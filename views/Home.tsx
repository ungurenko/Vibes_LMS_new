import React, { useState, useEffect, useMemo } from 'react';
import {
   Calendar,
   BookOpen,
   Wrench,
   MessageSquareText,
   BookA,
   Palette,
   Megaphone,
   Newspaper
} from 'lucide-react';
import { TabId, NewsItem } from '../types';
import { motion } from 'framer-motion';
import { fetchWithAuthGet } from '../lib/fetchWithAuth';
import { getCached, setCache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';
import { Badge } from '@/components/ui/badge';

interface HomeProps {
   onNavigate: (tab: TabId) => void;
   userName?: string;
   userCohort?: { id: string; name: string } | null;
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

interface UpcomingCall {
   id: string;
   topic: string;
   time: string;
   relativeDate: string;
}

const NEWS_ICONS: Record<NewsItem['type'], React.ElementType> = {
   lesson: BookOpen,
   style: Palette,
   prompt: MessageSquareText,
   update: Megaphone,
};

const NEWS_ICON_STYLES: Record<NewsItem['type'], { gradient: string; shadow: string }> = {
   lesson: { gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/25' },
   style: { gradient: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/25' },
   prompt: { gradient: 'from-indigo-500 to-blue-600', shadow: 'shadow-indigo-500/25' },
   update: { gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/25' },
};

const NEWS_LABEL_COLORS: Record<NewsItem['type'], string> = {
   lesson: 'text-purple-600 dark:text-purple-400',
   style: 'text-pink-600 dark:text-pink-400',
   prompt: 'text-indigo-600 dark:text-indigo-400',
   update: 'text-amber-600 dark:text-amber-400',
};

const NEWS_LABELS: Record<NewsItem['type'], string> = {
   lesson: 'Новый урок',
   style: 'Новый стиль',
   prompt: 'Новый промпт',
   update: 'Обновление',
};

const NEWS_SUBTITLES: Record<NewsItem['type'], string> = {
   lesson: 'Добавлен в программу курса',
   style: 'Добавлен в библиотеку стилей',
   prompt: 'Добавлен в базу промптов',
   update: 'Обновление платформы',
};

const QUICK_ACTIONS = [
   { label: 'Уроки', tab: 'lessons' as TabId, icon: BookOpen, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/25', bgGradient: 'from-purple-500/10 to-violet-500/10' },
   { label: 'Инструменты', tab: 'tools' as TabId, icon: Wrench, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/25', bgGradient: 'from-violet-500/10 to-purple-500/10' },
   { label: 'Промпты', tab: 'prompts' as TabId, icon: MessageSquareText, gradient: 'from-indigo-500 to-blue-600', shadow: 'shadow-indigo-500/25', bgGradient: 'from-indigo-500/10 to-blue-500/10' },
   { label: 'Словарик', tab: 'glossary' as TabId, icon: BookA, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/25', bgGradient: 'from-emerald-500/10 to-teal-500/10' },
];

const PAGE_SIZE = 8;

function getGreeting(): string {
   const hour = new Date().getHours();
   if (hour >= 5 && hour < 12) return 'Доброе утро';
   if (hour >= 12 && hour < 18) return 'Добрый день';
   return 'Добрый вечер';
}

function formatRelativeDate(dateStr: string): string {
   const date = new Date(dateStr);
   const now = new Date();
   const diffMs = now.getTime() - date.getTime();
   const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

   if (diffDays === 0) return 'Сегодня';
   if (diffDays === 1) return 'Вчера';
   if (diffDays < 7) return `${diffDays} ${pluralDays(diffDays)} назад`;
   if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${pluralWeeks(weeks)} назад`;
   }
   return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function isRecent(dateStr: string): boolean {
   const date = new Date(dateStr);
   const now = new Date();
   const diffMs = now.getTime() - date.getTime();
   const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
   return diffDays <= 1;
}

function pluralDays(n: number): string {
   if (n === 1) return 'день';
   if (n >= 2 && n <= 4) return 'дня';
   return 'дней';
}

function pluralWeeks(n: number): string {
   if (n === 1) return 'неделю';
   if (n >= 2 && n <= 4) return 'недели';
   return 'недель';
}

function NewsSkeleton() {
   return (
      <div className="space-y-2">
         {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] animate-pulse">
               <div className="w-10 h-10 rounded-xl bg-stone-200 dark:bg-stone-700 flex-shrink-0" />
               <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-stone-200 dark:bg-stone-700 rounded" />
                  <div className="h-4 w-3/4 bg-stone-200 dark:bg-stone-700 rounded" />
                  <div className="h-3 w-1/2 bg-stone-100 dark:bg-stone-800 rounded" />
               </div>
               <div className="h-3 w-14 bg-stone-200 dark:bg-stone-700 rounded flex-shrink-0 mt-1" />
            </div>
         ))}
      </div>
   );
}

const Home: React.FC<HomeProps> = ({ onNavigate, userName = 'Студент', userCohort }) => {
   const [news, setNews] = useState<NewsItem[]>([]);
   const [upcomingCall, setUpcomingCall] = useState<UpcomingCall | null>(null);
   const [isLoadingNews, setIsLoadingNews] = useState(true);
   const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

   const firstName = userName.split(' ')[0];
   const greeting = useMemo(() => getGreeting(), []);

   // Load news feed
   useEffect(() => {
      const fetchNews = async () => {
         try {
            const cached = getCached<NewsItem[]>(CACHE_KEYS.NEWS, CACHE_TTL.NEWS);
            if (cached) {
               setNews(cached);
               setIsLoadingNews(false);
            }

            const data = await fetchWithAuthGet<NewsItem[]>('/api/content/news');
            setNews(data);
            setCache(CACHE_KEYS.NEWS, data);
         } catch (error) {
            console.error('Error fetching news:', error);
         } finally {
            setIsLoadingNews(false);
         }
      };

      fetchNews();
   }, []);

   // Load upcoming call
   useEffect(() => {
      const fetchUpcomingCall = async () => {
         try {
            const data = await fetchWithAuthGet<UpcomingCall>('/api/calls/upcoming');
            setUpcomingCall(data);
         } catch (error) {
            // No upcoming call — that's fine
         }
      };

      fetchUpcomingCall();
   }, []);

   const isCallToday = upcomingCall?.relativeDate?.toLowerCase().includes('сегодня');
   const visibleNews = news.slice(0, visibleCount);
   const hasMore = news.length > visibleCount;
   const remaining = news.length - visibleCount;

   return (
      <motion.div
         variants={containerVariants}
         initial="hidden"
         animate="show"
         className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-24"
      >
         {/* --- GREETING --- */}
         <motion.div variants={cardVariants} className="mb-6">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
               <span className="text-stone-900 dark:text-stone-50">{greeting}, </span>
               <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">{firstName}</span>
               <span className="text-stone-900 dark:text-stone-50">!</span>
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
               Что будем изучать сегодня?
            </p>
         </motion.div>

         {/* --- BENTO GRID --- */}
         <div className="grid grid-cols-12 gap-4">

            {/* ===== NEWS FEED (lg:col-span-7) ===== */}
            <motion.div variants={cardVariants} className="col-span-12 lg:col-span-7">
               <div className="relative bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.08] rounded-3xl shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_0_30px_rgba(168,85,247,0.06)] p-5 md:p-6 flex flex-col h-full min-h-[320px]">
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                     style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(168,85,247,0.03) 0%, transparent 50%)' }} />

                  <h3 className="font-display text-xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-3 mb-4">
                     <Newspaper size={20} className="text-purple-500" />
                     Новости платформы
                  </h3>

                  {isLoadingNews ? (
                     <NewsSkeleton />
                  ) : news.length === 0 ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                        <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
                           <Newspaper size={24} className="text-stone-400 dark:text-stone-500" />
                        </div>
                        <p className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-1">Пока нет новостей</p>
                        <p className="text-sm text-stone-400 dark:text-stone-500">Новые материалы появятся здесь</p>
                     </div>
                  ) : (
                     <>
                        <div className="flex-1 space-y-2">
                           {visibleNews.map((item) => {
                              const Icon = NEWS_ICONS[item.type];
                              const iconStyle = NEWS_ICON_STYLES[item.type];
                              const labelColor = NEWS_LABEL_COLORS[item.type];
                              const fresh = isRecent(item.created_at);
                              const subtitle = item.type === 'update' && item.description
                                 ? item.description
                                 : NEWS_SUBTITLES[item.type];
                              return (
                                 <div
                                    key={`${item.type}-${item.id}`}
                                    className="flex items-start gap-3 p-3 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.06] transition-colors"
                                 >
                                    <div className="relative flex-shrink-0">
                                       <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconStyle.gradient} shadow-lg ${iconStyle.shadow} flex items-center justify-center`}>
                                          <Icon size={18} className="text-white" />
                                       </div>
                                       {fresh && (
                                          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                          </span>
                                       )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="flex items-center justify-between gap-2 mb-0.5">
                                          <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>
                                             {NEWS_LABELS[item.type]}
                                          </span>
                                          <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">
                                             {formatRelativeDate(item.created_at)}
                                          </span>
                                       </div>
                                       <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 line-clamp-2">
                                          {item.label}
                                       </p>
                                       <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">
                                          {subtitle}
                                       </p>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>

                        {/* Show more button */}
                        {hasMore && (
                           <button
                              onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                              className="mt-3 w-full py-2.5 text-sm font-medium text-stone-600 dark:text-stone-400 bg-stone-50/50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] rounded-2xl hover:bg-stone-100/50 dark:hover:bg-white/[0.06] transition-colors"
                           >
                              Показать ещё {Math.min(remaining, PAGE_SIZE)}
                           </button>
                        )}
                     </>
                  )}
               </div>
            </motion.div>

            {/* ===== RIGHT COLUMN (lg:col-span-5) ===== */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">

               {/* ===== UPCOMING CALL CARD ===== */}
               {upcomingCall && (
                  <motion.div variants={cardVariants}>
                     <div className="relative bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.08] rounded-3xl shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_0_30px_rgba(168,85,247,0.06)] p-4 md:p-5">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-500/15 dark:to-violet-500/15 rounded-2xl flex items-center justify-center flex-shrink-0">
                              <Calendar size={22} className="text-purple-600 dark:text-purple-400" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                 {isCallToday && (
                                    <span className="relative flex h-2.5 w-2.5">
                                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                                       <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
                                    </span>
                                 )}
                                 <Badge variant="ghost" className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 px-0">
                                    Следующий созвон
                                 </Badge>
                              </div>
                              <p className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">
                                 {upcomingCall.topic}
                              </p>
                           </div>
                           <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                 <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                    {upcomingCall.relativeDate}
                                 </div>
                                 <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                    {upcomingCall.time} МСК
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               )}

               {/* ===== QUICK ACTIONS CARD ===== */}
               <motion.div variants={cardVariants} className="flex-1">
                  <div className="relative bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.08] rounded-3xl shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_0_30px_rgba(168,85,247,0.06)] p-5 md:p-6 flex flex-col h-full">
                     <div className="absolute inset-0 rounded-3xl pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(168,85,247,0.03) 0%, transparent 50%)' }} />
                     <h3 className="text-base font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-4">
                        Перейти к
                     </h3>

                     <div className="grid grid-cols-2 gap-3 flex-1">
                        {QUICK_ACTIONS.map((action) => {
                           const Icon = action.icon;
                           return (
                              <motion.button
                                 key={action.tab}
                                 onClick={() => onNavigate(action.tab)}
                                 whileHover={{ y: -2 }}
                                 whileTap={{ scale: 0.97 }}
                                 className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-gradient-to-br ${action.bgGradient} border border-black/[0.04] dark:border-white/[0.06] hover:border-black/[0.08] dark:hover:border-white/[0.12] transition-colors`}
                              >
                                 <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg ${action.shadow} flex items-center justify-center`}>
                                    <Icon size={22} className="text-white" />
                                 </div>
                                 <span className="font-medium text-sm text-stone-700 dark:text-stone-200">{action.label}</span>
                              </motion.button>
                           );
                        })}
                     </div>
                  </div>
               </motion.div>

            </div>

         </div>
      </motion.div>
   );
};

export default Home;
