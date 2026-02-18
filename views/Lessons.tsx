
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Play,
    Lock,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Download,
    ExternalLink,
    Layout,
    Maximize2,
    Minimize2,
    Check,
    PlayCircle,
    ChevronDown,
    ListTree,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CourseModule, LessonStatus } from '../types';
import { LessonItemSkeleton } from '../components/SkeletonLoader';
import { getCached, setCache, removeCache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';
import { fetchWithAuthGet, fetchWithAuthPost } from '../lib/fetchWithAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
        const videoId = match[2];
        const origin = window.location.origin;
        return `https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0&origin=${origin}`;
    }
    return null;
};

const Lessons: React.FC = () => {
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeModuleId, setActiveModuleId] = useState<string>('');
    const [activeLessonId, setActiveLessonId] = useState<string>('');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [isMobileProgramOpen, setIsMobileProgramOpen] = useState(false);

    // Load modules from API with caching (stale-while-revalidate)
    useEffect(() => {
        const fetchModules = async () => {
            try {
                const cachedData = getCached<CourseModule[]>(CACHE_KEYS.LESSONS, CACHE_TTL.LESSONS);
                if (cachedData) {
                    setModules(cachedData);
                    setIsLoading(false);
                    if (cachedData.length > 0 && cachedData[0].lessons?.length > 0) {
                        setActiveModuleId(cachedData[0].id);
                        setActiveLessonId(cachedData[0].lessons[0].id);
                    }
                } else {
                    setIsLoading(true);
                }

                const data = await fetchWithAuthGet<CourseModule[]>('/api/lessons');
                setModules(data);
                setCache(CACHE_KEYS.LESSONS, data);

                if (!cachedData && data.length > 0 && data[0].lessons?.length > 0) {
                    setActiveModuleId(data[0].id);
                    setActiveLessonId(data[0].lessons[0].id);
                }
            } catch (error) {
                console.error('Error fetching lessons:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchModules();
    }, []);

    // Auto-expand module containing active lesson
    useEffect(() => {
        if (activeModuleId) {
            setExpandedModules(prev => {
                const next = new Set(prev);
                next.add(activeModuleId);
                return next;
            });
        }
    }, [activeModuleId]);

    const activeModule = modules.find(m => m.id === activeModuleId);
    const activeLesson = activeModule?.lessons.find(l => l.id === activeLessonId);

    // Sync state if modules change
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

    // Dynamic progress
    const progressData = useMemo(() => {
        let completed = 0;
        let total = 0;
        for (const m of modules) {
            for (const l of m.lessons) {
                total++;
                if (l.status === 'completed') completed++;
            }
        }
        return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }, [modules]);

    // Current lesson index info
    const lessonIndexInfo = useMemo(() => {
        if (!activeModule || !activeLesson) return null;
        const currentIndex = activeModule.lessons.findIndex(l => l.id === activeLessonId);
        return { currentIndex, totalInModule: activeModule.lessons.length };
    }, [activeModule, activeLesson, activeLessonId]);

    const handleNextLesson = useCallback(() => {
        if (!activeModule || !activeLesson) return;
        const currentIndex = activeModule.lessons.findIndex(l => l.id === activeLessonId);

        if (currentIndex < activeModule.lessons.length - 1) {
            setActiveLessonId(activeModule.lessons[currentIndex + 1].id);
        } else {
            const currentModuleIndex = modules.findIndex(m => m.id === activeModuleId);
            if (currentModuleIndex < modules.length - 1) {
                const nextModule = modules[currentModuleIndex + 1];
                if (nextModule.status !== 'locked' && nextModule.lessons.length > 0) {
                    setActiveModuleId(nextModule.id);
                    setActiveLessonId(nextModule.lessons[0].id);
                }
            }
        }
    }, [activeModule, activeLesson, activeLessonId, activeModuleId, modules]);

    const handlePrevLesson = useCallback(() => {
        if (!activeModule || !activeLesson) return;
        const currentIndex = activeModule.lessons.findIndex(l => l.id === activeLessonId);
        if (currentIndex > 0) {
            setActiveLessonId(activeModule.lessons[currentIndex - 1].id);
        }
    }, [activeModule, activeLesson, activeLessonId]);

    const toggleSidebar = useCallback(() => setIsSidebarCollapsed(prev => !prev), []);

    const toggleModule = useCallback((moduleId: string) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(moduleId)) {
                next.delete(moduleId);
            } else {
                next.add(moduleId);
            }
            return next;
        });
    }, []);

    const selectLesson = useCallback((moduleId: string, lessonId: string) => {
        setActiveModuleId(moduleId);
        setActiveLessonId(lessonId);
        setIsMobileProgramOpen(false);
    }, []);

    const handleLessonCompletion = async () => {
        if (!activeLesson) return;

        const newCompletedStatus = activeLesson.status !== 'completed';

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
        setCache(CACHE_KEYS.LESSONS, updatedModules);

        try {
            await fetchWithAuthPost('/api/lessons', {
                lessonId: activeLesson.id,
                completed: newCompletedStatus
            });
        } catch (error) {
            console.error('Error updating lesson status:', error);
            removeCache(CACHE_KEYS.LESSONS);
        }
    };

    const embedUrl = activeLesson?.videoUrl ? getYouTubeEmbedUrl(activeLesson.videoUrl) : null;

    // --- Sidebar content (reused in desktop sidebar & mobile Sheet) ---
    const sidebarContent = (
        <div className="space-y-1">
            {isLoading ? (
                <div className="space-y-4">
                    {[3, 4].map((count, mIdx) => (
                        <div key={mIdx}>
                            <div className="h-3.5 w-28 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
                            <div className="space-y-0.5">
                                {Array.from({ length: count }).map((_, idx) => (
                                    <LessonItemSkeleton key={idx} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                modules.map(module => {
                    const isExpanded = expandedModules.has(module.id);
                    const completedInModule = module.lessons.filter(l => l.status === 'completed').length;
                    const totalInModule = module.lessons.length;
                    const hasActiveLesson = module.lessons.some(l => l.id === activeLessonId);

                    return (
                        <div key={module.id}>
                            {/* Module header — collapsible */}
                            <button
                                onClick={() => toggleModule(module.id)}
                                className={cn(
                                    "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors",
                                    "hover:bg-zinc-100/80 dark:hover:bg-white/5",
                                    hasActiveLesson && "bg-zinc-100/50 dark:bg-white/[0.03]"
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <ChevronDown
                                        size={14}
                                        className={cn(
                                            "shrink-0 text-zinc-400 transition-transform duration-200",
                                            !isExpanded && "-rotate-90"
                                        )}
                                    />
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                                        {module.title}
                                    </span>
                                </div>
                                <Badge variant="secondary" className="shrink-0 text-[10px] font-mono tabular-nums px-1.5 py-0">
                                    {completedInModule}/{totalInModule}
                                </Badge>
                            </button>

                            {/* Lessons list — animated collapse */}
                            <AnimatePresence initial={false}>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="py-0.5 space-y-0.5">
                                            {module.lessons.map((lesson, lIdx) => {
                                                const isActive = activeLessonId === lesson.id;
                                                const isLocked = lesson.status === 'locked';
                                                const isCompleted = lesson.status === 'completed';

                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => {
                                                            if (!isLocked) {
                                                                selectLesson(module.id, lesson.id);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all group",
                                                            isActive && "bg-primary/10",
                                                            !isActive && !isLocked && "hover:bg-zinc-50 dark:hover:bg-white/[0.03]",
                                                            isLocked && "opacity-40 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {/* Status indicator */}
                                                        <div className={cn(
                                                            "shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors",
                                                            isActive && "bg-primary text-primary-foreground",
                                                            isCompleted && !isActive && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                                            !isActive && !isCompleted && !isLocked && "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500",
                                                            isLocked && "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600"
                                                        )}>
                                                            {isLocked ? (
                                                                <Lock size={12} />
                                                            ) : isCompleted ? (
                                                                <Check size={14} strokeWidth={2.5} />
                                                            ) : isActive ? (
                                                                <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                                                            ) : (
                                                                <span>{lIdx + 1}</span>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <span className={cn(
                                                                "block text-sm font-medium leading-tight transition-colors",
                                                                isActive && "text-primary dark:text-primary",
                                                                !isActive && "text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white"
                                                            )}>
                                                                {lesson.title}
                                                            </span>
                                                            <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                                                {!isLocked && <PlayCircle size={10} />}
                                                                {lesson.duration}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })
            )}
        </div>
    );

    return (
        <div className="transition-all duration-500">

            <div className={cn(
                "grid transition-all duration-500 ease-in-out gap-6 lg:gap-0",
                isSidebarCollapsed ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_280px]"
            )}>

                {/* === LEFT COLUMN: PLAYER & CONTENT === */}
                <div className="min-w-0 px-4 md:px-6 py-3 md:py-4 lg:pr-6">

                    {activeLesson ? (
                        <motion.div
                            key={activeLesson.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            className="flex flex-col h-full max-w-5xl mx-auto"
                        >
                            {/* 1. Header Breadcrumbs */}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                                    <span className="hidden md:inline">Курс</span>
                                    <ChevronRight size={14} className="hidden md:block opacity-50" />
                                    <span className="text-zinc-800 dark:text-zinc-300">{activeModule?.title}</span>
                                    {lessonIndexInfo && (
                                        <span className="text-zinc-400 text-xs font-mono tabular-nums">
                                            {lessonIndexInfo.currentIndex + 1}/{lessonIndexInfo.totalInModule}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Mobile "Программа" button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsMobileProgramOpen(true)}
                                        className="lg:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                    >
                                        <ListTree size={16} />
                                        <span className="ml-1.5 text-xs font-bold uppercase tracking-wider">Программа</span>
                                    </Button>
                                    {/* Theater mode */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleSidebar}
                                        className="hidden lg:flex text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                        aria-label={isSidebarCollapsed ? 'Показать меню' : 'Режим театра'}
                                    >
                                        {isSidebarCollapsed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                        <span className="ml-1.5 text-xs font-bold uppercase tracking-wider">
                                            {isSidebarCollapsed ? 'Меню' : 'Театр'}
                                        </span>
                                    </Button>
                                </div>
                            </div>

                            {/* 2. Video Player */}
                            <div className="w-full max-w-[760px] mx-auto aspect-video bg-black rounded-xl overflow-hidden relative group shadow-lg shadow-zinc-200/50 dark:shadow-none ring-1 ring-zinc-900/5 dark:ring-white/10 z-10">
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
                                    <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 to-zinc-900 opacity-50" />

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

                                {!embedUrl && (
                                    <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                        <h2 className="text-white font-bold text-lg drop-shadow-md">{activeLesson.title}</h2>
                                    </div>
                                )}
                            </div>

                            {/* 3. Action Bar — compact two-line layout */}
                            <div className="mt-2 flex flex-col gap-1 pb-2">
                                <div className="flex items-center justify-between gap-3">
                                    <h1 className="text-xl font-display font-bold text-zinc-900 dark:text-white leading-tight truncate">
                                        {activeLesson.title}
                                    </h1>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={handlePrevLesson}
                                            disabled={activeModule?.lessons[0].id === activeLesson.id}
                                            aria-label="Предыдущий урок"
                                        >
                                            <ChevronLeft size={16} />
                                        </Button>

                                        <Button
                                            size="sm"
                                            onClick={handleLessonCompletion}
                                            className={cn(
                                                activeLesson.status === 'completed'
                                                    ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20'
                                                    : 'hover:scale-105 active:scale-95 shadow-lg shadow-zinc-500/10'
                                            )}
                                        >
                                            {activeLesson.status === 'completed' ? (
                                                <>
                                                    <Check size={16} />
                                                    <span>Пройдено</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    <span>Завершить</span>
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={handleNextLesson}
                                            aria-label="Следующий урок"
                                        >
                                            <ChevronRight size={16} />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                    <span className="flex items-center gap-1">
                                        <Layout size={13} />
                                        {activeModuleId === 'recorded' ? 'Записанные уроки' : 'Прямые эфиры'}
                                    </span>
                                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                    <span>{activeLesson.duration}</span>
                                    {activeLesson.status === 'completed' && (
                                        <>
                                            <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs">
                                                Пройден
                                            </Badge>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Separator className="my-1" />

                            {/* 4. Content Tabs — shadcn line variant */}
                            <Tabs defaultValue="overview" className="mt-1">
                                <TabsList variant="line">
                                    <TabsTrigger value="overview" className="text-base">Описание</TabsTrigger>
                                    <TabsTrigger value="materials" className="text-base flex items-center gap-1.5">
                                        Материалы
                                        {(activeLesson.materials.length + activeLesson.tasks.length) > 0 && (
                                            <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0 font-mono">
                                                {activeLesson.materials.length + activeLesson.tasks.length}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>

                                <div className="mt-3">
                                    <TabsContent value="overview">
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="prose prose-zinc dark:prose-invert max-w-none"
                                        >
                                            <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                                                {activeLesson.description}
                                            </p>
                                        </motion.div>
                                    </TabsContent>

                                    <TabsContent value="materials">
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-8"
                                        >
                                            {activeLesson.materials.length > 0 && (
                                                <div>
                                                    <h3 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                                        <Download size={18} className="text-purple-500" />
                                                        Файлы и ссылки
                                                    </h3>
                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        {activeLesson.materials.map(mat => (
                                                            <Card key={mat.id} className="py-0 hover:border-primary/30 hover:shadow-sm transition-all group">
                                                                <CardContent className="p-4 flex items-center gap-3">
                                                                    <a
                                                                        href={mat.url}
                                                                        className="flex items-center gap-3 flex-1 min-w-0"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        <div className="shrink-0 w-9 h-9 rounded-lg bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-purple-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-500/10 transition-colors">
                                                                            {mat.type === 'pdf' ? <Download size={18} /> : <ExternalLink size={18} />}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">{mat.title}</div>
                                                                            <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mt-0.5">{mat.type}</div>
                                                                        </div>
                                                                    </a>
                                                                </CardContent>
                                                            </Card>
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
                                                    <div className="space-y-2">
                                                        {activeLesson.tasks.map(task => (
                                                            <label
                                                                key={task.id}
                                                                className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                                                            >
                                                                <Checkbox
                                                                    defaultChecked={task.completed}
                                                                    className="mt-0.5"
                                                                />
                                                                <span className={cn(
                                                                    "text-sm leading-relaxed pt-0.5",
                                                                    task.completed ? "line-through text-muted-foreground" : "text-zinc-700 dark:text-zinc-300"
                                                                )}>
                                                                    {task.text}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    </TabsContent>
                                </div>
                            </Tabs>
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

                {/* === RIGHT COLUMN: SIDEBAR === */}
                <div className={cn(
                    "hidden lg:block transition-all duration-500",
                    isSidebarCollapsed ? "translate-x-full hidden w-0" : "w-[280px]"
                )}>
                    <div className="sticky top-0 h-screen bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl border-l border-zinc-200/80 dark:border-white/5">
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="p-4 pb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">Программа</h2>
                                    <span className="text-xs font-mono tabular-nums text-zinc-500">
                                        {progressData.completed}/{progressData.total}
                                    </span>
                                </div>
                                <Progress value={progressData.percent} className="h-1.5" />
                            </div>

                            <Separator />

                            {/* Scrollable content */}
                            <ScrollArea className="flex-1">
                                <div className="py-4 pl-4 pr-6">
                                    {sidebarContent}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

            </div>

            {/* === MOBILE SHEET === */}
            <Sheet open={isMobileProgramOpen} onOpenChange={setIsMobileProgramOpen}>
                <SheetContent side="right" className="w-[300px] sm:max-w-[300px] p-0">
                    <SheetHeader className="p-5 pb-4">
                        <SheetTitle className="flex items-center justify-between">
                            <span>Программа</span>
                            <span className="text-xs font-mono tabular-nums text-zinc-500 font-normal">
                                {progressData.completed}/{progressData.total}
                            </span>
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            Навигация по урокам курса
                        </SheetDescription>
                        <Progress value={progressData.percent} className="h-1.5" />
                    </SheetHeader>

                    <Separator />

                    <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
                        <div className="py-4 pl-4 pr-6">
                            {sidebarContent}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default Lessons;
