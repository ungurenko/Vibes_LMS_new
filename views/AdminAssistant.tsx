/**
 * AdminAssistant - Настройки AI инструментов
 * Две вкладки: Настройки инструментов и Чаты студентов
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  FileText,
  Lightbulb,
  Save,
  Loader,
  Check,
  ChevronDown,
  MessageSquare,
  Settings,
  User,
  Clock,
  Filter,
  Eye,
  X,
  ChevronRight,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, Drawer } from '../components/Shared';
import { fetchWithAuthGet, fetchWithAuth } from '../lib/fetchWithAuth';

type ToolType = 'assistant' | 'tz_helper' | 'ideas';

interface ToolConfig {
  id?: string;
  content: string;
  model_id: string;
  updatedAt: string | null;
}

interface ToolCardData {
  type: ToolType;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  gradient: string;
}

// --- Chat Types ---

interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface ChatSummary {
  id: string;
  toolType: ToolType;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  user: ChatUser;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hasCopyableContent: boolean;
  createdAt: string;
}

interface ChatDetail {
  chat: {
    id: string;
    toolType: ToolType;
    createdAt: string;
    updatedAt: string;
    user: ChatUser;
  };
  messages: ChatMessage[];
}

interface ChatsStats {
  totalChats: number;
  totalMessages: number;
  uniqueUsers: number;
  assistantChats: number;
  tzHelperChats: number;
  ideasChats: number;
  messagesThisWeek: number;
}

const toolsData: ToolCardData[] = [
  {
    type: 'assistant',
    title: 'Ассистент',
    description: 'Универсальный помощник по вайб-кодингу',
    icon: <Bot size={24} />,
    iconBg: 'bg-violet-500',
    gradient: 'from-violet-500 to-indigo-600'
  },
  {
    type: 'tz_helper',
    title: 'Помощник по ТЗ',
    description: 'Создание технического задания для проекта',
    icon: <FileText size={24} />,
    iconBg: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-teal-600'
  },
  {
    type: 'ideas',
    title: 'Идеи для проектов',
    description: 'Генерация персонализированных идей',
    icon: <Lightbulb size={24} />,
    iconBg: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-600'
  }
];

// Популярные модели для выбора
const popularModels = [
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Google)' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (Google)' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'z-ai/glm-4.7', label: 'GLM-4.7 (Z-AI)' },
  { id: 'xiaomi/mimo-v2-flash:free', label: 'MiMo V2 Flash (Free)' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
];

// --- Helper Functions ---

const toolTypeLabels: Record<ToolType, string> = {
  assistant: 'Ассистент',
  tz_helper: 'ТЗ Helper',
  ideas: 'Идеи',
};

const toolTypeBadgeColors: Record<ToolType, string> = {
  assistant: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
  tz_helper: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  ideas: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
};

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Никогда';

  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;

  return date.toLocaleDateString('ru-RU');
}

const ToolConfigCard: React.FC<{
  tool: ToolCardData;
  config: ToolConfig;
  onSave: (toolType: ToolType, content: string, modelId: string) => Promise<void>;
  saving: boolean;
  saved: boolean;
}> = ({ tool, config, onSave, saving, saved }) => {
  const [content, setContent] = useState(config.content);
  const [modelId, setModelId] = useState(config.model_id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCustomModel, setShowCustomModel] = useState(false);

  useEffect(() => {
    setContent(config.content);
    setModelId(config.model_id);
    // Проверяем, есть ли модель в списке популярных
    const isKnownModel = popularModels.some(m => m.id === config.model_id);
    setShowCustomModel(!isKnownModel && config.model_id !== '');
  }, [config]);

  const handleSave = async () => {
    await onSave(tool.type, content, modelId);
  };

  const hasChanges = content !== config.content || modelId !== config.model_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${tool.iconBg} flex items-center justify-center text-white shadow-lg`}>
            {tool.icon}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{tool.title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{tool.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg">
              Не сохранено
            </span>
          )}
          <ChevronDown
            size={20}
            className={`text-zinc-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-6 border-t border-zinc-100 dark:border-white/5 pt-6">
              {/* Model Selection */}
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Модель AI
                </label>
                <div className="space-y-3">
                  <select
                    value={showCustomModel ? 'custom' : modelId}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomModel(true);
                        setModelId('');
                      } else {
                        setShowCustomModel(false);
                        setModelId(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    {popularModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                    <option value="custom">Другая модель...</option>
                  </select>

                  {showCustomModel && (
                    <input
                      type="text"
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      placeholder="Введите ID модели (например: openai/gpt-4)"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors font-mono text-sm"
                    />
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Модели OpenRouter: <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">openrouter.ai/models</a>
                </p>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Системный промпт
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl p-4 font-mono text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors resize-y leading-relaxed"
                  placeholder="Введите системный промпт..."
                />
                <p className="text-xs text-zinc-400 mt-2">
                  {content.length} символов
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    saved
                      ? 'bg-emerald-500 text-white'
                      : hasChanges
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Сохранение...
                    </>
                  ) : saved ? (
                    <>
                      <Check size={18} />
                      Сохранено
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Сохранить
                    </>
                  )}
                </button>
              </div>

              {/* Last Updated */}
              {config.updatedAt && (
                <p className="text-xs text-zinc-400 text-right">
                  Обновлено: {new Date(config.updatedAt).toLocaleString('ru-RU')}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


// --- Chats Tab Component ---

const ChatsTab: React.FC = () => {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [stats, setStats] = useState<ChatsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ToolType | 'all'>('all');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatDetail, setChatDetail] = useState<ChatDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load chats and stats
  const loadChats = useCallback(async () => {
    try {
      const token = localStorage.getItem('vibes_token');

      // Load stats
      const statsRes = await fetch('/api/admin?resource=ai-chats&stats=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsResult = await statsRes.json();
        if (statsResult.success) setStats(statsResult.data);
      }

      // Load chats list
      const url = filter === 'all'
        ? '/api/admin?resource=ai-chats'
        : `/api/admin?resource=ai-chats&tool_type=${filter}`;

      const chatsRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (chatsRes.ok) {
        const chatsResult = await chatsRes.json();
        if (chatsResult.success) setChats(chatsResult.data);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Load chat detail
  const openChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    setLoadingDetail(true);
    setChatDetail(null);

    try {
      const token = localStorage.getItem('vibes_token');
      const res = await fetch(`/api/admin?resource=ai-chats&chat_id=${chatId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) setChatDetail(result.data);
      }
    } catch (error) {
      console.error('Failed to load chat detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeChat = () => {
    setSelectedChatId(null);
    setChatDetail(null);
  };

  // Экспорт чатов в Markdown
  const handleExport = async () => {
    if (filter === 'all') {
      alert('Выберите конкретный инструмент для экспорта');
      return;
    }

    setExporting(true);
    try {
      const token = localStorage.getItem('vibes_token');
      const res = await fetch(`/api/admin?resource=ai-chats&export=true&tool_type=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Ошибка экспорта');
      }

      const result = await res.json();
      if (!result.success || !result.data?.markdown) {
        throw new Error('Нет данных для экспорта');
      }

      // Создаём и скачиваем файл
      const blob = new Blob([result.data.markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `vibes-chats-${filter}-${date}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка экспорта чатов');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={32} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-white/5">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.totalChats}</div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Всего чатов</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-white/5">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.messagesThisWeek}</div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Сообщений за неделю</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-white/5">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.uniqueUsers}</div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Активных студентов</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-white/5">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.totalMessages}</div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Всего сообщений</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <Filter size={14} /> Фильтр:
          </span>
          {(['all', 'assistant', 'tz_helper', 'ideas'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setLoading(true); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {f === 'all' ? 'Все' : toolTypeLabels[f]}
              {stats && f !== 'all' && (
                <span className="ml-1 opacity-60">
                  ({f === 'assistant' ? stats.assistantChats : f === 'tz_helper' ? stats.tzHelperChats : stats.ideasChats})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting || filter === 'all'}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            filter === 'all'
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
          title={filter === 'all' ? 'Выберите инструмент для экспорта' : `Экспорт чатов: ${toolTypeLabels[filter]}`}
        >
          {exporting ? (
            <Loader size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Экспорт
        </button>
      </div>

      {/* Chats List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden">
        {chats.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={48} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Нет чатов</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Студенты пока не использовали AI-инструменты</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => openChat(chat.id)}
                className="w-full p-4 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                  {chat.user.avatar ? (
                    <img src={chat.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-zinc-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-white truncate">
                      {chat.user.name || chat.user.email}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${toolTypeBadgeColors[chat.toolType]}`}>
                      {toolTypeLabels[chat.toolType]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      {chat.messageCount} сообщ.
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatRelativeTime(chat.lastMessageAt)}
                    </span>
                  </div>
                </div>

                {/* Active indicator */}
                {chat.messageCount >= 10 && (
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-lg">
                    Активный
                  </span>
                )}

                <ChevronRight size={18} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Detail Drawer */}
      <Drawer
        isOpen={selectedChatId !== null}
        onClose={closeChat}
        title={chatDetail ? `Чат с ${chatDetail.chat.user.name || chatDetail.chat.user.email}` : 'Загрузка...'}
        width="md:w-[600px]"
      >
        {loadingDetail ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={24} className="animate-spin text-zinc-400" />
          </div>
        ) : chatDetail ? (
          <div className="space-y-4">
            {/* Chat Info */}
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                {chatDetail.chat.user.avatar ? (
                  <img src={chatDetail.chat.user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-zinc-400" />
                )}
              </div>
              <div>
                <div className="font-medium text-zinc-900 dark:text-white">{chatDetail.chat.user.name}</div>
                <div className="text-xs text-zinc-500">{chatDetail.chat.user.email}</div>
              </div>
              <span className={`ml-auto px-2 py-1 rounded text-xs font-medium ${toolTypeBadgeColors[chatDetail.chat.toolType]}`}>
                {toolTypeLabels[chatDetail.chat.toolType]}
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {chatDetail.messages.length === 0 ? (
                <p className="text-center text-zinc-400 py-8">Нет сообщений</p>
              ) : (
                chatDetail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black ml-8'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white mr-8'
                    }`}
                  >
                    <div className="text-xs font-medium mb-1 opacity-60">
                      {msg.role === 'user' ? 'Студент' : 'AI'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {msg.content.length > 2000
                        ? msg.content.substring(0, 2000) + '...'
                        : msg.content}
                    </div>
                    <div className="text-xs opacity-40 mt-2">
                      {new Date(msg.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};


type TabType = 'settings' | 'chats';

const AdminAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [configs, setConfigs] = useState<Record<ToolType, ToolConfig>>({
    assistant: { content: '', model_id: 'google/gemini-2.5-flash-lite', updatedAt: null },
    tz_helper: { content: '', model_id: 'z-ai/glm-4.7', updatedAt: null },
    ideas: { content: '', model_id: 'xiaomi/mimo-v2-flash:free', updatedAt: null },
  });
  const [loading, setLoading] = useState(true);
  const [savingTool, setSavingTool] = useState<ToolType | null>(null);
  const [savedTool, setSavedTool] = useState<ToolType | null>(null);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const data = await fetchWithAuthGet<Record<ToolType, ToolConfig>>('/api/admin?resource=ai-instruction');
        if (data) {
          setConfigs(prev => ({
            assistant: data.assistant || prev.assistant,
            tz_helper: data.tz_helper || prev.tz_helper,
            ideas: data.ideas || prev.ideas,
          }));
        }
      } catch (e) {
        console.error('Failed to load tool configs:', e);
      } finally {
        setLoading(false);
      }
    };
    loadConfigs();
  }, []);

  const handleSave = async (toolType: ToolType, content: string, modelId: string) => {
    setSavingTool(toolType);
    setSavedTool(null);

    try {
      const result = await fetchWithAuth('/api/admin?resource=ai-instruction', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_type: toolType,
          content,
          model_id: modelId
        })
      });

      if (result.success) {
        setConfigs(prev => ({
          ...prev,
          [toolType]: {
            id: result.data.id,
            content: result.data.content,
            model_id: result.data.model_id,
            updatedAt: result.data.updatedAt,
          }
        }));
        setSavedTool(toolType);
        setTimeout(() => setSavedTool(null), 2000);
      }
    } catch (e) {
      console.error('Failed to save tool config:', e);
      alert('Ошибка сохранения настроек');
    } finally {
      setSavingTool(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex items-center justify-center py-20">
          <Loader size={32} className="animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      <PageHeader
        title="Инструменты"
        description="Настройка AI моделей и просмотр чатов студентов."
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'settings'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Settings size={18} />
          Настройки
        </button>
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'chats'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <MessageSquare size={18} />
          Чаты студентов
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' ? (
        <>
          <div className="space-y-4">
            {toolsData.map((tool) => (
              <ToolConfigCard
                key={tool.type}
                tool={tool}
                config={configs[tool.type]}
                onSave={handleSave}
                saving={savingTool === tool.type}
                saved={savedTool === tool.type}
              />
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-8 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5">
            <h4 className="font-bold text-zinc-900 dark:text-white mb-2">Подсказки</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <li>• <strong>Ассистент</strong> — общий помощник для вопросов по вайб-кодингу</li>
              <li>• <strong>Помощник по ТЗ</strong> — используй маркер <code className="bg-zinc-200 dark:bg-zinc-800 px-1 rounded">[ТЗ_START]...[ТЗ_END]</code> для копируемого ТЗ</li>
              <li>• <strong>Идеи</strong> — используй маркер <code className="bg-zinc-200 dark:bg-zinc-800 px-1 rounded">[IDEA_START]...[IDEA_END]</code> для переноса идеи в ТЗ</li>
            </ul>
          </div>
        </>
      ) : (
        <ChatsTab />
      )}
    </div>
  );
};

export default AdminAssistant;
