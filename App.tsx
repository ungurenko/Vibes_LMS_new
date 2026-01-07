
import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Home from './views/Home';
import StyleLibrary from './views/StyleLibrary';
import Glossary from './views/Glossary';
import Assistant from './views/Assistant';
import Lessons from './views/Lessons';
import PromptBase from './views/PromptBase';
import Roadmaps from './views/Roadmaps';
import AdminStudents from './views/AdminStudents';
import AdminContent from './views/AdminContent';
import AdminCalls from './views/AdminCalls';
import AdminAssistant from './views/AdminAssistant';
import AdminSettings from './views/AdminSettings';
import UserProfile from './views/UserProfile';
import Login from './views/Login';
import Register from './views/Register';
import Onboarding from './views/Onboarding';
import { TabId, InviteLink, Student, CourseModule } from './types';
import { STUDENTS_DATA, COURSE_MODULES } from './data';
import { motion, AnimatePresence } from 'framer-motion';
import { SoundProvider } from './SoundContext';

// Mock DB Initializer
const initializeInvites = (): InviteLink[] => {
    const saved = localStorage.getItem('vibes_invites');
    if (saved) return JSON.parse(saved);
    return [
        { id: '1', token: 'demo123', status: 'active', created: new Date().toISOString() }
    ];
};

const initializeStudents = (): Student[] => {
    const saved = localStorage.getItem('vibes_students_db');
    if (saved) return JSON.parse(saved);
    return STUDENTS_DATA;
}

