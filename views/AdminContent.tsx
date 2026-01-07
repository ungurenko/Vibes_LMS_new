
import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Terminal, 
  Book, 
  GraduationCap, 
  Edit, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Upload, 
  Save,
  Copy,
  GripVertical,
  Eye,
  CheckCircle2,
  Download,
  Map,
  ListOrdered,
  Clock,
  ChevronUp,
  ChevronDown,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { COURSE_MODULES, STYLES_DATA, PROMPTS_DATA, GLOSSARY_DATA, ROADMAPS_DATA } from '../data';
import { Lesson, StyleCard, PromptItem, GlossaryTerm, CourseModule, Roadmap, RoadmapStep } from '../types';
import { Drawer, PageHeader, Input, Select, ConfirmModal } from '../components/Shared';

// --- Types & Config ---

type ContentTab = 'lessons' | 'styles' | 'prompts' | 'glossary' | 'roadmaps';

// Extended Interfaces for Admin State (mocking DB fields)
interface AdminLesson extends Lesson {
  views: number;
  completions: number;
}

interface AdminStyle extends StyleCard {
  usageCount: number;
  status: 'published' | 'draft';
}

interface AdminPrompt extends PromptItem {
  copyCount: number;
  status: 'published' | 'draft';
}

interface AdminRoadmap extends Roadmap {
  activeUsers?: number;
  completions?: number;
}

// --- Mock Data Enrichment ---
const INITIAL_STYLES = STYLES_DATA.map(s => ({
  ...s,
  usageCount: Math.floor(Math.random() * 1200) + 100,
  status: 'published'
} as AdminStyle));

const INITIAL_PROMPTS = PROMPTS_DATA.map(p => ({
  ...p,
  copyCount: Math.floor(Math.random() * 800) + 50,
  status: 'published'
} as AdminPrompt));

const INITIAL_ROADMAPS = ROADMAPS_DATA.map(r => ({
  ...r,
  activeUsers: Math.floor(Math.random() * 200) + 10,
  completions: Math.floor(Math.random() * 50) + 5
} as AdminRoadmap));

interface AdminContentProps {
    modules?: CourseModule[];
    onUpdateModules?: (modules: CourseModule[]) => void;
}

