
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles, Layout, ShieldCheck, Heart, Book, MessageSquare, Briefcase } from 'lucide-react';
import { STYLES_DATA } from '../data';

interface OnboardingProps {
  userName: string;
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ userName, onComplete }) => {
  const [step, setStep] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const nextStep = () => setStep((prev) => prev + 1);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, scale: 1.05, transition: { duration: 0.3 } }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.5 } }
  };

  // ЭКРАН 1: ПРИВЕТСТВИЕ
  const Screen1 = () => (
    <div className="text-center max-w-lg mx-auto">
      <motion.div 
        initial={{ scale: 0 }} 
        animate={{ scale: 1 }} 
        className="w-24 h-24 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl"
      >
        👋
      </motion.div>
      <h2 className="text-4xl md:text-5xl font-display font-bold text-zinc-900 dark:text-white mb-6">
        Привет, {userName}!
      </h2>
      <p className="text-xl text-zinc-500 dark:text-zinc-400 mb-10 leading-relaxed">
        У тебя всё получится. Мы здесь не чтобы кодить сутками, а чтобы создавать крутые вещи в кайф.
      </p>
      <button onClick={nextStep} className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-3 mx-auto">
        <span>Погнали!</span>
        <ArrowRight size={20} />
      </button>
    </div>
  );

  // ЭКРАН 2: ТВОЙ ПУТЬ
  const Screen2 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 dark:text-white mb-8 text-center">
        Твой путь к результату
      </h2>
      <p className="text-center text-zinc-500 mb-8">Два готовых продукта за 4 недели.</p>
      <div className="space-y-6 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
        {[
          { title: 'База', desc: 'Поймешь, как работает веб и настроишь инструменты.', icon: '🛠️' },
          { title: 'Лендинг', desc: 'Сделаешь свой первый сайт и опубликуешь его.', icon: '🎨' },
          { title: 'Веб-сервис', desc: 'Создашь приложение, которое работает с ИИ.', icon: '⚡' },
          { title: 'Запуск', desc: 'Финальный проект и сертификат.', icon: '🚀' },
        ].map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex gap-6 relative"
          >
            <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 z-10 text-xl shadow-sm">
              {item.icon}
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-white/5 flex-1 shadow-sm">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-1">{item.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <button onClick={nextStep} className="px-8 py-4 bg-violet-600 text-white rounded-2xl font-bold text-lg hover:bg-violet-500 transition-colors">
          Понятно
        </button>
      </div>
    </div>
  );

  // ЭКРАН 3: ОБЗОР ПЛАТФОРМЫ
  const Screen3 = () => (
    <div className="max-w-5xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 dark:text-white mb-10">
        Всё необходимое в одном месте
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {[
            { icon: Layout, title: 'Уроки', text: 'Короткие видео без воды.', color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/20' },
            { icon: Sparkles, title: 'Библиотека стилей', text: 'Готовые дизайн-системы.', color: 'text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/20' },
            { icon: Book, title: 'Словарик', text: 'Термины простым языком.', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/20' },
            { icon: ShieldCheck, title: 'Ассистент', text: 'ИИ-ментор 24/7.', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
            { icon: MessageSquare, title: 'Чат группы', text: 'Поддержка и нетворкинг.', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
            { icon: Briefcase, title: 'Мои проекты', text: 'Твоё портфолио.', color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800' },
        ].map((card, idx) => (
            <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 text-left"
            >
                <div className={`w-12 h-12 ${card.bg} rounded-2xl flex items-center justify-center ${card.color} mb-4`}>
                    <card.icon size={24} />
                </div>
                <h3 className="font-bold text-lg mb-1">{card.title}</h3>
                <p className="text-sm text-zinc-500">{card.text}</p>
            </motion.div>
        ))}
      </div>
      <button onClick={nextStep} className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity">
        Супер, идем дальше
      </button>
    </div>
  );

  // ЭКРАН 4: ВЫБОР СТИЛЯ (Интерактив)
  const Screen4 = () => (
    <div className="max-w-5xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 dark:text-white mb-4">
        Что тебе визуально ближе?
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Выбери стиль для старта. Это легкое действие, чтобы начать.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {STYLES_DATA.slice(0, 4).map((style) => (
          <div 
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            className={`cursor-pointer group relative rounded-2xl overflow-hidden aspect-[3/4] transition-all duration-300 ${
              selectedStyle === style.id ? 'ring-4 ring-violet-500 scale-105' : 'hover:scale-105 opacity-80 hover:opacity-100'
            }`}
          >
            <img src={style.image} alt={style.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
              <span className="text-white font-bold text-sm">{style.name}</span>
            </div>
            {selectedStyle === style.id && (
              <div className="absolute top-3 right-3 bg-violet-500 text-white rounded-full p-1">
                <CheckCircle2 size={16} />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <button 
        onClick={nextStep}
        disabled={!selectedStyle} 
        className="px-8 py-4 bg-violet-600 text-white rounded-2xl font-bold text-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        Выбрал
      </button>
    </div>
  );

  // ЭКРАН 5: ФИНАЛ (АВТОР)
  const Screen5 = () => (
    <div className="text-center max-w-lg mx-auto">
      <div className="relative w-32 h-32 mx-auto mb-8">
         <img 
            src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop" 
            alt="Александр" 
            className="w-full h-full rounded-full object-cover border-4 border-white dark:border-zinc-800 shadow-xl"
         />
         <div className="absolute bottom-0 right-0 bg-white dark:bg-zinc-900 p-2 rounded-full shadow-md">
            <Heart size={20} className="text-red-500 fill-current" />
         </div>
      </div>
      
      <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 dark:text-white mb-4">
        Пару слов от меня
      </h2>
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 mb-8 text-left relative">
         <div className="absolute -top-3 left-8 w-6 h-6 bg-white dark:bg-zinc-900 border-t border-l border-zinc-200 dark:border-white/5 transform rotate-45"></div>
         <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
           «Я сам не "профессиональный программист" с 10-летним стажем. Я — <strong>вайб-кодер</strong>. 
           Я использую нейросети, чтобы воплощать идеи быстро и красиво. 
           Если что-то не получается — пиши в чат или спрашивай Ассистента. 
           Я на связи и поддержу тебя.»
         </p>
         <p className="mt-4 font-bold text-right text-zinc-900 dark:text-white">— Александр</p>
      </div>

      <button onClick={onComplete} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl">
        Начать обучение
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative z-10 w-full"
      >
        <motion.div variants={contentVariants} key={step}>
          {step === 0 && <Screen1 />}
          {step === 1 && <Screen2 />}
          {step === 2 && <Screen3 />}
          {step === 3 && <Screen4 />}
          {step === 4 && <Screen5 />}
        </motion.div>
      </motion.div>

      {/* Progress Dots */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-violet-600' : 'w-2 bg-zinc-300 dark:bg-zinc-700'
            }`} 
          />
        ))}
      </div>
    </div>
  );
};

export default Onboarding;
