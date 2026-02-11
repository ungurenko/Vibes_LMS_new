/**
 * ToolsView - Главный экран раздела "Инструменты"
 * Bento-grid с премиальными карточками и AI-иллюстрациями
 * v2: CSS-фикс по фидбеку дизайнера
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import { fetchWithAuthGet } from '../lib/fetchWithAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ToolModelInfo {
  modelId: string;
  modelName: string;
}

type ToolType = 'assistant' | 'tz_helper' | 'ideas';

interface ToolsViewProps {
  onSelectTool: (toolType: ToolType) => void;
}

interface ToolCardData {
  type: ToolType;
  title: string;
  description: string;
  illustration: string;
  gradient: string;
  glowColor: string;
  size: 'large' | 'medium';
}

const tools: ToolCardData[] = [
  {
    type: 'assistant',
    title: 'Ассистент',
    description: 'Универсальный помощник по вайб-кодингу. Ответит на вопросы, поможет с кодом и ошибками.',
    illustration: '/tools/assistant.png',
    gradient: 'from-rose-600/30 via-pink-600/20 to-transparent',
    glowColor: 'rose',
    size: 'large'
  },
  {
    type: 'tz_helper',
    title: 'Помощник по ТЗ',
    description: 'Создай техническое задание для проекта. Опиши идею — получи готовый промпт.',
    illustration: '/tools/tz-helper.png',
    gradient: 'from-emerald-600/30 via-teal-600/20 to-transparent',
    glowColor: 'emerald',
    size: 'medium'
  },
  {
    type: 'ideas',
    title: 'Идеи для проектов',
    description: 'Не знаешь что создать? Найди идею под свою нишу, опыт и цели.',
    illustration: '/tools/ideas.png',
    gradient: 'from-amber-600/30 via-orange-600/20 to-transparent',
    glowColor: 'amber',
    size: 'medium'
  }
];

const LargeToolCard: React.FC<{ tool: ToolCardData; onClick: () => void; modelName?: string }> = ({ tool, onClick, modelName }) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="group w-full text-left"
    >
      <Card className="relative min-h-[200px] h-auto md:h-[220px] rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-rose-500/30 hover:border-rose-500/40 hover:-translate-y-1 p-0 py-0 gap-0">
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-r ${tool.gradient} opacity-70 group-hover:opacity-90 transition-opacity duration-500`} />

        {/* Animated glow */}
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-rose-500/30 rounded-full blur-[80px] group-hover:bg-rose-500/50 transition-all duration-700" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col md:flex-row">
          {/* Text content */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 font-semibold">
                AI Ментор
              </Badge>
              {modelName && (
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {modelName}
                </span>
              )}
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-3 font-display flex items-center gap-3">
              {tool.title}
              <ChevronRight
                size={24}
                className="text-rose-400 group-hover:translate-x-2 transition-transform duration-300"
              />
            </h3>
            <p className="text-sm text-zinc-200 leading-relaxed max-w-md group-hover:text-white transition-colors">
              {tool.description}
            </p>
          </div>

          {/* Illustration - на вылет */}
          <div className="relative w-full md:w-[50%] h-[120px] md:h-full flex items-center justify-end overflow-hidden">
            <motion.img
              src={tool.illustration}
              alt={tool.title}
              className="w-auto h-[125%] md:h-[115%] max-w-none object-contain object-right group-hover:scale-110 transition-transform duration-700 ease-out"
              style={{ marginRight: '5%' }}
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/15 rounded-full blur-[60px] group-hover:bg-rose-500/25 transition-all duration-500" />
      </Card>
    </motion.button>
  );
};

const MediumToolCard: React.FC<{ tool: ToolCardData; onClick: () => void; index: number; modelName?: string }> = ({ tool, onClick, index, modelName }) => {
  const glowColors = {
    emerald: {
      glow: 'bg-emerald-500/30 group-hover:bg-emerald-500/50',
      border: 'hover:border-emerald-500/40 hover:shadow-emerald-500/30',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      text: 'text-emerald-400'
    },
    amber: {
      glow: 'bg-amber-500/30 group-hover:bg-amber-500/50',
      border: 'hover:border-amber-500/40 hover:shadow-amber-500/30',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      text: 'text-amber-400'
    }
  };

  const colors = glowColors[tool.glowColor as keyof typeof glowColors] || glowColors.emerald;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="group w-full text-left"
    >
      <Card className={`relative min-h-[320px] h-auto md:h-[360px] rounded-3xl bg-zinc-900 border border-white/10 shadow-xl overflow-hidden transition-all duration-500 hover:-translate-y-1 p-0 py-0 gap-0 ${colors.border}`}>
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b ${tool.gradient} opacity-70 group-hover:opacity-90 transition-opacity duration-500`} />

        {/* Animated glow */}
        <div className={`absolute -bottom-10 -right-10 w-40 h-40 ${colors.glow} rounded-full blur-[60px] transition-all duration-700`} />

        {/* Illustration - по центру, полностью видна */}
        <div className="relative h-[220px] md:h-[200px] flex items-center justify-center p-4">
          <motion.img
            src={tool.illustration}
            alt={tool.title}
            className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 p-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className={`${colors.badge} font-semibold`}>
              {tool.type === 'tz_helper' ? 'Генератор' : 'Креатив'}
            </Badge>
            {modelName && (
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {modelName}
              </span>
            )}
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mb-2 font-display flex items-center gap-2">
            {tool.title}
            <ChevronRight
              size={20}
              className={`${colors.text} group-hover:translate-x-1 transition-transform duration-300`}
            />
          </h3>
          <p className="text-sm text-zinc-200 leading-relaxed group-hover:text-white transition-colors">
            {tool.description}
          </p>
        </div>
      </Card>
    </motion.button>
  );
};

const ToolsView: React.FC<ToolsViewProps> = ({ onSelectTool }) => {
  const [models, setModels] = useState<Record<ToolType, ToolModelInfo> | null>(null);

  useEffect(() => {
    fetchWithAuthGet<Record<ToolType, ToolModelInfo>>('/api/tools/models')
      .then(setModels)
      .catch(err => console.error('Failed to load tool models:', err));
  }, []);

  const largeTool = tools.find(t => t.size === 'large')!;
  const mediumTools = tools.filter(t => t.size === 'medium');

  return (
    <div className="w-full min-h-[calc(100dvh-80px)] md:min-h-[calc(100vh-2rem)] flex flex-col bg-transparent">
      {/* Header */}
      <header className="px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Sparkles size={20} className="text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white font-display">
              Инструменты
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base"
          >
            AI-помощники для вайб-кодинга. Выбери инструмент и начни работу.
          </motion.p>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="flex-1 px-4 md:px-8 pb-8">
        <div className="max-w-4xl mx-auto space-y-3 md:space-y-4">
          {/* Large Card - Ассистент */}
          <LargeToolCard
            tool={largeTool}
            onClick={() => onSelectTool(largeTool.type)}
            modelName={models?.[largeTool.type]?.modelName}
          />

          {/* Medium Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {mediumTools.map((tool, index) => (
              <MediumToolCard
                key={tool.type}
                tool={tool}
                onClick={() => onSelectTool(tool.type)}
                index={index}
                modelName={models?.[tool.type]?.modelName}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 md:px-8 pb-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-zinc-500 dark:text-zinc-600"
        >
          Все инструменты сохраняют историю диалога
        </motion.p>
      </div>
    </div>
  );
};

export default ToolsView;
