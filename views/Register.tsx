
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Lock, Mail, User, AlertTriangle, Loader2, Camera, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { InviteLink } from '../types';

interface RegisterProps {
  inviteCode: string;
  onRegister: (data: { name: string; email: string; avatar?: string }) => void;
  onNavigateLogin: () => void;
  validateInvite: (code: string) => InviteLink | null;
}

const Register: React.FC<RegisterProps> = ({ inviteCode, onRegister, onNavigateLogin, validateInvite }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [inviteStatus, setInviteStatus] = useState<'validating' | 'valid' | 'invalid'>('validating');
  const [isLoading, setIsLoading] = useState(false);

  // Validate Invite on Mount
  useEffect(() => {
    const timer = setTimeout(() => {
        const invite = validateInvite(inviteCode);
        if (invite && invite.status === 'active') {
            setInviteStatus('valid');
        } else {
            setInviteStatus('invalid');
        }
    }, 800); // Fake network delay for smooth UX
    return () => clearTimeout(timer);
  }, [inviteCode, validateInvite]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        alert("Пароли не совпадают");
        return;
    }
    if (!agreed) return;

    setIsLoading(true);
    setTimeout(() => {
        setIsLoading(false);
        onRegister({ name, email, avatar: avatar || undefined });
    }, 1500);
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

  if (inviteStatus === 'validating') {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <Loader2 size={40} className="text-violet-600 animate-spin mb-4" />
                <p className="text-zinc-500 font-medium">Проверяем инвайт...</p>
             </motion.div>
        </div>
      );
  }

  if (inviteStatus === 'invalid') {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
             <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5 text-center shadow-xl"
            >
                <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Ссылка недействительна</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
                    Упс, эта ссылка уже использована или не существует. <br/>
                    Возможно, вы уже зарегистрировались?
                </p>
                
                <div className="space-y-3">
                    <button 
                        onClick={onNavigateLogin}
                        className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold hover:opacity-90 transition-opacity"
                    >
                        Войти в аккаунт
                    </button>
                    <button className="w-full py-3 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                        Написать в поддержку
                    </button>
                </div>
             </motion.div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Background Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-violet-500/10 rounded-full blur-[120px]" />
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
                        <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden transition-colors hover:border-violet-500">
                            {avatar ? (
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <Camera size={32} className="text-zinc-400 group-hover:text-violet-500 transition-colors" />
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
                            className="absolute -bottom-1 -right-1 p-2 bg-white dark:bg-zinc-800 rounded-full shadow-md border border-zinc-200 dark:border-white/10 hover:text-violet-600 transition-colors"
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
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors"
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
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors"
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
                            className="w-full pl-11 pr-12 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors"
                            placeholder="Минимум 8 символов"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
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
                                : 'border-zinc-200 dark:border-white/10 focus:border-violet-500'
                            }`}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
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
                        className="mt-1 rounded border-zinc-300 text-violet-600 focus:ring-violet-500" 
                    />
                    <label htmlFor="agree" className="text-sm text-zinc-500 dark:text-zinc-400 cursor-pointer">
                        Я согласен с <a href="#" className="underline hover:text-violet-600">условиями использования</a>.
                    </label>
                </div>

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
            Уже есть аккаунт? <button onClick={onNavigateLogin} className="text-violet-600 dark:text-violet-400 font-bold hover:underline">Войти</button>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
