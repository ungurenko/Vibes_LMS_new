/**
 * ToolsView - Главный экран раздела "Инструменты"
 * Витрина с карточками инструментов: Ассистент, Помощник по ТЗ, Идеи
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  FileText,
  Lightbulb,
  ChevronRight,
  Sparkles
} from 'lucide-react';

type ToolType = 'assistant' | 'tz_helper' | 'ideas';

interface ToolsViewProps {
  onSelectTool: (toolType: ToolType) => void;
}

interface ToolCardData {
  type: ToolType;
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
}

const tools: ToolCardData[] = [
  {
    type: 'assistant',
    icon: <Bot size={24} />,
    title: 'Ассистент',
    description: 'Универсальный помощник по вайб-кодингу. Ответит на вопросы, поможет с кодом и ошибками.',
    gradient: 'from-violet-500 to-indigo-600',
    iconBg: 'bg-violet-500'
  },
  {
    type: 'tz_helper',
    icon: <FileText size={24} />,
    title: 'Помощник по ТЗ',
    description: 'Создай техническое задание для проекта. Опиши идею — получи готовый промпт для нейросети.',
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-500'
  },
  {
    type: 'ideas',
    icon: <Lightbulb size={24} />,
    title: 'Идеи для проектов',
    description: 'Не знаешь что создать? Найди идею под свою нишу, опыт и цели.',
    gradient: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-500'
  }
];

const ToolCard: React.FC<{ tool: ToolCardData; onClick: () => void; index: number }> = ({
  tool,
  onClick,
  index
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={onClick}
      className="group w-full text-left"
    >
      <div className="relative p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Gradient overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${tool.iconBg} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
          {tool.icon}
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 font-display flex items-center gap-2">
          {tool.title}
          <ChevronRight
            size={18}
            className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 group-hover:translate-x-1 transition-all"
          />
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {tool.description}
        </p>

        {/* Decorative element */}
        <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br ${tool.gradient} rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
      </div>
    </motion.button>
  );
};

const ToolsView: React.FC<ToolsViewProps> = ({ onSelectTool }) => {
  return (
    <div className="w-full min-h-[calc(100dvh-80px)] md:min-h-[calc(100vh-2rem)] flex flex-col bg-transparent">
      {/* Header */}
      <header className="px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
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

      {/* Tools Grid */}
      <div className="flex-1 px-4 md:px-8 pb-8">
        <div className="max-w-3xl mx-auto grid gap-4 md:gap-6">
          {tools.map((tool, index) => (
            <ToolCard
              key={tool.type}
              tool={tool}
              onClick={() => onSelectTool(tool.type)}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 md:px-8 pb-6 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Все инструменты сохраняют историю диалога
        </p>
      </div>
    </div>
  );
};

export default ToolsView;