const AdminContent: React.FC<AdminContentProps> = () => {
  const [activeTab, setActiveTab] = useState<ContentTab>('lessons');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: ContentTab | 'modules' } | null>(null);

  // Data State
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [styles, setStyles] = useState<AdminStyle[]>([]);
  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [roadmaps, setRoadmaps] = useState<AdminRoadmap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- API Functions ---

  const loadLessons = async () => {
    try {
      const token = localStorage.getItem('vibes_token');
      const response = await fetch('/api/admin?resource=lessons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setModules(result.data);
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const loadStyles = async () => {
    try {
      const token = localStorage.getItem('vibes_token');
      const response = await fetch('/api/admin-content?type=styles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setStyles(result.data);
      }
    } catch (error) {
      console.error('Error loading styles:', error);
      setStyles([]);
    }
  };

  const loadPrompts = async () => {
    try {
      const token = localStorage.getItem('vibes_token');
      const response = await fetch('/api/admin-content?type=prompts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setPrompts(result.data);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      setPrompts([]);
    }
  };

  const loadGlossary = async () => {
    try {
      const token = localStorage.getItem('vibes_token');
      const response = await fetch('/api/admin-content?type=glossary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setGlossary(result.data);
      }
    } catch (error) {
      console.error('Error loading glossary:', error);
      setGlossary(GLOSSARY_DATA);
    }
  };

  const loadRoadmaps = async () => {
    try {
      const token = localStorage.getItem('vibes_token');
      const response = await fetch('/api/admin-content?type=roadmaps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setRoadmaps(result.data);
      }
    } catch (error) {
      console.error('Error loading roadmaps:', error);
      setRoadmaps(INITIAL_ROADMAPS);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadLessons(),
        loadStyles(),
        loadPrompts(),
        loadGlossary(),
        loadRoadmaps()
      ]);
      setIsLoading(false);
    };
    loadAllData();
  }, []);

  // --- Helpers ---

  const confirmDelete = (id: string, type: ContentTab | 'modules') => {
      setItemToDelete({ id, type });
      setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;

    try {
      const token = localStorage.getItem('vibes_token');

      if (type === 'modules') {
        await fetch(`/api/admin?resource=lessons&module=modules&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await loadLessons();
      }
      else if (type === 'lessons') {
        await fetch(`/api/admin?resource=lessons&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await loadLessons();
      }
      else if (type === 'styles') {
        await fetch(`/api/admin-content?type=styles&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setStyles(prev => prev.filter(i => i.id !== id));
      }
      else if (type === 'prompts') {
        await fetch(`/api/admin-content?type=prompts&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setPrompts(prev => prev.filter(i => i.id !== id));
      }
      else if (type === 'glossary') {
        await fetch(`/api/admin-content?type=glossary&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setGlossary(prev => prev.filter(i => i.id !== id));
      }
      else if (type === 'roadmaps') {
        await fetch(`/api/admin-content?type=roadmaps&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setRoadmaps(prev => prev.filter(i => i.id !== id));
      }

      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Ошибка при удалении');
    }
  };

  const openEditor = (item: any | null = null) => {
    // If opening for a new item, set defaults
    if (!item) {
        if (activeTab === 'roadmaps') {
            setEditingItem({
                title: '',
                description: '',
                category: 'Подготовка',
                icon: '🚀',
                estimatedTime: '30 мин',
                difficulty: 'Легко',
                steps: []
            });
        } else if (activeTab === 'lessons') {
            setEditingItem({
                duration: '15 мин',
                moduleId: modules[0]?.id || '',
                videoUrl: ''
            });
        } else {
            setEditingItem({});
        }
    } else {
        setEditingItem({ ...item });
    }
    setIsEditorOpen(true);
  };

  // Generic field updater
  const updateField = (field: string, value: any) => {
    setEditingItem((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const token = localStorage.getItem('vibes_token');
      const isUpdate = !!editingItem.id;

      if (activeTab === 'lessons') {
        const response = await fetch('/api/admin?resource=lessons', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editingItem)
        });

        if (!response.ok) throw new Error('Failed to save lesson');

        await loadLessons();
      }
      else if (activeTab === 'styles') {
        const response = await fetch('/api/admin-content?type=styles', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editingItem)
        });

        if (!response.ok) throw new Error('Failed to save style');
        await loadStyles();
      }
      else if (activeTab === 'prompts') {
        const response = await fetch('/api/admin-content?type=prompts', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editingItem)
        });

        if (!response.ok) throw new Error('Failed to save prompt');
        await loadPrompts();
      }
      else if (activeTab === 'glossary') {
        const response = await fetch('/api/admin-content?type=glossary', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editingItem)
        });

        if (!response.ok) throw new Error('Failed to save glossary term');
        await loadGlossary();
      }
      else if (activeTab === 'roadmaps') {
        const response = await fetch('/api/admin-content?type=roadmaps', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editingItem)
        });

        if (!response.ok) throw new Error('Failed to save roadmap');
        await loadRoadmaps();
      }

      setIsEditorOpen(false);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Ошибка при сохранении');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingItem((prev: any) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Render Functions ---

  const renderLessonsView = () => {
    // When reordering modules
    const handleReorderModules = async (newOrder: CourseModule[]) => {
        setModules(newOrder);
        // TODO: Optionally, call API to save new order
        // For now, just update local state
    };

    // When reordering lessons inside a module
    const handleReorderLessons = async (moduleId: string, newModuleLessons: Lesson[]) => {
        const newModules = modules.map(m =>
            m.id === moduleId ? { ...m, lessons: newModuleLessons } : m
        );
        setModules(newModules);
        // TODO: Optionally, call API to save new order
    };

    return (
      <Reorder.Group axis="y" values={modules} onReorder={handleReorderModules} className="space-y-6">
        {modules.map((module) => {
            return (
              <Reorder.Item 
                key={module.id} 
                value={module}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm"
              >
                 <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-white/5 cursor-grab active:cursor-grabbing group">
                    <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                       <div className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600 transition-colors">
                         <GripVertical size={14} />
                       </div>
                       {module.title}
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-white/5">
                        {module.lessons.length} уроков
                        </span>
                        <button 
                            onClick={() => confirmDelete(module.id, 'modules')}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Удалить модуль"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                 </div>
                 
                 {/* Nested Lesson List */}
                 <Reorder.Group axis="y" values={module.lessons} onReorder={(newOrder) => handleReorderLessons(module.id, newOrder)} className="divide-y divide-zinc-100 dark:divide-white/5">
                    {module.lessons.map((lesson) => (
                       <Reorder.Item 
                            key={lesson.id} 
                            value={lesson}
                            className="group flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors relative"
                       >
                          <div className="cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 p-2 -ml-2">
                             <GripVertical size={20} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{lesson.title}</h4>
                                {lesson.status === 'locked' && <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded">Draft</span>}
                                {lesson.status === 'completed' && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded">Live</span>}
                             </div>
                             <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="flex items-center gap-1"><Video size={12} /> {lesson.duration}</span>
                                <span className="flex items-center gap-1"><Eye size={12} /> {(lesson as any).views || 0}</span>
                                {lesson.videoUrl && <span className="flex items-center gap-1 text-violet-500"><LinkIcon size={12} /> URL</span>}
                             </div>
                          </div>
    
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => openEditor(lesson)} className="p-2 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                                <Edit size={16} />
                             </button>
                             <button onClick={() => confirmDelete(lesson.id, 'lessons')} className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                <Trash2 size={16} />
                             </button>
                          </div>
                       </Reorder.Item>
                    ))}
                 </Reorder.Group>
                 
                 <div className="bg-zinc-50 dark:bg-zinc-800/30 px-4 py-2 text-center">
                     <button onClick={() => openEditor({ moduleId: module.id })} className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline py-2 w-full">
                        + Добавить урок в модуль
                     </button>
                 </div>
              </Reorder.Item>
            );
        })}
      </Reorder.Group>
    );
  };

  const renderStylesView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {styles.map((style) => (
           <div key={style.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden group hover:border-violet-300 dark:hover:border-violet-500/30 transition-all shadow-sm">
              <div className="h-40 bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                 {style.image ? (
                    <img src={style.image} alt={style.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-700">
                        <ImageIcon size={32} />
                    </div>
                 )}
                 <div className="absolute top-3 right-3 flex gap-2">
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider">
                       {style.category}
                    </span>
                 </div>
              </div>
              <div className="p-5">
                 <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{style.name}</h3>
                    <div className="flex gap-1">
                       <button onClick={() => openEditor(style)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white">
                          <Edit size={16} />
                       </button>
                       <button onClick={() => confirmDelete(style.id, 'styles')} className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500">
                          <Trash2 size={16} />
                       </button>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    <span className="flex items-center gap-1"><Copy size={12} /> {style.usageCount} копирований</span>
                    <span className={`px-1.5 py-0.5 rounded ${style.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                       {style.status}
                    </span>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {style.tags?.map(tag => (
                       <span key={tag} className="text-[10px] px-2 py-1 rounded bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">#{tag}</span>
                    ))}
                 </div>
              </div>
           </div>
         ))}
      </div>
    );
  };

  const renderPromptsView = () => {
     return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5">
                 <tr>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Категория</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Название</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Копирований</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-4 text-right"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                 {prompts.map((prompt) => (
                    <tr key={prompt.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] group">
                       <td className="px-6 py-4">
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                             {prompt.category}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          <div className="font-bold text-zinc-900 dark:text-white text-sm">{prompt.title}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[200px]">{prompt.description}</div>
                       </td>
                       <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                          {prompt.copyCount}
                       </td>
                       <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                             prompt.status === 'published' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 text-amber-600'
                          }`}>
                             <span className={`w-1.5 h-1.5 rounded-full ${prompt.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                             {prompt.status}
                          </div>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => openEditor(prompt)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Edit size={16} /></button>
                             <button onClick={() => confirmDelete(prompt.id, 'prompts')} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
     );
  };

  const renderGlossaryView = () => {
    return (
       <div>
          <div className="flex gap-4 mb-6">
             <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-zinc-600 dark:text-zinc-300">
                <Upload size={16} /> Импорт CSV
             </button>
             <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-zinc-600 dark:text-zinc-300">
                <Download size={16} /> Экспорт CSV
             </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5">
                   <tr>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Термин</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Алиасы</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Категория</th>
                      <th className="px-6 py-4 text-right"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                   {glossary.map((term) => (
                      <tr key={term.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] group">
                         <td className="px-6 py-4">
                            <div className="font-bold text-zinc-900 dark:text-white text-sm">{term.term}</div>
                            <div className="text-xs text-zinc-500 truncate max-w-[300px]">{term.definition}</div>
                         </td>
                         <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 italic">
                            {term.slang || '—'}
                         </td>
                         <td className="px-6 py-4">
                            <span className="inline-block px-2 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                               {term.category}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => openEditor(term)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Edit size={16} /></button>
                               <button onClick={() => confirmDelete(term.id, 'glossary')} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    );
  };

  const renderRoadmapsView = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((map) => (
                <div key={map.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 p-6 hover:border-violet-300 dark:hover:border-violet-500/30 transition-all shadow-sm group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">
                            {map.icon}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditor(map)} className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white">
                                <Edit size={16} />
                            </button>
                            <button onClick={() => confirmDelete(map.id, 'roadmaps')} className="p-2 rounded-lg text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                {map.category}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${map.difficulty === 'Легко' ? 'bg-emerald-500' : map.difficulty === 'Средне' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        </div>
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-1">{map.title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{map.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-white/5 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><ListOrdered size={14} /> {map.steps.length} шагов</span>
                            <span className="flex items-center gap-1"><Clock size={14} /> {map.estimatedTime}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
  };

  const renderEditorForm = () => {
    // Dynamic form based on activeTab
    return (
      <div className="space-y-6">
         {/* Common Name Field */}
         <Input 
            label={activeTab === 'glossary' ? 'Термин' : 'Название'}
            placeholder="Введите название..."
            value={editingItem?.title || editingItem?.name || editingItem?.term || ''}
            onChange={(e) => {
                if (activeTab === 'glossary') updateField('term', e.target.value);
                else if (activeTab === 'styles') updateField('name', e.target.value);
                else updateField('title', e.target.value);
            }}
         />

         {/* Specific Fields */}
         {activeTab === 'lessons' && (
            <>
               <div className="grid grid-cols-2 gap-4">
                  <Select 
                    label="Модуль"
                    value={editingItem?.moduleId || ''}
                    onChange={(e) => updateField('moduleId', e.target.value)}
                    options={[
                        { value: "", label: "Выберите модуль..." },
                        ...modules.map(m => ({ value: m.id, label: m.title }))
                    ]}
                  />
                  <Input 
                    label="Длительность"
                    value={editingItem?.duration || ''}
                    onChange={(e) => updateField('duration', e.target.value)}
                    placeholder="15 мин"
                  />
               </div>
               
               <Input 
                  label="Ссылка на видео (YouTube)"
                  icon={Video}
                  value={editingItem?.videoUrl || ''}
                  onChange={(e) => updateField('videoUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
               />

               <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Описание урока</label>
                   <textarea 
                        rows={4} 
                        value={editingItem?.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500" 
                    />
               </div>
            </>
         )}

         {activeTab === 'styles' && (
             <>
                <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Краткое описание</label>
                   <textarea
                        rows={2}
                        value={editingItem?.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10"
                    />
                </div>
                <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Изображение</label>
                   <div className="flex gap-4 items-start">
                      <div className="w-24 h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-400 shrink-0 overflow-hidden relative group">
                         {editingItem?.image ? (
                             <img src={editingItem.image} className="w-full h-full object-cover" alt="Preview" />
                         ) : (
                             <ImageIcon size={24} />
                         )}
                      </div>
                      <div className="flex-1 space-y-3">
                         <Input
                            value={editingItem?.image || ''}
                            onChange={(e) => updateField('image', e.target.value)}
                            placeholder="https://..."
                         />
                         <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-400">или</span>
                            <label className="cursor-pointer px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-bold text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-2">
                                <Upload size={14} />
                                Загрузить файл
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                         </div>
                      </div>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Промпт для AI *</label>
                   <textarea
                        rows={6}
                        value={editingItem?.prompt || ''}
                        onChange={(e) => updateField('prompt', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 font-mono text-sm"
                        required
                    />
                </div>
                <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Подробное описание</label>
                   <textarea
                        rows={4}
                        value={editingItem?.longDescription || ''}
                        onChange={(e) => updateField('longDescription', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10"
                    />
                </div>
                <Input
                    label="Градиент (Tailwind классы)"
                    value={editingItem?.gradient || ''}
                    onChange={(e) => updateField('gradient', e.target.value)}
                    placeholder="from-amber-50 to-rose-50"
                />
                <Input
                    label="Теги (через запятую)"
                    value={editingItem?.tags?.join(', ') || ''}
                    onChange={(e) => updateField('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                    placeholder="minimalism, clean, modern"
                />
                <Select
                    label="Категория"
                    value={editingItem?.category || 'Минимализм'}
                    onChange={(e) => updateField('category', e.target.value)}
                    options={['Светлые', 'Тёмные', 'Яркие', 'Минимализм'].map(c => ({ value: c, label: c }))}
                />
             </>
         )}

         {activeTab === 'prompts' && (
             <>
                <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Краткое описание</label>
                   <textarea
                        rows={2}
                        value={editingItem?.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10"
                    />
                </div>
                <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Текст промпта *</label>
                   <textarea
                        rows={8}
                        value={editingItem?.content || ''}
                        onChange={(e) => updateField('content', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 font-mono text-sm"
                        required
                    />
                </div>
                <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Инструкция по использованию</label>
                   <textarea
                        rows={3}
                        value={editingItem?.usage || ''}
                        onChange={(e) => updateField('usage', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10"
                    />
                </div>
                <Select
                    label="Категория"
                    value={editingItem?.category || 'Лендинг'}
                    onChange={(e) => updateField('category', e.target.value)}
                    options={['Лендинг', 'Веб-сервис', 'Дизайн', 'Фиксы', 'Функции', 'API', 'Оптимизация'].map(c => ({ value: c, label: c }))}
                />
                <Input
                    label="Теги (через запятую)"
                    value={editingItem?.tags?.join(', ') || ''}
                    onChange={(e) => updateField('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                    placeholder="landing, hero, cta"
                />
             </>
         )}

         {activeTab === 'glossary' && (
            <>
               <Input 
                  label="Синонимы (Сленг)"
                  value={editingItem?.slang || ''}
                  onChange={(e) => updateField('slang', e.target.value)}
                  placeholder="Например: Деплой, выкатка..."
               />
               <Select 
                  label="Категория"
                  value={editingItem?.category || 'Базовые'}
                  onChange={(e) => updateField('category', e.target.value)}
                  options={['Базовые', 'Код', 'Инструменты', 'API', 'Ошибки', 'Вайб-кодинг'].map(c => ({ value: c, label: c }))}
               />
               <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Определение</label>
                   <textarea 
                        rows={4} 
                        value={editingItem?.definition || ''}
                        onChange={(e) => updateField('definition', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500" 
                    />
               </div>
            </>
         )}

         {activeTab === 'roadmaps' && (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <Select 
                        label="Категория"
                        value={editingItem?.category || 'Подготовка'}
                        onChange={(e) => updateField('category', e.target.value)}
                        options={['Подготовка', 'Лендинг', 'Веб-сервис', 'Полезное'].map(c => ({ value: c, label: c }))}
                    />
                    <Input 
                        label="Иконка (Эмодзи)"
                        value={editingItem?.icon || ''}
                        onChange={(e) => updateField('icon', e.target.value)}
                        placeholder="🚀"
                        className="text-center"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <Select 
                        label="Сложность"
                        value={editingItem?.difficulty || 'Легко'}
                        onChange={(e) => updateField('difficulty', e.target.value)}
                        options={[
                            { value: "Легко", label: "Легко" },
                            { value: "Средне", label: "Средне" },
                            { value: "Сложно", label: "Сложно" }
                        ]}
                    />
                    <Input 
                        label="Время"
                        value={editingItem?.estimatedTime || ''}
                        onChange={(e) => updateField('estimatedTime', e.target.value)}
                        placeholder="30 мин"
                    />
                </div>

                <div>
                   <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Описание</label>
                   <textarea 
                        rows={3} 
                        value={editingItem?.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500" 
                    />
               </div>

               {/* Visual Steps Editor */}
               <div className="pt-2">
                   <div className="flex items-center justify-between mb-3">
                       <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Шаги дорожной карты</label>
                       <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">{(editingItem?.steps || []).length} шагов</span>
                   </div>
                   
                   <div className="space-y-3">
                       {/* List of Steps */}
                       {(editingItem?.steps || []).map((step: RoadmapStep, index: number) => (
                           <div key={step.id || index} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 relative group">
                               {/* Row 1: Order & Title */}
                               <div className="flex items-center gap-3 mb-3">
                                   <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                                       {index + 1}
                                   </div>
                                   <input 
                                       type="text" 
                                       placeholder="Название шага"
                                       value={step.title}
                                       onChange={(e) => {
                                           const newSteps = [...editingItem.steps];
                                           newSteps[index] = { ...step, title: e.target.value };
                                           updateField('steps', newSteps);
                                       }}
                                       className="flex-1 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-violet-500 focus:outline-none px-2 py-1 font-medium transition-colors"
                                   />
                                   
                                   {/* Actions */}
                                   <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                       <button 
                                           type="button"
                                           onClick={() => {
                                               if (index > 0) {
                                                   const newSteps = [...editingItem.steps];
                                                   [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
                                                   updateField('steps', newSteps);
                                               }
                                           }}
                                           className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 disabled:opacity-30"
                                           disabled={index === 0}
                                       >
                                           <ChevronUp size={16} />
                                       </button>
                                       <button 
                                           type="button"
                                           onClick={() => {
                                               if (index < editingItem.steps.length - 1) {
                                                   const newSteps = [...editingItem.steps];
                                                   [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
                                                   updateField('steps', newSteps);
                                               }
                                           }}
                                           className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 disabled:opacity-30"
                                           disabled={index === editingItem.steps.length - 1}
                                       >
                                           <ChevronDown size={16} />
                                       </button>
                                       <button 
                                           type="button"
                                           onClick={() => {
                                               const newSteps = editingItem.steps.filter((_: any, i: number) => i !== index);
                                               updateField('steps', newSteps);
                                           }}
                                           className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-zinc-400 hover:text-red-500 ml-1"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                   </div>
                               </div>

                               {/* Row 2: Description */}
                               <div className="mb-3 pl-9">
                                   <textarea 
                                       rows={2}
                                       placeholder="Описание действия..."
                                       value={step.description}
                                       onChange={(e) => {
                                           const newSteps = [...editingItem.steps];
                                           newSteps[index] = { ...step, description: e.target.value };
                                           updateField('steps', newSteps);
                                       }}
                                       className="w-full bg-white dark:bg-zinc-900/50 rounded-lg p-2 text-sm border border-zinc-200 dark:border-white/5 focus:outline-none focus:border-violet-500/50"
                                   />
                               </div>

                               {/* Row 3: Links */}
                               <div className="pl-9 flex gap-2">
                                   <div className="flex-1 flex items-center gap-2 bg-white dark:bg-zinc-900/50 rounded-lg px-2 border border-zinc-200 dark:border-white/5 focus-within:border-violet-500/50">
                                       <LinkIcon size={14} className="text-zinc-400" />
                                       <input 
                                           type="text" 
                                           placeholder="https://..."
                                           value={step.linkUrl || ''}
                                           onChange={(e) => {
                                               const newSteps = [...editingItem.steps];
                                               newSteps[index] = { ...step, linkUrl: e.target.value };
                                               updateField('steps', newSteps);
                                           }}
                                           className="flex-1 bg-transparent py-1.5 text-xs focus:outline-none"
                                       />
                                   </div>
                                   <div className="flex-1 flex items-center gap-2 bg-white dark:bg-zinc-900/50 rounded-lg px-2 border border-zinc-200 dark:border-white/5 focus-within:border-violet-500/50">
                                       <span className="text-xs font-bold text-zinc-400">Текст:</span>
                                       <input 
                                           type="text" 
                                           placeholder="Например: Скачать VS Code"
                                           value={step.linkText || ''}
                                           onChange={(e) => {
                                               const newSteps = [...editingItem.steps];
                                               newSteps[index] = { ...step, linkText: e.target.value };
                                               updateField('steps', newSteps);
                                           }}
                                           className="flex-1 bg-transparent py-1.5 text-xs focus:outline-none"
                                       />
                                   </div>
                               </div>
                           </div>
                       ))}

                       {/* Add Button */}
                       <button 
                           type="button"
                           onClick={() => {
                               const newStep = { 
                                   id: Date.now().toString(), 
                                   title: '', 
                                   description: '',
                                   linkUrl: '',
                                   linkText: ''
                               };
                               updateField('steps', [...(editingItem.steps || []), newStep]);
                           }}
                           className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-white/20 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                       >
                           <Plus size={16} />
                           Добавить шаг
                       </button>
                   </div>
               </div>
            </>
         )}

         {/* Common Status/Order (Available for Lessons, Styles, Prompts) */}
         {activeTab !== 'glossary' && activeTab !== 'roadmaps' && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                <Select 
                    label="Статус"
                    value={editingItem?.status || 'published'}
                    onChange={(e) => updateField('status', e.target.value)}
                    options={[
                        { value: "published", label: "Опубликован" },
                        { value: "draft", label: "Черновик" },
                        { value: "hidden", label: "Скрыт" }
                    ]}
                />
                <Input 
                    label="Порядок"
                    type="number"
                    value={editingItem?.order || 10}
                    onChange={(e) => updateField('order', parseInt(e.target.value))}
                />
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
       {/* Top Bar */}
       <PageHeader 
         title="Управление контентом" 
         description="Редактирование базы знаний платформы."
         action={
            <button 
             onClick={() => openEditor()} 
             className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-zinc-500/10"
            >
             <Plus size={18} />
             <span>Добавить {activeTab === 'lessons' ? 'урок' : activeTab === 'styles' ? 'стиль' : activeTab === 'prompts' ? 'промпт' : activeTab === 'roadmaps' ? 'карту' : 'термин'}</span>
            </button>
         }
       />

       {/* Tabs Navigation */}
       <div className="flex overflow-x-auto scrollbar-none gap-2 mb-8 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-2xl w-full md:w-fit border border-zinc-200 dark:border-white/5">
          {[
             { id: 'lessons', label: 'Уроки', icon: GraduationCap },
             { id: 'roadmaps', label: 'Карты', icon: Map },
             { id: 'styles', label: 'Стили', icon: Palette },
             { id: 'prompts', label: 'Промпты', icon: Terminal },
             { id: 'glossary', label: 'Словарь', icon: Book },
          ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as ContentTab)}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
               }`}
             >
                <tab.icon size={16} className={activeTab === tab.id ? "text-violet-600 dark:text-violet-400" : ""} />
                {tab.label}
             </button>
          ))}
       </div>

       {/* Main Content Area */}
       <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
       >
          {activeTab === 'lessons' && renderLessonsView()}
          {activeTab === 'styles' && renderStylesView()}
          {activeTab === 'prompts' && renderPromptsView()}
          {activeTab === 'glossary' && renderGlossaryView()}
          {activeTab === 'roadmaps' && renderRoadmapsView()}
       </motion.div>

       {/* Edit Panel Drawer */}
       <Drawer 
         isOpen={isEditorOpen} 
         onClose={() => setIsEditorOpen(false)}
         title={`${editingItem?.id ? 'Редактировать' : 'Создать'} ${activeTab === 'lessons' ? 'урок' : 'запись'}`}
         footer={
            <>
                <button 
                    type="button" 
                    onClick={() => setIsEditorOpen(false)}
                    className="px-6 py-3 rounded-xl border border-zinc-200 dark:border-white/10 font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                >
                    Отмена
                </button>
                <button 
                    type="submit" 
                    form="edit-form"
                    className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/20 flex items-center gap-2"
                >
                    <Save size={18} />
                    Сохранить
                </button>
            </>
         }
       >
          <form id="edit-form" onSubmit={handleSave}>
             {renderEditorForm()}
          </form>
       </Drawer>

       {/* Delete Confirmation */}
       <ConfirmModal 
         isOpen={isDeleteModalOpen}
         onClose={() => setIsDeleteModalOpen(false)}
         onConfirm={executeDelete}
       />

    </div>
  );
};

export default AdminContent;
