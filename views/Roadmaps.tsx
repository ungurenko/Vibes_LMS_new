
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trophy, 
  ChevronRight,
  ListTodo,
  ExternalLink,
  Map,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROADMAPS_DATA } from '../data';
import { Roadmap, RoadmapCategory } from '../types';
import { useSound } from '../SoundContext';

// Types for local storage
type ProgressMap = Record<string, string[]>; // roadmapId -> array of completed step IDs

const CATEGORIES: RoadmapCategory[] = ['Подготовка', 'Лендинг', 'Веб-сервис', 'Полезное'];

const Roadmaps: React.FC = () => {
  const { playSound } = useSound();
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<ProgressMap>({});
  const [activeCategory, setActiveCategory] = useState<RoadmapCategory | 'Все'>('Все');

  // Load progress from local storage
  useEffect(() => {
    const saved = localStorage.getItem('vibes_roadmap_progress');
    if (saved) {
      try {
        setCompletedSteps(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load roadmap progress", e);
      }
    }
  }, []);

  // Save progress
  useEffect(() => {
    localStorage.setItem('vibes_roadmap_progress', JSON.stringify(completedSteps));
  }, [completedSteps]);

  // Scroll to top when opening a map
  useEffect(() => {
    if (activeMapId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeMapId]);

  const activeMap = useMemo(() => 
    ROADMAPS_DATA.find(r => r.id === activeMapId), 
  [activeMapId]);

  const toggleStep = (stepId: string) => {
    if (!activeMapId) return;

    setCompletedSteps(prev => {
      const currentMapSteps = prev[activeMapId] || [];
      const isCompleted = currentMapSteps.includes(stepId);
      
      let newMapSteps;
      if (isCompleted) {
        newMapSteps = currentMapSteps.filter(id => id !== stepId);
      } else {
        newMapSteps = [...currentMapSteps, stepId];
        playSound('success'); // Play sound on completion
      }

      const newState = { ...prev, [activeMapId]: newMapSteps };
      
      // Check for completion and trigger confetti
      if (!isCompleted && activeMap) {
        if (newMapSteps.length === activeMap.steps.length) {
            triggerConfetti();
        }
      }

      return newState;
    });
  };

  const triggerConfetti = () => {
    // Check if canvas-confetti is loaded globally
    // @ts-ignore
    if (typeof confetti === 'function') {
        // @ts-ignore
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#8b5cf6', '#a78bfa', '#ffffff']
        });
    }
  };

  const filteredRoadmaps = useMemo(() => {
    if (activeCategory === 'Все') return ROADMAPS_DATA;
    return ROADMAPS_DATA.filter(r => r.category === activeCategory);
  }, [activeCategory]);

  const calculateProgress = (roadmapId: string, totalSteps: number) => {
    const completed = completedSteps[roadmapId]?.length || 0;
    return Math.round((completed / totalSteps) * 100);
  };

  // --- Views ---

  if (activeMap) {
    const currentProgress = calculateProgress(activeMap.id, activeMap.steps.length);
    const completedCount = completedSteps[activeMap.id]?.length || 0;
    const isFullyCompleted = completedCount === activeMap.steps.length;

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-[1000px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32"
        >
            <button 
                onClick={() => { playSound('click'); setActiveMapId(null); }}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-6 font-medium"
            >
                <ArrowLeft size={18} />
                Назад к картам
            </button>

            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-10 border border-zinc-200 dark:border-white/5 shadow-xl shadow-zinc-200/50 dark:shadow-none mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-3xl">
                            {activeMap.icon}
                        </div>
                        <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/10">
                            {activeMap.category}
                        </div>
                    </div>
                    
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-3">
                        {activeMap.title}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed max-w-2xl mb-8">
                        {activeMap.description}
                    </p>

                    <div className="flex items-center gap-6 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                            <Clock size={18} />
                            {activeMap.estimatedTime}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                                activeMap.difficulty === 'Легко' ? 'bg-emerald-500' : 
                                activeMap.difficulty === 'Средне' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                            {activeMap.difficulty}
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar Sticky */}
            <div className="sticky top-4 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-white/5 p-4 mb-8 shadow-lg shadow-black/5">
                <div className="flex justify-between items-center mb-2 text-sm font-bold">
                    <span className="text-zinc-700 dark:text-zinc-300">Прогресс</span>
                    <span className="text-violet-600 dark:text-violet-400">{currentProgress}%</span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${currentProgress}%` }}
                        transition={{ type: "spring", stiffness: 50, damping: 15 }}
                        className="h-full bg-violet-600 rounded-full relative"
                    >
                         <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}></div>
                    </motion.div>
                </div>
            </div>

            {/* Steps List */}
            <div className="space-y-4">
                {activeMap.steps.map((step, index) => {
                    const isCompleted = completedSteps[activeMap.id]?.includes(step.id);
                    return (
                        <motion.div 
                            key={step.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => toggleStep(step.id)}
                            className={`group p-5 md:p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                                isCompleted 
                                ? 'bg-violet-50/50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-500/30' 
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5'
                            }`}
                        >
                            <div className="flex items-start gap-4 md:gap-6 relative z-10">
                                <div className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 mt-0.5 ${
                                    isCompleted 
                                    ? 'bg-violet-600 border-violet-600 text-white scale-110' 
                                    : 'border-zinc-300 dark:border-zinc-600 text-transparent group-hover:border-violet-400'
                                }`}>
                                    <CheckCircle2 size={16} strokeWidth={3} />
                                </div>
                                <div className="flex-1">
                                    <h3 className={`font-bold text-lg mb-1 transition-colors ${
                                        isCompleted ? 'text-zinc-500 dark:text-zinc-400 line-through decoration-2 decoration-violet-300 dark:decoration-violet-700' : 'text-zinc-900 dark:text-white'
                                    }`}>
                                        {step.title}
                                    </h3>
                                    <p className={`text-sm leading-relaxed ${
                                        isCompleted ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'
                                    }`}>
                                        {step.description}
                                    </p>
                                    
                                    {step.linkUrl && (
                                        <div className="mt-3">
                                            <a 
                                                href={step.linkUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1.5 rounded-lg border border-violet-100 dark:border-violet-500/20 hover:bg-violet-100 transition-colors"
                                            >
                                                <ExternalLink size={12} />
                                                {step.linkText || 'Открыть ссылку'}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Completion State */}
            <AnimatePresence>
                {isFullyCompleted && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-center relative overflow-hidden shadow-2xl shadow-violet-500/40"
                    >
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                         <div className="relative z-10">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-lg">
                                <Trophy size={40} className="text-yellow-300 drop-shadow-md" />
                            </div>
                            <h2 className="font-display text-3xl font-bold mb-3">Поздравляем! 🎉</h2>
                            <p className="text-violet-100 text-lg mb-8 max-w-md mx-auto">
                                Ты успешно прошел карту "{activeMap.title}". Это большой шаг вперед!
                            </p>
                            <button 
                                onClick={() => setActiveMapId(null)}
                                className="px-8 py-4 bg-white text-violet-700 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                                Вернуться к списку
                            </button>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
  }

  // List View
  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            Дорожные карты
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl text-lg font-light">
             Пошаговые планы для каждой задачи. Выбери цель и иди по шагам — так ты точно ничего не забудешь.
          </p>
        </div>
        <div className="hidden md:block">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-violet-600 dark:text-violet-400 rotate-3">
                <Map size={32} />
            </div>
        </div>
      </div>

      {/* Categories */}
      <div className="sticky top-20 md:top-6 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 md:mx-0 md:px-0 border-y md:border-none border-zinc-200 dark:border-white/5 md:bg-transparent md:backdrop-blur-none">
        <div className="flex overflow-x-auto scrollbar-none gap-2 pb-1">
            {['Все', ...CATEGORIES].map((cat) => (
            <button
                key={cat}
                onClick={() => { playSound('click'); setActiveCategory(cat as any); }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border whitespace-nowrap ${
                activeCategory === cat
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent shadow-lg transform scale-105'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:border-zinc-300 dark:hover:border-white/20'
                }`}
            >
                {cat}
            </button>
            ))}
        </div>
      </div>

      {/* Grid */}
      <motion.div 
        layout 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <AnimatePresence>
            {filteredRoadmaps.map((map) => {
                const completedCount = completedSteps[map.id]?.length || 0;
                const totalSteps = map.steps.length;
                const progress = Math.round((completedCount / totalSteps) * 100);
                const isStarted = progress > 0;
                const isCompleted = progress === 100;

                return (
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={map.id}
                        onClick={() => { playSound('click'); setActiveMapId(map.id); }}
                        className={`group cursor-pointer bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden flex flex-col h-full ${
                            isCompleted 
                            ? 'border-emerald-200 dark:border-emerald-500/30' 
                            : 'border-zinc-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/30'
                        }`}
                    >
                        {/* Status Badge */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                                {map.icon}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/10">
                                    {map.estimatedTime}
                                </span>
                            </div>
                        </div>

                        <div className="mb-auto">
                            <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-2 leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                {map.title}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                                {map.description}
                            </p>
                        </div>

                        {/* Footer Progress */}
                        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-white/5">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    {isCompleted ? 'Завершено' : isStarted ? 'В процессе' : 'Не начато'}
                                </span>
                                <span className={`font-mono text-sm font-bold ${isCompleted ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                                    {completedCount}/{totalSteps}
                                </span>
                            </div>
                            <div className="h-1.5 bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        isCompleted ? 'bg-emerald-500' : 'bg-violet-600'
                                    }`} 
                                    style={{ width: `${progress}%` }} 
                                />
                            </div>
                        </div>

                        {/* Completed Checkmark Overlay */}
                        {isCompleted && (
                            <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 p-1.5 rounded-full">
                                <CheckCircle2 size={16} />
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Roadmaps;