const AppContent: React.FC = () => {
    // --- Auth & Routing State ---
    const [currentUser, setCurrentUser] = useState<Student | null>(null);
    const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState<string | null>(null);
    const [view, setView] = useState<'login' | 'register' | 'app' | 'reset-password' | 'onboarding'>('login');

    // --- App Data State (The "Database") ---
    const [students, setStudents] = useState<Student[]>(initializeStudents);
    const [invites, setInvites] = useState<InviteLink[]>(initializeInvites);

    // Modules теперь загружаются напрямую из API в компонентах

    // --- UI State ---
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
    const [mode, setMode] = useState<'student' | 'admin'>('student');

    const [assistantInitialMessage, setAssistantInitialMessage] = useState<string | null>(null);

    // Убрали сохранение modules в localStorage

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
                        });
                        if (user.role === 'admin') {
                            setMode('admin');
                            setActiveTab('admin-students');
                        } else {
                            setMode('student');
                            setActiveTab('dashboard');
                        }
                        setView('app');
                    } else {
                        // Токен невалидный - удаляем и показываем логин
                        localStorage.removeItem('vibes_token');
                        setView('login');
                    }
                })
                .catch(() => {
                    setView('login');
                });
        } else {
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

    // 3. Persist Data
    useEffect(() => {
        localStorage.setItem('vibes_invites', JSON.stringify(invites));
    }, [invites]);

    useEffect(() => {
        localStorage.setItem('vibes_students_db', JSON.stringify(students));
    }, [students]);

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
                });

                if (user.role === 'admin') {
                    setMode('admin');
                    setActiveTab('admin-students');
                } else {
                    setMode('student');
                    setActiveTab('dashboard');

                    const hasOnboarded = localStorage.getItem(`vibes_onboarded_${user.id}`);
                    if (!hasOnboarded) {
                        setView('onboarding');
                        return;
                    }
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

    const handleRegister = (data: { name: string; email: string; avatar?: string }) => {
        if (inviteCodeFromUrl) {
            setInvites(prev => prev.map(inv => {
                if (inv.token === inviteCodeFromUrl) {
                    return { ...inv, status: 'used', usedByEmail: data.email, usedByName: data.name, usedAt: new Date().toISOString() };
                }
                return inv;
            }));
        }

        const newId = Date.now().toString();
        const newUser: Student = {
            id: newId,
            name: data.name,
            email: data.email,
            avatar: data.avatar || `https://ui-avatars.com/api/?name=${data.name}&background=8b5cf6&color=fff`,
            status: 'active',
            progress: 0,
            currentModule: 'Модуль 1',
            lastActive: 'Только что',
            joinedDate: new Date().toISOString(),
            projects: {},
        };

        setStudents(prev => [...prev, newUser]);
        setCurrentUser(newUser);
        setMode('student');
        localStorage.setItem('vibes_user_id', newId);
        window.history.replaceState({}, '', window.location.pathname);
        setView('onboarding');
    };

    const completeOnboarding = () => {
        if (currentUser?.id) {
            localStorage.setItem(`vibes_onboarded_${currentUser.id}`, 'true');
            setView('app');
        }
    };

    const validateInvite = (code: string): InviteLink | null => {
        const invite = invites.find(i => i.token === code);
        if (!invite) return null;
        if (invite.status === 'deactivated') return null;
        if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return null;
        return invite;
    };

    const handleLogout = () => {
        localStorage.removeItem('vibes_token');
        setCurrentUser(null);
        setMode('student');
        setActiveTab('dashboard');
        setView('login');
    };

    const handleAskAI = (prompt: string) => {
        setAssistantInitialMessage(prompt);
        setActiveTab('assistant');
    };

    const generateInvites = (count: number, daysValid: number | null) => {
        const newInvites: InviteLink[] = [];
        const expiresAt = daysValid ? new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString() : null;

        for (let i = 0; i < count; i++) {
            const randomToken = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 6);
            newInvites.push({
                id: Date.now().toString() + i,
                token: randomToken,
                status: 'active',
                created: new Date().toISOString(),
                expiresAt: expiresAt
            });
        }
        setInvites(prev => [...newInvites, ...prev]);
    };

    const deleteInvite = (id: string) => {
        setInvites(prev => prev.filter(i => i.id !== id));
    };

    const deactivateInvite = (id: string) => {
        setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'deactivated' } : i));
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // --- Render Views ---

    if (view === 'login') return <Login onLogin={handleLogin} onNavigateToRegister={() => setView('register')} onSimulateResetLink={() => setView('reset-password')} />;
    if (view === 'reset-password') return <Login onLogin={handleLogin} onNavigateToRegister={() => setView('register')} initialView="reset" onSimulateResetLink={() => { }} onResetComplete={() => setView('login')} />;
    if (view === 'register' && inviteCodeFromUrl) return <Register inviteCode={inviteCodeFromUrl} validateInvite={validateInvite} onRegister={handleRegister} onNavigateLogin={() => { window.history.replaceState({}, '', window.location.pathname); setView('login'); }} />;
    if (view === 'onboarding' && currentUser) return <Onboarding userName={currentUser.name} onComplete={completeOnboarding} />;

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Home onNavigate={setActiveTab} />;
            // Update Lessons to receive modules prop
            case 'lessons': return <Lessons />;
            case 'roadmaps': return <Roadmaps />;
            case 'styles': return <StyleLibrary />;
            case 'prompts': return <PromptBase />;
            case 'glossary': return <Glossary onNavigate={setActiveTab} onAskAI={handleAskAI} />;
            case 'assistant': return <Assistant initialMessage={assistantInitialMessage} onMessageHandled={() => setAssistantInitialMessage(null)} />;
            case 'profile': return currentUser ? <UserProfile user={currentUser} /> : <Home onNavigate={setActiveTab} />;

            // Admin Views
            case 'admin-students': return <AdminStudents students={students} onUpdateStudent={handleUpdateStudent} onAddStudent={handleAddStudent} onDeleteStudent={handleDeleteStudent} />;
            // Update AdminContent to receive modules and updater
            case 'admin-content': return <AdminContent />;
            case 'admin-calls': return <AdminCalls />;
            case 'admin-assistant': return <AdminAssistant />;
            case 'admin-settings': return <AdminSettings invites={invites} onGenerateInvites={generateInvites} onDeleteInvite={deleteInvite} onDeactivateInvite={deactivateInvite} />;

            default: return mode === 'admin' ? <AdminStudents students={students} onUpdateStudent={handleUpdateStudent} onAddStudent={handleAddStudent} onDeleteStudent={handleDeleteStudent} /> : <Home onNavigate={setActiveTab} />;
        }
    };

    return (
        <div className={`min-h-[100dvh] bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-white transition-colors duration-300 ${mode === 'admin' ? 'admin-mode' : ''}`}>
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden gpu-accelerated">
                {mode === 'student' ? (
                    <>
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 dark:bg-violet-900/10 rounded-full blur-[120px] animate-blob" />
                        <div className="absolute bottom-[10%] right-[0%] w-[30%] h-[30%] bg-fuchsia-600/10 dark:bg-fuchsia-900/10 rounded-full blur-[100px] animate-blob animation-delay-2000" />
                    </>
                ) : (
                    <>
                        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-emerald-900/5 rounded-full blur-[150px] animate-blob" />
                        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-zinc-500/5 rounded-full blur-[120px] animate-blob animation-delay-2000" />
                    </>
                )}
            </div>

            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} theme={theme} toggleTheme={toggleTheme} mode={mode} setMode={setMode} />

            <main className="md:pl-72 min-h-[100dvh] flex flex-col relative z-10">
                <header className="md:hidden h-auto py-4 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30 border-b border-zinc-200 dark:border-white/5 transition-colors duration-300">
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

                <div className="hidden md:flex justify-end items-center px-8 py-6 w-full max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{currentUser?.name}</span>
                            <button onClick={handleLogout} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">Выйти</button>
                        </div>
                        <button onClick={() => setActiveTab('profile')} className={`w-10 h-10 rounded-full p-0.5 transition-transform hover:scale-105 ${mode === 'admin' ? 'bg-gradient-to-tr from-emerald-500 to-cyan-500' : 'bg-gradient-to-tr from-violet-500 to-fuchsia-500'}`}>
                            {currentUser?.avatar && !currentUser.avatar.includes('ui-avatars') ? (
                                <img src={currentUser.avatar} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-white dark:border-zinc-900" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center font-bold text-violet-600">{currentUser?.name?.[0]}</div>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 w-full max-w-[1600px] mx-auto pt-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 15, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.99 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
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
