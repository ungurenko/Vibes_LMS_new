
import React, { useState } from 'react';
import {
  LayoutDashboard,
  Palette,
  Book,
  Wrench,
  X,
  Moon,
  Sun,
  GraduationCap,
  Terminal,
  Users,
  Video,
  Settings,
  ShieldCheck,
  LogOut,
  Sparkles,
  ListTodo,
  Volume2,
  VolumeX,
  Lock,
  Laptop,
  Layers,
  BarChart3
} from 'lucide-react';
import { NavItem, TabId, NavigationConfig } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../SoundContext';
import AdminPasswordModal from './AdminPasswordModal';
import { Button } from '@/components/ui/button';

// Preload map: tab → dynamic import для предзагрузки чанков при hover
const preloadMap: Partial<Record<TabId, () => Promise<any>>> = {
  dashboard: () => import('../views/Home'),
  lessons: () => import('../views/Lessons'),
  roadmaps: () => import('../views/Roadmaps'),
  styles: () => import('../views/StyleLibrary'),
  prompts: () => import('../views/PromptBase'),
  glossary: () => import('../views/Glossary'),
  tools: () => import('../views/ToolsView'),
  profile: () => import('../views/UserProfile'),
};

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  mode: 'student' | 'admin';
  setMode: (mode: 'student' | 'admin') => void;
  navConfig: NavigationConfig | null;
}

const studentNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { id: 'lessons', label: 'Уроки', icon: GraduationCap },
  { id: 'roadmaps', label: 'Дорожные карты', icon: ListTodo },
  { id: 'styles', label: 'Стили', icon: Palette },
  { id: 'prompts', label: 'Промпты', icon: Terminal },
  { id: 'glossary', label: 'Словарик', icon: Book },
  { id: 'tools', label: 'Инструменты', icon: Wrench },
  { id: 'practice', label: 'Практика', icon: Laptop, href: 'https://vibes-praktic.vercel.app/' },
];

const adminNavItems: NavItem[] = [
  { id: 'admin-students', label: 'Ученики', icon: Users },
  { id: 'admin-content', label: 'Контент', icon: Book },
  { id: 'admin-calls', label: 'Созвоны', icon: Video },
  { id: 'admin-cohorts', label: 'Потоки', icon: Layers },
  { id: 'admin-tools', label: 'Инструменты', icon: Sparkles },
  { id: 'admin-analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'admin-settings', label: 'Настройки', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen, theme, toggleTheme, mode, setMode, navConfig }) => {
  const { playSound, isEnabled, toggleSound } = useSound();
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Фильтруем студенческие вкладки на основе конфигурации
  const visibleStudentNavItems = studentNavItems.filter(item => {
    // Если конфигурация не загружена - показываем все (fallback)
    if (!navConfig) return true;

    // Проверяем видимость вкладки
    return navConfig[item.id as keyof NavigationConfig] !== false;
  });

  const navItems = mode === 'student' ? visibleStudentNavItems : adminNavItems;

  const sidebarContent = (
    <div className="h-full flex flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-r border-zinc-200 dark:border-white/5 transition-colors duration-300 shadow-xl shadow-zinc-200/20 dark:shadow-none">
      {/* Logo Area */}
      <div className="flex items-center justify-between mb-6 pl-2 pt-2">
        <div className="flex items-center gap-3">
            {mode === 'student' ? (
                 <div className="relative group cursor-pointer">
                    <img 
                        src="https://i.imgur.com/f3UfhpM.png" 
                        alt="VIBES Logo" 
                        className="h-24 w-auto object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-sm"
                    />
                    <div className="absolute -bottom-2 right-0 text-[9px] font-bold tracking-[0.2em] text-purple-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        Academy
                    </div>
                 </div>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 flex items-center justify-center text-white dark:text-black shadow-lg">
                        <ShieldCheck size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-white leading-none">ADMIN</span>
                        <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Panel</span>
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2">
            {/* Admin Toggle Icon */}
             <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    playSound('click');
                    if (mode === 'student') {
                        setShowAdminModal(true);
                    } else {
                        setMode('student');
                        setActiveTab('dashboard');
                        setIsOpen(false);
                    }
                }}
                className={`min-w-[44px] min-h-[44px] ${
                    mode === 'admin'
                    ? 'text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
                title={mode === 'student' ? 'Вход для куратора' : 'Выйти из админки'}
             >
                {mode === 'student' ? <Lock size={18} /> : <LogOut size={18} />}
             </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="md:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white min-w-[44px] min-h-[44px]"
            >
              <X size={24} />
            </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-none py-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          if (item.href) {
            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  playSound('click');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200`}
              >
                <div className={`relative z-10 p-1.5 rounded-lg transition-colors duration-300 group-hover:text-purple-500 dark:group-hover:text-purple-300`}>
                  <item.icon size={20} strokeWidth={2} />
                </div>
                <span className={`relative z-10 text-base font-medium tracking-wide`}>{item.label}</span>
              </a>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                playSound('click');
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              onMouseEnter={() => preloadMap[item.id]?.()}
              onTouchStart={() => preloadMap[item.id]?.()}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                isActive
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-white dark:bg-white/[0.08] rounded-2xl shadow-[0_1px_6px_rgba(0,0,0,0.03)] dark:shadow-none border border-zinc-100 dark:border-white/[0.05]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className={`relative z-10 p-1.5 rounded-lg transition-colors duration-300 ${
                  isActive 
                  ? 'text-purple-600 dark:text-purple-400' 
                  : 'group-hover:text-purple-500 dark:group-hover:text-purple-300'
              }`}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]" : ""} />
              </div>
              <span className={`relative z-10 text-base font-medium tracking-wide ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
              {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute left-0 w-0.5 h-4 bg-purple-600 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="mt-auto space-y-3 pt-6 border-t border-zinc-200/50 dark:border-white/5">
        <div className="flex gap-2">
            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { playSound('click'); toggleTheme(); }}
              className="flex-1 flex items-center justify-between px-4 py-3 h-auto rounded-2xl bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 group"
            >
               <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 uppercase tracking-wider">
                 {theme === 'dark' ? 'Тёмная' : 'Светлая'}
               </span>
               <div className="p-1.5 rounded-lg bg-white dark:bg-black/40 text-purple-600 dark:text-purple-400 shadow-sm border border-zinc-100 dark:border-white/5 group-hover:scale-110 transition-transform">
                 {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
               </div>
            </Button>

            {/* Sound Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSound}
              className="rounded-2xl bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400"
              title={isEnabled ? "Выключить звук" : "Включить звук"}
            >
               {isEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 h-screen fixed left-0 top-0 z-40 bg-transparent">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[85vw] max-w-72 z-50 bg-transparent"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Admin Password Modal */}
      <AdminPasswordModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => {
          setMode('admin');
          setActiveTab('admin-students');
          setIsOpen(false);
        }}
      />
    </>
  );
};

export default Sidebar;
