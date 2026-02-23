import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { registerApi } from "../services/AuthService";
import toast from "react-hot-toast";
import { MdChat } from "react-icons/md";

const Register = () => {
    const [userData, setUserData] = useState({ name: "", email: "", password: "" });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setUserData({ ...userData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await registerApi(userData);
            toast.success("Account created! You can now login.");
            navigate("/login");
        } catch (error) {
            toast.error(error.response?.data || "Could not register. Try again.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#111b21] items-center justify-center p-4">
            {/* Header / Logo */}
            <div className="mb-10 text-center">
                <div className="bg-[#25D366] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <MdChat className="text-white" size={45} />
                </div>
                <h1 className="text-[#e9edef] text-3xl font-bold tracking-wide">CHATVERSE</h1>
                <p className="text-[#8696a0] mt-1 text-sm uppercase tracking-[3px]">WhatsApp Clone</p>
            </div>

            <div className="bg-[#202c33] p-10 rounded-xl shadow-2xl w-full max-w-md border border-[#313d45]">
                <h2 className="text-[#e9edef] text-xl font-medium mb-8 text-center">Create your account</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[#00a884] text-xs font-bold uppercase mb-2 tracking-wider">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={userData.name}
                            onChange={handleChange}
                            className="w-full p-3 rounded bg-[#2a3942] border-b-2 border-transparent focus:border-[#00a884] text-[#e9edef] outline-none transition-all placeholder-[#8696a0]"
                            placeholder="Your Name"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[#00a884] text-xs font-bold uppercase mb-2 tracking-wider">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={userData.email}
                            onChange={handleChange}
                            className="w-full p-3 rounded bg-[#2a3942] border-b-2 border-transparent focus:border-[#00a884] text-[#e9edef] outline-none transition-all placeholder-[#8696a0]"
                            placeholder="user@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[#00a884] text-xs font-bold uppercase mb-2 tracking-wider">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={userData.password}
                            onChange={handleChange}
                            className="w-full p-3 rounded bg-[#2a3942] border-b-2 border-transparent focus:border-[#00a884] text-[#e9edef] outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#00a884] text-[#111b21] py-3 rounded-md font-bold text-sm uppercase tracking-widest hover:bg-[#06cf9c] transition-all transform hover:translate-y-[-1px] active:translate-y-[0px] shadow-lg mt-4"
                    >
                        Register
                    </button>

                    <div className="pt-6 border-t border-[#313d45] text-center">
                        <p className="text-[#8696a0] text-sm">
                            Already have an account?{" "}
                            <Link to="/login" className="text-[#00a884] hover:underline font-bold">
                                Login here
                            </Link>
                        </p>
                    </div>
                </form>
            </div>

            <p className="text-[#8696a0] text-xs mt-12 opacity-50 italic">Privacy focused. Always connected.</p>
        </div>
    );
};

export default Register;
