
import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Cpu,
  Trash2,
  Copy,
  Check,
  Terminal,
  Zap,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../SoundContext';
import { fetchWithAuthGet, fetchWithAuth } from '../lib/fetchWithAuth';

// --- Configuration ---

const DEFAULT_QUICK_QUESTIONS = [
  "Как задеплоить на Vercel?",
  "Что такое API простыми словами?",
  "Как исправить ошибку 404?",
  "Напиши промпт для кнопки"
];

// --- Helpers ---

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// --- Components ---

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'text' }) => {
  const { playSound } = useSound();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    playSound('copy');
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-lg group font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-zinc-500" />
          <span className="text-xs text-zinc-400 lowercase font-medium">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? <span className="text-emerald-500">Скопировано</span> : <span>Копировать</span>}
        </button>
      </div>
      <div className="p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <pre className="text-zinc-300 leading-relaxed whitespace-pre font-mono text-[13px]">
          {code}
        </pre>
      </div>
    </div>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="markdown-body prose prose-zinc dark:prose-invert max-w-none prose-p:leading-7 prose-p:mb-4 prose-pre:m-0 prose-pre:p-0 prose-pre:bg-transparent text-sm md:text-base break-words">
      <ReactMarkdown
        components={{
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline font-bold break-all" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = !inline && (match || String(children).includes('\n'));

            return isBlock ? (
              <CodeBlock code={String(children).replace(/\n$/, '')} language={match ? match[1] : 'text'} />
            ) : (
              <code className="bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 rounded px-1.5 py-0.5 font-mono text-xs md:text-sm text-violet-700 dark:text-violet-300 break-words" {...props}>
                {children}
              </code>
            );
          },
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside ml-4 mb-4 space-y-1 marker:text-violet-500" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside ml-4 mb-4 space-y-1 marker:text-violet-500 font-medium" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="pl-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-4 last:mb-0 whitespace-pre-wrap text-zinc-700 dark:text-zinc-200" {...props} />
          ),
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-zinc-900 dark:text-white font-display" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 mt-5 text-zinc-900 dark:text-white font-display" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 mt-4 text-zinc-900 dark:text-white font-display" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-zinc-900 dark:text-white" {...props} />,
          em: ({ node, ...props }) => <em className="italic text-zinc-800 dark:text-zinc-300" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-violet-500 pl-4 py-2 my-4 bg-zinc-50 dark:bg-white/5 rounded-r-lg italic text-zinc-600 dark:text-zinc-400" {...props} />
          )
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

interface AssistantProps {
  initialMessage?: string | null;
  onMessageHandled?: () => void;
}

