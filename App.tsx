
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Login from './views/Login';
import Register from './views/Register';
import SplashScreen from './components/SplashScreen';
import { ViewSkeleton } from './components/SkeletonLoader';

// Lazy loaded student views (code splitting)
const Home = lazy(() => import('./views/Home'));
const StyleLibrary = lazy(() => import('./views/StyleLibrary'));
const Glossary = lazy(() => import('./views/Glossary'));
const ToolsView = lazy(() => import('./views/ToolsView'));
const Lessons = lazy(() => import('./views/Lessons'));
const PromptBase = lazy(() => import('./views/PromptBase'));
const Roadmaps = lazy(() => import('./views/Roadmaps'));
const UserProfile = lazy(() => import('./views/UserProfile'));

// Lazy loaded heavy components (code splitting)
const ToolChat = lazy(() => import('./views/ToolChat'));
const AdminStudents = lazy(() => import('./views/AdminStudents'));
const AdminContent = lazy(() => import('./views/AdminContent'));
const AdminCalls = lazy(() => import('./views/AdminCalls'));
const AdminAssistant = lazy(() => import('./views/AdminAssistant'));
const AdminSettings = lazy(() => import('./views/AdminSettings'));
const AdminCohorts = lazy(() => import('./views/AdminCohorts'));
const AdminAnalytics = lazy(() => import('./views/AdminAnalytics'));
import { cn } from '@/lib/utils';
import { TabId, InviteLink, Student, CourseModule, NavigationConfig, Cohort } from './types';
import CohortSelector from './components/admin/CohortSelector';

type ToolType = 'assistant' | 'tz_helper' | 'ideas' | null;
import { motion, AnimatePresence } from 'framer-motion';
import { SoundProvider } from './SoundContext';
import { fetchWithAuth } from './lib/fetchWithAuth';
import { setCache, CACHE_KEYS } from './lib/cache';
import { useAnalytics } from './lib/hooks/useAnalytics';



