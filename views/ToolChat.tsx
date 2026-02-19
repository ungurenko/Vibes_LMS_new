/**
 * ToolChat - Универсальный чат для инструментов
 * Поддерживает маркеры [ТЗ_START]/[ТЗ_END] и [IDEA_START]/[IDEA_END]
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import {
  Send,
  User,
  Sparkles,
  Trash2,
  Copy,
  Check,
  ArrowLeft,
  FileText,
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { motion } from 'framer-motion';
import { useSound } from '../SoundContext';
import CodeBlock from '../components/CodeBlock';
import { formatTime } from '../lib/formatUtils';
import { useAnalytics } from '../lib/hooks/useAnalytics';

type ToolType = 'assistant' | 'tz_helper' | 'ideas';

interface ToolChatProps {
  toolType: ToolType;
  onBack: () => void;
  onTransferToTZ?: (idea: string) => void;
  initialMessage?: string | null;
}

// Быстрые подсказки для начала диалога
const QUICK_PROMPTS: Record<ToolType, string[]> = {
  assistant: [
    'Напиши код кнопки',
    'Объясни Flexbox',
    'Найди ошибку в коде',
    'Как сделать адаптив?'
  ],
  tz_helper: [
    'Интернет-магазин',
    'Портфолио дизайнера',
    'Лендинг для курса',
    'Мобильное приложение'
  ],
  ideas: [
    'Для фрилансера',
    'Для малого бизнеса',
    'Для студента',
    'Для хобби'
  ]
};

// Конфигурация инструментов
const TOOL_CONFIG: Record<ToolType, {
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  welcomeMessage: string;
}> = {
  assistant: {
    title: 'Ассистент',
    subtitle: 'Помощник по вайб-кодингу',
    emoji: '🧑‍💻',
    gradient: 'from-purple-600 to-violet-600',
    welcomeMessage: 'Привет! Я твой ИИ-ментор по вайб-кодингу. Готов помочь с кодом, ошибками или объяснить сложные штуки простыми словами. **С чего начнем?**'
  },
  tz_helper: {
    title: 'Помощник по ТЗ',
    subtitle: 'Создание технического задания',
    emoji: '📋',
    gradient: 'from-emerald-500 to-teal-600',
    welcomeMessage: 'Привет! Я помогу тебе создать техническое задание для нейросети. **Опиши свою идею проекта** — что ты хочешь создать?'
  },
  ideas: {
    title: 'Идеи для проектов',
    subtitle: 'Генерация идей для проектов',
    emoji: '💡',
    gradient: 'from-amber-500 to-orange-600',
    welcomeMessage: 'Привет! Я помогу найти идею проекта, которая подойдёт именно тебе. **В какой сфере ты работаешь или чем увлекаешься?**'
  }
};

// --- Helpers ---

// Парсинг маркеров в тексте
const parseMarkers = (text: string): {
  beforeMarker: string;
  markedContent: string | null;
  afterMarker: string;
  markerType: 'tz' | 'idea' | null;
} => {
  // Проверяем [ТЗ_START]...[ТЗ_END]
  const tzMatch = text.match(/\[ТЗ_START\]([\s\S]*?)\[ТЗ_END\]/);
  if (tzMatch) {
    const idx = text.indexOf('[ТЗ_START]');
    const endIdx = text.indexOf('[ТЗ_END]') + '[ТЗ_END]'.length;
    return {
      beforeMarker: text.slice(0, idx),
      markedContent: tzMatch[1].trim(),
      afterMarker: text.slice(endIdx),
      markerType: 'tz'
    };
  }

  // Проверяем [IDEA_START]...[IDEA_END]
  const ideaMatch = text.match(/\[IDEA_START\]([\s\S]*?)\[IDEA_END\]/);
  if (ideaMatch) {
    const idx = text.indexOf('[IDEA_START]');
    const endIdx = text.indexOf('[IDEA_END]') + '[IDEA_END]'.length;
    return {
      beforeMarker: text.slice(0, idx),
      markedContent: ideaMatch[1].trim(),
      afterMarker: text.slice(endIdx),
      markerType: 'idea'
    };
  }

  return { beforeMarker: text, markedContent: null, afterMarker: '', markerType: null };
};

// --- Components ---

const FormattedText = memo(function FormattedText({ text }: { text: string }) {
  return (
    <div className="markdown-body prose ppurple-zinc dark:ppurple-invert max-w-none ppurple-p:leading-[1.6] ppurple-p:mb-3 ppurple-pre:m-0 ppurple-pre:p-0 ppurple-pre:bg-transparent text-[13px] md:text-[15px] break-words">
      <ReactMarkdown
        components={{
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline font-bold break-all" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = !inline && (match || String(children).includes('\n'));

            return isBlock ? (
              <CodeBlock code={String(children).replace(/\n$/, '')} language={match ? match[1] : 'text'} />
            ) : (
              <code className="bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded px-1.5 py-0.5 font-mono text-xs md:text-sm text-purple-700 dark:text-purple-300 break-words" {...props}>
                {children}
              </code>
            );
          },
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside ml-4 mb-3 space-y-0.5 marker:text-purple-500" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside ml-4 mb-3 space-y-0.5 marker:text-purple-500 font-medium" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="pl-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-3 last:mb-0 whitespace-pre-wrap text-zinc-700 dark:text-zinc-200" {...props} />
          ),
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-3 mt-5 text-zinc-900 dark:text-white font-display" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2.5 mt-4 text-zinc-900 dark:text-white font-display" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-3 text-zinc-900 dark:text-white font-display" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-zinc-900 dark:text-white" {...props} />,
          em: ({ node, ...props }) => <em className="italic text-zinc-800 dark:text-zinc-300" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-3 border-purple-500 pl-3 py-1.5 my-3 bg-zinc-50 dark:bg-white/5 rounded-r-lg italic text-zinc-600 dark:text-zinc-400" {...props} />
          )
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});

// Компонент для копируемого контента (ТЗ)
const CopyableContent = memo(function CopyableContent({ content }: { content: string }) {
  const { playSound } = useSound();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    playSound('copy');
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
      <div className="mb-2.5">
        <FormattedText text={content} />
      </div>
      <button
        onClick={handleCopy}
        className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
          copied
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30'
        }`}
      >
        {copied ? (
          <>
            <Check size={16} />
            Скопировано!
          </>
        ) : (
          <>
            <Copy size={16} />
            Скопировать ТЗ
          </>
        )}
      </button>
    </div>
  );
});

// Компонент для идеи с кнопкой перехода
const IdeaContent = memo(function IdeaContent({ content, onTransfer }: { content: string; onTransfer: () => void }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
      <div className="mb-2.5">
        <FormattedText text={content} />
      </div>
      <button
        onClick={onTransfer}
        className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <FileText size={16} />
        Создать ТЗ для этой идеи
        <ArrowRight size={16} />
      </button>
    </div>
  );
});

// Компонент быстрых подсказок для пустого чата
const QuickPrompts = memo(function QuickPrompts({ toolType, onSelect, gradient }: {
  toolType: ToolType;
  onSelect: (prompt: string) => void;
  gradient: string;
}) {
  const prompts = QUICK_PROMPTS[toolType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex flex-wrap justify-center gap-2 mt-6 px-4"
    >
      {prompts.map((prompt, index) => (
        <motion.button
          key={prompt}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
          onClick={() => onSelect(prompt)}
          className={`px-4 py-2.5 text-sm font-medium rounded-full min-h-[44px]
            bg-zinc-100 dark:bg-white/5
            border border-zinc-200 dark:border-white/10
            text-zinc-600 dark:text-zinc-400
            hover:bg-purple-50 dark:hover:bg-purple-500/10
            hover:border-purple-300 dark:hover:border-purple-500/30
            hover:text-purple-700 dark:hover:text-purple-300
            transition-all duration-200
            hover:scale-105 active:scale-95
            flex items-center justify-center
          `}
        >
          {prompt}
        </motion.button>
      ))}
    </motion.div>
  );
});

// --- Main Component ---

const ToolChat: React.FC<ToolChatProps> = ({
  toolType,
  onBack,
  onTransferToTZ,
  initialMessage
}) => {
  const { playSound } = useSound();
  const { trackToolMessage, trackQuickQuestion } = useAnalytics();
  const config = TOOL_CONFIG[toolType];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modelName, setModelName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load History
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('vibes_token');
        const response = await fetch(`/api/tools/messages?tool_type=${toolType}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load history');

        const data = await response.json();
        const history = data.data || [];

        if (history.length > 0) {
          const formattedHistory = history.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(formattedHistory);
        } else {
          setMessages([{
            id: 'init',
            role: 'assistant',
            text: config.welcomeMessage,
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
        setMessages([{
          id: 'init',
          role: 'assistant',
          text: config.welcomeMessage,
          timestamp: new Date()
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [toolType]);

  // Load Model Name
  useEffect(() => {
    const fetchModel = async () => {
      try {
        const token = localStorage.getItem('vibes_token');
        const response = await fetch('/api/tools/models', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.data?.[toolType]?.modelName) {
            setModelName(data.data[toolType].modelName);
          }
        }
      } catch (err) {
        console.error('Failed to load model:', err);
      }
    };
    fetchModel();
  }, [toolType]);

  // Handle Initial Message (from Ideas transfer)
  useEffect(() => {
    if (initialMessage && !isTyping && !isLoading) {
      handleSend(initialMessage);
    }
  }, [initialMessage, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    playSound('success');
    trackToolMessage(toolType);

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      const token = localStorage.getItem('vibes_token');

      const response = await fetch('/api/tools/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tool_type: toolType,
          message: text,
        }),
      });

      if (!response.ok) throw new Error('API request failed');

      const assistantMsgId = (Date.now() + 1).toString();
      let accumulatedText = '';

      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        timestamp: new Date()
      }]);

      setIsTyping(false);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);

              if (parsed.content) {
                accumulatedText += parsed.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, text: accumulatedText }
                    : m
                ));
              }
            } catch (e) {
              // Ignore invalid JSON
            }
          }
        }
      }

      if (!accumulatedText) throw new Error('Empty response');

    } catch (error) {
      console.error("Chat API Error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Произошла ошибка соединения с нейросетью. Проверь интернет или обратись к администратору.',
        timestamp: new Date()
      };
      setMessages(prev => {
        const filtered = prev.filter(m => m.text !== '');
        return [...filtered, errorMsg];
      });
    } finally {
      setIsTyping(false);
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('Очистить историю переписки?')) {
      try {
        const token = localStorage.getItem('vibes_token');
        await fetch(`/api/tools/chats?tool_type=${toolType}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setMessages([{
          id: Date.now().toString(),
          role: 'assistant',
          text: config.welcomeMessage,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error("Failed to clear chat:", error);
        alert("Не удалось очистить историю.");
      }
    }
  };

  const handleTransferIdea = (ideaContent: string) => {
    if (onTransferToTZ) {
      onTransferToTZ(ideaContent);
    }
  };

  // Render message with markers
  const renderMessage = (msg: ChatMessage) => {
    if (msg.role === 'user') {
      return <p className="whitespace-pre-wrap break-words">{msg.text}</p>;
    }

    const { beforeMarker, markedContent, afterMarker, markerType } = parseMarkers(msg.text);

    return (
      <>
        {beforeMarker && <FormattedText text={beforeMarker} />}

        {markerType === 'tz' && markedContent && (
          <CopyableContent content={markedContent} />
        )}

        {markerType === 'idea' && markedContent && (
          <IdeaContent
            content={markedContent}
            onTransfer={() => handleTransferIdea(markedContent)}
          />
        )}

        {afterMarker && <FormattedText text={afterMarker} />}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full h-[calc(100dvh-80px)] md:h-[calc(100vh-2rem)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100dvh-80px)] md:h-screen flex flex-col overflow-hidden bg-transparent">

      {/* Header */}
      <header className="px-4 md:px-6 py-3 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-white/5 z-20 shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${config.gradient} flex items-center justify-center shadow-lg`}>
            <span className="text-xl">{config.emoji}</span>
          </div>

          {/* Title */}
          <div>
            <h1 className="font-display text-base md:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
              {config.title}
            </h1>
            {modelName && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {modelName}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-2.5 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Очистить чат"
        >
          <Trash2 size={20} />
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 overscroll-contain">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              key={msg.id}
              className={`flex items-start gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-md ${
                msg.role === 'assistant'
                  ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10'
                  : 'bg-zinc-900 dark:bg-white text-white dark:text-black'
              }`}>
                {msg.role === 'assistant'
                  ? <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                  : <User size={14} />
                }
              </div>

              {/* Bubble */}
              <div className={`flex flex-col max-w-[90%] md:max-w-[768px] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`relative px-3.5 py-2.5 md:px-4 md:py-3 pb-6 rounded-xl md:rounded-2xl shadow-sm text-[13px] md:text-[15px] leading-[1.6] overflow-hidden ${
                  msg.role === 'assistant'
                    ? 'bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 rounded-tl-sm shadow-xl shadow-zinc-200/50 dark:shadow-none'
                    : 'bg-gradient-to-br from-purple-600 to-violet-600 text-white rounded-tr-sm shadow-lg shadow-purple-500/30 border border-white/10'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${config.gradient} opacity-30`} />
                  )}
                  {renderMessage(msg)}
                  {/* Timestamp inside bubble */}
                  <span className={`absolute bottom-2 right-3 text-[9px] font-mono opacity-40 ${
                    msg.role === 'assistant' ? 'text-zinc-500' : 'text-white/70'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Quick Prompts для пустого чата */}
          {messages.length <= 1 && !isTyping && (
            <QuickPrompts
              toolType={toolType}
              onSelect={(prompt) => { trackQuickQuestion(prompt, toolType); handleSend(prompt); }}
              gradient={config.gradient}
            />
          )}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-md">
                <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="px-4 py-3 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl rounded-tl-sm border border-zinc-200 dark:border-white/5 flex items-center gap-2 shadow-sm">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-purple-500 rounded-full" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-purple-400 rounded-full" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-purple-300 rounded-full" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 pt-2 px-3 md:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80 z-20">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={onFormSubmit}
            className="relative rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-white/10 focus-within:border-purple-400 dark:focus-within:border-purple-500/50 transition-all duration-200 ring-0 focus-within:ring-2 focus-within:ring-purple-500/20"
          >

            <div className="relative flex items-end p-1.5 md:p-2 bg-white dark:bg-zinc-900 rounded-2xl">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={toolType === 'tz_helper' ? 'Опиши свою идею...' : toolType === 'ideas' ? 'Напиши ответ...' : 'Спроси нейросеть...'}
                className="w-full max-h-32 md:max-h-48 bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 p-3 md:p-4 pl-4 md:pl-5 focus:outline-none resize-none text-sm md:text-base scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700"
                rows={1}
                style={{ minHeight: '48px' }}
              />
              <div className="pb-1 pr-1">
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center min-w-[44px] min-h-[44px] ${
                    inputValue.trim() && !isTyping
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 shadow-md'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ToolChat;
