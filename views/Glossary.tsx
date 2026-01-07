
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Hash, BookOpen, ArrowUp, Sparkles, Copy, MessageSquare, Share2, RefreshCw } from 'lucide-react';
import { GLOSSARY_DATA } from '../data';
import { GlossaryCategory, GlossaryTerm, TabId } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../SoundContext';

const CATEGORIES: GlossaryCategory[] = ['Все', 'Базовые', 'Код', 'Инструменты', 'API', 'Ошибки', 'Вайб-кодинг'];

// Color mapping for categories to add visual hierarchy
const CATEGORY_COLORS: Record<string, string> = {
  'Базовые': 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20',
  'Код': 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20',
  'Инструменты': 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
  'API': 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
  'Ошибки': 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10 border-red-100 dark:border-red-500/20',
  'Вайб-кодинг': 'text-fuchsia-600 bg-fuchsia-50 dark:text-fuchsia-400 dark:bg-fuchsia-500/10 border-fuchsia-100 dark:border-fuchsia-500/20',
};

interface GlossaryProps {
  onNavigate?: (tab: TabId) => void;
  onAskAI?: (prompt: string) => void;
}

const Glossary: React.FC<GlossaryProps> = ({ onNavigate, onAskAI }) => {
  const { playSound } = useSound();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory>('Все');
  const [randomTerm, setRandomTerm] = useState<GlossaryTerm | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Set random term on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * GLOSSARY_DATA.length);
    setRandomTerm(GLOSSARY_DATA[randomIndex]);
  }, []);

  const refreshRandomTerm = () => {
    playSound('click');
    let newTerm;
    do {
       const randomIndex = Math.floor(Math.random() * GLOSSARY_DATA.length);
       newTerm = GLOSSARY_DATA[randomIndex];
    } while (newTerm.id === randomTerm?.id);
    setRandomTerm(newTerm);
  };

  const handleCopy = (id: string, text: string) => {
    playSound('copy');
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAskAssistant = (term: string, definition?: string) => {
    playSound('click');
    
    // Construct a rich prompt for the assistant
    const prompt = definition 
        ? `Привет! Я встретил термин **"${term}"** в словаре (${definition}). Объясни его подробнее простыми словами, приведи примеры использования в коде или аналогии из жизни. Как это применимо на практике?`
        : `Расскажи мне подробнее про **"${term}"**. Что это такое простыми словами и как используется?`;

    if (onAskAI) {
        onAskAI(prompt);
    } else if (onNavigate) {
        // Fallback if prop not provided
        onNavigate('assistant');
    }
  };

  const filteredData = useMemo(() => {
    return GLOSSARY_DATA.filter((item) => {
      const matchesSearch = item.term.toLowerCase().includes(search.toLowerCase()) || 
                            (item.slang && item.slang.toLowerCase().includes(search.toLowerCase())) ||
                            item.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Все' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      
      {/* 1. SPOTLIGHT HERO SECTION */}
      {randomTerm && !search && activeCategory === 'Все' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
           <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 dark:bg-white text-white dark:text-black p-8 md:p-12 shadow-2xl shadow-zinc-500/20">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start justify-between">
                 <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-4 text-zinc-400 dark:text-zinc-500">
                       <Sparkles size={20} className="text-yellow-400 dark:text-yellow-600" />
                       <span className="text-xs font-bold uppercase tracking-widest">Термин дня</span>
                    </div>
                    <h2 className="font-display text-4xl md:text-6xl font-bold mb-4 leading-tight">
                      {randomTerm.term}
                    </h2>
                    {randomTerm.slang && (
                      <p className="font-mono text-lg text-violet-400 dark:text-violet-600 mb-6 opacity-90">
                        a.k.a. {randomTerm.slang}
                      </p>
                    )}
                    <p className="text-lg md:text-xl text-zinc-300 dark:text-zinc-600 leading-relaxed max-w-xl">
                      {randomTerm.definition}
                    </p>
                 </div>

                 <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                    <button 
                      onClick={() => handleCopy('hero', `${randomTerm.term} — ${randomTerm.definition}`)}
                      className="px-6 py-4 rounded-2xl bg-white/10 dark:bg-black/5 hover:bg-white/20 dark:hover:bg-black/10 backdrop-blur-md border border-white/10 dark:border-black/10 transition-colors flex items-center justify-center gap-3 font-bold"
                    >
                       {copiedId === 'hero' ? <CheckCircleIcon /> : <Copy size={20} />}
                       <span>{copiedId === 'hero' ? 'Скопировано' : 'Копировать'}</span>
                    </button>
                    <button 
                      onClick={refreshRandomTerm}
                      className="px-6 py-4 rounded-2xl border border-white/10 dark:border-black/10 hover:bg-white/5 dark:hover:bg-black/5 text-zinc-400 dark:text-zinc-500 transition-colors flex items-center justify-center gap-3 font-bold text-sm"
                    >
                       <RefreshCw size={18} />
                       <span>Другой термин</span>
                    </button>
                 </div>
              </div>
           </div>
        </motion.div>
      )}

      {/* 2. SEARCH & FILTER HEADER */}
      <div className="sticky top-4 z-30 mb-8 space-y-4">
         {/* Search Bar */}
         <div className="relative group max-w-3xl mx-auto">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl opacity-20 group-focus-within:opacity-50 blur transition duration-500" />
            <div className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl flex items-center p-2 shadow-lg border border-zinc-200 dark:border-white/10">
               <Search className="ml-4 text-zinc-400 shrink-0" size={20} />
               <input
                 type="text"
                 placeholder="Найти определение, сленг или суть..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full bg-transparent px-4 py-3 text-lg outline-none text-zinc-900 dark:text-white placeholder-zinc-400"
               />
               {search && (
                 <button onClick={() => setSearch('')} className="p-2 mr-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">
                    <span className="sr-only">Clear</span>
                    <ArrowUp size={16} className="rotate-45 text-zinc-500" />
                 </button>
               )}
            </div>
         </div>

         {/* Categories Pills */}
         <div className="flex overflow-x-auto scrollbar-none gap-2 justify-start md:justify-center py-2 px-4 md:px-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                  activeCategory === cat
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent shadow-md scale-105'
                    : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
         </div>
      </div>

      {/* 3. MASONRY GRID CONTENT */}
      {filteredData.length > 0 ? (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
           <AnimatePresence>
              {filteredData.map((item, index) => {
                 const colorClass = CATEGORY_COLORS[item.category] || 'text-zinc-500 bg-zinc-50 border-zinc-200';
                 
                 return (
                   <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      key={item.id}
                      className="break-inside-avoid group relative bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/30 transition-all hover:shadow-xl hover:shadow-violet-500/5 mb-6"
                   >
                      <div className="flex justify-between items-start mb-4">
                         <div>
                            <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white leading-tight">
                               {item.term}
                            </h3>
                            {item.slang && (
                               <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">
                                  {item.slang}
                               </span>
                            )}
                         </div>
                         <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
                            {item.category}
                         </span>
                      </div>

                      <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed mb-6">
                         {item.definition}
                      </p>

                      {/* Action Bar (Visible on Hover/Focus) */}
                      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-white/5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="flex gap-2">
                            <button 
                               onClick={() => handleCopy(item.id, item.definition)}
                               className="p-2 rounded-xl text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                               title="Копировать определение"
                            >
                               {copiedId === item.id ? <CheckCircleIcon size={18} className="text-emerald-500" /> : <Copy size={18} />}
                            </button>
                            <button 
                               onClick={() => handleAskAssistant(item.term, item.definition)}
                               className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                               title="Спросить ассистента"
                            >
                               <MessageSquare size={18} />
                            </button>
                         </div>
                         <button className="text-xs font-bold text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                            #vibes
                         </button>
                      </div>
                   </motion.div>
                 );
              })}
           </AnimatePresence>
        </div>
      ) : (
        /* Empty State */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-32 text-center"
        >
           <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-zinc-300 dark:text-zinc-600">
              <Search size={40} />
           </div>
           <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Термин не найден</h3>
           <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-8">
             Мы не нашли "{search}" в нашей базе. Хочешь, спросим у ИИ-ассистента?
           </p>
           <button 
             onClick={() => handleAskAssistant(search)}
             className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-violet-500/20 flex items-center gap-2"
           >
             <Sparkles size={18} />
             Спросить у AI
           </button>
        </motion.div>
      )}

      {/* Mobile Back to Top */}
      <div className="fixed bottom-6 right-6 lg:hidden z-40">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="p-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg shadow-black/20"
        >
           <ArrowUp size={24} />
        </button>
      </div>

    </div>
  );
};

// Simple Icon Component for reuse
const CheckCircleIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
);

export default Glossary;
