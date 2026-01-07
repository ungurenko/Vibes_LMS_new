
import React, { useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Play,
  Palette,
  Terminal,
  Book, 
  Bot,
  Sparkles,
  Target
} from 'lucide-react';
import { TabId } from '../types';
import { DASHBOARD_STAGES } from '../data';
import { motion } from 'framer-motion';

interface HomeProps {
  onNavigate: (tab: TabId) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [activeStageId, setActiveStageId] = useState<number>(1);
  const [completedTasks, setCompletedTasks] = useState<string[]>(['t1-1', 't1-2']);

  const activeStage = DASHBOARD_STAGES.find(s => s.id === activeStageId) || DASHBOARD_STAGES[0];

  const handleTaskToggle = (taskId: string) => {
    setCompletedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Calculate Progress
  const totalTasks = activeStage.tasks.length;
  const completedCount = activeStage.tasks.filter(t => completedTasks.includes(t.id)).length;

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    show: { 
      y: 0, 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 20 } 
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-10 pb-32"
    >
      {/* --- BENTO GRID LAYOUT --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* 1. HERO CARD (Focus Mode) - Spans 2 cols, 2 rows */}
        <motion.div 
          variants={cardVariants}
          className="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-[2.5rem] bg-zinc-900 dark:bg-white text-white dark:text-black p-8 md:p-10 flex flex-col justify-between group shadow-2xl shadow-zinc-200/50 dark:shadow-none ring-1 ring-white/10 dark:ring-black/5"
        >
           {/* Animated Background */}
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
           <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-600 opacity-80 blur-[100px] animate-blob group-hover:scale-110 transition-transform duration-[2s]" />
           <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/20 rounded-full blur-3xl" />

           <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                 <div className="bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                    Текущий фокус
                 </div>
                 <div className="text-white/80 font-mono text-sm tracking-wider">WEEK 01 // BASICS</div>
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold leading-[1.1] mb-4 tracking-tight drop-shadow-md">
                 Основы <br/> Веб-дизайна
              </h2>
              <p className="text-white/80 text-lg max-w-sm leading-relaxed font-light">
                 Разбираем HTTP, DNS и как браузер отрисовывает страницы. Фундамент вайб-кодинга.
              </p>
           </div>

           <div className="relative z-10 mt-8 flex items-center gap-6">
              <button 
                onClick={() => onNavigate('lessons')}
                className="pl-6 pr-2 py-2 bg-white dark:bg-black text-black dark:text-white rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl group/btn ring-2 ring-white/50 dark:ring-black/20"
              >
                 <span>Продолжить</span>
                 <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover/btn:bg-violet-500 group-hover/btn:text-white transition-colors">
                    <Play size={20} className="ml-1" fill="currentColor" />
                 </div>
              </button>
              <div className="hidden sm:flex flex-col ml-2">
                 <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5">Прогресс этапа</span>
                 <div className="w-32 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                    <div className="h-full bg-white w-[35%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                 </div>
              </div>
           </div>
        </motion.div>

        {/* 2. TASK STACK - Spans 1 col, 2 rows */}
        <motion.div variants={cardVariants} className="md:col-span-1 md:row-span-2 bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-200 dark:border-white/5 flex flex-col relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                 <Target className="text-red-500" /> Задачи
              </h3>
              <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-500 border border-zinc-200 dark:border-white/5">
                 {completedCount}/{totalTasks}
              </span>
           </div>

           <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-none mask-linear">
              {activeStage.tasks.map((task) => {
                 const isDone = completedTasks.includes(task.id);
                 return (
                    <div 
                       key={task.id}
                       onClick={() => handleTaskToggle(task.id)}
                       className={`group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                          isDone 
                          ? 'bg-zinc-50 dark:bg-zinc-800/30 border-transparent opacity-60 order-last' 
                          : 'bg-white dark:bg-zinc-800/50 border-zinc-100 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5'
                       }`}
                    >
                       <div className="flex items-start gap-3 relative z-10">
                          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
                             isDone 
                             ? 'bg-violet-600 border-violet-600 text-white' 
                             : 'border-zinc-300 dark:border-zinc-600 group-hover:border-violet-400'
                          }`}>
                             {isDone && <CheckCircle2 size={12} />}
                          </div>
                          <span className={`text-sm font-medium leading-tight transition-colors ${
                             isDone ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-200'
                          }`}>
                             {task.title}
                          </span>
                       </div>
                    </div>
                 )
              })}
              
              {/* Empty State / Celebration */}
              {completedCount === totalTasks && (
                 <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-500 ring-4 ring-emerald-50 dark:ring-emerald-500/5">
                       <Sparkles size={24} />
                    </div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">Все задачи выполнены!</p>
                    <p className="text-xs text-zinc-500">Отдохни или переходи к следующему этапу.</p>
                 </motion.div>
              )}
           </div>
        </motion.div>

        {/* 3. QUICK ACTIONS WIDGET - Spans 1 col, 1 row */}
        <motion.div variants={cardVariants} className="md:col-span-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] p-6 border border-zinc-200 dark:border-white/5 flex flex-col justify-center">
           <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 px-1">Инструменты</h3>
           <div className="grid grid-cols-2 gap-3">
              {[
                 { id: 'styles', icon: Palette, color: 'text-fuchsia-500', label: 'Стили', bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10' },
                 { id: 'prompts', icon: Terminal, color: 'text-emerald-500', label: 'Промпты', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                 { id: 'glossary', icon: Book, color: 'text-amber-500', label: 'Термины', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                 { id: 'assistant', icon: Bot, color: 'text-cyan-500', label: 'AI Чат', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
              ].map(item => (
                 <button 
                    key={item.id}
                    onClick={() => onNavigate(item.id as TabId)}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 group border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
                 >
                    <div className={`p-2 rounded-xl mb-2 ${item.bg} transition-colors group-hover:scale-110 duration-300`}>
                        <item.icon size={20} className={item.color} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{item.label}</span>
                 </button>
              ))}
           </div>
        </motion.div>

        {/* 4. EVENT WIDGET - Spans 1 col, 1 row */}
        <motion.div variants={cardVariants} className="md:col-span-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-6 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/30 transition-colors" />
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl translate-y-1/3 -translate-x-1/3" />
           
           <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-auto">
                 <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                    <Calendar size={20} />
                 </div>
                 <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold uppercase tracking-wider shadow-sm">
                    Завтра
                 </div>
              </div>
              
              <div className="mt-6">
                 <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-display font-bold">19:00</span>
                    <span className="text-emerald-100 font-medium text-sm">МСК</span>
                 </div>
                 
                 <div className="h-px w-full bg-gradient-to-r from-white/40 to-transparent mb-4" />

                 <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-1.5 opacity-90 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Созвон
                 </div>
                 <h3 className="text-lg font-bold leading-tight text-white/95">Разбор домашек: Лендинг</h3>
              </div>
           </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Home;
