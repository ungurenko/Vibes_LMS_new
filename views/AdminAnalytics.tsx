/**
 * AdminAnalytics — вкладка "Аналитика" в админ-панели
 * Поведенческая аналитика студентов: промпты, стили, AI-инструменты, страницы
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Copy,
  Eye,
  MessageSquare,
  Zap,
  Heart,
  FileText,
  Globe,
  Wrench,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchWithAuthGet } from '../lib/fetchWithAuth';
import { PageHeader } from '../components/Shared';

// --- Types ---

interface AnalyticsMetrics {
  totalEvents: number;
  uniqueUsers: number;
  promptCopies: number;
  styleViews: number;
  aiMessages: number;
  quickClicks: number;
}

interface TopPrompt {
  id: string;
  title: string;
  count: number;
}

interface TopStyle {
  id: string;
  name: string;
  views: number;
  copies: number;
}

interface ToolUsageItem {
  toolType: string;
  messages: number;
  uniqueUsers: number;
}

interface QuickQuestionItem {
  question: string;
  toolType: string;
  count: number;
}

interface PageViewItem {
  page: string;
  views: number;
  uniqueUsers: number;
}

interface AnalyticsData {
  metrics: AnalyticsMetrics;
  topPrompts: TopPrompt[];
  topFavorites: TopPrompt[];
  topStyles: TopStyle[];
  toolUsage: ToolUsageItem[];
  topQuickQuestions: QuickQuestionItem[];
  topPages: PageViewItem[];
}

type Period = '7d' | '30d' | 'all';

interface AdminAnalyticsProps {
  selectedCohortId: string | null;
  selectedCohortName: string | null;
}

// --- Helpers ---

const TOOL_NAMES: Record<string, string> = {
  assistant: 'Ассистент',
  tz_helper: 'Помощник по ТЗ',
  ideas: 'Идеи для проектов',
};

const PAGE_NAMES: Record<string, string> = {
  dashboard: 'Дашборд',
  lessons: 'Уроки',
  roadmaps: 'Дорожные карты',
  styles: 'Стили',
  prompts: 'Промпты',
  glossary: 'Словарик',
  tools: 'Инструменты',
  profile: 'Профиль',
  practice: 'Практика',
};

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 дней',
  '30d': '30 дней',
  all: 'Всё время',
};

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// --- Components ---

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  delay?: number;
}> = ({ icon, label, value, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-white/5 shadow-sm"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
    </div>
    <div className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
      {formatNumber(value)}
    </div>
    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">{label}</div>
  </motion.div>
);

const ProgressBar: React.FC<{ value: number; max: number; color?: string }> = ({
  value,
  max,
  color = 'bg-purple-500',
}) => (
  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-500 ${color}`}
      style={{ width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%` }}
    />
  </div>
);

const RankedList: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: { label: string; value: number; sub?: string }[];
  color?: string;
  emptyText?: string;
}> = ({ title, icon, items, color = 'bg-purple-500', emptyText = 'Нет данных' }) => {
  const max = items.length > 0 ? items[0].value : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/5 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-zinc-400">{icon}</span>
        <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-4">{emptyText}</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium truncate flex-1 mr-2">
                  <span className="text-zinc-400 font-mono text-xs mr-1.5">{i + 1}.</span>
                  {item.label}
                </span>
                <span className="text-xs font-bold text-zinc-500 tabular-nums shrink-0">
                  {item.value}
                  {item.sub && <span className="text-zinc-400 ml-1">{item.sub}</span>}
                </span>
              </div>
              <ProgressBar value={item.value} max={max} color={color} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-white/5 animate-pulse">
    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl mb-3" />
    <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
    <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
  </div>
);

const SkeletonList: React.FC = () => (
  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/5 p-6 animate-pulse">
    <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-5" />
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="mb-4">
        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
      </div>
    ))}
  </div>
);

// --- Main Component ---

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  selectedCohortId,
  selectedCohortName,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const params = new URLSearchParams({ period });
        if (selectedCohortId) params.set('cohortId', selectedCohortId);

        const result = await fetchWithAuthGet<AnalyticsData>(
          `/api/admin?resource=analytics&${params.toString()}`
        );
        setData(result);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [period, selectedCohortId]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
            Аналитика
          </h2>
          {selectedCohortName && (
            <p className="text-sm text-zinc-500 mt-1">
              Поток: <span className="font-bold">{selectedCohortName}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  period === p
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
            title="Обновить"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : data ? (
          <>
            <MetricCard
              icon={<BarChart3 size={18} />}
              label="Всего событий"
              value={data.metrics.totalEvents}
              color="bg-blue-500/10 text-blue-500"
              delay={0}
            />
            <MetricCard
              icon={<Users size={18} />}
              label="Уникальных юзеров"
              value={data.metrics.uniqueUsers}
              color="bg-purple-500/10 text-purple-500"
              delay={0.05}
            />
            <MetricCard
              icon={<Copy size={18} />}
              label="Копирований промптов"
              value={data.metrics.promptCopies}
              color="bg-emerald-500/10 text-emerald-500"
              delay={0.1}
            />
            <MetricCard
              icon={<Eye size={18} />}
              label="Просмотров стилей"
              value={data.metrics.styleViews}
              color="bg-violet-500/10 text-violet-500"
              delay={0.15}
            />
            <MetricCard
              icon={<MessageSquare size={18} />}
              label="AI сообщений"
              value={data.metrics.aiMessages}
              color="bg-amber-500/10 text-amber-500"
              delay={0.2}
            />
            <MetricCard
              icon={<Zap size={18} />}
              label="Быстрых вопросов"
              value={data.metrics.quickClicks}
              color="bg-cyan-500/10 text-cyan-500"
              delay={0.25}
            />
          </>
        ) : null}
      </div>

      {/* Row 1: Top Prompts | Top Favorites | Top Styles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonList key={i} />)
        ) : data ? (
          <>
            <RankedList
              title="Топ промптов (копирования)"
              icon={<Copy size={16} />}
              items={data.topPrompts.map(p => ({ label: p.title, value: p.count }))}
              color="bg-emerald-500"
              emptyText="Пока нет копирований"
            />
            <RankedList
              title="Топ в избранном"
              icon={<Heart size={16} />}
              items={data.topFavorites.map(p => ({ label: p.title, value: p.count }))}
              color="bg-violet-500"
              emptyText="Пока нет избранных"
            />
            <RankedList
              title="Топ стилей"
              icon={<Eye size={16} />}
              items={data.topStyles.map(s => ({
                label: s.name,
                value: s.views,
                sub: s.copies > 0 ? `(${s.copies} коп.)` : undefined,
              }))}
              color="bg-purple-500"
              emptyText="Пока нет просмотров"
            />
          </>
        ) : null}
      </div>

      {/* Row 2: AI Tools (2 col) | Quick Questions (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonList key={i} />)
        ) : data ? (
          <>
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/5 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-zinc-400"><Wrench size={16} /></span>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-sm">AI инструменты</h3>
                </div>
                {data.toolUsage.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-4">Пока нет данных</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.toolUsage.map((tool, i) => (
                      <div
                        key={tool.toolType}
                        className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-white/5"
                      >
                        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-200 mb-3">
                          {TOOL_NAMES[tool.toolType] || tool.toolType}
                        </div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
                            {formatNumber(tool.messages)}
                          </span>
                          <span className="text-xs text-zinc-400">сообщений</span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          {tool.uniqueUsers} {tool.uniqueUsers === 1 ? 'пользователь' : 'пользователей'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <RankedList
              title="Быстрые вопросы"
              icon={<Zap size={16} />}
              items={data.topQuickQuestions.map(q => ({
                label: q.question,
                value: q.count,
                sub: TOOL_NAMES[q.toolType] ? `(${TOOL_NAMES[q.toolType]})` : undefined,
              }))}
              color="bg-amber-500"
              emptyText="Пока нет кликов"
            />
          </>
        ) : null}
      </div>

      {/* Row 3: Popular Pages */}
      {isLoading ? (
        <SkeletonList />
      ) : data ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/5 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-zinc-400"><Globe size={16} /></span>
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Популярные страницы</h3>
          </div>
          {data.topPages.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">Пока нет просмотров</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.topPages.map((page, i) => {
                const max = data.topPages[0]?.views || 1;
                return (
                  <div key={page.page} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-xs font-mono text-zinc-400 w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate">
                        {PAGE_NAMES[page.page] || page.page}
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar value={page.views} max={max} color="bg-blue-500" />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">
                        {page.views}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {page.uniqueUsers} юз.
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </motion.div>
  );
};

export default AdminAnalytics;
