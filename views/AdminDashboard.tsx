
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Activity,
  TrendingUp,
  Layout,
  Server,
  AlertCircle,
  CheckCircle2,
  X,
  MessageSquare,
  Clock,
  Calendar,
  MoreHorizontal,
  ArrowRight,
  Bell,
  Save,
  Zap,
  ChevronRight,
  Send,
  Play,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer, Input } from '../components/Shared';
import { fetchWithAuthGet } from '../lib/fetchWithAuth';

// --- Types ---

interface DashboardMetrics {
  totalStudents: { value: string; change: string; changePercent: number };
  activeNow: { value: string; change: string; isPositive: boolean };
  avgProgress: { value: string; isPositive: boolean };
  newProjects: { value: string; change: string };
}

interface PipelineStage {
  id: string;
  title: string;
  count: number;
  avatars: string[];
}

interface DashboardStats {
  metrics: DashboardMetrics;
  pipeline: PipelineStage[];
  lastUpdated: string;
}

// --- Цвета для pipeline стадий ---
const STAGE_COLORS: Record<string, string> = {
  'База': 'bg-zinc-200 dark:bg-zinc-700',
  'Лендинг': 'bg-purple-500',
  'Веб-сервис': 'bg-indigo-500',
  'Финал': 'bg-emerald-500',
};

const INITIAL_ALERTS = [
  { id: 1, type: 'danger', title: 'Отстающие', message: 'Иван и еще 2 студента не заходили 5 дней', action: 'Напомнить' },
  { id: 2, type: 'warning', title: 'Проверка', message: '5 новых работ на проверке в модуле Лендинг', action: 'Проверить' },
  { id: 3, type: 'info', title: 'Вопрос', message: 'Сложный вопрос в чате от Марии Д.', action: 'Ответить' },
];

const NEXT_CALL = {
  date: 'Сегодня',
  time: '19:00',
  topic: 'Разбор домашних заданий: Лендинг',
  subtopic: 'Типичные ошибки в верстке и дизайне',
  attendees: 142
};

// --- Components ---

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 100" className="w-full h-12 overflow-visible opacity-50" preserveAspectRatio="none">
            <polyline 
                points={points} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={color}
            />
        </svg>
    );
};

const AdminDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [greeting, setGreeting] = useState('');

  // Dashboard stats from API
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Call Editor State
  const [isEditCallOpen, setIsEditCallOpen] = useState(false);
  const [callDetails, setCallDetails] = useState(NEXT_CALL);

  // Загрузка статистики из API
  const fetchStats = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);

    try {
      const data = await fetchWithAuthGet<DashboardStats>('/api/admin?resource=dashboard-stats');
      setStats(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Доброе утро');
    else if (hour < 18) setGreeting('Добрый день');
    else setGreeting('Добрый вечер');

    // Загружаем статистику при монтировании
    fetchStats();

    // Auto-refresh каждые 5 минут
    const interval = setInterval(() => fetchStats(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const dismissAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleAction = (id: number) => {
      // Simulate action
      dismissAlert(id);
  };

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32"
    >
      
      {/* 1. HERO HEADER: Greeting & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
         <div>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1 text-sm font-medium">
                <span>{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                    Система активна
                </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
                {greeting}, Админ 👋
            </h2>
         </div>
         
         <div className="flex gap-3">
             <button className="px-5 py-2.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 rounded-xl font-bold text-sm shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2">
                 <Bell size={18} />
                 <span>Уведомления</span>
                 {alerts.length > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{alerts.length}</span>}
             </button>
             <button className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                 <Send size={18} />
                 <span>Сделать рассылку</span>
             </button>
         </div>
      </div>

      {/* 2. SMART METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         {isLoading ? (
           // Skeleton loader
           <>
             {[1, 2, 3, 4].map((i) => (
               <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 animate-pulse">
                 <div className="flex justify-between items-start mb-4">
                   <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
                   <div className="w-16 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                 </div>
                 <div className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                 <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
               </div>
             ))}
           </>
         ) : stats ? (
           // Real metrics
           <>
             {/* Всего учеников */}
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0 }}
               className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-500/30 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:shadow-purple-500/5"
             >
               <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                   <Users size={20} />
                 </div>
                 <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                   <TrendingUp size={12} />
                   {stats.metrics.totalStudents.change}
                 </div>
               </div>
               <div className="relative z-10">
                 <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-white tracking-tight">{stats.metrics.totalStudents.value}</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">Всего учеников</p>
               </div>
             </motion.div>

             {/* Активных сейчас */}
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-500/30 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:shadow-purple-500/5"
             >
               <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                   <Zap size={20} />
                 </div>
                 <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${stats.metrics.activeNow.isPositive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'}`}>
                   {stats.metrics.activeNow.change}
                 </div>
               </div>
               <div className="relative z-10">
                 <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-white tracking-tight">{stats.metrics.activeNow.value}</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">Активных (7 дней)</p>
               </div>
             </motion.div>

             {/* Средний прогресс */}
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-500/30 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:shadow-purple-500/5"
             >
               <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                   <CheckCircle2 size={20} />
                 </div>
                 <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${stats.metrics.avgProgress.isPositive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-amber-600 bg-amber-50 dark:bg-amber-500/10'}`}>
                   {stats.metrics.avgProgress.isPositive ? 'Хорошо' : 'Низкий'}
                 </div>
               </div>
               <div className="relative z-10">
                 <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-white tracking-tight">{stats.metrics.avgProgress.value}</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">Средний прогресс</p>
               </div>
             </motion.div>

             {/* Проекты */}
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-500/30 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:shadow-purple-500/5"
             >
               <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500">
                   <Layout size={20} />
                 </div>
                 <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                   <TrendingUp size={12} />
                   {stats.metrics.newProjects.change}
                 </div>
               </div>
               <div className="relative z-10">
                 <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-white tracking-tight">{stats.metrics.newProjects.value}</h3>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">Проектов в витрине</p>
               </div>
             </motion.div>
           </>
         ) : null}
      </div>

      {/* Время последнего обновления */}
      {lastRefresh && (
        <div className="flex items-center justify-end gap-2 mb-4 -mt-4">
          <button
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            Обновлено {lastRefresh.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* LEFT COL: Pipeline & Activity */}
         <div className="lg:col-span-2 space-y-8">
            
            {/* 3. VISUAL STUDENT PIPELINE */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 p-8"
            >
                <div className="flex justify-between items-center mb-8">
                   <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Поток студентов</h3>
                   <button className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">
                      Все студенты <ArrowRight size={12} className="inline" />
                   </button>
                </div>

                <div className="space-y-6">
                   {isLoading ? (
                     // Skeleton for pipeline
                     <>
                       {[1, 2, 3, 4].map((i) => (
                         <div key={i} className="animate-pulse">
                           <div className="flex justify-between items-center mb-3">
                             <div className="flex items-center gap-3">
                               <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                               <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
                             </div>
                             <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
                           </div>
                           <div className="h-14 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl" />
                         </div>
                       ))}
                     </>
                   ) : stats?.pipeline && stats.pipeline.length > 0 ? (
                     stats.pipeline.map((stage) => {
                       const stageColor = STAGE_COLORS[stage.title] || 'bg-zinc-500';
                       const totalStudents = parseInt(stats.metrics.totalStudents.value.replace(/\s/g, '')) || 1;

                       return (
                         <div key={stage.id} className="group cursor-pointer">
                           <div className="flex justify-between items-center mb-3">
                             <div className="flex items-center gap-3">
                               <span className={`w-3 h-3 rounded-full ${stageColor} shadow-[0_0_8px_currentColor] opacity-80`} />
                               <span className="font-bold text-zinc-700 dark:text-zinc-200 text-sm">{stage.title}</span>
                             </div>
                             <span className="font-mono text-xs text-zinc-400 font-bold">{stage.count} чел.</span>
                           </div>

                           {/* Pipeline Bar Visual */}
                           <div className="relative h-14 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-white/5 flex items-center px-4 overflow-hidden group-hover:border-zinc-300 dark:group-hover:border-white/20 transition-colors">
                             {/* Progress Fill Background */}
                             <div
                               className={`absolute top-0 left-0 bottom-0 ${stageColor} opacity-5 transition-all`}
                               style={{ width: `${Math.min((stage.count / totalStudents) * 100, 100)}%` }}
                             />

                             {/* Avatars */}
                             <div className="flex items-center -space-x-3 relative z-10">
                               {stage.avatars.slice(0, 5).map((src, i) => (
                                 <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 overflow-hidden ring-1 ring-black/5 hover:scale-110 hover:z-20 transition-transform bg-zinc-200">
                                   <img src={src} alt="" className="w-full h-full object-cover" />
                                 </div>
                               ))}
                               {stage.count > stage.avatars.length && (
                                 <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-500 shadow-sm z-0">
                                   +{stage.count - stage.avatars.length}
                                 </div>
                               )}
                               {stage.count === 0 && (
                                 <span className="text-xs text-zinc-400">Пока нет студентов</span>
                               )}
                             </div>

                             <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                               <ChevronRight size={18} className="text-zinc-400" />
                             </div>
                           </div>
                         </div>
                       );
                     })
                   ) : (
                     <div className="text-center py-8 text-zinc-400">
                       <p>Нет данных о стадиях</p>
                     </div>
                   )}
                </div>
            </motion.div>

            {/* 5. ACTIONABLE ALERTS STACK */}
            <div className="space-y-4">
                <h3 className="font-bold text-zinc-500 dark:text-zinc-400 text-sm uppercase tracking-wider px-2">Входящие задачи</h3>
                <AnimatePresence mode="popLayout">
                    {alerts.length > 0 ? alerts.map(alert => (
                        <motion.div
                            key={alert.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-white/5 flex items-center gap-5 shadow-sm group hover:shadow-md transition-shadow"
                        >
                            <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                                alert.type === 'danger' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' :
                                alert.type === 'warning' ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10' :
                                'bg-blue-50 text-blue-500 dark:bg-blue-500/10'
                            }`}>
                                <AlertCircle size={24} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-zinc-900 dark:text-white text-base mb-0.5">{alert.title}</h4>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{alert.message}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleAction(alert.id)}
                                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                                >
                                    {alert.action}
                                </button>
                                <button
                                    onClick={() => dismissAlert(alert.id)}
                                    className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center bg-white/50 dark:bg-white/[0.02] rounded-3xl border border-dashed border-zinc-200 dark:border-white/10">
                            <div className="inline-flex p-4 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 mb-3">
                                <CheckCircle2 size={24} />
                            </div>
                            <p className="font-bold text-zinc-900 dark:text-white">Все чисто!</p>
                            <p className="text-sm text-zinc-500">Задач на сегодня больше нет.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
         </div>

         {/* RIGHT COL: Event & Quick Actions */}
         <div className="lg:col-span-1 space-y-8">
            
            {/* 4. HOLO-TICKET EVENT CARD */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative group perspective-1000"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="relative bg-zinc-900 dark:bg-white text-white dark:text-black rounded-3xl overflow-hidden shadow-2xl">
                    {/* Noise & Texture */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
                    
                    {/* Top Section */}
                    <div className="p-8 pb-10 relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <span className="px-3 py-1 bg-white/20 dark:bg-black/10 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                Live Event
                            </span>
                            <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-black/5 flex items-center justify-center backdrop-blur-md">
                                <Calendar size={18} />
                            </div>
                        </div>
                        
                        <h3 className="font-display text-3xl font-bold leading-tight mb-2">
                            {callDetails.topic}
                        </h3>
                        <p className="text-white/70 dark:text-black/60 text-sm leading-relaxed mb-6">
                            {callDetails.subtopic}
                        </p>

                        <div className="flex items-center gap-6">
                            <div>
                                <div className="text-xs uppercase font-bold text-white/50 dark:text-black/40 tracking-wider">Начало</div>
                                <div className="text-xl font-mono font-bold">{callDetails.time}</div>
                            </div>
                            <div className="w-px h-8 bg-white/20 dark:bg-black/10" />
                            <div>
                                <div className="text-xs uppercase font-bold text-white/50 dark:text-black/40 tracking-wider">Участники</div>
                                <div className="text-xl font-mono font-bold">{callDetails.attendees}</div>
                            </div>
                        </div>
                    </div>

                    {/* Tear Line Visual */}
                    <div className="relative h-6 flex items-center">
                        <div className="w-6 h-6 bg-slate-50 dark:bg-zinc-950 rounded-full -ml-3" />
                        <div className="flex-1 h-px border-t-2 border-dashed border-white/20 dark:border-black/10 mx-2" />
                        <div className="w-6 h-6 bg-slate-50 dark:bg-zinc-950 rounded-full -mr-3" />
                    </div>

                    {/* Bottom Action Section */}
                    <div className="p-4 bg-black/20 dark:bg-black/5 backdrop-blur-sm">
                        <button 
                            onClick={() => setIsEditCallOpen(true)}
                            className="w-full py-4 bg-white dark:bg-black text-black dark:text-white rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Play size={20} fill="currentColor" />
                            Запустить эфир
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Quick Actions Panel */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-white/5">
                <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Быстрые действия</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Добавить ученика', icon: Users, color: 'text-blue-500' },
                        { label: 'Создать контент', icon: Layout, color: 'text-purple-500' },
                        { label: 'Настройки доступа', icon: Server, color: 'text-zinc-500' },
                        { label: 'Экспорт данных', icon: Save, color: 'text-emerald-500' },
                    ].map((action, i) => (
                        <button key={i} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors gap-2 border border-transparent hover:border-zinc-200 dark:hover:border-white/10 group">
                            <action.icon size={24} className={`${action.color} group-hover:scale-110 transition-transform`} />
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 text-center">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

         </div>
      </div>

      {/* Edit Call Drawer */}
      <Drawer 
        isOpen={isEditCallOpen} 
        onClose={() => setIsEditCallOpen(false)} 
        title="Настройка эфира"
        width="md:w-[500px]"
        footer={
            <>
                <button onClick={() => setIsEditCallOpen(false)} className="px-6 py-3 rounded-xl border font-bold text-zinc-500">Отмена</button>
                <button onClick={() => setIsEditCallOpen(false)} className="px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold">Сохранить</button>
            </>
        }
      >
         <div className="space-y-4">
            <Input label="Тема" value={callDetails.topic} onChange={(e) => setCallDetails({...callDetails, topic: e.target.value})} />
            <Input label="Подзаголовок" value={callDetails.subtopic} onChange={(e) => setCallDetails({...callDetails, subtopic: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
                <Input type="time" label="Время" value={callDetails.time} onChange={(e) => setCallDetails({...callDetails, time: e.target.value})} />
                <Input type="number" label="Ожидается" value={callDetails.attendees} onChange={(e) => setCallDetails({...callDetails, attendees: parseInt(e.target.value)})} />
            </div>
         </div>
      </Drawer>

    </motion.div>
  );
};

export default AdminDashboard;
    