const AppContent: React.FC = () => {
    // --- Auth & Routing State ---
    const [currentUser, setCurrentUser] = useState<Student | null>(null);
    const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState<string | null>(null);
    const [view, setView] = useState<'login' | 'register' | 'app' | 'reset-password'>('login');
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // --- App Data State (The "Database") ---
    const [students, setStudents] = useState<Student[]>([]);
    const [invites, setInvites] = useState<InviteLink[]>([]);

    // Modules теперь загружаются напрямую из API в компонентах

    // --- UI State ---
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
    const [mode, setMode] = useState<'student' | 'admin'>('student');

    const [selectedTool, setSelectedTool] = useState<ToolType>(null);
    const [toolInitialMessage, setToolInitialMessage] = useState<string | null>(null);
    const [navConfig, setNavConfig] = useState<NavigationConfig | null>(null);

    // --- Cohort State ---
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
    const [userCohort, setUserCohort] = useState<{ id: string; name: string } | null>(null);

    // Убрали сохранение modules в localStorage

    const { trackPageView } = useAnalytics();

    // Track page views
    useEffect(() => {
        if (currentUser && view === 'app') {
            trackPageView(activeTab);
        }
    }, [activeTab, currentUser, view]);

    // --- Effects ---

    // 1. Initialize Theme & Check Auth on Mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (savedTheme) setTheme(savedTheme);

        const params = new URLSearchParams(window.location.search);
        const inviteParam = params.get('invite');
        const savedToken = localStorage.getItem('vibes_token');

        if (inviteParam) {
            setInviteCodeFromUrl(inviteParam);
            setIsAuthLoading(false);
            setView('register');
        } else if (savedToken) {
            // Проверяем токен через API
            fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${savedToken}` }
            })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        const user = result.data;
                        // Маппим поля из API в формат Student
                        setCurrentUser({
                            id: user.id,
                            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
                            email: user.email,
                            avatar: user.avatarUrl || `https://ui-avatars.com/api/?name=${user.firstName || 'U'}&background=8b5cf6&color=fff`,
                            status: 'active',
                            progress: 0,
                            currentModule: '',
                            lastActive: 'Сейчас',
                            joinedDate: user.createdAt || new Date().toISOString(),
                            projects: {},
                            niche: user.niche || undefined,
                            cohortId: user.cohortId,
                            cohortName: user.cohortName,
                        });
                        // Сохраняем когорту студента
                        if (user.cohortId) {
                            setUserCohort({ id: user.cohortId, name: user.cohortName || '' });
                        }
                        if (user.role === 'admin') {
                            setMode('admin');
                            setActiveTab('admin-students');
                            // Загрузить инвайты, студентов и когорты для админ-панели (параллельно)
                            Promise.all([loadInvites(), loadStudents(), loadCohorts()]);
                        } else {
                            setMode('student');
                            setActiveTab('dashboard');
                        }
                        setIsAuthLoading(false);
                        setView('app');
                    } else {
                        // Токен невалидный - удаляем и показываем логин
                        localStorage.removeItem('vibes_token');
                        setIsAuthLoading(false);
                        setView('login');
                    }
                })
                .catch(() => {
                    setIsAuthLoading(false);
                    setView('login');
                });
        } else {
            setIsAuthLoading(false);
            setView('login');
        }

        // Обработчик события истёкшего токена
        const handleAuthExpired = () => {
            console.log('Auth token expired - logging out');
            localStorage.removeItem('vibes_token');
            setCurrentUser(null);
            setMode('student');
            setActiveTab('dashboard');
            setView('login');
        };

        window.addEventListener('auth:expired', handleAuthExpired);

        // Cleanup
        return () => {
            window.removeEventListener('auth:expired', handleAuthExpired);
        };
    }, []);

    // 2. Persist Theme
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);



    // 4. Load Navigation Config (только после авторизации)
    useEffect(() => {
        // Ждём пока пользователь авторизуется
        if (!currentUser) {
            setNavConfig(null); // Показываем все вкладки до авторизации
            return;
        }

        const token = localStorage.getItem('vibes_token');
        if (!token) {
            setNavConfig(null);
            return;
        }

        fetch('/api/admin?resource=navigation', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    setNavConfig(result.data);
                } else {
                    console.log('Failed to load navigation config:', result.error);
                    setNavConfig(null);
                }
            })
            .catch(err => {
                console.log('Failed to load navigation config:', err);
                // Fallback: null означает показывать все вкладки
                setNavConfig(null);
            });
    }, [currentUser]); // Зависимость от currentUser - перезагружаем при смене пользователя

    // 5. Prefetch critical data after successful auth
    useEffect(() => {
        if (!currentUser) return;

        const token = localStorage.getItem('vibes_token');
        if (!token) return;

        // Prefetch in background without blocking UI
        const prefetchData = async () => {
            try {
                const headers = { 'Authorization': `Bearer ${token}` };

                // Parallel fetch all content
                const [stylesRes, promptsRes, glossaryRes, stagesRes, lessonsRes, categoriesRes] = await Promise.all([
                    fetch('/api/content/styles', { headers }).then(r => r.json()),
                    fetch('/api/content/prompts', { headers }).then(r => r.json()),
                    fetch('/api/content/glossary', { headers }).then(r => r.json()),
                    fetch('/api/stages', { headers }).then(r => r.json()),
                    fetch('/api/lessons', { headers }).then(r => r.json()),
                    fetch('/api/content/categories', { headers }).then(r => r.json())
                ]);

                // Cache successful responses
                if (stylesRes.success) setCache(CACHE_KEYS.STYLES, stylesRes.data);
                if (promptsRes.success) setCache(CACHE_KEYS.PROMPTS, promptsRes.data);
                if (glossaryRes.success) setCache(CACHE_KEYS.GLOSSARY, glossaryRes.data);
                if (stagesRes.success) setCache(CACHE_KEYS.STAGES, stagesRes.data);
                if (lessonsRes.success) setCache(CACHE_KEYS.LESSONS, lessonsRes.data);
                if (categoriesRes.success) setCache(CACHE_KEYS.CATEGORIES, categoriesRes.data);
            } catch (error) {
                // Silent fail - prefetch is not critical
                console.log('Prefetch failed (non-critical):', error);
            }
        };

        prefetchData();
    }, [currentUser]);

    // --- Actions ---

    const handleUpdateStudent = (updatedStudent: Student) => {
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    };

    const handleAddStudent = (newStudent: Student) => {
        setStudents(prev => [...prev, newStudent]);
    };

    const handleDeleteStudent = (id: string) => {
        setStudents(prev => prev.filter(s => s.id !== id));
    };

    // Обновление профиля текущего пользователя
    const handleUserUpdate = (updatedFields: Partial<Student>) => {
        if (currentUser) {
            setCurrentUser({ ...currentUser, ...updatedFields });
        }
    };

    const handleLogin = async (email: string, password: string) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                // Сохраняем токен
                localStorage.setItem('vibes_token', result.data.token);

                const user = result.data.user;
                // Маппим поля из API в формат Student
                setCurrentUser({
                    id: user.id,
                    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
                    email: user.email,
                    avatar: user.avatarUrl || `https://ui-avatars.com/api/?name=${user.firstName || 'U'}&background=8b5cf6&color=fff`,
                    status: 'active',
                    progress: 0,
                    currentModule: '',
                    lastActive: 'Сейчас',
                    joinedDate: user.createdAt || new Date().toISOString(),
                    projects: {},
                    niche: user.niche || undefined
                });

                if (user.role === 'admin') {
                    setMode('admin');
                    setActiveTab('admin-students');
                    // Загружаем данные для админки сразу после входа (параллельно)
                    Promise.all([loadInvites(), loadStudents(), loadCohorts()]);
                } else {
                    setMode('student');
                    setActiveTab('dashboard');
                }
                setView('app');
            } else {
                alert(result.error || 'Ошибка входа');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Ошибка подключения к серверу');
        }
    };

    const handleRegister = (data: { token: string; user: any }) => {
        // Сохранить JWT token
        localStorage.setItem('vibes_token', data.token);

        // Создать объект пользователя из данных API
        const newUser: User = {
            id: data.user.id,
            name: `${data.user.first_name} ${data.user.last_name || ''}`.trim(),
            email: data.user.email,
            role: data.user.role || 'student',
            avatar: `https://ui-avatars.com/api/?name=${data.user.first_name}&background=8b5cf6&color=fff`,
            progressPercent: data.user.progress_percent || 0
        };

        setCurrentUser(newUser);
        setMode(newUser.role === 'admin' ? 'admin' : 'student');

        // Очистить invite code из URL
        window.history.replaceState({}, '', window.location.pathname);

        // Перейти в приложение
        setView('app');
    };

    const handleLogout = () => {
        localStorage.removeItem('vibes_token');
        setCurrentUser(null);
        setMode('student');
        setActiveTab('dashboard');
        setView('login');
    };

    const handleAskAI = (prompt: string) => {
        setToolInitialMessage(prompt);
        setSelectedTool('assistant');
        setActiveTab('tools');
    };

    const handleSelectTool = (toolType: ToolType) => {
        setSelectedTool(toolType);
        setToolInitialMessage(null);
    };

    const handleBackFromTool = () => {
        setSelectedTool(null);
        setToolInitialMessage(null);
    };

    const handleTransferToTZ = (idea: string) => {
        setToolInitialMessage(idea);
        setSelectedTool('tz_helper');
    };

    const loadCohorts = async () => {
        const token = localStorage.getItem('vibes_token');
        if (!token) return;

        try {
            const response = await fetch('/api/admin?resource=cohorts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setCohorts(result.data);
                // Выбрать первую активную когорту по умолчанию
                if (!selectedCohortId && result.data.length > 0) {
                    const active = result.data.find((c: Cohort) => c.isActive);
                    setSelectedCohortId(active?.id || result.data[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading cohorts:', error);
        }
    };

    const loadInvites = async () => {
        const token = localStorage.getItem('vibes_token');
        if (!token) return;

        try {
            const response = await fetch('/api/admin?resource=invites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                const apiInvites = result.data.map((invite: any) => ({
                    id: invite.id,
                    token: invite.token,
                    status: invite.status,
                    created: invite.createdAt,
                    expiresAt: invite.expiresAt,
                    usedByEmail: invite.usedByEmail,
                    usedByName: invite.usedByName,
                    usedAt: invite.usedAt
                }));
                setInvites(apiInvites);
            }
        } catch (error) {
            console.error('Error loading invites:', error);
        }
    };

    const loadStudents = async () => {
        const token = localStorage.getItem('vibes_token');
        if (!token) return;

        try {
            const response = await fetch('/api/admin?resource=students', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                setStudents(result.data);
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
    };

    const generateInvites = async (count: number, daysValid: number | null) => {
        const token = localStorage.getItem('vibes_token');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        const newInvites: InviteLink[] = [];

        for (let i = 0; i < count; i++) {
            try {
                const response = await fetch('/api/admin?resource=invites', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        expiresInDays: daysValid,
                        cohortId: selectedCohortId
                    })
                });

                const result = await response.json();

                if (result.success) {
                    const invite = result.data;
                    newInvites.push({
                        id: invite.id,
                        token: invite.token,
                        status: invite.status,
                        created: invite.createdAt,
                        expiresAt: invite.expiresAt
                    });
                }
            } catch (error) {
                console.error('Error creating invite:', error);
            }
        }

        // Обновить локальный state для UI
        setInvites(prev => [...newInvites, ...prev]);
    };

    const deleteInvite = async (id: string) => {
        const token = localStorage.getItem('vibes_token');
        if (!token) return;

        try {
            const response = await fetch(`/api/admin?resource=invites&id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Удалить из локального state
                setInvites(prev => prev.filter(i => i.id !== id));
            }
        } catch (error) {
            console.error('Error deleting invite:', error);
        }
    };

    const deactivateInvite = async (id: string) => {
        const token = localStorage.getItem('vibes_token');
        if (!token) return;

        try {
            const response = await fetch(`/api/admin?resource=invites&id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Обновить локальный state - пометить как деактивированный
                setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'deactivated' } : i));
            }
        } catch (error) {
            console.error('Error deactivating invite:', error);
        }
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // --- Render Views ---

    // Show splash screen while checking auth
    if (isAuthLoading) return <SplashScreen />;

    if (view === 'login') return <Login onLogin={handleLogin} onNavigateToRegister={() => setView('register')} onSimulateResetLink={() => setView('reset-password')} />;
    if (view === 'reset-password') return <Login onLogin={handleLogin} onNavigateToRegister={() => setView('register')} initialView="reset" onSimulateResetLink={() => { }} onResetComplete={() => setView('login')} />;
    if (view === 'register' && inviteCodeFromUrl) return <Register inviteCode={inviteCodeFromUrl} onRegister={handleRegister} onNavigateLogin={() => { window.history.replaceState({}, '', window.location.pathname); setView('login'); }} />;

    const selectedCohortName = cohorts.find(c => c.id === selectedCohortId)?.name || null;

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Suspense fallback={<ViewSkeleton />}><Home onNavigate={setActiveTab} userName={currentUser?.name} userCohort={userCohort} /></Suspense>;
            case 'lessons': return <Suspense fallback={<ViewSkeleton />}><Lessons /></Suspense>;
            case 'roadmaps': return <Suspense fallback={<ViewSkeleton />}><Roadmaps /></Suspense>;
            case 'styles': return <Suspense fallback={<ViewSkeleton />}><StyleLibrary /></Suspense>;
            case 'prompts': return <Suspense fallback={<ViewSkeleton />}><PromptBase /></Suspense>;
            case 'glossary': return <Suspense fallback={<ViewSkeleton />}><Glossary onNavigate={setActiveTab} onAskAI={handleAskAI} /></Suspense>;
            case 'tools':
                if (selectedTool) {
                    return (
                        <Suspense fallback={<ViewSkeleton />}>
                            <ToolChat
                                toolType={selectedTool}
                                onBack={handleBackFromTool}
                                onTransferToTZ={selectedTool === 'ideas' ? handleTransferToTZ : undefined}
                                initialMessage={toolInitialMessage}
                            />
                        </Suspense>
                    );
                }
                return <Suspense fallback={<ViewSkeleton />}><ToolsView onSelectTool={handleSelectTool} /></Suspense>;
            case 'profile': return currentUser ? <Suspense fallback={<ViewSkeleton />}><UserProfile user={currentUser} onUserUpdate={handleUserUpdate} /></Suspense> : <Suspense fallback={<ViewSkeleton />}><Home onNavigate={setActiveTab} userName={currentUser?.name} /></Suspense>;

            // Admin Views (lazy-loaded with Suspense)
            case 'admin-students': return (
                <Suspense fallback={<ViewSkeleton />}>
                    <AdminStudents students={students} onUpdateStudent={handleUpdateStudent} onAddStudent={handleAddStudent} onDeleteStudent={handleDeleteStudent} selectedCohortId={selectedCohortId} selectedCohortName={selectedCohortName} />
                </Suspense>
            );
            case 'admin-content': return (
                <Suspense fallback={<ViewSkeleton />}>
                    <AdminContent selectedCohortId={selectedCohortId} selectedCohortName={selectedCohortName} cohorts={cohorts} />
                </Suspense>
            );
            case 'admin-calls': return (
                <Suspense fallback={<ViewSkeleton />}>
                    <AdminCalls selectedCohortId={selectedCohortId} cohorts={cohorts} selectedCohortName={selectedCohortName} />
                </Suspense>
            );
            case 'admin-cohorts': return (
                <Suspense fallback={<ViewSkeleton />}>
                    <AdminCohorts cohorts={cohorts} onCohortsChange={loadCohorts} />
                </Suspense>
            );
            case 'admin-tools': return (
                <Suspense fallback={<ViewSkeleton />}>
                    <AdminAssistant />
                </Suspense>
            );
            case 'admin-analytics': return (
                <Suspense fallback={<ViewSkeleton />}>
                    <AdminAnalytics selectedCohortId={selectedCohortId} selectedCohortName={selectedCohortName} />
                </Suspense>
            );
            case 'admin-settings': return (
                <Suspense fallback={<ViewSkeleton />}>
                    <AdminSettings invites={invites} onGenerateInvites={generateInvites} onDeleteInvite={deleteInvite} onDeactivateInvite={deactivateInvite} selectedCohortName={selectedCohortName} />
                </Suspense>
            );

            default: return mode === 'admin' ? (
                <Suspense fallback={<ViewSkeleton />}>
                    <AdminStudents students={students} onUpdateStudent={handleUpdateStudent} onAddStudent={handleAddStudent} onDeleteStudent={handleDeleteStudent} selectedCohortId={selectedCohortId} />
                </Suspense>
            ) : <Suspense fallback={<ViewSkeleton />}><Home onNavigate={setActiveTab} userName={currentUser?.name} /></Suspense>;
        }
    };

    return (
        <div className={`min-h-[100dvh] bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-purple-500/30 selection:text-purple-900 dark:selection:text-white transition-colors duration-300 ${mode === 'admin' ? 'admin-mode' : ''}`}>
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden gpu-accelerated">
                {mode === 'student' ? (
                    <>
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/12 dark:bg-purple-900/12 rounded-full blur-[120px] animate-blob" />
                        <div className="absolute bottom-[10%] right-[0%] w-[30%] h-[30%] bg-violet-600/12 dark:bg-violet-900/12 rounded-full blur-[100px] animate-blob animation-delay-2000" />
                        <div className="absolute top-[30%] right-[-5%] w-[25%] h-[25%] bg-violet-600/8 dark:bg-violet-900/12 rounded-full blur-[80px] animate-blob animation-delay-4000" />
                        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(168,85,247,0.05) 0%, transparent 50%)' }} />
                    </>
                ) : (
                    <>
                        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-emerald-900/5 rounded-full blur-[150px] animate-blob" />
                        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-zinc-500/5 rounded-full blur-[120px] animate-blob animation-delay-2000" />
                    </>
                )}
            </div>

            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} theme={theme} toggleTheme={toggleTheme} mode={mode} setMode={setMode} navConfig={navConfig} />

            <main className="md:pl-72 min-h-[100dvh] flex flex-col relative z-10">
                <header className="md:hidden h-auto pt-[calc(1rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30 border-b border-zinc-200 dark:border-white/5 transition-colors duration-300">
                    <div className="flex items-center gap-3">
                        {mode === 'student' ? (
                            <img src="https://i.imgur.com/f3UfhpM.png" alt="VIBES Logo" className="h-10 w-auto object-contain dark:brightness-0 dark:invert" />
                        ) : (
                            <span className="font-bold text-lg">ADMIN</span>
                        )}
                    </div>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <Menu size={24} />
                    </button>
                </header>

                {(activeTab === 'dashboard' || activeTab.startsWith('admin-')) && (
                    <div className="hidden md:flex justify-between items-center px-8 py-6 w-full max-w-[1600px] mx-auto">
                        {mode === 'admin' && cohorts.length > 0 ? (
                            <CohortSelector cohorts={cohorts} selectedId={selectedCohortId} onChange={setSelectedCohortId} />
                        ) : <div />}
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-zinc-900 dark:text-white">{currentUser?.name}</span>
                                <button onClick={handleLogout} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">Выйти</button>
                            </div>
                            <button onClick={() => setActiveTab('profile')} className={`w-10 h-10 rounded-full p-0.5 transition-transform hover:scale-105 ${mode === 'admin' ? 'bg-gradient-to-tr from-emerald-500 to-cyan-500' : 'bg-gradient-to-tr from-purple-500 to-violet-500'}`}>
                                {currentUser?.avatar && !currentUser.avatar.includes('ui-avatars') ? (
                                    <img src={currentUser.avatar} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-white dark:border-zinc-900" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center font-bold text-purple-600">{currentUser?.name?.[0]}</div>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                <div className={cn("flex-1 w-full pt-0", activeTab !== 'lessons' && "max-w-[1600px] mx-auto")}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 15, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.99 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="h-full"
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <SoundProvider>
            <AppContent />
        </SoundProvider>
    );
}

export default App;
