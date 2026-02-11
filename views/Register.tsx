
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Lock, Mail, User, AlertTriangle, Loader2, Camera, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { InviteLink } from '../types';

interface RegisterProps {
  inviteCode: string;
  onRegister: (data: { token: string; user: any }) => void;
  onNavigateLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ inviteCode, onRegister, onNavigateLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Проверка минимальной длины пароля
    if (password.length < 8) {
        setApiError('Пароль должен быть минимум 8 символов');
        return;
    }

    if (password !== confirmPassword) {
        setApiError("Пароли не совпадают");
        return;
    }

    if (!agreed) {
        setApiError('Необходимо согласиться с условиями использования');
        return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email.toLowerCase(),
                password,
                firstName: name.split(' ')[0],
                lastName: name.split(' ').slice(1).join(' ') || null,
                inviteCode
            })
        });

        const data = await response.json();

        if (!response.ok) {
            setApiError(data.error || 'Ошибка регистрации');
            setIsLoading(false);
            return;
        }

        // Успех - передать токен и пользователя в App.tsx
        onRegister(data.data);
    } catch (err) {
        setApiError('Ошибка сети. Попробуйте позже.');
        setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAvatar(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const generateRandomAvatar = () => {
      const randomId = Math.floor(Math.random() * 70);
      setAvatar(`https://i.pravatar.cc/150?u=${randomId}`);
  };

  const isFormValid = name && email && password.length >= 8 && password === confirmPassword && agreed;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Background Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-rose-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
            <img 
              src="https://i.imgur.com/f3UfhpM.png" 
              alt="VIBES Logo" 
              className="h-24 w-auto object-contain mx-auto mb-4"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                <CheckCircle2 size={12} /> Инвайт принят
            </div>
            <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Добро пожаловать в VIBES</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Заполни профиль, чтобы начать обучение</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5 shadow-xl shadow-zinc-200/50 dark:shadow-none">
           <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Avatar Picker */}
                <div className="flex flex-col items-center mb-6">
                    <div className="relative group cursor-pointer">
                        <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden transition-colors hover:border-rose-500">
                            {avatar ? (
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <Camera size={32} className="text-zinc-400 group-hover:text-rose-500 transition-colors" />
                            )}
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleAvatarChange} 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {/* Randomize Button */}
                        <button 
                            type="button"
                            onClick={generateRandomAvatar}
                            className="absolute -bottom-1 -right-1 p-2 bg-white dark:bg-zinc-800 rounded-full shadow-md border border-zinc-200 dark:border-white/10 hover:text-rose-600 transition-colors"
                            title="Случайный аватар"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    <span className="text-xs text-zinc-400 mt-2">Загрузи фото или выбери рандом</span>
                </div>

                <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Имя</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-rose-500 transition-colors"
                            placeholder="Как тебя зовут?"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-rose-500 transition-colors"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Пароль</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-12 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-rose-500 transition-colors"
                            placeholder="Минимум 8 символов"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Повторите пароль</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full pl-11 pr-12 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border focus:outline-none transition-colors ${
                                confirmPassword && password !== confirmPassword 
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-zinc-200 dark:border-white/10 focus:border-rose-500'
                            }`}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-start gap-3 mt-4">
                    <input
                        type="checkbox"
                        id="agree"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                    />
                    <label htmlFor="agree" className="text-sm text-zinc-500 dark:text-zinc-400 cursor-pointer">
                        Я согласен с <a href="#" className="underline hover:text-rose-600">условиями использования</a>.
                    </label>
                </div>

                {apiError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 mt-4"
                    >
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{apiError}</p>
                                {apiError.toLowerCase().includes('инвайт') && (
                                    <button
                                        type="button"
                                        onClick={() => window.open('mailto:support@vibes.com', '_blank')}
                                        className="text-red-600 dark:text-red-400 underline text-sm mt-2 hover:text-red-700 dark:hover:text-red-300"
                                    >
                                        Написать в поддержку
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed mt-6"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <span>Создать аккаунт</span>
                    )}
                </button>
           </form>
        </div>

        <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Уже есть аккаунт? <button onClick={onNavigateLogin} className="text-rose-600 dark:text-rose-400 font-bold hover:underline">Войти</button>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
