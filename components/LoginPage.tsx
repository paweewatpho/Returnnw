import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle, User, Lock } from 'lucide-react';
import { mockLogin, MOCK_USERS } from '../data/mockUsers';
import { User as UserType } from '../types';
import { getRoleDisplayName, getRoleColor } from '../utils/permissions';

interface LoginPageProps {
    onLoginSuccess: (user: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const user = mockLogin(email, password);

        if (user) {
            onLoginSuccess(user);
        } else {
            setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            setIsLoading(false);
        }
    };

    const handleQuickLogin = (user: UserType) => {
        // กรอกแค่ Email เท่านั้น ไม่กรอก Password
        // ให้ User ใส่ Password เอง
        setEmail(user.email);
        setPassword(''); // Clear password field
        // Focus ที่ช่อง password
        setTimeout(() => {
            const passwordInput = document.querySelector<HTMLInputElement>('input[type="password"]');
            passwordInput?.focus();
        }, 100);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-6xl flex gap-8 relative z-10">
                {/* Left Side - Login Form */}
                <div className="flex-1 bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-white/90">
                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg mb-4">
                            <img
                                src="https://img2.pic.in.th/pic/logo-neo.png"
                                alt="Neo Logo"
                                className="w-12 h-12 object-contain"
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">
                            Neosiam Return
                        </h1>
                        <p className="text-slate-500 text-sm">
                            ระบบจัดการสินค้าคืน (Return Management System)
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                User:
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@neosiam.com"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Password:
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••"
                                    required
                                    className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>กำลังเข้าสู่ระบบ...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    <span>เข้าสู่ระบบ</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right Side - Quick Login */}
                <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <User className="w-6 h-6 text-blue-600" />
                        Quick Login (Development)
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        คลิกเพื่อกรอก Email อัตโนมัติ (ยังต้องใส่รหัสผ่านเอง)
                    </p>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {MOCK_USERS.map((user) => (
                            <button
                                key={user.uid}
                                onClick={() => handleQuickLogin(user)}
                                className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={user.photoURL || 'https://ui-avatars.com/api/?name=User'}
                                        alt={user.displayName}
                                        className="w-12 h-12 rounded-full border-2 border-slate-100 group-hover:border-blue-200 transition-colors"
                                    />
                                    <div className="flex-1">
                                        <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                                            {user.displayName}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {user.email}
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                                        {getRoleDisplayName(user.role)}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Note */}
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-700">
                            <strong>หมายเหตุ:</strong> Quick Login จะกรอกแค่ Email ให้ คุณยังต้องใส่รหัสผ่านเอง
                        </p>
                    </div>
                </div>
            </div>

            {/* Custom CSS for animations */}
            <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
        </div>
    );
};

export default LoginPage;
