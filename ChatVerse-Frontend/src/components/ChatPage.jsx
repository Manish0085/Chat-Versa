import React, { useEffect, useRef, useState } from "react";
import { MdAttachFile, MdSend, MdVideocam, MdCall, MdMoreVert, MdSearch, MdEmojiEmotions, MdMic, MdCheck, MdDoneAll } from "react-icons/md";
import useChatContext from "../context/ChatContext";
import { useNavigate } from "react-router";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import toast from "react-hot-toast";
import { baseURL } from "../config/AxiosHelper";
import { getMessagess, getRoomsApi, uploadFileApi } from "../services/RoomService";
import { timeAgo } from "../config/helper";
import VideoCall from "./VideoCall";
import { useAuth } from "../context/AuthContext";

const ChatPage = () => {
  const {
    roomId,
    currentUser,
    connected,
    setConnected,
    setRoomId,
    setCurrentUser,
  } = useChatContext();
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatBoxRef = useRef(null);
  const [stompClient, setStompClient] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState('video'); // 'video' or 'audio'
  const [incomingCall, setIncomingCall] = useState(null);
  const [initialSignal, setInitialSignal] = useState(null);
  const [signalQueue, setSignalQueue] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef(null);

  // States for real-time features
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (!connected) {
      navigate("/");
    }
  }, [connected, navigate]);

  // Load rooms
  useEffect(() => {
    async function fetchRooms() {
      try {
        const data = await getRoomsApi();
        setRooms(data);
      } catch (error) {
        console.error("Failed to fetch rooms", error);
      }
    }
    if (connected) {
      fetchRooms();
    }
  }, [connected, roomId]);

  // Load old messages
  useEffect(() => {
    async function loadMessages() {
      try {
        const messagesList = await getMessagess(roomId);
        setMessages(messagesList);
      } catch (error) {
        console.error("Failed to load messages", error);
      }
    }
    if (connected && roomId) {
      loadMessages();
    }
  }, [roomId, connected]);

  // Auto-scroll
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, typingUser]);

  // WebSocket connection using modern Client
  useEffect(() => {
    if (!connected || !roomId || !user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${baseURL}/chat`),
      debug: (str) => {
        // console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        username: user.email // Used by PresenceEventListener
      }
    });

    client.onConnect = () => {
      setStompClient(client);

      // Sub 1: Messages
      client.subscribe(`/topic/room/${roomId}`, (message) => {
        const newMessage = JSON.parse(message.body);
        setMessages((prev) => {
          const exists = prev.some(m => m.id === newMessage.id && m.id !== undefined && m.id !== null);
          if (exists) return prev;
          return [...prev, newMessage];
        });

        // If message is not from me, send read receipt
        if (newMessage.sender !== currentUser) {
          client.publish({
            destination: `/app/read/${roomId}`,
            body: JSON.stringify({
              messageId: newMessage.id,
              reader: currentUser,
              status: 'READ'
            })
          });
        }
      });

      // Sub 2: Typing Indicators
      client.subscribe(`/topic/room/${roomId}/typing`, (payload) => {
        const data = JSON.parse(payload.body);
        if (data.username !== currentUser) {
          if (data.typing) {
            setTypingUser(data.username);
          } else {
            setTypingUser(null);
          }
        }
      });

      // Sub 3: Room Status Updates
      client.subscribe(`/topic/room/${roomId}/status`, (payload) => {
        const data = JSON.parse(payload.body);
        console.log("Status update received:", data);
      });

      // Sub 4: Global Presence Updates
      client.subscribe(`/topic/presence`, (payload) => {
        const data = JSON.parse(payload.body);
        setOnlineUsers(prev => ({
          ...prev,
          [data.email]: data.online
        }));
      });

      // Sub 5: Incoming Call Signaling
      client.subscribe(`/topic/call/${roomId}`, (message) => {
        const signal = JSON.parse(message.body);
        if (signal.from === currentUser) return;

        if (signal.type === "offer") {
          setIncomingCall(signal);
        } else if (signal.type === "candidate" || signal.type === "answer") {
          // If we have a pending incoming call but haven't joined yet, queue the signals
          setSignalQueue(prev => [...prev, signal]);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
      if (frame.headers['message']?.includes("unauthorized")) {
        toast.error("Session expired. Please login again.");
        logout();
      }
    };

    client.activate();

    return () => {
      if (client) client.deactivate();
    };
  }, [roomId, connected, currentUser, user, token, logout]);

  const handleTyping = (e) => {
    setInput(e.target.value);

    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: `/app/typing/${roomId}`,
        body: JSON.stringify({
          username: currentUser,
          typing: true
        })
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        stompClient.publish({
          destination: `/app/typing/${roomId}`,
          body: JSON.stringify({
            username: currentUser,
            typing: false
          })
        });
      }, 2000);
    }
  };

  const sendMessage = async () => {
    if (stompClient && stompClient.connected && input.trim()) {
      const message = {
        sender: currentUser,
        content: input,
        roomId: roomId,
        timeStamp: new Date().toISOString()
      };

      stompClient.publish({
        destination: `/app/sendMessage/${roomId}`,
        body: JSON.stringify(message)
      });

      stompClient.publish({
        destination: `/app/typing/${roomId}`,
        body: JSON.stringify({
          username: currentUser,
          typing: false
        })
      });

      setInput("");
    }
  };

  const handleLogout = () => {
    if (stompClient) stompClient.deactivate();
    setConnected(false);
    setRoomId("");
    setCurrentUser("");
    logout();
    navigate("/login");
  };

  const switchRoom = (id) => {
    setRoomId(id);
  };

  const filteredRooms = rooms.filter(r =>
    r.roomId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAcceptCall = () => {
    setCallType(incomingCall.callType || 'video');
    setInitialSignal(incomingCall);
    setInCall(true);
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    // Optional: send reject signal
    setIncomingCall(null);
  };

  return (
    <div className="flex h-screen bg-[#0b141a] text-[#e9edef] overflow-hidden font-sans">
      {/* Incoming Call Notification */}
      {incomingCall && !inCall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-[#202c33] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full">
            <div className="relative">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingCall.from}`}
                alt="avatar"
                className="w-24 h-24 rounded-full bg-[#313d45] border-4 border-[#00a884] shadow-xl animate-pulse"
              />
              <div className="absolute -bottom-2 -right-2 bg-[#00a884] p-2 rounded-full shadow-lg">
                {incomingCall.callType === 'audio' ? <MdCall className="text-white" size={20} /> : <MdVideocam className="text-white" size={20} />}
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-1">Incoming {incomingCall.callType === 'audio' ? 'Voice' : 'Video'} Call</h3>
              <p className="text-[#8696a0] font-medium">{incomingCall.from} is calling you...</p>
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={handleRejectCall}
                className="flex-1 py-3 bg-red-600/20 text-red-500 rounded-2xl font-bold hover:bg-red-600 hover:text-white transition-all active:scale-95"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex-1 py-3 bg-[#00a884] text-[#111b21] rounded-2xl font-bold hover:bg-[#06cf9c] transition-all shadow-lg shadow-[#00a884]/20 active:scale-95 animate-bounce-subtle"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {inCall && (
        <VideoCall
          stompClient={stompClient}
          roomId={roomId}
          currentUser={currentUser}
          callType={callType}
          initialSignal={initialSignal}
          signalQueue={signalQueue}
          onEndCall={() => { setInCall(false); setInitialSignal(null); setSignalQueue([]); }}
        />
      )}

      {/* Left Sidebar */}
      <div className="w-1/4 min-w-[320px] border-r border-[#222d34] flex flex-col bg-[#111b21] z-20 shadow-2xl">
        <div className="h-[64px] bg-[#202c33] flex items-center justify-between px-4 border-b border-[#222d34]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser}`}
                alt="avatar"
                className="w-10 h-10 rounded-full bg-[#313d45] border border-[#00a884]"
              />
              <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#202c33] rounded-full ${onlineUsers[user?.email] ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            </div>
            <span className="font-bold text-sm tracking-tight">{currentUser}</span>
          </div>
        </div>

        <div className="p-3 bg-[#111b21]">
          <div className="bg-[#202c33] flex items-center gap-4 px-4 py-2 rounded-xl transition-all focus-within:ring-1 focus-within:ring-[#00a884]">
            <MdSearch className="text-[#8696a0]" size={20} />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-sm w-full outline-none placeholder-[#8696a0]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
          {filteredRooms.map((room) => (
            <div
              key={room.id || room.roomId}
              onClick={() => switchRoom(room.roomId)}
              className={`flex items-center gap-4 p-4 cursor-pointer rounded-2xl transition-all duration-200 ${roomId === room.roomId ? 'bg-[#2a3942] shadow-lg scale-[1.02]' : 'hover:bg-[#202c33]'}`}
            >
              <div className="w-12 h-12 bg-gradient-to-tr from-[#00a884] to-[#05cd99] rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg transform rotate-3">
                {room.roomId?.substring(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-[#e9edef] truncate">{room.roomName || room.roomId}</span>
                  <span className="text-[10px] text-[#8696a0] font-medium uppercase">Active</span>
                </div>
                <p className="text-xs text-[#8696a0] truncate opacity-80">
                  #{room.roomId} • Topic Core
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col relative bg-[#0b141a]">
        {/* Header */}
        <div className="h-[64px] bg-[#202c33]/90 backdrop-blur-md z-30 flex items-center justify-between px-6 border-b border-[#222d34] shadow-sm">
          <div className="flex items-center gap-4 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00a884] to-[#005c4b] rounded-xl flex items-center justify-center text-white font-bold shadow-md">
              {roomId?.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-base tracking-tight">{roomId}</p>
              <p className="text-[11px] text-[#00a884] font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-pulse"></span>
                Kafka Stream Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-[#aebac1]">
            <button onClick={() => { setCallType('video'); setInCall(true); }} className="hover:text-[#00a884] transition-colors"><MdVideocam size={26} /></button>
            <button onClick={() => { setCallType('audio'); setInCall(true); }} className="hover:text-[#00a884] transition-colors"><MdCall size={24} /></button>
            <div className="w-[1px] h-6 bg-[#313d45] mx-1"></div>
            <button onClick={handleLogout} className="px-4 py-1.5 rounded-lg border border-red-500/30 text-red-500 text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Sign Out</button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={chatBoxRef}
          className="flex-1 overflow-y-auto p-6 z-10 space-y-4 custom-scrollbar bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-fixed"
        >
          <div className="flex justify-center mb-8">
            <span className="bg-[#202c33]/80 backdrop-blur px-4 py-1.5 rounded-full text-[10px] font-bold text-[#8696a0] uppercase tracking-[2px] border border-[#313d45]">
              E2E Secure Channel
            </span>
          </div>

          {messages.map((message, index) => {
            const isOwn = message.sender === currentUser;
            return (
              <div key={index} className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`relative max-w-[70%] px-4 py-3 rounded-2xl shadow-xl border ${isOwn
                  ? "bg-[#005c4b] text-white rounded-tr-none border-[#00a884]/20"
                  : "bg-[#202c33] text-[#e9edef] rounded-tl-none border-[#313d45]/50"
                  }`}>
                  {!isOwn && (
                    <p className="text-[10px] font-black text-[#05cd99] mb-1.5 uppercase tracking-tighter">{message.sender}</p>
                  )}

                  {message.fileUrl ? (
                    <div className="mb-2">
                      {message.fileType?.startsWith("image/") ? (
                        <img src={`${baseURL}${message.fileUrl}`} className="max-w-full rounded-xl shadow-2xl" alt="" />
                      ) : (
                        <a href={`${baseURL}${message.fileUrl}`} className="flex items-center gap-3 bg-black/20 p-4 rounded-xl hover:bg-black/30 transition shadow-inner">
                          <MdAttachFile className="rotate-45" size={24} />
                          <span className="truncate text-sm font-medium">{message.fileName}</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed pr-8 whitespace-pre-wrap">{message.content}</p>
                  )}

                  <div className="mt-1 flex items-center justify-end gap-1.5 opacity-60">
                    <span className="text-[9px] font-bold">
                      {new Date(message.timeStamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && <MdDoneAll className="text-[#53bdeb]" size={14} />}
                  </div>
                </div>
              </div>
            );
          })}

          {typingUser && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-[#202c33]/50 backdrop-blur-sm px-4 py-2 rounded-2xl text-xs font-semibold text-[#00a884] border border-[#00a884]/20 italic">
                {typingUser} is typing...
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="min-h-[80px] bg-[#202c33]/95 backdrop-blur-xl z-30 flex items-center gap-4 px-6 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <button className="text-[#aebac1] hover:text-[#00a884] transition transform hover:scale-110"><MdEmojiEmotions size={28} /></button>
          <button onClick={() => fileInputRef.current.click()} className="text-[#aebac1] hover:text-[#00a884] transition transform hover:scale-110"><MdAttachFile className="rotate-45" size={28} /></button>
          <input type="file" ref={fileInputRef} onChange={() => { }} className="hidden" />

          <div className="flex-1 bg-[#2a3942] rounded-2xl flex items-center px-6 py-3 shadow-inner group transition-all focus-within:ring-2 focus-within:ring-[#00a884]/30">
            <input
              value={input}
              onChange={handleTyping}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              type="text"
              placeholder="Type a message..."
              className="w-full bg-transparent text-sm outline-none placeholder-[#8696a0] font-medium"
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`p-4 rounded-2xl transition-all duration-300 shadow-xl ${input.trim() ? "bg-gradient-to-br from-[#00a884] to-[#005c4b] text-white hover:scale-110 active:scale-95" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
          >
            <MdSend size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
