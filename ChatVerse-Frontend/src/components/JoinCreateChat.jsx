import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { createRoomApi, joinChatApi } from "../services/RoomService";
import useChatContext from "../context/ChatContext";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { MdChat, MdExitToApp, MdAdd, MdLogin, MdStars } from "react-icons/md";

const JoinCreateChat = () => {
  const { user, logout } = useAuth();
  const [detail, setDetail] = useState({ roomId: "", userName: user?.name || "" });
  const { setRoomId, setCurrentUser, setConnected } = useChatContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setDetail(prev => ({ ...prev, userName: user.name }));
    }
  }, [user]);

  function handleFormInputChange(e) {
    setDetail({ ...detail, [e.target.name]: e.target.value });
  }

  function validateForm() {
    if (detail.roomId === "" || detail.userName === "") {
      toast.error("Security: Room ID required for encrypted tunnel.");
      return false;
    }
    return true;
  }

  async function joinChat() {
    if (validateForm()) {
      try {
        const room = await joinChatApi(detail.roomId);
        toast.success("Synchronized with Kafka Room");
        setCurrentUser(detail.userName);
        setRoomId(room.roomId);
        setConnected(true);
        navigate("/chat");
      } catch (err) {
        toast.error(err?.response?.data || "Room not found on Cloud MSK.");
      }
    }
  }

  async function createRoom() {
    if (validateForm()) {
      try {
        const res = await createRoomApi(detail.roomId);
        toast.success("Provisioned New Cloud Topic 🚀");
        setCurrentUser(detail.userName);
        setRoomId(res.roomId);
        setConnected(true);
        navigate("/chat");
      } catch (err) {
        toast.error(err?.response?.data || "Provisioning failed.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0b141a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#00a884]/30">
      {/* Premium Animated Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00a884] rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#005c4b] rounded-full blur-[160px] animate-pulse delay-1000"></div>
      </div>

      <button
        onClick={logout}
        className="absolute top-8 right-8 flex items-center gap-2 text-[#8696a0] hover:text-white transition-all bg-[#202c33]/50 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-[#313d45] text-xs font-black uppercase tracking-widest hover:border-red-500/50"
      >
        <MdExitToApp size={18} /> Logout
      </button>

      <div className="mb-12 text-center z-10">
        <div className="relative inline-block mb-6 group">
          <div className="absolute inset-0 bg-[#25D366] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className="bg-gradient-to-br from-[#00a884] to-[#005c4b] w-20 h-20 rounded-[2rem] flex items-center justify-center relative shadow-2xl transform hover:rotate-6 transition-transform duration-500">
            <MdChat className="text-white" size={40} />
          </div>
          <div className="absolute -top-2 -right-2 bg-yellow-500 p-1.5 rounded-lg shadow-lg">
            <MdStars className="text-[#111b21]" size={16} />
          </div>
        </div>
        <h1 className="text-white text-5xl font-black tracking-tighter mb-2">CHAT<span className="text-[#00a884]">VERSE</span></h1>
        <p className="text-[#8696a0] text-sm font-medium tracking-wide">Enterprise Kafka-Ready Infrastructure</p>
      </div>

      <div className="bg-[#111b21]/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] w-full max-w-lg border border-[#222d34] z-10">
        <div className="space-y-8">
          <div>
            <label className="flex items-center gap-2 text-[#00a884] text-[10px] font-black uppercase mb-3 tracking-[3px]">
              <span className="w-4 h-[1px] bg-[#00a884]"></span> Identity Proxy
            </label>
            <div className="bg-[#0b141a] p-4 rounded-2xl border border-[#222d34] flex items-center gap-4 transition-all">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} className="w-8 h-8 rounded-full border border-[#00a884]/30" alt="" />
              <span className="text-[#e9edef] font-bold text-sm tracking-tight">{user?.name || "Anonymous Agent"}</span>
              <span className="ml-auto text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded font-bold uppercase">Verified</span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-[#00a884] text-[10px] font-black uppercase mb-3 tracking-[3px]">
              <span className="w-4 h-[1px] bg-[#00a884]"></span> Kafka Topic ID
            </label>
            <input
              name="roomId"
              value={detail.roomId}
              onChange={handleFormInputChange}
              className="w-full p-5 rounded-2xl bg-[#0b141a] border border-[#222d34] text-[#e9edef] focus:border-[#00a884]/50 focus:ring-4 focus:ring-[#00a884]/5 outline-none transition-all placeholder-[#313d45] text-base font-bold tracking-tight shadow-inner"
              placeholder="Enter Cloud Room Identifier"
            />
            <div className="flex items-center gap-2 mt-4 text-[11px] text-[#8696a0] font-medium italic">
              <div className="w-1 h-1 bg-green-500 rounded-full"></div>
              Secure Socket Protocol (v2.0) Active
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={joinChat}
              className="flex-1 flex items-center justify-center gap-3 bg-[#202c33] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#2a3942] transition-all border border-[#313d45] group"
            >
              <MdLogin size={20} className="group-hover:translate-x-1 transition-transform" /> Join Core
            </button>
            <button
              onClick={createRoom}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-br from-[#00a884] to-[#005c4b] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-[#00a884]/20 group"
            >
              <MdAdd size={22} className="group-hover:rotate-90 transition-transform" /> Provision
            </button>
          </div>
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center gap-4 text-[#313d45] z-10">
        <div className="flex items-center gap-8">
          <span className="text-[10px] font-bold uppercase tracking-[3px]">Scalable</span>
          <span className="text-[10px] font-bold uppercase tracking-[3px]">Kafka</span>
          <span className="text-[10px] font-bold uppercase tracking-[3px]">Cloud</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-ping"></div>
          <span className="text-[10px] font-black text-[#8696a0] uppercase tracking-[4px]">System Nominal</span>
        </div>
      </div>
    </div>
  );
};

export default JoinCreateChat;
