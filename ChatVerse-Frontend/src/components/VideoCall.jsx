import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MdCallEnd, MdVideocam, MdVideocamOff, MdMic, MdMicOff } from "react-icons/md";

const VideoCall = ({ stompClient, roomId, currentUser, callType, initialSignal, signalQueue, onEndCall }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const peerConnection = useRef(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState("connecting"); // 'connecting', 'connected', 'failed'
    const pendingCandidates = useRef([]);

    const configuration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
        ],
    };

    useEffect(() => {
        const initCall = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: callType === 'video',
                    audio: true
                });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                peerConnection.current = new RTCPeerConnection(configuration);

                stream.getTracks().forEach((track) => {
                    peerConnection.current.addTrack(track, stream);
                });

                peerConnection.current.ontrack = (event) => {
                    log("Remote track received");
                    if (callType === 'video' && remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    } else if (callType === 'audio' && remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                };

                peerConnection.current.oniceconnectionstatechange = () => {
                    log(`ICE Connection State: ${peerConnection.current.iceConnectionState}`);
                    if (peerConnection.current.iceConnectionState === "connected" ||
                        peerConnection.current.iceConnectionState === "completed") {
                        setConnectionStatus("connected");
                    } else if (peerConnection.current.iceConnectionState === "failed" ||
                        peerConnection.current.iceConnectionState === "disconnected") {
                        setConnectionStatus("failed");
                    }
                };

                peerConnection.current.onconnectionstatechange = () => {
                    log(`Connection State: ${peerConnection.current.connectionState}`);
                };

                peerConnection.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        log("Sending ICE candidate");
                        stompClient.publish({
                            destination: `/app/call.signal`,
                            body: JSON.stringify({
                                type: "candidate",
                                data: event.candidate,
                                from: currentUser,
                                roomId: roomId
                            })
                        });
                    }
                };

                // Subscribe to signaling
                const subscription = stompClient.subscribe(`/topic/call/${roomId}`, (message) => {
                    const signal = JSON.parse(message.body);
                    if (signal.from === currentUser) return;

                    handleSignalingData(signal);
                });

                // Create Offer if we are the initiator
                // For simplicity, let's say the first person to join handles this or we have a button
                // Here we just wait for signaling

                // Process initial signal if provided (Incoming call - Receiver Side)
                if (initialSignal && initialSignal.type === "offer") {
                    log("Processing initial offer");
                    await handleSignalingData(initialSignal);
                } else if (!initialSignal) {
                    // We are the initiator
                    log("Initiating call automatically");
                    setTimeout(() => {
                        startCall();
                    }, 1000);
                }

                // Process signal queue from ChatPage (missed signals)
                if (signalQueue && signalQueue.length > 0) {
                    log(`Processing ${signalQueue.length} signals from ChatPage queue`);
                    signalQueue.forEach(sig => handleSignalingData(sig));
                }

                return () => {
                    subscription.unsubscribe();
                    stream.getTracks().forEach(track => track.stop());
                    if (peerConnection.current) peerConnection.current.close();
                };
            } catch (err) {
                console.error("Error accessing media devices.", err);
                toast.error("Could not access camera/microphone");
            }
        };

        if (stompClient) {
            initCall();
        }
    }, [stompClient]);

    const log = (message) => {
        console.log(`[WebRTC] ${message}`);
    };

    const handleSignalingData = async (signal) => {
        if (!peerConnection.current) return;
        try {
            if (signal.type === "offer") {
                log("Received Offer");
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                stompClient.publish({
                    destination: `/app/call.signal`,
                    body: JSON.stringify({
                        type: "answer",
                        data: answer,
                        from: currentUser,
                        roomId: roomId
                    })
                });
                // Process queued candidates
                processPendingCandidates();
            } else if (signal.type === "answer") {
                log("Received Answer");
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
                // Process queued candidates
                processPendingCandidates();
            } else if (signal.type === "candidate") {
                if (peerConnection.current.remoteDescription) {
                    await safeAddIceCandidate(signal.data);
                } else {
                    log("Queueing ICE candidate (remoteDescription not set)");
                    pendingCandidates.current.push(signal.data);
                }
            }
        } catch (err) {
            console.error("Error handling signaling data", err);
        }
    };

    const safeAddIceCandidate = async (candidateData) => {
        try {
            if (!candidateData || !candidateData.candidate) {
                log("Received end-of-candidates or null candidate");
                return;
            }
            log("Adding ICE candidate");
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidateData));
        } catch (e) {
            console.error("Failed to add ICE candidate", e);
        }
    };

    const processPendingCandidates = async () => {
        log(`Processing ${pendingCandidates.current.length} pending candidates`);
        while (pendingCandidates.current.length > 0) {
            const candidate = pendingCandidates.current.shift();
            await safeAddIceCandidate(candidate);
        }
    };

    const startCall = async () => {
        if (!peerConnection.current) {
            toast.error("Call not initialized. Please wait.");
            return;
        }
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        stompClient.publish({
            destination: `/app/call.signal`,
            body: JSON.stringify({
                type: "offer",
                data: offer,
                from: currentUser,
                roomId: roomId,
                callType: callType
            })
        });
    };

    const toggleMute = () => {
        localStream.getAudioTracks()[0].enabled = isMuted;
        setIsMuted(!isMuted);
    };

    const toggleVideo = () => {
        localStream.getVideoTracks()[0].enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-5xl aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                {/* Media Elements */}
                {callType === 'video' ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover transition-opacity duration-1000 ${connectionStatus === 'connected' ? 'opacity-100' : 'opacity-0'}`}
                    />
                ) : (
                    <audio ref={remoteAudioRef} autoPlay />
                )}

                {/* Voice Call UI (Always shows for audio, shows for video when connecting/failed) */}
                {(callType === 'audio' || connectionStatus !== 'connected') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b141a]">
                        <div className="relative mb-8">
                            <div className={`w-32 h-32 rounded-full border-4 border-[#00a884]/20 border-t-[#00a884] ${connectionStatus === 'connected' ? 'animate-none' : 'animate-spin'}`}></div>
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${roomId}`}
                                alt="avatar"
                                className={`absolute inset-4 w-24 h-24 rounded-full bg-[#111b21] transition-transform duration-500 ${callType === 'audio' && connectionStatus === 'connected' ? 'scale-110 shadow-[0_0_30px_rgba(0,168,132,0.4)]' : ''}`}
                            />
                            {callType === 'audio' && connectionStatus === 'connected' && (
                                <div className="absolute -inset-4 rounded-full border-2 border-[#00a884]/30 animate-ping"></div>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">
                            {connectionStatus === 'connecting' ? 'Establishing Secure Connection...' :
                                connectionStatus === 'connected' ? 'Voice Call Active' : 'Call Failed'}
                        </h2>
                        <p className="text-[#8696a0] font-medium tracking-wide uppercase text-xs">
                            {callType === 'video' ? 'Video' : 'Voice'} Call • End-to-End Encrypted
                        </p>
                    </div>
                )}

                {/* Local Video - PiP */}
                {callType === 'video' && (
                    <div className="absolute bottom-6 right-6 w-1/4 aspect-video bg-gray-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover mirror"
                        />
                    </div>
                )}

                {/* Controls */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-[#202c33]/80 backdrop-blur-xl rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all hover:scale-105">
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-all duration-300 ${isMuted ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-[#2a3942] text-[#aebac1] hover:text-white hover:bg-[#3b4a54]'}`}
                    >
                        {isMuted ? <MdMicOff size={28} /> : <MdMic size={28} />}
                    </button>

                    {/* Status Indicator */}
                    <div className="px-6 py-2 rounded-full bg-black/20 border border-white/5 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-[#00a884] animate-pulse' : 'bg-yellow-500 animate-bounce'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#8696a0]">
                            {connectionStatus}
                        </span>
                    </div>

                    {callType === 'video' && (
                        <button
                            onClick={toggleVideo}
                            className={`p-4 rounded-full transition-all duration-300 ${isVideoOff ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-[#2a3942] text-[#aebac1] hover:text-white hover:bg-[#3b4a54]'}`}
                        >
                            {isVideoOff ? <MdVideocamOff size={28} /> : <MdVideocam size={28} />}
                        </button>
                    )}
                    <button
                        onClick={onEndCall}
                        className="p-4 bg-red-600 text-white rounded-full hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:rotate-90 active:scale-90"
                    >
                        <MdCallEnd size={28} />
                    </button>
                </div>

                {/* Info */}
                <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                    <div className="w-2.5 h-2.5 bg-[#25D366] rounded-full animate-pulse shadow-[0_0_10px_#25D366]"></div>
                    <span className="text-white text-xs font-bold tracking-widest uppercase">Live • {roomId}</span>
                </div>
            </div>
        </div>
    );
};

export default VideoCall;
