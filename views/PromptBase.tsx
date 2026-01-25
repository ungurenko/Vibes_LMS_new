
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Copy,
    Check,
    Terminal,
    Search,
    X,
    Layers,
    ArrowRight,
    Heart,
    Compass,
    Wrench,
    Zap,
    Palette,
    Bug,
    Rocket
} from 'lucide-react';
import { PromptCategory, PromptItem, PromptCategoryItem, WorkStage, TaskType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../SoundContext';
import { fetchWithAuthGet, fetchWithAuthPost } from '../lib/fetchWithAuth';
import { GridSkeleton, PromptCardSkeleton } from '../components/SkeletonLoader';
import { getCached, setCache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';

// --- Constants & Types ---

const CATEGORY_COLORS: Record<string, string> = {
    'Лендинг': 'text-violet-500 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
    'Веб-сервис': 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
    'Базовые': 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    'Дизайн': 'text-pink-500 bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20',
    'Фиксы': 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
    'Функции': 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    'API': 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    'Оптимизация': 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20',
    'Системные настройки': 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
};

// Конфигурация фильтров по этапу работы
const WORK_STAGE_CONFIG: Record<WorkStage, { label: string; icon: React.ReactNode; color: string }> = {
    structure: {
        label: 'Структура',
        icon: <Wrench size={14} />,
        color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
    },
    design: {
        label: 'Дизайн',
        icon: <Palette size={14} />,
        color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20'
    },
    functionality: {
        label: 'Функционал',
        icon: <Zap size={14} />,
        color: 'text-green-500 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
    }
};

// Конфигурация фильтров по типу задачи
const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: React.ReactNode; color: string }> = {
    modify: {
        label: 'Изменить',
        icon: <Wrench size={14} />,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
    },
    fix: {
        label: 'Исправить',
        icon: <Bug size={14} />,
        color: 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
    },
    optimize: {
        label: 'Оптимизировать',
        icon: <Rocket size={14} />,
        color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20'
    }
};

// --- Components ---

const PromptBase: React.FC = () => {
    const { playSound } = useSound();
    const [prompts, setPrompts] = useState<PromptItem[]>([]);
    const [categories, setCategories] = useState<PromptCategoryItem[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('Все');
    const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Favorites state
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [favoriteToast, setFavoriteToast] = useState<{ action: 'added' | 'removed' } | null>(null);

    // Navigation filters
    const [activeWorkStage, setActiveWorkStage] = useState<WorkStage | 'all'>('all');
    const [activeTaskType, setActiveTaskType] = useState<TaskType | 'all'>('all');

    // Wizard state
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardWorkStage, setWizardWorkStage] = useState<WorkStage | 'unsure' | null>(null);
    const [wizardTaskType, setWizardTaskType] = useState<TaskType | 'unsure' | null>(null);
    const [wizardResults, setWizardResults] = useState<PromptItem[]>([]);
    const [wizardLoading, setWizardLoading] = useState(false);

    // Загрузка данных
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Проверяем кэш для промптов и избранного
                const cachedPrompts = getCached<PromptItem[]>(CACHE_KEYS.PROMPTS, CACHE_TTL.PROMPTS);
                const cachedFavorites = getCached<string[]>(CACHE_KEYS.FAVORITES, CACHE_TTL.FAVORITES);

                setIsLoading(!cachedPrompts);

                const [promptsData, categoriesData, favoritesData] = await Promise.all([
                    cachedPrompts ? Promise.resolve(cachedPrompts) : fetchWithAuthGet<PromptItem[]>('/api/content/prompts'),
                    fetchWithAuthGet<PromptCategoryItem[]>('/api/content/categories'),
                    cachedFavorites ? Promise.resolve(cachedFavorites) : fetchWithAuthGet<string[]>('/api/content/favorites')
                ]);

                // Всегда устанавливаем промпты в state
                setPrompts(promptsData);

                // Кэшируем только если это свежие данные с сервера
                if (!cachedPrompts) {
                    setCache(CACHE_KEYS.PROMPTS, promptsData);
                }
                setCategories(categoriesData);

                // Устанавливаем избранное
                setFavorites(new Set(favoritesData));
                if (!cachedFavorites) {
                    setCache(CACHE_KEYS.FAVORITES, favoritesData);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                // Fallback for prompts if error
                if (!prompts.length) setPrompts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- Handlers ---

    const handleCopy = (id: string, content: string) => {
        playSound('copy');
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Toggle favorite with optimistic update
    const handleToggleFavorite = async (promptId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        playSound('click');

        const isFavorite = favorites.has(promptId);

        // Оптимистичное обновление
        setFavorites(prev => {
            const next = new Set(prev);
            isFavorite ? next.delete(promptId) : next.add(promptId);
            return next;
        });

        // Toast
        setFavoriteToast({ action: isFavorite ? 'removed' : 'added' });
        setTimeout(() => setFavoriteToast(null), 2000);

        // Обновляем кэш
        const newFavorites = isFavorite
            ? [...favorites].filter(id => id !== promptId)
            : [...favorites, promptId];
        setCache(CACHE_KEYS.FAVORITES, newFavorites);

        // API запрос
        try {
            const token = localStorage.getItem('vibes_token');
            if (isFavorite) {
                await fetch(`/api/content/favorites?promptId=${promptId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await fetchWithAuthPost('/api/content/favorites', { promptId });
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Revert on error
            setFavorites(prev => {
                const next = new Set(prev);
                isFavorite ? next.add(promptId) : next.delete(promptId);
                return next;
            });
        }
    };

    const filteredPrompts = useMemo(() => {
        return prompts.filter(prompt => {
            // Фильтр по избранному
            if (showFavoritesOnly && !favorites.has(prompt.id)) return false;

            const matchesSearch = prompt.title.toLowerCase().includes(search.toLowerCase()) ||
                prompt.description.toLowerCase().includes(search.toLowerCase()) ||
                prompt.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
            const matchesCategory = activeCategory === 'Все' || prompt.category === activeCategory;
            const matchesWorkStage = activeWorkStage === 'all' || prompt.workStage === activeWorkStage;
            const matchesTaskType = activeTaskType === 'all' || prompt.taskType === activeTaskType;
            return matchesSearch && matchesCategory && matchesWorkStage && matchesTaskType;
        });
    }, [search, activeCategory, prompts, showFavoritesOnly, favorites, activeWorkStage, activeTaskType]);

    // Wizard handlers
    const handleWizardStart = () => {
        playSound('click');
        setShowWizard(true);
        setWizardStep(1);
        setWizardWorkStage(null);
        setWizardTaskType(null);
        setWizardResults([]);
    };

    const handleWizardSelectStage = (stage: WorkStage | 'unsure') => {
        playSound('click');
        setWizardWorkStage(stage);
        setWizardStep(2);
    };

    const handleWizardSelectTask = async (task: TaskType | 'unsure') => {
        playSound('click');
        setWizardTaskType(task);
        setWizardLoading(true);

        try {
            const params = new URLSearchParams();
            if (wizardWorkStage && wizardWorkStage !== 'unsure') params.append('workStage', wizardWorkStage);
            if (task && task !== 'unsure') params.append('taskType', task);

            const results = await fetchWithAuthGet<PromptItem[]>(`/api/content/wizard?${params.toString()}`);
            setWizardResults(results);
            setWizardStep(3);
        } catch (error) {
            console.error('Wizard error:', error);
        } finally {
            setWizardLoading(false);
        }
    };

    const handleWizardClose = () => {
        setShowWizard(false);
        setWizardStep(1);
        setWizardWorkStage(null);
        setWizardTaskType(null);
        setWizardResults([]);
    };

    const handleWizardSelectPrompt = (prompt: PromptItem) => {
        playSound('click');
        handleWizardClose();
        // Найти полный промпт в основном списке
        const fullPrompt = prompts.find(p => p.id === prompt.id);
        if (fullPrompt) {
            setSelectedPrompt(fullPrompt);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">

            {/* Header */}
            <div className="mb-10">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
                    Библиотека Промптов
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl text-lg">
                    Коллекция проверенных инструкций для нейросетей. Копируй и используй для своих задач.
                </p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Search & Filters */}
                <div className="mb-8 space-y-4">
                    <div className="flex gap-3 items-center flex-wrap">
                        {/* Wizard Button */}
                        <button
                            onClick={handleWizardStart}
                            className="flex items-center gap-2 px-5 py-4 rounded-2xl text-sm font-bold transition-all border bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Compass size={18} />
                            <span>Помоги выбрать</span>
                        </button>

                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                            <input
                                type="text"
                                placeholder="Найти промпт..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 transition-colors shadow-sm focus:ring-4 focus:ring-violet-500/10"
                            />
                        </div>
                        {/* Favorites Button */}
                        <button
                            onClick={() => { playSound('click'); setShowFavoritesOnly(!showFavoritesOnly); }}
                            className={`flex items-center gap-2 px-4 py-4 rounded-2xl text-sm font-bold transition-all border whitespace-nowrap ${showFavoritesOnly
                                ? 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400'
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <Heart size={18} className={showFavoritesOnly ? 'fill-current' : ''} />
                            <span className="hidden sm:inline">Избранное</span>
                            {favorites.size > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${showFavoritesOnly
                                    ? 'bg-pink-200 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300'
                                    : 'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'
                                }`}>
                                    {favorites.size}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Filter Rows */}
                    <div className="space-y-3">
                        {/* Work Stage Filter */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider w-20 shrink-0">Этап:</span>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => { playSound('click'); setActiveWorkStage('all'); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeWorkStage === 'all'
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    Все
                                </button>
                                {(Object.entries(WORK_STAGE_CONFIG) as [WorkStage, typeof WORK_STAGE_CONFIG[WorkStage]][]).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => { playSound('click'); setActiveWorkStage(key); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeWorkStage === key
                                            ? config.color + ' border-current'
                                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        {config.icon}
                                        {config.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Task Type Filter */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider w-20 shrink-0">Задача:</span>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => { playSound('click'); setActiveTaskType('all'); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeTaskType === 'all'
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    Все
                                </button>
                                {(Object.entries(TASK_TYPE_CONFIG) as [TaskType, typeof TASK_TYPE_CONFIG[TaskType]][]).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => { playSound('click'); setActiveTaskType(key); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeTaskType === key
                                            ? config.color + ' border-current'
                                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        {config.icon}
                                        {config.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider w-20 shrink-0">Проект:</span>
                            <div className="flex overflow-x-auto scrollbar-none gap-2 pb-1">
                                {[{ name: 'Все', id: 'all' }, ...categories].map((cat) => (
                                    <button
                                        key={cat.id || cat.name}
                                        onClick={() => { playSound('click'); setActiveCategory(cat.name); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${activeCategory === cat.name
                                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent'
                                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <GridSkeleton
                        count={9}
                        columns={3}
                        SkeletonComponent={PromptCardSkeleton}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPrompts.map((prompt) => {
                        const colorClass = CATEGORY_COLORS[prompt.category] || 'text-zinc-500 bg-zinc-50 border-zinc-200';
                        const isStack = !!prompt.steps;
                        const stageConfig = prompt.workStage ? WORK_STAGE_CONFIG[prompt.workStage] : null;
                        const taskConfig = prompt.taskType ? TASK_TYPE_CONFIG[prompt.taskType] : null;

                        return (
                            <div
                                key={prompt.id}
                                onClick={() => { playSound('click'); setSelectedPrompt(prompt); }}
                                className="group cursor-pointer bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 flex flex-col h-full relative overflow-hidden"
                            >
                                {/* Hover Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/0 group-hover:from-violet-500/5 group-hover:to-fuchsia-500/5 transition-colors duration-500" />

                                <div className="relative z-10">
                                    {/* Navigation badges row */}
                                    {(stageConfig || taskConfig) && (
                                        <div className="flex gap-1.5 mb-3">
                                            {stageConfig && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); playSound('click'); setActiveWorkStage(prompt.workStage!); }}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${stageConfig.color} hover:opacity-80 transition-opacity`}
                                                    title={`Фильтр: ${stageConfig.label}`}
                                                >
                                                    {stageConfig.icon}
                                                    {stageConfig.label}
                                                </button>
                                            )}
                                            {taskConfig && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); playSound('click'); setActiveTaskType(prompt.taskType!); }}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${taskConfig.color} hover:opacity-80 transition-opacity`}
                                                    title={`Фильтр: ${taskConfig.label}`}
                                                >
                                                    {taskConfig.icon}
                                                    {taskConfig.label}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-2 flex-wrap">
                                            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${colorClass}`}>
                                                {prompt.category}
                                            </span>
                                            {isStack && (
                                                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-violet-200 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:border-violet-500/30 dark:text-violet-300 flex items-center gap-1">
                                                    <Layers size={10} />
                                                    {prompt.steps?.length} шага
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            {/* Favorite Heart Button */}
                                            <button
                                                onClick={(e) => handleToggleFavorite(prompt.id, e)}
                                                className={`p-2 rounded-full transition-all ${favorites.has(prompt.id)
                                                    ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-500'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100'
                                                }`}
                                                title={favorites.has(prompt.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                                            >
                                                <Heart size={16} className={favorites.has(prompt.id) ? 'fill-current' : ''} />
                                            </button>

                                            {!isStack && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (prompt.content) handleCopy(prompt.id, prompt.content); }}
                                                    className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Быстрое копирование"
                                                >
                                                    {copiedId === prompt.id ? <Check size={16} /> : <Copy size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                        {prompt.title}
                                    </h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 line-clamp-3 leading-relaxed">
                                        {prompt.description}
                                    </p>

                                    <div className="mt-auto flex flex-wrap gap-2">
                                        {prompt.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-xs text-zinc-400 font-medium bg-zinc-50 dark:bg-white/5 px-2 py-1 rounded-md">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                        })}
                    </div>
                )}

                {filteredPrompts.length === 0 && !isLoading && (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300 dark:text-zinc-600">
                            <Search size={32} />
                        </div>
                        <p className="text-zinc-400 font-bold">Промпты не найдены</p>
                        <p className="text-zinc-500 text-sm mt-1">Попробуй поискать в другой категории</p>
                    </div>
                )}
            </motion.div>

            {/* Modal for Library Items - Portal to escape stacking context */}
            {createPortal(
                <AnimatePresence>
                    {selectedPrompt && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedPrompt(null)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                            >
                                {/* Header */}
                                <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${CATEGORY_COLORS[selectedPrompt.category]}`}>
                                                    {selectedPrompt.category}
                                                </span>
                                                {selectedPrompt.steps && (
                                                    <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-violet-200 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:border-violet-500/30 dark:text-violet-300 flex items-center gap-1">
                                                        <Layers size={12} />
                                                        Цепочка промптов
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-display text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                                                {selectedPrompt.title}
                                            </h3>
                                            <p className="text-zinc-500 dark:text-zinc-400">
                                                {selectedPrompt.description}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedPrompt(null)}
                                            className="p-2 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                                    {/* Usage */}
                                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-5 flex gap-4">
                                        <div className="shrink-0 pt-1 text-amber-600 dark:text-amber-400">
                                            <Layers size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm mb-1">Как использовать</h4>
                                            <p className="text-sm text-amber-800 dark:text-amber-300/80 leading-relaxed">
                                                {selectedPrompt.usage}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Content Logic: Stack vs Single */}
                                    {selectedPrompt.steps ? (
                                        /* --- STACK VIEW --- */
                                        <div className="space-y-8 relative">
                                            {/* Vertical Line */}
                                            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-zinc-100 dark:bg-zinc-800" />

                                            {selectedPrompt.steps.map((step, idx) => (
                                                <div key={idx} className="relative pl-14">
                                                    {/* Step Number Bubble */}
                                                    <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold z-10 transition-colors bg-white dark:bg-zinc-900 ${copiedId === `${selectedPrompt.id}-step-${idx}`
                                                            ? 'border-emerald-500 text-emerald-500'
                                                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                                                        }`}>
                                                        {copiedId === `${selectedPrompt.id}-step-${idx}` ? <Check size={16} /> : idx + 1}
                                                    </div>

                                                    {/* Step Content */}
                                                    <div className="mb-2">
                                                        <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-1">{step.title}</h4>
                                                        {step.description && <p className="text-sm text-zinc-500 mb-3">{step.description}</p>}
                                                    </div>

                                                    <div className="relative group">
                                                        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleCopy(`${selectedPrompt.id}-step-${idx}`, step.content)}
                                                                className="p-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 shadow-lg border border-white/10 flex items-center gap-2 text-xs font-bold"
                                                            >
                                                                {copiedId === `${selectedPrompt.id}-step-${idx}` ? (
                                                                    <>
                                                                        <Check size={14} />
                                                                        <span>Скопировано</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy size={14} />
                                                                        <span>Копировать</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <div className="bg-[#1e1e1e] text-zinc-300 p-5 rounded-2xl overflow-x-auto text-sm font-mono leading-relaxed border border-zinc-800 shadow-inner">
                                                            <pre>{step.content}</pre>
                                                        </div>
                                                    </div>

                                                    {/* Arrow Connector (if not last) */}
                                                    {idx < (selectedPrompt.steps?.length || 0) - 1 && (
                                                        <div className="flex justify-center mt-6 mb-2">
                                                            <ArrowRight size={20} className="text-zinc-300 dark:text-zinc-700 rotate-90" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        /* --- SINGLE PROMPT VIEW --- */
                                        <>
                                            <div className="relative group">
                                                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => selectedPrompt.content && handleCopy(selectedPrompt.id, selectedPrompt.content)}
                                                        className="p-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 shadow-lg border border-white/10"
                                                    >
                                                        {copiedId === selectedPrompt.id ? <Check size={16} /> : <Copy size={16} />}
                                                    </button>
                                                </div>
                                                <div className="bg-[#1e1e1e] text-zinc-300 p-6 rounded-2xl overflow-x-auto text-sm font-mono leading-relaxed border border-zinc-800 shadow-inner">
                                                    <pre>{selectedPrompt.content}</pre>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => selectedPrompt.content && handleCopy(selectedPrompt.id, selectedPrompt.content)}
                                                className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3"
                                            >
                                                {copiedId === selectedPrompt.id ? (
                                                    <>
                                                        <Check size={20} />
                                                        <span>Скопировано!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={20} />
                                                        <span>Скопировать промпт</span>
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Floating Toast - Copy */}
            <AnimatePresence>
                {copiedId && !selectedPrompt && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-4 px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl shadow-2xl border border-zinc-700 dark:border-zinc-200"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                            <Check size={20} strokeWidth={3} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-base">Скопировано</span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">Готово к вставке в AI</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Toast - Favorites */}
            <AnimatePresence>
                {favoriteToast && !selectedPrompt && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-4 px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl shadow-2xl border border-zinc-700 dark:border-zinc-200"
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${favoriteToast.action === 'added'
                            ? 'bg-pink-500 text-white'
                            : 'bg-zinc-500 text-white'
                        }`}>
                            <Heart size={20} strokeWidth={3} className={favoriteToast.action === 'added' ? 'fill-current' : ''} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-base">
                                {favoriteToast.action === 'added' ? 'Добавлено в избранное' : 'Удалено из избранного'}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {favoriteToast.action === 'added' ? 'Промпт сохранён' : 'Промпт убран'}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Wizard Modal */}
            {createPortal(
                <AnimatePresence>
                    {showWizard && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={handleWizardClose}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl"
                            >
                                {/* Header */}
                                <div className="p-6 border-b border-zinc-100 dark:border-white/5 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
                                                <Compass size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
                                                    Помоги выбрать
                                                </h3>
                                                <p className="text-sm text-zinc-500">
                                                    Шаг {wizardStep} из 3
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleWizardClose}
                                            className="p-2 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6">
                                    <AnimatePresence mode="wait">
                                        {/* Step 1: Work Stage */}
                                        {wizardStep === 1 && (
                                            <motion.div
                                                key="step1"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-4"
                                            >
                                                <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-4">
                                                    Что ты сейчас делаешь?
                                                </h4>
                                                <div className="space-y-3">
                                                    {(Object.entries(WORK_STAGE_CONFIG) as [WorkStage, typeof WORK_STAGE_CONFIG[WorkStage]][]).map(([key, config]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => handleWizardSelectStage(key)}
                                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.02] ${config.color} hover:shadow-lg`}
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center">
                                                                {config.icon}
                                                            </div>
                                                            <span className="font-bold">{config.label}</span>
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => handleWizardSelectStage('unsure')}
                                                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center">
                                                            ?
                                                        </div>
                                                        <span className="font-bold">Не уверен</span>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Step 2: Task Type */}
                                        {wizardStep === 2 && (
                                            <motion.div
                                                key="step2"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-4"
                                            >
                                                <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-4">
                                                    Какая у тебя задача?
                                                </h4>
                                                <div className="space-y-3">
                                                    {(Object.entries(TASK_TYPE_CONFIG) as [TaskType, typeof TASK_TYPE_CONFIG[TaskType]][]).map(([key, config]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => handleWizardSelectTask(key)}
                                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.02] ${config.color} hover:shadow-lg`}
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center">
                                                                {config.icon}
                                                            </div>
                                                            <span className="font-bold">{config.label}</span>
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => handleWizardSelectTask('unsure')}
                                                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center">
                                                            ?
                                                        </div>
                                                        <span className="font-bold">Не уверен</span>
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => { playSound('click'); setWizardStep(1); }}
                                                    className="mt-4 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                                >
                                                    ← Назад
                                                </button>
                                            </motion.div>
                                        )}

                                        {/* Step 3: Results */}
                                        {wizardStep === 3 && (
                                            <motion.div
                                                key="step3"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-4"
                                            >
                                                <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-4">
                                                    Рекомендуемые промпты
                                                </h4>
                                                {wizardLoading ? (
                                                    <div className="flex justify-center py-8">
                                                        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                ) : wizardResults.length > 0 ? (
                                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                                        {wizardResults.map((prompt) => (
                                                            <button
                                                                key={prompt.id}
                                                                onClick={() => handleWizardSelectPrompt(prompt)}
                                                                className="w-full text-left p-4 rounded-2xl border border-zinc-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold border ${CATEGORY_COLORS[prompt.category] || 'text-zinc-500 bg-zinc-50 border-zinc-200'}`}>
                                                                        {prompt.category}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h5 className="font-bold text-zinc-900 dark:text-white truncate">
                                                                            {prompt.title}
                                                                        </h5>
                                                                        <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                                                                            {prompt.description}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-zinc-500">
                                                        <p>Промпты не найдены</p>
                                                        <p className="text-sm mt-1">Попробуй выбрать другие критерии</p>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => { playSound('click'); setWizardStep(2); }}
                                                    className="mt-4 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                                >
                                                    ← Назад
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default PromptBase;
