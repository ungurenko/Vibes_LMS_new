
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Lock, Mail, ArrowLeft, RefreshCcw, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  onNavigateToRegister: () => void;
  onSimulateResetLink: () => void;
  initialView?: 'login' | 'reset';
  onResetComplete?: () => void;
}

const Login: React.FC<LoginProps> = ({ 
    onLogin, 
    onNavigateToRegister, 
    onSimulateResetLink, 
    initialView = 'login',
    onResetComplete 
}) => {
  const [view, setView] = useState<'login' | 'forgot' | 'email-sent' | 'reset'>(initialView === 'reset' ? 'reset' : 'login');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin(email, password);
    }, 1000);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setTimeout(() => {
          setIsLoading(false);
          setView('email-sent');
      }, 1000);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmNewPassword) {
          alert("Пароли не совпадают");
          return;
      }
      setIsLoading(true);
      setTimeout(() => {
          setIsLoading(false);
          alert("Пароль успешно изменен!");
          if (onResetComplete) onResetComplete();
          else setView('login');
      }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Background Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
            <img 
              src="https://i.imgur.com/f3UfhpM.png" 
              alt="VIBES Logo" 
              className="h-24 w-auto object-contain mx-auto mb-4 drop-shadow-md filter dark:invert dark:brightness-200"
            />
            <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                {view === 'login' && 'Вход в VIBES'}
                {view === 'forgot' && 'Восстановление'}
                {view === 'email-sent' && 'Проверьте почту'}
                {view === 'reset' && 'Новый пароль'}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                {view === 'login' && 'Платформа вайб-кодинга'}
                {view === 'forgot' && 'Введите email для сброса пароля'}
                {view === 'email-sent' && `Мы отправили письмо на ${email}`}
                {view === 'reset' && 'Придумайте надежный пароль'}
            </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5 shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden relative">
           <AnimatePresence mode="wait">
               
               {/* LOGIN FORM */}
               {view === 'login' && (
                   <motion.form 
                        key="login"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onSubmit={handleSubmit} 
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                <input 
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Пароль</label>
                                    <button type="button" onClick={() => setView('forgot')} className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline">
                                        Забыл пароль?
                                    </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                                    placeholder="••••••••"
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

                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" id="remember" className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500" />
                            <label htmlFor="remember" className="text-sm text-zinc-500 dark:text-zinc-400 cursor-pointer">Запомнить меня</label>
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100 shadow-lg"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Войти</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                   </motion.form>
               )}

               {/* FORGOT PASSWORD FORM */}
               {view === 'forgot' && (
                   <motion.form 
                        key="forgot"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onSubmit={handleForgotSubmit}
                        className="space-y-4"
                    >
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-600 dark:text-violet-400">
                                <RefreshCcw size={32} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
                            <input 
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                                placeholder="name@example.com"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-colors disabled:opacity-70 shadow-lg shadow-violet-500/20"
                        >
                            {isLoading ? 'Отправка...' : 'Отправить ссылку'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setView('login')} 
                            className="w-full py-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-sm font-bold flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={16} /> Назад ко входу
                        </button>
                   </motion.form>
               )}

               {/* EMAIL SENT STATE */}
               {view === 'email-sent' && (
                   <motion.div 
                        key="sent"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-center"
                    >
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 ring-4 ring-emerald-50 dark:ring-emerald-500/5">
                            <CheckCircle2 size={32} />
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 leading-relaxed">
                            Если аккаунт с email <strong>{email}</strong> существует, мы отправили туда инструкцию по сбросу пароля.
                        </p>
                        
                        {/* DEMO ONLY BUTTON */}
                        <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600">
                            <p className="text-xs text-zinc-500 mb-2">ДЕМО: Симуляция клика по ссылке из письма</p>
                            <button 
                                onClick={onSimulateResetLink}
                                className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg"
                            >
                                Открыть Reset Password
                            </button>
                        </div>

                        <button 
                            type="button" 
                            onClick={() => setView('login')} 
                            className="text-violet-600 dark:text-violet-400 font-bold hover:underline"
                        >
                            Вернуться ко входу
                        </button>
                   </motion.div>
               )}

               {/* RESET PASSWORD FORM */}
               {view === 'reset' && (
                   <motion.form 
                        key="reset"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onSubmit={handleResetSubmit}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Новый пароль</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                <input 
                                    type={showNewPassword ? "text" : "password"}
                                    required
                                    minLength={8}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                                    placeholder="Минимум 8 символов"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                >
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Повторите пароль</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                <input 
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className={`w-full pl-11 pr-12 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border transition-all focus:outline-none focus:ring-2 ${
                                        confirmNewPassword && newPassword !== confirmNewPassword 
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                                        : 'border-zinc-200 dark:border-white/10 focus:border-violet-500 focus:ring-violet-500/20'
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
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 shadow-lg"
                        >
                             {isLoading ? 'Сохранение...' : 'Сбросить пароль'}
                        </button>
                   </motion.form>
               )}

           </AnimatePresence>
        </div>

        {view === 'login' && (
            <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Нет аккаунта? Доступ выдаётся после покупки курса.<br/>
                <a href="#" className="text-violet-600 dark:text-violet-400 font-bold hover:underline">Узнать о курсе VIBES</a>
            </div>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
