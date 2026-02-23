import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { loginApi } from "../services/AuthService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { MdChat } from "react-icons/md";

const Login = () => {
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await loginApi(credentials);
            login(data);
            toast.success("Welcome back!");
            navigate("/");
        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data || "Email or password incorrect");
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
                <h2 className="text-[#e9edef] text-xl font-medium mb-8 text-center">Login to your account</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[#00a884] text-xs font-bold uppercase mb-2 tracking-wider">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={credentials.email}
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
                            value={credentials.password}
                            onChange={handleChange}
                            className="w-full p-3 rounded bg-[#2a3942] border-b-2 border-transparent focus:border-[#00a884] text-[#e9edef] outline-none transition-all placeholder="
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#00a884] text-[#111b21] py-3 rounded-md font-bold text-sm uppercase tracking-widest hover:bg-[#06cf9c] transition-all transform hover:translate-y-[-1px] active:translate-y-[0px] shadow-lg mt-4"
                    >
                        Login
                    </button>

                    <div className="pt-6 border-t border-[#313d45] text-center">
                        <p className="text-[#8696a0] text-sm">
                            New to ChatVerse?{" "}
                            <Link to="/register" className="text-[#00a884] hover:underline font-bold">
                                Create account
                            </Link>
                        </p>
                    </div>
                </form>
            </div>

            <p className="text-[#8696a0] text-xs mt-12 opacity-50 italic">Secure. Fast. End-to-End Encrypted.</p>
        </div>
    );
};

export default Login;
