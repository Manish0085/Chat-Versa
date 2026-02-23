import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MdCallEnd, MdVideocam, MdVideocamOff, MdMic, MdMicOff } from "react-icons/md";

const VideoCall = ({ stompClient, roomId, currentUser, onEndCall }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const peerConnection = useRef(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const configuration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
        ],
    };

    useEffect(() => {
        const initCall = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                peerConnection.current = new RTCPeerConnection(configuration);

                stream.getTracks().forEach((track) => {
                    peerConnection.current.addTrack(track, stream);
                });

                peerConnection.current.ontrack = (event) => {
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                };

                peerConnection.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        stompClient.send(`/app/call.signal`, {}, JSON.stringify({
                            type: "candidate",
                            data: event.candidate,
                            from: currentUser,
                            roomId: roomId
                        }));
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

    const handleSignalingData = async (signal) => {
        if (!peerConnection.current) return;
        try {
            if (signal.type === "offer") {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                stompClient.send(`/app/call.signal`, {}, JSON.stringify({
                    type: "answer",
                    data: answer,
                    from: currentUser,
                    roomId: roomId
                }));
            } else if (signal.type === "answer") {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
            } else if (signal.type === "candidate") {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.data));
            }
        } catch (err) {
            console.error("Error handling signaling data", err);
        }
    };

    const startCall = async () => {
        if (!peerConnection.current) {
            toast.error("Call not initialized. Please wait.");
            return;
        }
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        stompClient.send(`/app/call.signal`, {}, JSON.stringify({
            type: "offer",
            data: offer,
            from: currentUser,
            roomId: roomId
        }));
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
                {/* Remote Video */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                {/* Local Video - PiP */}
                <div className="absolute bottom-6 right-6 w-1/4 aspect-video bg-gray-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                    />
                </div>

                {/* Controls */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-[#202c33]/80 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg' : 'bg-[#2a3942] text-[#aebac1] hover:text-white'}`}
                    >
                        {isMuted ? <MdMicOff size={28} /> : <MdMic size={28} />}
                    </button>
                    <button
                        onClick={startCall}
                        className="px-8 py-4 bg-[#00a884] text-[#111b21] rounded-full font-bold uppercase tracking-wider hover:bg-[#06cf9c] transition-all shadow-lg active:scale-95"
                    >
                        Click to Start
                    </button>
                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500 text-white shadow-lg' : 'bg-[#2a3942] text-[#aebac1] hover:text-white'}`}
                    >
                        {isVideoOff ? <MdVideocamOff size={28} /> : <MdVideocam size={28} />}
                    </button>
                    <button
                        onClick={onEndCall}
                        className="p-4 bg-red-600 text-white rounded-full hover:bg-red-500 transition-all shadow-lg hover:rotate-90 active:scale-90"
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
