
import React, { useState, useMemo } from 'react';
import { 
  Copy, 
  Check, 
  Terminal, 
  Search, 
  X, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { PROMPTS_DATA } from '../data';
import { PromptCategory, PromptItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../SoundContext';

// --- Constants & Types ---

const CATEGORIES: PromptCategory[] = ['Лендинг', 'Веб-сервис', 'Дизайн', 'Фиксы', 'Функции', 'API', 'Оптимизация'];

const CATEGORY_COLORS: Record<string, string> = {
  'Лендинг': 'text-violet-500 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
  'Веб-сервис': 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
  'Дизайн': 'text-pink-500 bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20',
  'Фиксы': 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
  'Функции': 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
  'API': 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
  'Оптимизация': 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20',
};

// --- Components ---

const PromptBase: React.FC = () => {
  const { playSound } = useSound();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PromptCategory | 'Все'>('Все');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);

  // --- Handlers ---

  const handleCopy = (id: string, content: string) => {
    playSound('copy');
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPrompts = useMemo(() => {
    return PROMPTS_DATA.filter(prompt => {
      const matchesSearch = prompt.title.toLowerCase().includes(search.toLowerCase()) || 
                            prompt.description.toLowerCase().includes(search.toLowerCase()) ||
                            prompt.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = activeCategory === 'Все' || prompt.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      
      {/* Header */}
      <div className="mb-10">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
          Библиотека Промптов
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl text-lg">
          Коллекция проверенных инструкций для нейросетей. Копируй и используй для своих задач.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search & Filters */}
        <div className="mb-8 space-y-6">
            <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                type="text"
                placeholder="Найти промпт (например: 'dashboard' или 'landing')..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 transition-colors shadow-sm focus:ring-4 focus:ring-violet-500/10"
                />
            </div>

            <div className="flex overflow-x-auto scrollbar-none gap-2 pb-2">
                {['Все', ...CATEGORIES].map((cat) => (
                <button
                    key={cat}
                    onClick={() => { playSound('click'); setActiveCategory(cat as any); }}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${
                    activeCategory === cat
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent shadow-md'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'
                    }`}
                >
                    {cat}
                </button>
                ))}
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrompts.map((prompt) => {
            const colorClass = CATEGORY_COLORS[prompt.category] || 'text-zinc-500 bg-zinc-50 border-zinc-200';
            const isStack = !!prompt.steps;
            
            return (
                <div
                key={prompt.id}
                onClick={() => { playSound('click'); setSelectedPrompt(prompt); }}
                className="group cursor-pointer bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 flex flex-col h-full relative overflow-hidden"
                >
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/0 group-hover:from-violet-500/5 group-hover:to-fuchsia-500/5 transition-colors duration-500" />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${colorClass}`}>
                                {prompt.category}
                            </span>
                            {isStack && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-violet-200 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:border-violet-500/30 dark:text-violet-300 flex items-center gap-1">
                                    <Layers size={10} />
                                    {prompt.steps?.length} шага
                                </span>
                            )}
                        </div>
                        
                        {!isStack && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0 duration-300">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); if (prompt.content) handleCopy(prompt.id, prompt.content); }}
                                    className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 transition-colors"
                                    title="Быстрое копирование"
                                >
                                    {copiedId === prompt.id ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        )}
                    </div>

                    <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {prompt.title}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 line-clamp-3 leading-relaxed">
                        {prompt.description}
                    </p>

                    <div className="mt-auto flex flex-wrap gap-2">
                        {prompt.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-zinc-400 font-medium bg-zinc-50 dark:bg-white/5 px-2 py-1 rounded-md">
                            #{tag}
                        </span>
                        ))}
                    </div>
                </div>
                </div>
            );
            })}
        </div>
        
        {filteredPrompts.length === 0 && (
            <div className="py-20 text-center">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300 dark:text-zinc-600">
                    <Search size={32} />
                </div>
                <p className="text-zinc-400 font-bold">Промпты не найдены</p>
                <p className="text-zinc-500 text-sm mt-1">Попробуй поискать в другой категории</p>
            </div>
        )}
      </motion.div>

      {/* Modal for Library Items */}
      <AnimatePresence>
         {selectedPrompt && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedPrompt(null)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               />
               <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
               >
                  {/* Header */}
                  <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
                     <div className="flex justify-between items-start gap-4">
                        <div>
                           <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${CATEGORY_COLORS[selectedPrompt.category]}`}>
                                 {selectedPrompt.category}
                              </span>
                              {selectedPrompt.steps && (
                                <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-violet-200 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:border-violet-500/30 dark:text-violet-300 flex items-center gap-1">
                                    <Layers size={12} />
                                    Цепочка промптов
                                </span>
                              )}
                           </div>
                           <h3 className="font-display text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                              {selectedPrompt.title}
                           </h3>
                           <p className="text-zinc-500 dark:text-zinc-400">
                              {selectedPrompt.description}
                           </p>
                        </div>
                        <button 
                           onClick={() => setSelectedPrompt(null)}
                           className="p-2 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                           <X size={20} />
                        </button>
                     </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                     {/* Usage */}
                     <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-5 flex gap-4">
                        <div className="shrink-0 pt-1 text-amber-600 dark:text-amber-400">
                           <Layers size={24} />
                        </div>
                        <div>
                           <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm mb-1">Как использовать</h4>
                           <p className="text-sm text-amber-800 dark:text-amber-300/80 leading-relaxed">
                              {selectedPrompt.usage}
                           </p>
                        </div>
                     </div>

                     {/* Content Logic: Stack vs Single */}
                     {selectedPrompt.steps ? (
                        /* --- STACK VIEW --- */
                        <div className="space-y-8 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-zinc-100 dark:bg-zinc-800" />
                            
                            {selectedPrompt.steps.map((step, idx) => (
                                <div key={idx} className="relative pl-14">
                                    {/* Step Number Bubble */}
                                    <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold z-10 transition-colors bg-white dark:bg-zinc-900 ${
                                        copiedId === `${selectedPrompt.id}-step-${idx}` 
                                        ? 'border-emerald-500 text-emerald-500' 
                                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                                    }`}>
                                        {copiedId === `${selectedPrompt.id}-step-${idx}` ? <Check size={16} /> : idx + 1}
                                    </div>

                                    {/* Step Content */}
                                    <div className="mb-2">
                                        <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-1">{step.title}</h4>
                                        {step.description && <p className="text-sm text-zinc-500 mb-3">{step.description}</p>}
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleCopy(`${selectedPrompt.id}-step-${idx}`, step.content)}
                                                className="p-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 shadow-lg border border-white/10 flex items-center gap-2 text-xs font-bold"
                                            >
                                                {copiedId === `${selectedPrompt.id}-step-${idx}` ? (
                                                    <>
                                                        <Check size={14} />
                                                        <span>Скопировано</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={14} />
                                                        <span>Копировать</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <div className="bg-[#1e1e1e] text-zinc-300 p-5 rounded-2xl overflow-x-auto text-sm font-mono leading-relaxed border border-zinc-800 shadow-inner">
                                            <pre>{step.content}</pre>
                                        </div>
                                    </div>
                                    
                                    {/* Arrow Connector (if not last) */}
                                    {idx < (selectedPrompt.steps?.length || 0) - 1 && (
                                        <div className="flex justify-center mt-6 mb-2">
                                            <ArrowRight size={20} className="text-zinc-300 dark:text-zinc-700 rotate-90" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                     ) : (
                        /* --- SINGLE PROMPT VIEW --- */
                        <>
                            <div className="relative group">
                                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => selectedPrompt.content && handleCopy(selectedPrompt.id, selectedPrompt.content)}
                                    className="p-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 shadow-lg border border-white/10"
                                >
                                    {copiedId === selectedPrompt.id ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                                </div>
                                <div className="bg-[#1e1e1e] text-zinc-300 p-6 rounded-2xl overflow-x-auto text-sm font-mono leading-relaxed border border-zinc-800 shadow-inner">
                                <pre>{selectedPrompt.content}</pre>
                                </div>
                            </div>

                            <button
                                onClick={() => selectedPrompt.content && handleCopy(selectedPrompt.id, selectedPrompt.content)}
                                className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3"
                            >
                                {copiedId === selectedPrompt.id ? (
                                <>
                                    <Check size={20} />
                                    <span>Скопировано!</span>
                                </>
                                ) : (
                                <>
                                    <Copy size={20} />
                                    <span>Скопировать промпт</span>
                                </>
                                )}
                            </button>
                        </>
                     )}
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Floating Toast */}
      <AnimatePresence>
        {copiedId && !selectedPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-4 px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl shadow-2xl border border-zinc-700 dark:border-zinc-200"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <Check size={20} strokeWidth={3} />
            </div>
            <div className="flex flex-col">
               <span className="font-bold text-base">Скопировано</span>
               <span className="text-xs text-zinc-500 dark:text-zinc-400">Готово к вставке в AI</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromptBase;
