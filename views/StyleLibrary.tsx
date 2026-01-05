
import React, { useState, useMemo } from 'react';
import { Copy, Check, Eye, X, Palette, Sparkles, MoveRight } from 'lucide-react';
import { STYLES_DATA } from '../data';
import { StyleCategory, StyleCard } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../SoundContext';

const CATEGORIES: StyleCategory[] = ['Все', 'Светлые', 'Тёмные', 'Яркие', 'Минимализм'];

const StyleLibrary: React.FC = () => {
  const { playSound } = useSound();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleCard | null>(null);
  const [activeCategory, setActiveCategory] = useState<StyleCategory>('Все');

  const handleCopy = (id: string, prompt: string) => {
    playSound('copy');
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const filteredStyles = useMemo(() => {
    if (activeCategory === 'Все') return STYLES_DATA;
    return STYLES_DATA.filter(style => style.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      
      {/* 3.1 Заголовок раздела */}
      <div className="mb-12">
          <h2 className="font-display text-4xl md:text-6xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight">
            Библиотека <br />
            <span className="text-violet-600 dark:text-violet-400">Стилей</span>
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl text-lg md:text-xl font-light">
            Выбери визуальный стиль для своего проекта. Кликни на карточку, чтобы посмотреть детали и скопировать промпт.
          </p>
      </div>

      {/* 3.5 Инструкция */}
      <div className="mb-16 border-b border-zinc-200 dark:border-white/10 pb-12">
         <div className="grid md:grid-cols-3 gap-6">
            {[
                { step: '01', title: 'Выбери стиль', text: 'Найди визуальный язык, который подходит твоему проекту.', icon: Palette },
                { step: '02', title: 'Скопируй промпт', text: 'Нажми кнопку копирования на карточке понравившегося стиля.', icon: Copy },
                { step: '03', title: 'Создавай', text: 'Вставь промпт в AI Studio вместе с описанием задачи.', icon: Sparkles },
            ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                        <item.icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1 uppercase tracking-wider flex items-center gap-2">
                         Шаг {item.step}
                      </h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.text}</p>
                    </div>
                </div>
            ))}
         </div>
      </div>

      {/* 3.4 Фильтрация */}
      <div className="sticky top-20 md:top-6 z-30 bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 md:mx-0 md:px-0 border-y md:border-none border-zinc-200 dark:border-white/5 md:bg-transparent md:backdrop-blur-none">
        <div className="flex overflow-x-auto scrollbar-none gap-2 pb-1">
            {CATEGORIES.map((cat) => (
            <button
                key={cat}
                onClick={() => { playSound('click'); setActiveCategory(cat); }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border whitespace-nowrap ${
                activeCategory === cat
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent shadow-lg transform scale-105'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:border-zinc-300 dark:hover:border-white/20'
                }`}
            >
                {cat}
            </button>
            ))}
        </div>
      </div>

      {/* 3.2 Сетка карточек */}
      <motion.div 
        layout 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8"
      >
        <AnimatePresence mode="popLayout">
          {filteredStyles.map((style) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)", transition: { duration: 0.2 } }}
              transition={{ 
                layout: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.4 }
              }}
              key={style.id}
              className="group relative bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors duration-500 hover:shadow-2xl hover:shadow-violet-900/10 dark:hover:shadow-violet-900/20 flex flex-col h-[400px]"
            >
              {/* Image Area */}
              <div className="relative h-[65%] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img 
                    src={style.image} 
                    alt={style.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-40 transition-opacity group-hover:opacity-60" />
                
                {/* 3.3 Hover Actions Overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <button 
                        onClick={() => { playSound('click'); setSelectedStyle(style); }}
                        className="p-3.5 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg"
                        title="Посмотреть пример"
                    >
                        <Eye size={24} />
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(style.id, style.prompt);
                        }}
                        className="p-3.5 rounded-full bg-violet-600 border border-violet-500 text-white hover:bg-violet-500 hover:scale-110 transition-all duration-300 shadow-lg"
                        title="Скопировать промпт"
                    >
                         {copiedId === style.id ? <Check size={24} /> : <Copy size={24} />}
                    </button>
                </div>
                
                {/* Badge */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-bold text-white uppercase tracking-wider shadow-lg">
                    {style.category}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-6 flex flex-col justify-between relative bg-white dark:bg-zinc-900">
                <div>
                   <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                     {style.name}
                   </h3>
                   <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm leading-relaxed line-clamp-2 mb-3">
                     {style.description}
                   </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {style.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                            {tag}
                        </span>
                    ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Modal / Lightbox */}
      <AnimatePresence>
        {selectedStyle && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-4 md:py-8">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedStyle(null)}
                    className="absolute inset-0 bg-zinc-900/80 backdrop-blur-md"
                />
                <motion.div 
                    layoutId={`style-card-${selectedStyle.id}`}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="relative w-full max-w-6xl bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-full md:h-auto md:max-h-[85vh] z-10"
                >
                    {/* Close Button */}
                    <button 
                        onClick={() => setSelectedStyle(null)}
                        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    {/* Left: Image */}
                    <div className="w-full md:w-3/5 h-64 md:h-auto bg-zinc-100 dark:bg-zinc-800 relative">
                        <img 
                            src={selectedStyle.image} 
                            alt={selectedStyle.name}
                            className="w-full h-full object-cover"
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 md:hidden" />
                         <div className="absolute bottom-6 left-6 text-white md:hidden max-w-[80%]">
                            <h3 className="font-display text-3xl font-bold mb-2">{selectedStyle.name}</h3>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                    {selectedStyle.category}
                                </span>
                            </div>
                         </div>
                    </div>

                    {/* Right: Info */}
                    <div className="w-full md:w-2/5 p-8 md:p-12 flex flex-col bg-white dark:bg-zinc-900 overflow-y-auto">
                        <div className="hidden md:block">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300 text-xs font-bold uppercase tracking-wider">
                                    {selectedStyle.category}
                                </span>
                            </div>
                            <h3 className="font-display text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
                                {selectedStyle.name}
                            </h3>
                        </div>

                        <div className="prose prose-zinc dark:prose-invert mb-8">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-2">Описание</h4>
                            <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
                                {selectedStyle.longDescription || selectedStyle.description}
                            </p>
                        </div>

                        <div className="mb-10">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3">Характеристики</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedStyle.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 text-sm font-medium">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-zinc-100 dark:border-white/5">
                            <button
                                onClick={() => handleCopy(selectedStyle.id, selectedStyle.prompt)}
                                className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3"
                            >
                                {copiedId === selectedStyle.id ? (
                                    <>
                                        <Check size={24} />
                                        <span>Скопировано!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={24} />
                                        <span>Скопировать промпт</span>
                                    </>
                                )}
                            </button>
                            <p className="text-center text-xs text-zinc-400 mt-4">
                                Нажми, чтобы скопировать и вставить в нейросеть
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {copiedId && !selectedStyle && (
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
               <span className="font-bold text-base">Промпт скопирован!</span>
               <span className="text-xs text-zinc-500 dark:text-zinc-400">Вставь его в Google AI Studio</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StyleLibrary;
