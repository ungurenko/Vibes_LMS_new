/**
 * AdminAssistant - Настройки AI инструментов
 * Три карточки: Ассистент, Помощник по ТЗ, Идеи
 * Каждая карточка имеет поле модели и системного промпта
 */

import React, { useState, useEffect } from 'react';
import {
  Bot,
  FileText,
  Lightbulb,
  Save,
  Loader,
  Check,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../components/Shared';
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

const AdminAssistant: React.FC = () => {
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
        description="Настройка AI моделей и системных промптов для каждого инструмента."
      />

      <div className="space-y-4">
        {toolsData.map((tool, index) => (
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
    </div>
  );
};

export default AdminAssistant;