const Assistant: React.FC<AssistantProps> = ({ initialMessage, onMessageHandled }) => {
  const { playSound } = useSound();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickQuestions, setQuickQuestions] = useState<string[]>(DEFAULT_QUICK_QUESTIONS);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load History from API
  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Загружаем историю с сервера
        const history = await fetchWithAuthGet<ChatMessage[]>('/api/chat');
        
        if (history && history.length > 0) {
          // Преобразуем даты из строк в Date объекты
          const formattedHistory = history.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(formattedHistory);
        } else {
          // Приветственное сообщение, если история пуста
          setMessages([{
            id: 'init',
            role: 'assistant',
            text: 'Привет! Я твой ИИ-ментор по вайб-кодингу. Готов помочь с кодом, ошибками или объяснить сложные штуки простыми словами. **С чего начнем?**',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
        // Fallback: пустое состояние или ошибка
        setMessages([{
          id: 'error',
          role: 'assistant',
          text: 'Не удалось загрузить историю сообщений. Но мы можем начать новый диалог.',
          timestamp: new Date()
        }]);
      }
    };

    loadHistory();
  }, []);

  // Load Quick Questions from API
  useEffect(() => {
    const loadQuickQuestions = async () => {
      try {
        const questions = await fetchWithAuthGet<string[]>('/api/content/quick-questions');

        if (questions && questions.length > 0) {
          setQuickQuestions(questions);
        }
        // Если пустой массив - оставляем дефолтные значения
      } catch (error) {
        console.error("Failed to load quick questions:", error);
        // Fallback: используем дефолтные значения
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuickQuestions();
  }, []);

  // Handle Initial Context from other pages
  useEffect(() => {
    if (initialMessage && !isTyping) {
      handleSend(initialMessage);
      if (onMessageHandled) onMessageHandled();
    }
  }, [initialMessage]);

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

    playSound('success'); // Play sound for sent message

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(), // Временный ID для UI
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    // Reset height
    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      // Получаем JWT токен из localStorage
      const token = localStorage.getItem('vibes_token');

      // Отправляем запрос к нашему API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text, // Отправляем только новое сообщение
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // Создаём пустое сообщение ассистента для стриминга
      const assistantMsgId = (Date.now() + 1).toString();
      let accumulatedText = '';

      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        timestamp: new Date()
      }]);

      setIsTyping(false);

      // Обрабатываем SSE стрим
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

            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.content) {
                accumulatedText += parsed.content;

                // Обновляем сообщение в реальном времени
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, text: accumulatedText }
                    : m
                ));
              }
            } catch (e) {
              // Игнорируем невалидный JSON
            }
          }
        }
      }

      // Если текст не накопился, показываем ошибку
      if (!accumulatedText) {
        throw new Error('Empty response');
      }

    } catch (error) {
      console.error("Chat API Error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Произошла ошибка соединения с нейросетью. Проверь интернет или обратись к администратору.',
        timestamp: new Date()
      };
      setMessages(prev => {
        // Удаляем пустое сообщение если оно есть (обычно последнее)
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
        await fetchWithAuth('/api/chat', { method: 'DELETE' });
        
        setMessages([{
          id: Date.now().toString(),
          role: 'assistant',
          text: 'Чат очищен. Я готов к новым задачам! 🚀',
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error("Failed to clear chat:", error);
        alert("Не удалось очистить историю.");
      }
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-80px)] md:h-[calc(100vh-2rem)] flex flex-col overflow-hidden bg-transparent">

      {/* --- Header (Desktop Only) --- */}
      <header className="hidden md:flex px-8 py-4 items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-white/5 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Bot size={20} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse"></div>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-zinc-900 dark:text-white leading-tight">
              VIBES Neural Link
            </h1>
            <div className="flex items-center gap-2">
              <Cpu size={12} className="text-zinc-500" />
              <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider">google/gemini-2.5-flash-lite</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          title="Очистить историю"
        >
          <Trash2 size={20} />
        </button>
      </header>

      {/* --- Mobile Header Actions (Floating) --- */}
      <div className="md:hidden absolute top-2 right-2 z-30">
          <button
            onClick={handleClearChat}
            className="p-2 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur text-zinc-500 hover:text-red-500 border border-zinc-200 dark:border-white/10"
          >
            <Trash2 size={16} />
          </button>
      </div>

      {/* --- Chat Area --- */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 overscroll-contain">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              key={msg.id}
              className={`flex items-start gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-md ${msg.role === 'assistant'
                  ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10'
                  : 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                }`}>
                {msg.role === 'assistant'
                  ? <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
                  : <User size={16} />
                }
              </div>

              {/* Bubble */}
              <div className={`flex flex-col max-w-[85%] md:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`relative px-4 py-3 md:px-6 md:py-5 rounded-2xl md:rounded-3xl shadow-sm text-sm md:text-base leading-relaxed overflow-hidden ${msg.role === 'assistant'
                    ? 'bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 rounded-tl-sm shadow-xl shadow-zinc-200/50 dark:shadow-none'
                    : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm shadow-lg shadow-violet-500/30 border border-white/10'
                  }`}>
                  {msg.role === 'assistant' && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-transparent opacity-30"></div>
                  )}

                  {msg.role === 'assistant' ? (
                    <FormattedText text={msg.text} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-zinc-400 mt-1 md:mt-2 px-1 opacity-60">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-4"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-md">
                <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div className="px-5 py-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl rounded-tl-sm border border-zinc-200 dark:border-white/5 flex items-center gap-2 shadow-sm">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-violet-500 rounded-full" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-violet-400 rounded-full" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-violet-300 rounded-full" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {/* --- Input Area --- */}
      <div className="shrink-0 p-4 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-zinc-950 dark:via-zinc-950 z-20">
        <div className="max-w-4xl mx-auto space-y-3 md:space-y-4">

          {/* Quick Questions */}
          {isLoadingQuestions ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mask-linear px-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-48 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mask-linear px-1">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="whitespace-nowrap px-3 py-2 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur border border-zinc-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/50 text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-300 transition-all shadow-sm hover:shadow-violet-500/10 flex items-center gap-2 group"
                >
                  <Zap size={14} className="text-violet-400 group-hover:text-violet-500 transition-colors" />
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Field */}
          <form
            onSubmit={onFormSubmit}
            className="relative group rounded-3xl bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-200 dark:border-white/10 focus-within:border-violet-500/50 dark:focus-within:border-violet-500/50 transition-all duration-300 ring-0 focus-within:ring-4 focus-within:ring-violet-500/10"
          >
            {/* Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl opacity-0 group-focus-within:opacity-30 blur-md transition-opacity duration-500 pointer-events-none" />

            <div className="relative flex items-end p-1.5 md:p-2 bg-white dark:bg-zinc-900 rounded-3xl">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Спроси нейросеть..."
                className="w-full max-h-32 md:max-h-48 bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 p-3 md:p-4 pl-4 md:pl-5 focus:outline-none resize-none text-sm md:text-base scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700"
                rows={1}
                style={{ minHeight: '48px' }}
              />
              <div className="pb-1 pr-1">
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="p-2 md:p-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl md:rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg hover:shadow-zinc-500/20 flex items-center justify-center"
                >
                  <Send size={18} className={!inputValue.trim() ? "opacity-50" : ""} />
                </button>
              </div>
            </div>
          </form>
          <div className="text-center">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono opacity-70">
              Gemini 2.5 Flash Lite
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
