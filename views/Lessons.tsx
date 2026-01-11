
import React, { useState, useEffect } from 'react';
import {
    Play,
    Lock,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    FileText,
    Download,
    ExternalLink,
    Layout,
    Sparkles,
    Maximize2,
    Minimize2,
    MoreVertical,
    Check,
    PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CourseModule, LessonStatus } from '../types';
import { LessonItemSkeleton } from '../components/SkeletonLoader';

const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    // Regex to capture video ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
        const videoId = match[2];
        // Use www.youtube.com instead of youtube-nocookie.com to avoid Error 153/150 on some videos
        // Add origin parameter to prevent domain restriction errors
        const origin = window.location.origin;
        return `https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0&origin=${origin}`;
    }
    return null;
};

const Lessons: React.FC = () => {
    // State for modules from API
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize with the first lesson of the first module if available
    const [activeModuleId, setActiveModuleId] = useState<string>('');
    const [activeLessonId, setActiveLessonId] = useState<string>('');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'materials'>('overview');

    // Load modules from API
    useEffect(() => {
        const fetchModules = async () => {
            try {
                setIsLoading(true);
                const token = localStorage.getItem('vibes_token');
                const response = await fetch('/api/lessons', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) return;

                const result = await response.json();
                if (result.success && result.data) {
                    setModules(result.data);

                    // Set first available lesson as active
                    if (result.data.length > 0 && result.data[0].lessons?.length > 0) {
                        setActiveModuleId(result.data[0].id);
                        setActiveLessonId(result.data[0].lessons[0].id);
                    }
                }
            } catch (error) {
                console.error('Error fetching lessons:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchModules();
    }, []);

    // Helper to get current objects
    const activeModule = modules.find(m => m.id === activeModuleId);
    const activeLesson = activeModule?.lessons.find(l => l.id === activeLessonId);

    // Sync state if modules change (e.g. initial load or updates)
    useEffect(() => {
        if ((!activeModule || !activeLesson) && modules.length > 0 && modules[0].lessons.length > 0) {
            setActiveModuleId(modules[0].id);
            setActiveLessonId(modules[0].lessons[0].id);
        }
    }, [modules, activeModule, activeLesson]);

    // Scroll to top when lesson changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeLessonId]);

    // Navigation handlers
    const handleNextLesson = () => {
        if (!activeModule || !activeLesson) return;
        const currentIndex = activeModule.lessons.findIndex(l => l.id === activeLessonId);

        // If not last lesson in module
        if (currentIndex < activeModule.lessons.length - 1) {
            setActiveLessonId(activeModule.lessons[currentIndex + 1].id);
        } else {
            // Check next module
            const currentModuleIndex = modules.findIndex(m => m.id === activeModuleId);
            if (currentModuleIndex < modules.length - 1) {
                const nextModule = modules[currentModuleIndex + 1];
                if (nextModule.status !== 'locked' && nextModule.lessons.length > 0) {
                    setActiveModuleId(nextModule.id);
                    setActiveLessonId(nextModule.lessons[0].id);
                }
            }
        }
    };

    const handlePrevLesson = () => {
        if (!activeModule || !activeLesson) return;
        const currentIndex = activeModule.lessons.findIndex(l => l.id === activeLessonId);
        if (currentIndex > 0) {
            setActiveLessonId(activeModule.lessons[currentIndex - 1].id);
        }
    };

    const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

    const handleLessonCompletion = async () => {
        if (!activeLesson) return;

        const newCompletedStatus = activeLesson.status !== 'completed';

        // Optimistic update
        const updatedModules = modules.map(m => ({
            ...m,
            lessons: m.lessons.map(l => {
                if (l.id === activeLesson.id) {
                    return { ...l, status: (newCompletedStatus ? 'completed' : 'available') as LessonStatus };
                }
                return l;
            })
        }));
        setModules(updatedModules);

        try {
            const token = localStorage.getItem('vibes_token');
            const response = await fetch('/api/lessons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    lessonId: activeLesson.id,
                    completed: newCompletedStatus
                })
            });

            if (!response.ok) {
                console.error('Failed to update lesson status');
                // Optional: Revert state here if needed
            }
        } catch (error) {
            console.error('Error updating lesson status:', error);
        }
    };

    const embedUrl = activeLesson?.videoUrl ? getYouTubeEmbedUrl(activeLesson.videoUrl) : null;

    return (
        <div className="max-w-[1920px] mx-auto transition-all duration-500">

            <div className={`grid transition-all duration-500 ease-in-out gap-6 lg:gap-0 ${isSidebarCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[1fr_400px]'}`}>

                {/* === LEFT COLUMN: PLAYER & CONTENT === */}
                <div className="min-w-0 px-4 md:px-8 py-6 md:py-8 lg:pr-8">

                    {activeLesson ? (
                        <motion.div
                            key={activeLesson.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            className="flex flex-col h-full max-w-5xl mx-auto"
                        >
                            {/* 1. Header Breadcrumbs */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                                    <span className="hidden md:inline">Курс</span>
                                    <ChevronRight size={14} className="hidden md:block opacity-50" />
                                    <span className="text-zinc-800 dark:text-zinc-300">{activeModule?.title}</span>
                                </div>
                                <button
                                    onClick={toggleSidebar}
                                    className="hidden lg:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    {isSidebarCollapsed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                    {isSidebarCollapsed ? 'Показать меню' : 'Театр'}
                                </button>
                            </div>

                            {/* 2. Video Player */}
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden relative group shadow-2xl shadow-zinc-200/50 dark:shadow-none ring-1 ring-zinc-900/5 dark:ring-white/10 z-10">
                                {embedUrl ? (
                                    <iframe
                                        src={embedUrl}
                                        title={activeLesson.title}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        allowFullScreen
                                    />
                                ) : (
                                    /* Placeholder Content if no video URL */
                                    <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-violet-900/20 to-zinc-900 opacity-50" />

                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="relative w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all z-20 group/play"
                                        >
                                            <Play size={32} className="ml-1 fill-white opacity-90 group-hover/play:opacity-100" />
                                        </motion.button>
                                        <p className="relative z-20 mt-6 text-zinc-400 font-medium tracking-wide text-sm">Видео скоро появится</p>
                                    </div>
                                )}

                                {/* Video Title Overlay */}
                                {!embedUrl && (
                                    <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                        <h2 className="text-white font-bold text-lg drop-shadow-md">{activeLesson.title}</h2>
                                    </div>
                                )}
                            </div>

                            {/* 3. Action Bar (Unified) */}
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/5 pb-6">
                                <div className="flex-1">
                                    <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white leading-tight mb-2">
                                        {activeLesson.title}
                                    </h1>
                                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                                        <span className="flex items-center gap-1.5"><Layout size={14} /> {activeModuleId === 'recorded' ? 'Записанные уроки' : 'Прямые эфиры'}</span>
                                        <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                        <span>{activeLesson.duration}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={handlePrevLesson}
                                        disabled={activeModule?.lessons[0].id === activeLesson.id}
                                        className="p-3 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>

                                    {/* Primary Action */}
                                    <button
                                        onClick={handleLessonCompletion}
                                        className={`flex-1 sm:flex-none h-12 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeLesson.status === 'completed'
                                                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 shadow-lg shadow-zinc-500/10'
                                            }`}
                                    >
                                        {activeLesson.status === 'completed' ? (
                                            <>
                                                <Check size={18} />
                                                <span>Пройдено</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} />
                                                <span>Завершить урок</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleNextLesson}
                                        className="p-3 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* 4. Content Area (Smart Pills) */}
                            <div className="mt-8">
                                <div className="flex gap-4 mb-6 overflow-x-auto scrollbar-none">
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'overview'
                                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-md'
                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        Описание
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('materials')}
                                        className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'materials'
                                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-md'
                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        Материалы и Задания
                                        {activeLesson.materials.length > 0 && (
                                            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-600 text-[10px] flex items-center justify-center text-current opacity-80">
                                                {activeLesson.materials.length + activeLesson.tasks.length}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                <div className="min-h-[300px]">
                                    <AnimatePresence mode="wait">
                                        {activeTab === 'overview' && (
                                            <motion.div
                                                key="overview"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="prose prose-zinc dark:prose-invert max-w-none"
                                            >
                                                <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                                    {activeLesson.description}
                                                </p>
                                            </motion.div>
                                        )}

                                        {activeTab === 'materials' && (
                                            <motion.div
                                                key="materials"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="space-y-8"
                                            >
                                                {activeLesson.materials.length > 0 && (
                                                    <div>
                                                        <h3 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                                            <FileText size={18} className="text-violet-500" />
                                                            Файлы и ссылки
                                                        </h3>
                                                        <div className="grid sm:grid-cols-2 gap-4">
                                                            {activeLesson.materials.map(mat => (
                                                                <a
                                                                    key={mat.id}
                                                                    href={mat.url}
                                                                    className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/30 bg-white dark:bg-zinc-900 hover:shadow-lg hover:shadow-violet-500/5 transition-all group"
                                                                >
                                                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-500/10 transition-colors">
                                                                        {mat.type === 'pdf' ? <Download size={20} /> : <ExternalLink size={20} />}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-sm text-zinc-900 dark:text-white">{mat.title}</div>
                                                                        <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mt-0.5">{mat.type}</div>
                                                                    </div>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {activeLesson.tasks.length > 0 && (
                                                    <div>
                                                        <h3 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                                            <CheckCircle2 size={18} className="text-emerald-500" />
                                                            Практика
                                                        </h3>
                                                        <div className="space-y-3">
                                                            {activeLesson.tasks.map(task => (
                                                                <label key={task.id} className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
                                                                    <div className="relative flex items-center justify-center w-5 h-5 mt-0.5">
                                                                        <input type="checkbox" defaultChecked={task.completed} className="peer appearance-none w-5 h-5 rounded-md border-2 border-zinc-300 dark:border-zinc-600 checked:bg-emerald-500 checked:border-emerald-500 transition-colors" />
                                                                        <Check size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                                                                    </div>
                                                                    <span className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pt-0.5">
                                                                        {task.text}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                <Layout size={32} className="text-zinc-400" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Выберите урок</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Начните обучение, выбрав тему в меню справа.</p>
                        </div>
                    )}
                </div>

                {/* === RIGHT COLUMN: TIMELINE SIDEBAR === */}
                <div className={`hidden lg:block border-l border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-950 transition-all duration-500 ${isSidebarCollapsed ? 'translate-x-full hidden w-0' : 'w-[400px]'}`}>
                    <div className="sticky top-0 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 p-6 pb-32">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Программа</h2>
                            <div className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md text-zinc-500">
                                {Math.round(14)}% Пройдено
                            </div>
                        </div>

                        {/* Progress Visual */}
                        <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full mb-8 overflow-hidden">
                            <div className="h-full bg-violet-500 w-[14%]" />
                        </div>

                        <div className="space-y-8">
                            {isLoading ? (
                                <div className="space-y-6">
                                    {/* Модуль 1 */}
                                    <div className="relative">
                                        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
                                        <div className="space-y-1">
                                            {Array.from({ length: 3 }).map((_, idx) => (
                                                <LessonItemSkeleton key={idx} />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Модуль 2 */}
                                    <div className="relative">
                                        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
                                        <div className="space-y-1">
                                            {Array.from({ length: 4 }).map((_, idx) => (
                                                <LessonItemSkeleton key={idx} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                modules.map((module, mIdx) => (
                                <div key={module.id} className="relative">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 px-2">
                                        {module.title}
                                    </h3>

                                    <div className="relative space-y-1">
                                        {/* Timeline Line */}
                                        <div className="absolute left-[19px] top-3 bottom-3 w-[2px] bg-zinc-100 dark:bg-zinc-800" />

                                        {module.lessons.map((lesson, lIdx) => {
                                            const isActive = activeLessonId === lesson.id;
                                            const isLocked = lesson.status === 'locked';
                                            const isCompleted = lesson.status === 'completed';

                                            return (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => !isLocked && setActiveLessonId(lesson.id)}
                                                    className={`relative w-full flex items-start gap-4 p-3 rounded-2xl text-left transition-all group ${isActive
                                                            ? 'bg-zinc-100 dark:bg-white/5'
                                                            : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
                                                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {/* Timeline Node */}
                                                    <div className={`relative z-10 shrink-0 w-10 h-10 rounded-full border-[3px] flex items-center justify-center transition-colors bg-white dark:bg-zinc-950 ${isActive
                                                            ? 'border-violet-500 text-violet-600'
                                                            : isCompleted
                                                                ? 'border-emerald-500 text-emerald-500'
                                                                : 'border-zinc-200 dark:border-zinc-800 text-zinc-300 dark:text-zinc-700'
                                                        }`}>
                                                        {isLocked ? (
                                                            <Lock size={14} />
                                                        ) : isCompleted ? (
                                                            <Check size={16} strokeWidth={3} />
                                                        ) : isActive ? (
                                                            <div className="w-3 h-3 bg-violet-500 rounded-full animate-pulse" />
                                                        ) : (
                                                            <span className="text-xs font-bold">{lIdx + 1}</span>
                                                        )}
                                                    </div>

                                                    <div className="pt-1.5 flex-1">
                                                        <span className={`block text-sm font-bold leading-tight mb-1 transition-colors ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white'
                                                            }`}>
                                                            {lesson.title}
                                                        </span>
                                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                                            {!isLocked && <PlayCircle size={10} />}
                                                            {lesson.duration}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Lessons;
