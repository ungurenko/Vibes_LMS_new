
import React, { useState, useMemo } from 'react';
import { 
  Heart, 
  ExternalLink, 
  Plus, 
  Search, 
  Flame, 
  Clock, 
  Filter, 
  X, 
  Upload, 
  Layout, 
  Smartphone, 
  ShoppingCart, 
  Palette 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SHOWCASE_DATA } from '../data';
import { ShowcaseProject, ProjectCategory } from '../types';

const CATEGORIES: { id: ProjectCategory | 'Все'; label: string; icon: React.ElementType }[] = [
  { id: 'Все', label: 'Все проекты', icon: Layout },
  { id: 'Лендинг', label: 'Лендинги', icon: Layout },
  { id: 'Веб-сервис', label: 'Сервисы', icon: Smartphone },
  { id: 'E-commerce', label: 'E-commerce', icon: ShoppingCart },
  { id: 'Креатив', label: 'Креатив', icon: Palette },
];

const Community: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<ProjectCategory | 'Все'>('Все');
  const [projects, setProjects] = useState<ShowcaseProject[]>(SHOWCASE_DATA);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'hot' | 'new'>('hot');

  // Toggle Like Logic
  const handleLike = (id: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          likes: p.isLikedByCurrentUser ? p.likes - 1 : p.likes + 1,
          isLikedByCurrentUser: !p.isLikedByCurrentUser
        };
      }
      return p;
    }));
  };

  // Add Project Logic (Mock)
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
    // In a real app, we would validate data and upload image
    alert('Проект отправлен на модерацию! Скоро он появится на стене.');
  };

  // Filter & Sort
  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => {
      const matchesCategory = activeCategory === 'Все' || p.category === activeCategory;
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                            p.author.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    if (sortBy === 'hot') {
      result.sort((a, b) => b.likes - a.likes);
    } else {
      // Mock date sorting (assuming added sequentially or string comparison)
      result.sort((a, b) => b.id.localeCompare(a.id)); 
    }

    return result;
  }, [projects, activeCategory, search, sortBy]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        <div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-3">
            Стена Вайба <span className="text-orange-500 animate-pulse">🔥</span>
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl text-lg font-light leading-relaxed">
            Галерея работ студентов. Делись проектами, собирай огоньки и вдохновляйся идеями комьюнити.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-zinc-500/10"
        >
          <Plus size={20} />
          <span>Опубликовать проект</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="sticky top-20 md:top-6 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-y border-zinc-200 dark:border-white/5 py-4 mb-8 -mx-4 px-4 md:-mx-8 md:px-8">
         <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
             
             {/* Categories */}
             <div className="flex overflow-x-auto scrollbar-none gap-2 w-full md:w-auto pb-1">
                {CATEGORIES.map((cat) => (
                   <button
                     key={cat.id}
                     onClick={() => setActiveCategory(cat.id as any)}
                     className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                        activeCategory === cat.id
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white'
                          : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white border-zinc-200 dark:border-white/10'
                     }`}
                   >
                     <cat.icon size={16} />
                     {cat.label}
                   </button>
                ))}
             </div>

             {/* Search & Sort */}
             <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                   <input 
                     type="text" 
                     placeholder="Поиск..."
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-violet-500 text-sm"
                   />
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl flex">
                   <button 
                     onClick={() => setSortBy('hot')}
                     className={`p-1.5 rounded-lg transition-all ${sortBy === 'hot' ? 'bg-white dark:bg-zinc-700 shadow-sm text-orange-500' : 'text-zinc-400'}`}
                     title="Популярное"
                   >
                     <Flame size={18} />
                   </button>
                   <button 
                     onClick={() => setSortBy('new')}
                     className={`p-1.5 rounded-lg transition-all ${sortBy === 'new' ? 'bg-white dark:bg-zinc-700 shadow-sm text-violet-500' : 'text-zinc-400'}`}
                     title="Новое"
                   >
                     <Clock size={18} />
                   </button>
                </div>
             </div>
         </div>
      </div>

      {/* Grid */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         <AnimatePresence>
            {filteredProjects.map((project) => (
               <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={project.id}
                  className="group relative bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-500"
               >
                  {/* Image Area */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                     <img 
                       src={project.imageUrl} 
                       alt={project.title} 
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                     />
                     
                     {/* Overlay */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

                     {/* Top Badge */}
                     <div className="absolute top-4 left-4">
                        <span className="px-2 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
                           {project.category}
                        </span>
                     </div>

                     {/* External Link Overlay Button */}
                     <a 
                       href={project.demoUrl}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-white hover:text-black"
                     >
                       <ExternalLink size={18} />
                     </a>
                  </div>

                  {/* Content Area */}
                  <div className="p-5">
                     <div className="flex justify-between items-start mb-3">
                        <div>
                           <h3 className="font-display font-bold text-zinc-900 dark:text-white text-lg leading-tight mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                             {project.title}
                           </h3>
                           <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{project.description}</p>
                        </div>
                     </div>

                     <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-white/5 mt-4">
                        {/* Author */}
                        <div className="flex items-center gap-2">
                           <img src={project.author.avatar} alt="" className="w-6 h-6 rounded-full bg-zinc-200 ring-2 ring-white dark:ring-zinc-800" />
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white leading-none">{project.author.name}</span>
                              <span className="text-[10px] text-zinc-400">{project.author.level}</span>
                           </div>
                        </div>

                        {/* Likes */}
                        <button 
                          onClick={() => handleLike(project.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90 ${
                             project.isLikedByCurrentUser 
                               ? 'bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-500' 
                               : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-500'
                          }`}
                        >
                           <Heart size={14} className={project.isLikedByCurrentUser ? "fill-current" : ""} />
                           <span className="text-xs font-bold">{project.likes}</span>
                        </button>
                     </div>
                  </div>
               </motion.div>
            ))}
         </AnimatePresence>
      </motion.div>

      {filteredProjects.length === 0 && (
         <div className="py-20 text-center">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
               <Filter size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Проекты не найдены</h3>
            <p className="text-zinc-500">Попробуйте изменить параметры поиска или фильтры.</p>
         </div>
      )}

      {/* Add Project Modal */}
      <AnimatePresence>
         {isModalOpen && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
            >
               {/* Backdrop */}
               <div 
                   className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                   onClick={() => setIsModalOpen(false)}
               />

               {/* Modal Card */}
               <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-white/10"
               >
                  {/* Fixed Header */}
                  <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-900 shrink-0 z-10">
                     <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Опубликовать проект</h3>
                     <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full p-2 transition-colors">
                        <X size={20} />
                     </button>
                  </div>

                  {/* Scrollable Body */}
                  <div className="overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-white/10">
                     <form onSubmit={handleAddProject} className="space-y-5">
                        <div>
                           <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Название проекта</label>
                           <input type="text" placeholder="Мой крутой лендинг" className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500" required />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Категория</label>
                              <select className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500">
                                 {CATEGORIES.filter(c => c.id !== 'Все').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                              </select>
                           </div>
                           <div>
                              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Ссылка на демо</label>
                              <input type="url" placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500" required />
                           </div>
                        </div>

                        <div>
                           <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Краткое описание</label>
                           <textarea rows={3} placeholder="О чем этот проект? Какие технологии использовал?" className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 resize-none" required></textarea>
                        </div>

                        <div>
                           <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Скриншот</label>
                           <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors cursor-pointer group">
                              <Upload size={24} className="text-zinc-400 group-hover:text-violet-500 mb-2" />
                              <span className="text-sm font-bold text-zinc-500 group-hover:text-violet-600 dark:text-zinc-400">Загрузить изображение</span>
                              <input type="file" className="hidden" accept="image/*" />
                           </label>
                        </div>

                        <button 
                        type="submit" 
                        className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                        >
                           Отправить на модерацию
                        </button>
                     </form>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

    </div>
  );
};

export default Community;
