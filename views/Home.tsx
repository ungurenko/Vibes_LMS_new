import React, { useState, useEffect } from 'react';
import {
   Calendar,
   Check,
   ArrowRight,
   Sparkles,
   ChevronDown,
   ChevronUp,
   Clock,
   X
} from 'lucide-react';
import { TabId } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeProps {
   onNavigate: (tab: TabId) => void;
   userName?: string;
   userNiche?: string;
}

// Animation Variants (вынесены за компонент для предотвращения пересоздания)
const containerVariants = {
   hidden: { opacity: 0 },
   show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
   }
};

const cardVariants = {
   hidden: { y: 20, opacity: 0 },
   show: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
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

const Home: React.FC<HomeProps> = ({ onNavigate, userName = 'Студент', userNiche }) => {
   const [stages, setStages] = useState<DashboardStage[]>([]);
   const [isNicheBannerDismissed, setIsNicheBannerDismissed] = useState(false);
   const [activeStageId, setActiveStageId] = useState<string | null>(null);
   const [completedTasks, setCompletedTasks] = useState<string[]>([]);
   const [upcomingCall, setUpcomingCall] = useState<UpcomingCall | null>(null);
   const [isLoadingStages, setIsLoadingStages] = useState(true);

   const activeStage = stages.find(s => s.id === activeStageId) || (stages.length > 0 ? stages[0] : null);
   const activeStageIndex = stages.findIndex(s => s.id === activeStageId);

   // Компактный режим для задач
   const [isTasksExpanded, setIsTasksExpanded] = useState(false);
   const MAX_VISIBLE_TASKS = 4;
   const tasks = activeStage?.tasks || [];
   const isCompact = tasks.length > MAX_VISIBLE_TASKS;
   const visibleTasks = isTasksExpanded ? tasks : tasks.slice(0, MAX_VISIBLE_TASKS);
   const hiddenCount = tasks.length - MAX_VISIBLE_TASKS;

   // Загрузка стадий дашборда
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

   // Загрузка ближайшего созвона
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

   // Сортировка задач: активные сверху, выполненные снизу
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
         className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-24"
      >
         {/* --- HEADER --- */}
         <motion.header variants={cardVariants} className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
               <div>
                  <h1 className="font-display text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
                     Привет, {userName}!
                  </h1>
                  <p className="text-stone-500 dark:text-stone-400 text-base">
                     Этап {currentStageNumber} из {totalStages || '—'}
                  </p>
               </div>

               {/* Call Badge (если сегодня) */}
               {isCallToday && upcomingCall && (
                  <motion.div
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-500/10 dark:to-fuchsia-500/10 border border-violet-200/60 dark:border-violet-500/20 rounded-2xl shadow-sm shadow-violet-100 dark:shadow-none"
                  >
                     <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                        <Clock size={16} className="text-violet-600 dark:text-violet-400" />
                     </div>
                     <div>
                        <p className="text-xs font-medium text-violet-600/70 dark:text-violet-400/70 uppercase tracking-wide">Сегодня</p>
                        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                           Созвон в {upcomingCall.time}
                        </p>
                     </div>
                  </motion.div>
               )}
            </div>

            {/* Overall Progress Bar */}
            <div className="flex items-center gap-4">
               <div className="flex-1 h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <motion.div
                     initial={{ width: 0 }}
                     animate={{ width: `${overallProgress}%` }}
                     transition={{ duration: 0.6, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                     className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                  />
               </div>
               <span className="text-sm font-bold text-stone-600 dark:text-stone-300 tabular-nums min-w-[3ch]">
                  {overallProgress}%
               </span>
            </div>
         </motion.header>

         {/* Niche Banner */}
         {!userNiche && !isNicheBannerDismissed && (
            <motion.div
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.3 }}
               className="relative bg-gradient-to-r from-amber-50 via-violet-50 to-fuchsia-50 dark:from-amber-950/30 dark:via-violet-950/30 dark:to-fuchsia-950/30 rounded-2xl p-4 border border-amber-200/60 dark:border-violet-800/40 shadow-sm"
            >
               <button
                  onClick={() => setIsNicheBannerDismissed(true)}
                  className="absolute top-3 right-3 p-1 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition-colors"
               >
                  <X size={16} />
               </button>
               <div className="flex items-center gap-3 pr-6">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-violet-500 flex items-center justify-center shadow-sm">
                     <Sparkles size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                        Укажи свою нишу — AI-ассистент будет давать персональные советы
                     </p>
                  </div>
                  <button
                     onClick={() => onNavigate('profile')}
                     className="shrink-0 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 bg-white/80 dark:bg-white/10 px-3.5 py-1.5 rounded-lg border border-violet-200 dark:border-violet-700/50 hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
                  >
                     Заполнить
                  </button>
               </div>
            </motion.div>
         )}

         {/* --- MAIN GRID --- */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* 1. CURRENT STAGE CARD */}
            <motion.div
               variants={cardVariants}
               className="group relative bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md hover:shadow-stone-200/50 dark:hover:shadow-none transition-shadow duration-300 flex flex-col overflow-hidden"
            >
               {/* Subtle gradient overlay */}
               <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent dark:from-violet-500/[0.03] pointer-events-none" />

               {/* Week Label */}
               <div className="relative flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-lg">
                     {activeStage?.weekLabel || 'WEEK 01'}
                  </span>
                  <span className="text-stone-300 dark:text-stone-700">·</span>
                  <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
                     {activeStage?.subtitle || 'Загрузка...'}
                  </span>
               </div>

               {/* Stage Title */}
               <h2 className="relative font-display text-2xl md:text-[1.75rem] font-bold text-stone-900 dark:text-stone-50 mb-2 leading-tight tracking-tight">
                  {activeStage?.title || 'Загрузка...'}
               </h2>

               {/* Description */}
               {activeStage?.description && (
                  <p className="relative text-stone-500 dark:text-stone-400 text-[15px] leading-relaxed mb-4 flex-1">
                     {activeStage.description}
                  </p>
               )}

               {/* Stage Progress */}
               <div className="relative mt-auto">
                  <div className="flex items-center justify-between mb-2.5">
                     <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide">
                        Прогресс
                     </span>
                     <span className="text-sm font-bold text-stone-700 dark:text-stone-200 tabular-nums">
                        {stageProgress}%
                     </span>
                  </div>
                  <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden mb-4">
                     <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stageProgress}%` }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                     />
                  </div>

                  {/* CTA Button */}
                  <button
                     onClick={() => onNavigate('lessons')}
                     className="w-full py-3 px-5 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl font-semibold text-[15px] transition-all duration-200 flex items-center justify-center gap-2 group/btn hover:bg-stone-800 dark:hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
                  >
                     <span>Продолжить обучение</span>
                     <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
               </div>
            </motion.div>

            {/* 2. TASKS CARD */}
            <motion.div
               variants={cardVariants}
               className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col"
            >
               {/* Header */}
               <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-3">
                     <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                     Задачи
                  </h3>
                  <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-xl">
                     <span className="text-sm font-bold text-violet-600 dark:text-violet-400 tabular-nums">{completedCount}</span>
                     <span className="text-stone-300 dark:text-stone-600">/</span>
                     <span className="text-sm font-medium text-stone-400 dark:text-stone-500 tabular-nums">{totalTasks}</span>
                  </div>
               </div>

               {/* Celebration State или список задач */}
               {completedCount === totalTasks && totalTasks > 0 ? (
                  <motion.div
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="flex-1 flex flex-col items-center justify-center text-center py-8"
                  >
                     <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-3xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-100 dark:shadow-none">
                        <Sparkles size={32} className="text-emerald-500" />
                     </div>
                     <p className="font-display text-xl font-bold text-stone-900 dark:text-stone-50 mb-2">
                        Всё готово!
                     </p>
                     <p className="text-stone-500 dark:text-stone-400 text-sm max-w-[200px]">
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
                                          ? 'bg-stone-50 dark:bg-stone-800/30 border-stone-100 dark:border-stone-800'
                                          : 'bg-white dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-sm'
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
                           className="mt-4 w-full py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm font-semibold text-stone-600 dark:text-stone-300 flex items-center justify-center gap-2"
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
            </motion.div>

            {/* 3. UPCOMING CALL (если НЕ сегодня — показываем карточку) */}
            {upcomingCall && !isCallToday && (
               <motion.div
                  variants={cardVariants}
                  className="md:col-span-2 bg-gradient-to-r from-white to-stone-50/50 dark:from-stone-900 dark:to-stone-900/80 rounded-2xl p-4 border border-stone-200/80 dark:border-stone-800 shadow-sm flex items-center gap-4"
               >
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/10 dark:to-fuchsia-500/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-100 dark:shadow-none">
                     <Calendar size={24} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                           {upcomingCall.relativeDate}
                        </span>
                        <span className="text-stone-300 dark:text-stone-700">·</span>
                        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                           {upcomingCall.time} МСК
                        </span>
                     </div>
                     <p className="text-[15px] text-stone-500 dark:text-stone-400 truncate">
                        {upcomingCall.topic}
                     </p>
                  </div>
               </motion.div>
            )}

         </div>
      </motion.div>
   );
};

export default Home;
