import React, { useState, useEffect } from 'react';
import {
   Calendar,
   Check,
   ArrowRight,
   Sparkles,
   ChevronDown,
   ChevronUp,
   BookOpen,
   Wrench,
   MessageSquareText,
   BookA
} from 'lucide-react';
import { TabId } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeProps {
   onNavigate: (tab: TabId) => void;
   userName?: string;

}

// Animation Variants
const containerVariants = {
   hidden: { opacity: 0 },
   show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
   }
};

const cardVariants = {
   hidden: { y: 24, opacity: 0, scale: 0.97 },
   show: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
   }
};

const taskVariants = {
   hidden: { opacity: 0, x: -8 },
   show: { opacity: 1, x: 0, transition: { duration: 0.2 } },
   exit: { opacity: 0, x: 8, transition: { duration: 0.15 } }
};

interface UpcomingCall {
   id: string;
   topic: string;
   time: string;
   relativeDate: string;
}

interface StageTask {
   id: string;
   title: string;
}

interface DashboardStage {
   id: string;
   title: string;
   subtitle: string;
   description?: string;
   weekLabel?: string;
   isActive?: boolean;
   tasks: StageTask[];
}

const QUICK_ACTIONS = [
   { label: 'Уроки', tab: 'lessons' as TabId, icon: BookOpen, gradient: 'from-violet-500/30 to-indigo-500/30', iconColor: 'text-violet-600 dark:text-violet-400' },
   { label: 'Инструменты', tab: 'tools' as TabId, icon: Wrench, gradient: 'from-fuchsia-500/30 to-pink-500/30', iconColor: 'text-fuchsia-600 dark:text-fuchsia-400' },
   { label: 'Промпты', tab: 'prompts' as TabId, icon: MessageSquareText, gradient: 'from-indigo-500/30 to-blue-500/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
   { label: 'Словарик', tab: 'glossary' as TabId, icon: BookA, gradient: 'from-emerald-500/30 to-teal-500/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
];

const Home: React.FC<HomeProps> = ({ onNavigate, userName = 'Студент' }) => {
   const [stages, setStages] = useState<DashboardStage[]>([]);

   const [activeStageId, setActiveStageId] = useState<string | null>(null);
   const [completedTasks, setCompletedTasks] = useState<string[]>([]);
   const [upcomingCall, setUpcomingCall] = useState<UpcomingCall | null>(null);
   const [isLoadingStages, setIsLoadingStages] = useState(true);

   const activeStage = stages.find(s => s.id === activeStageId) || (stages.length > 0 ? stages[0] : null);
   const activeStageIndex = stages.findIndex(s => s.id === activeStageId);

   // Compact mode for tasks
   const [isTasksExpanded, setIsTasksExpanded] = useState(false);
   const MAX_VISIBLE_TASKS = 4;
   const tasks = activeStage?.tasks || [];
   const isCompact = tasks.length > MAX_VISIBLE_TASKS;
   const visibleTasks = isTasksExpanded ? tasks : tasks.slice(0, MAX_VISIBLE_TASKS);
   const hiddenCount = tasks.length - MAX_VISIBLE_TASKS;

   // Load stages
   useEffect(() => {
      const fetchStages = async () => {
         try {
            setIsLoadingStages(true);
            const token = localStorage.getItem('vibes_token');
            const response = await fetch('/api/stages', {
               headers: {
                  'Authorization': `Bearer ${token}`
               }
            });

            if (!response.ok) return;

            const result = await response.json();
            if (result.success && result.data) {
               setStages(result.data);

               const activeStage = result.data.find((s: any) => s.isActive);
               const currentStage = result.data.find((s: any) => s.status === 'current');
               setActiveStageId(activeStage?.id || currentStage?.id || result.data[0]?.id);

               const completedTaskIds = result.data
                  .flatMap((stage: any) => stage.tasks)
                  .filter((task: any) => task.completed)
                  .map((task: any) => task.id);
               setCompletedTasks(completedTaskIds);
            }
         } catch (error) {
            console.error('Error fetching stages:', error);
         } finally {
            setIsLoadingStages(false);
         }
      };

      fetchStages();
   }, []);

   // Load upcoming call
   useEffect(() => {
      const fetchUpcomingCall = async () => {
         try {
            const token = localStorage.getItem('vibes_token');
            const response = await fetch('/api/calls/upcoming', {
               headers: {
                  'Authorization': `Bearer ${token}`
               }
            });

            if (!response.ok) return;

            const result = await response.json();
            if (result.success && result.data) {
               setUpcomingCall(result.data);
            }
         } catch (error) {
            console.error('Error fetching upcoming call:', error);
         }
      };

      fetchUpcomingCall();
   }, []);

   const handleTaskToggle = async (taskId: string) => {
      const isCompleted = completedTasks.includes(taskId);

      try {
         const token = localStorage.getItem('vibes_token');

         if (isCompleted) {
            await fetch('/api/stages?action=complete-task', {
               method: 'DELETE',
               headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
               },
               body: JSON.stringify({ taskId })
            });
            setCompletedTasks(prev => prev.filter(id => id !== taskId));
         } else {
            await fetch('/api/stages?action=complete-task', {
               method: 'POST',
               headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
               },
               body: JSON.stringify({ taskId })
            });
            setCompletedTasks(prev => [...prev, taskId]);
         }
      } catch (error) {
         console.error('Error toggling task:', error);
      }
   };

   // Calculate Progress
   const totalTasks = activeStage?.tasks.length || 0;
   const completedCount = activeStage?.tasks.filter(t => completedTasks.includes(t.id)).length || 0;
   const stageProgress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

   // Overall course progress
   const totalStages = stages.length;
   const currentStageNumber = activeStageIndex >= 0 ? activeStageIndex + 1 : 1;
   const overallProgress = totalStages > 0 ? Math.round((currentStageNumber / totalStages) * 100) : 0;

   // Check if call is today
   const isCallToday = upcomingCall?.relativeDate?.toLowerCase().includes('сегодня');

   // Confetti on 100% completion
   useEffect(() => {
      if (completedCount === totalTasks && totalTasks > 0) {
         // @ts-ignore
         if (typeof confetti === 'function') {
            // @ts-ignore
            confetti({
               particleCount: 120,
               spread: 80,
               origin: { y: 0.5 },
               colors: ['#8b5cf6', '#d946ef', '#a78bfa', '#f0abfc', '#ffffff']
            });
         }
      }
   }, [completedCount, totalTasks]);

   // Sort tasks: active on top, completed on bottom
   const sortedTasks = [...visibleTasks].sort((a, b) => {
      const aCompleted = completedTasks.includes(a.id);
      const bCompleted = completedTasks.includes(b.id);
      if (aCompleted === bCompleted) return 0;
      return aCompleted ? 1 : -1;
   });

   return (
      <motion.div
         variants={containerVariants}
         initial="hidden"
         animate="show"
         className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-24"
      >
         {/* --- BENTO GRID --- */}
         <div className="grid grid-cols-12 gap-4">

            {/* ===== HERO CARD (col-span-12) ===== */}
            <motion.div
               variants={cardVariants}
               className="col-span-12 relative"
            >
               {/* Glow behind hero card */}
               <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/[0.08] to-indigo-500/10 rounded-[2rem] blur-2xl opacity-60 dark:opacity-40 pointer-events-none" />
               <div className="relative p-[1px] rounded-3xl bg-gradient-to-r from-violet-500/60 via-indigo-500/50 to-fuchsia-500/60 dark:from-violet-400/60 dark:via-indigo-400/50 dark:to-fuchsia-400/60">
                  <div className="bg-white/70 dark:bg-[#0a0a0f]/90 backdrop-blur-2xl rounded-3xl p-6 md:p-8 border border-black/[0.03] dark:border-white/[0.05] shadow-[0_4px_8px_rgba(0,0,0,0.03),0_24px_48px_rgba(0,0,0,0.06)]">
                     <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        {/* Left side */}
                        <div className="flex-1 min-w-0">
                           <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
                              <span className="text-stone-900 dark:text-stone-50">Привет, </span>
                              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{userName}</span>
                              <span className="text-stone-900 dark:text-stone-50">!</span>
                           </h1>

                           <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-lg">
                                 {activeStage?.weekLabel || 'WEEK 01'}
                              </span>
                              <span className="text-stone-400 dark:text-stone-500 text-sm">
                                 Этап {currentStageNumber} из {totalStages || '—'}
                              </span>
                           </div>

                           <h2 className="font-display text-lg md:text-xl font-semibold text-stone-800 dark:text-stone-200 mb-1 leading-tight">
                              {activeStage?.title || 'Загрузка...'}
                           </h2>
                           {activeStage?.description && (
                              <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed mb-5 max-w-xl">
                                 {activeStage.description}
                              </p>
                           )}

                           <button
                              onClick={() => onNavigate('lessons')}
                              className="inline-flex items-center gap-2 py-3 px-6 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl font-semibold text-[15px] transition-all duration-200 group/btn hover:bg-stone-800 dark:hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
                           >
                              <span>Продолжить обучение</span>
                              <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                           </button>
                        </div>

                        {/* Right side — progress display */}
                        <div className="flex flex-col items-center md:items-end gap-4 shrink-0">
                           {/* Large percentage */}
                           <div className="relative flex items-center justify-center">
                              {/* Glow behind ring at high progress */}
                              {overallProgress >= 80 && (
                                 <div className="absolute inset-[-8px] rounded-full blur-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 animate-pulse-glow" />
                              )}
                              <svg width="130" height="130" viewBox="0 0 130 130" className="rotate-[-90deg]">
                                 <circle cx="65" cy="65" r="56" fill="none"
                                    stroke="currentColor" strokeWidth="5"
                                    className="text-stone-200/60 dark:text-white/10" />
                                 <motion.circle cx="65" cy="65" r="56" fill="none"
                                    strokeWidth="5" strokeLinecap="round"
                                    stroke="url(#progressGradient)"
                                    initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - overallProgress / 100) }}
                                    transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    strokeDasharray={`${2 * Math.PI * 56}`} />
                                 <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                       <stop offset="0%" stopColor="#8b5cf6" />
                                       <stop offset="100%" stopColor="#d946ef" />
                                    </linearGradient>
                                 </defs>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                    className="text-5xl md:text-6xl font-extrabold font-display bg-gradient-to-br from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                                    {overallProgress}%
                                 </motion.div>
                              </div>
                           </div>

                           {/* Mini stats row */}
                           <div className="flex gap-4 md:gap-6">
                              <div className="text-center">
                                 <div className="font-mono text-base font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                                    {currentStageNumber}/{totalStages || '—'}
                                 </div>
                                 <div className="text-xs text-stone-500">Этап</div>
                              </div>
                              <div className="text-center">
                                 <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {completedCount}/{totalTasks}
                                 </div>
                                 <div className="text-xs text-stone-500">Задачи</div>
                              </div>
                              <div className="text-center">
                                 <div className="font-mono text-base font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                                    {stageProgress}%
                                 </div>
                                 <div className="text-xs text-stone-500">Прогресс</div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* ===== UPCOMING CALL CARD (col-span-12) ===== */}
            {upcomingCall && (
               <motion.div variants={cardVariants} className="col-span-12">
                  <div className="relative bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.08] rounded-3xl shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_0_30px_rgba(139,92,246,0.06)] p-4 md:p-5">
                     <div className="flex items-center gap-4">
                        {/* Calendar icon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/15 dark:to-fuchsia-500/15 rounded-2xl flex items-center justify-center flex-shrink-0">
                           <Calendar size={22} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        {/* Text: label + topic */}
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-0.5">
                              {isCallToday && (
                                 <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
                                 </span>
                              )}
                              <span className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                                 Следующий созвон
                              </span>
                           </div>
                           <p className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">
                              {upcomingCall.topic}
                           </p>
                        </div>
                        {/* Date/time on the right */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                           <div className="text-right">
                              <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                 {upcomingCall.relativeDate}
                              </div>
                              <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                                 {upcomingCall.time} МСК
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}

            {/* ===== TASKS CARD (lg:col-span-7 / 6 on celebration) ===== */}
            <motion.div
               variants={cardVariants}
               className={`col-span-12 ${completedCount === totalTasks && totalTasks > 0 ? 'lg:col-span-6' : 'lg:col-span-7'}`}
            >
               <div className="relative bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.08] rounded-3xl shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_0_30px_rgba(139,92,246,0.06)] p-5 md:p-6 flex flex-col h-full">
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                     style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(139,92,246,0.03) 0%, transparent 50%)' }} />
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="font-display text-xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-3">
                        <motion.span
                           animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                           transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                           className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                        />
                        Задачи
                     </h3>
                     <div className="flex items-center gap-1.5 bg-stone-100/80 dark:bg-white/[0.06] px-3 py-1.5 rounded-xl">
                        <span className="text-sm font-bold text-violet-600 dark:text-violet-400 tabular-nums">{completedCount}</span>
                        <span className="text-stone-300 dark:text-stone-600">/</span>
                        <span className="text-sm font-medium text-stone-400 dark:text-stone-500 tabular-nums">{totalTasks}</span>
                     </div>
                  </div>

                  {/* Celebration State or task list */}
                  {completedCount === totalTasks && totalTasks > 0 ? (
                     <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-center py-8"
                     >
                        <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/15 dark:to-fuchsia-500/15 rounded-3xl flex items-center justify-center mb-5 shadow-lg shadow-violet-200 dark:shadow-none animate-pulse-glow">
                           <Sparkles size={36} className="text-violet-500" />
                        </div>
                        <p className="font-display text-xl font-bold text-stone-900 dark:text-stone-50 mb-2">
                           Всё готово!
                        </p>
                        <p className="text-sm font-medium text-violet-600 dark:text-violet-400 mt-1">
                           {completedCount} из {totalTasks} задач выполнено
                        </p>
                        <p className="text-stone-500 dark:text-stone-400 text-sm max-w-[200px] mt-2">
                           Отдохни или переходи к следующему этапу
                        </p>
                     </motion.div>
                  ) : (
                     <div className="flex-1 flex flex-col">
                        <div className="flex-1 space-y-2 overflow-y-auto scrollbar-none">
                           <AnimatePresence mode="popLayout">
                              {sortedTasks.map((task) => {
                                 const isDone = completedTasks.includes(task.id);
                                 return (
                                    <motion.div
                                       key={task.id}
                                       layout
                                       variants={taskVariants}
                                       initial="hidden"
                                       animate="show"
                                       exit="exit"
                                       onClick={() => handleTaskToggle(task.id)}
                                       className={`group rounded-2xl border cursor-pointer p-3 transition-all duration-200 ${
                                          isDone
                                             ? 'bg-stone-50/50 dark:bg-white/[0.02] border-stone-100 dark:border-white/[0.04]'
                                             : 'bg-white/50 dark:bg-white/[0.03] border-stone-200/60 dark:border-white/[0.06] hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-sm'
                                       }`}
                                    >
                                       <div className="flex items-start gap-3.5">
                                          <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                             isDone
                                                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 border-transparent shadow-[0_0_8px_rgba(139,92,246,0.3)]'
                                                : 'border-stone-300 dark:border-stone-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:shadow-sm'
                                          }`}>
                                             <AnimatePresence>
                                                {isDone && (
                                                   <motion.div
                                                      initial={{ scale: 0 }}
                                                      animate={{ scale: 1 }}
                                                      exit={{ scale: 0 }}
                                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                   >
                                                      <Check size={12} className="text-white" strokeWidth={3} />
                                                   </motion.div>
                                                )}
                                             </AnimatePresence>
                                          </div>
                                          <span className={`text-[15px] leading-relaxed transition-colors ${
                                             isDone
                                                ? 'text-stone-400 dark:text-stone-500 line-through decoration-stone-300 dark:decoration-stone-600'
                                                : 'text-stone-700 dark:text-stone-200'
                                          }`}>
                                             {task.title}
                                          </span>
                                       </div>
                                    </motion.div>
                                 );
                              })}
                           </AnimatePresence>
                        </div>

                        {/* Expand/Collapse Button */}
                        {isCompact && hiddenCount > 0 && (
                           <button
                              onClick={() => setIsTasksExpanded(!isTasksExpanded)}
                              className="mt-4 w-full py-3 rounded-2xl bg-stone-100/60 dark:bg-white/[0.04] hover:bg-stone-200/60 dark:hover:bg-white/[0.06] transition-colors text-sm font-semibold text-stone-600 dark:text-stone-300 flex items-center justify-center gap-2"
                           >
                              {isTasksExpanded ? (
                                 <>
                                    <ChevronUp size={16} />
                                    Свернуть
                                 </>
                              ) : (
                                 <>
                                    <ChevronDown size={16} />
                                    Ещё {hiddenCount} {hiddenCount === 1 ? 'задача' : hiddenCount < 5 ? 'задачи' : 'задач'}
                                 </>
                              )}
                           </button>
                        )}
                     </div>
                  )}
               </div>
            </motion.div>

            {/* ===== QUICK ACTIONS CARD (lg:col-span-5 / 6 on celebration) ===== */}
            <motion.div
               variants={cardVariants}
               className={`col-span-12 ${completedCount === totalTasks && totalTasks > 0 ? 'lg:col-span-6' : 'lg:col-span-5'}`}
            >
               <div className="relative bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.08] rounded-3xl shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_0_30px_rgba(139,92,246,0.06)] p-5 md:p-6 flex flex-col h-full">
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                     style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(139,92,246,0.03) 0%, transparent 50%)' }} />
                  <h3 className="font-display text-xl font-bold text-stone-900 dark:text-stone-50 mb-4">
                     Быстрые действия
                  </h3>

                  <div className="space-y-2 flex-1">
                     {QUICK_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                           <button
                              key={action.tab}
                              onClick={() => onNavigate(action.tab)}
                              className="group flex items-center gap-3 w-full p-3 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all duration-200"
                           >
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center`}>
                                 <Icon size={18} className={action.iconColor} />
                              </div>
                              <span className="font-medium text-sm text-stone-700 dark:text-stone-200">{action.label}</span>
                              <ArrowRight size={16} className="ml-auto text-stone-400 group-hover:translate-x-1 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-all" />
                           </button>
                        );
                     })}
                  </div>

               </div>
            </motion.div>

         </div>
      </motion.div>
   );
};

export default Home;
