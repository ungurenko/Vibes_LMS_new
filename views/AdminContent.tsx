
import React, { useState } from 'react';
import {
  Palette,
  Terminal,
  Book,
  GraduationCap,
  Plus,
  Save,
  Map,
  Target,
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlossaryTerm, CourseModule, PromptCategoryItem } from '../types';
import { Drawer, PageHeader, Input, ConfirmModal } from '../components/Shared';
import { removeCache, CACHE_KEYS } from '../lib/cache';
import { useAdminFetch } from '../lib/hooks/useAdminFetch';
import {
  LessonsTab,
  StylesTab,
  PromptsTab,
  PromptCategoriesTab,
  GlossaryTab,
  RoadmapsTab,
  StagesTab,
  ModuleForm,
  LessonForm,
  StyleForm,
  PromptForm,
  CategoryForm,
  GlossaryForm,
  RoadmapForm,
  StageForm,
  StatusOrderFields,
} from '../components/admin/content';
import type { AdminStyle, AdminPrompt, AdminRoadmap, AdminStage } from '../components/admin/content';

// --- Types & Config ---

type ContentTab = 'lessons' | 'styles' | 'prompts' | 'prompt-categories' | 'glossary' | 'roadmaps' | 'stages';

interface AdminContentProps {
  modules?: CourseModule[];
  onUpdateModules?: (modules: CourseModule[]) => void;
}

const AdminContent: React.FC<AdminContentProps> = () => {
  // --- Tab & Editor State ---
  const [activeTab, setActiveTab] = useState<ContentTab>('lessons');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editingModuleMode, setEditingModuleMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // --- Delete State ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: ContentTab | 'modules' } | null>(null);

  // --- Data Fetching (replaces 7 loadX functions) ---
  const { data: modules, setData: setModules, reload: reloadLessons } = useAdminFetch<CourseModule[]>('/api/admin?resource=lessons', []);
  const { data: styles, setData: setStyles, reload: reloadStyles } = useAdminFetch<AdminStyle[]>('/api/admin-content?type=styles', []);
  const { data: prompts, setData: setPrompts, reload: reloadPrompts } = useAdminFetch<AdminPrompt[]>('/api/admin-content?type=prompts', []);
  const { data: promptCategories, reload: reloadPromptCategories } = useAdminFetch<PromptCategoryItem[]>('/api/admin-content?type=categories', []);
  const { data: glossary, setData: setGlossary, reload: reloadGlossary } = useAdminFetch<GlossaryTerm[]>('/api/admin-content?type=glossary', []);
  const { data: roadmaps, setData: setRoadmaps, reload: reloadRoadmaps } = useAdminFetch<AdminRoadmap[]>('/api/admin-content?type=roadmaps', []);
  const { data: stages, reload: reloadStages } = useAdminFetch<AdminStage[]>('/api/admin?resource=stages', []);

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
        await reloadLessons();
      }
      else if (type === 'lessons') {
        await fetch(`/api/admin?resource=lessons&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await reloadLessons();
      }
      else if (type === 'styles') {
        await fetch(`/api/admin-content?type=styles&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setStyles(prev => prev.filter(i => i.id !== id));
        removeCache(CACHE_KEYS.STYLES);
      }
      else if (type === 'prompts') {
        await fetch(`/api/admin-content?type=prompts&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setPrompts(prev => prev.filter(i => i.id !== id));
        removeCache(CACHE_KEYS.PROMPTS);
      }
      else if (type === 'prompt-categories') {
        await fetch(`/api/admin-content?type=categories&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await reloadPromptCategories();
      }
      else if (type === 'glossary') {
        await fetch(`/api/admin-content?type=glossary&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setGlossary(prev => prev.filter(i => i.id !== id));
        removeCache(CACHE_KEYS.GLOSSARY);
      }
      else if (type === 'roadmaps') {
        await fetch(`/api/admin-content?type=roadmaps&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setRoadmaps(prev => prev.filter(i => i.id !== id));
      }
      else if (type === 'stages') {
        await fetch(`/api/admin?resource=stages&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await reloadStages();
      }

      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Ошибка при удалении');
    }
  };

  const openEditor = (item: any | null = null) => {
    if (!item) {
      if (activeTab === 'prompt-categories') {
        setEditingItem({
          name: '',
          colorTheme: 'default',
          sortOrder: (promptCategories.length + 1) * 10
        });
      } else if (activeTab === 'roadmaps') {
        setEditingItem({
          title: '',
          description: '',
          category: 'Подготовка',
          icon: '\uD83D\uDE80',
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
      } else if (activeTab === 'prompts') {
        setEditingItem({
          title: '',
          description: '',
          content: '',
          usage: '',
          categoryId: promptCategories.length > 0 ? promptCategories[0].id : '',
          tags: []
        });
      } else if (activeTab === 'styles') {
        setEditingItem({
          title: '',
          description: '',
          category: 'Анимации',
          imageUrl: '',
          previewUrl: ''
        });
      } else if (activeTab === 'glossary') {
        setEditingItem({
          term: '',
          definition: '',
          synonyms: [],
          relatedTerms: []
        });
      } else {
        setEditingItem({});
      }
    } else {
      setEditingItem({ ...item });
    }
    setIsEditorOpen(true);
  };

  const openModuleEditor = (module: CourseModule | null = null) => {
    setEditingModuleMode(true);
    if (!module) {
      setEditingItem({
        title: '',
        description: '',
        status: 'locked',
        sortOrder: (modules.length + 1) * 10
      });
    } else {
      setEditingItem({
        id: module.id,
        title: module.title,
        description: module.description || '',
        status: module.status || 'locked'
      });
    }
    setValidationErrors([]);
    setIsEditorOpen(true);
  };

  const updateField = (field: string, value: any) => {
    setEditingItem((prev: any) => ({ ...prev, [field]: value }));
  };

  // --- Save Handler ---

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const token = localStorage.getItem('vibes_token');
      const isUpdate = !!editingItem.id;

      // Save module
      if (editingModuleMode) {
        if (!editingItem.title?.trim()) {
          setValidationErrors(['Название модуля обязательно']);
          return;
        }

        const response = await fetch('/api/admin?resource=lessons&module=modules', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editingItem)
        });

        if (!response.ok) throw new Error('Failed to save module');

        await reloadLessons();
        setEditingModuleMode(false);
        setIsEditorOpen(false);
        return;
      }

      if (activeTab === 'lessons') {
        const materials = editingItem?.materials || [];
        const invalidMaterials = materials.filter((m: any) =>
          !m.title?.trim() || !m.url?.trim()
        );

        if (invalidMaterials.length > 0) {
          setValidationErrors(['Заполните название и URL для всех материалов']);
          return;
        }

        const response = await fetch('/api/admin?resource=lessons', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editingItem)
        });

        if (!response.ok) throw new Error('Failed to save lesson');
        await reloadLessons();
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
        await reloadStyles();
        removeCache(CACHE_KEYS.STYLES);
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
        await reloadPrompts();
        removeCache(CACHE_KEYS.PROMPTS);
      }
      else if (activeTab === 'prompt-categories') {
        const response = await fetch('/api/admin-content?type=categories', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editingItem)
        });

        if (!response.ok) throw new Error('Failed to save category');
        await reloadPromptCategories();
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
        await reloadGlossary();
        removeCache(CACHE_KEYS.GLOSSARY);
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
        await reloadRoadmaps();
      }
      else if (activeTab === 'stages') {
        const response = await fetch('/api/admin?resource=stages', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editingItem)
        });

        if (!response.ok) throw new Error('Failed to save stage');
        await reloadStages();
      }

      setIsEditorOpen(false);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Ошибка при сохранении');
    }
  };

  // --- Image Upload ---

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;

      const token = localStorage.getItem('vibes_token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ base64, filename: file.name })
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки изображения');
      }

      const result = await response.json();
      setEditingItem((prev: any) => ({ ...prev, image: result.data.url }));

    } catch (error) {
      console.error('Image upload error:', error);
      alert('Ошибка при загрузке изображения');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // --- Material & Task Helpers ---

  const addMaterial = () => {
    const newMaterial = {
      id: `temp-${Date.now()}`,
      title: '',
      type: 'link' as const,
      url: '',
      sortOrder: (editingItem?.materials?.length || 0) + 1
    };
    setEditingItem((prev: any) => ({
      ...prev,
      materials: [...(prev?.materials || []), newMaterial]
    }));
  };

  const updateMaterial = (index: number, field: string, value: string) => {
    setEditingItem((prev: any) => {
      const materials = [...(prev?.materials || [])];
      materials[index] = { ...materials[index], [field]: value };
      return { ...prev, materials };
    });
  };

  const deleteMaterial = (index: number) => {
    setEditingItem((prev: any) => ({
      ...prev,
      materials: (prev?.materials || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const reorderMaterials = (newOrder: any[]) => {
    setEditingItem((prev: any) => ({
      ...prev,
      materials: newOrder.map((m, i) => ({ ...m, sortOrder: i + 1 }))
    }));
  };

  const handleMaterialUpload = async (index: number, file: File) => {
    try {
      setIsUploadingImage(true);

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;

      const token = localStorage.getItem('vibes_token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ base64, filename: `material-${Date.now()}-${file.name}` })
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const result = await response.json();

      const currentTitle = editingItem?.materials?.[index]?.title;
      if (!currentTitle?.trim()) {
        const fileName = file.name.replace(/\.[^.]+$/, '');
        updateMaterial(index, 'title', fileName);
      }

      updateMaterial(index, 'url', result.data.url);

    } catch (error) {
      console.error('Material upload error:', error);
      alert('Ошибка при загрузке файла');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addTask = () => {
    const newTask = {
      id: `temp-${Date.now()}`,
      text: '',
      sortOrder: (editingItem?.tasks?.length || 0) + 1
    };
    setEditingItem((prev: any) => ({
      ...prev,
      tasks: [...(prev?.tasks || []), newTask]
    }));
  };

  const updateTask = (index: number, text: string) => {
    setEditingItem((prev: any) => {
      const tasks = [...(prev?.tasks || [])];
      tasks[index] = { ...tasks[index], text };
      return { ...prev, tasks };
    });
  };

  const deleteTask = (index: number) => {
    setEditingItem((prev: any) => ({
      ...prev,
      tasks: (prev?.tasks || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const reorderTasks = (newOrder: any[]) => {
    setEditingItem((prev: any) => ({
      ...prev,
      tasks: newOrder.map((t, i) => ({ ...t, sortOrder: i + 1 }))
    }));
  };

  // --- Stages-specific handlers ---

  const handleSetActive = async (stageId: string) => {
    try {
      const token = localStorage.getItem('vibes_token');
      await fetch('/api/admin?resource=stages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: stageId, isActive: true })
      });
      await reloadStages();
    } catch (error) {
      console.error('Error setting active stage:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('vibes_token');
      await fetch(`/api/admin?resource=stages&task=tasks&id=${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await reloadStages();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddTask = async (stageId: string, title: string) => {
    try {
      const token = localStorage.getItem('vibes_token');
      const stage = stages.find(s => s.id === stageId);
      const sortOrder = stage?.tasks?.length ? stage.tasks.length + 1 : 1;

      await fetch('/api/admin?resource=stages&task=tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stageId, title, sortOrder })
      });
      await reloadStages();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  // --- Editor Form Renderer ---

  const renderEditorForm = () => {
    if (editingModuleMode) {
      return <ModuleForm editingItem={editingItem} updateField={updateField} validationErrors={validationErrors} />;
    }

    return (
      <div className="space-y-6">
        {/* Common Name Field */}
        <Input
          label={activeTab === 'glossary' ? 'Термин' : 'Название'}
          placeholder="Введите название..."
          value={editingItem?.title || editingItem?.name || editingItem?.term || ''}
          onChange={(e) => {
            if (activeTab === 'glossary') updateField('term', e.target.value);
            else if (activeTab === 'styles' || activeTab === 'prompt-categories') updateField('name', e.target.value);
            else updateField('title', e.target.value);
          }}
        />

        {/* Tab-specific Fields */}
        {activeTab === 'lessons' && (
          <LessonForm
            editingItem={editingItem}
            updateField={updateField}
            modules={modules}
            isUploadingImage={isUploadingImage}
            addMaterial={addMaterial}
            updateMaterial={updateMaterial}
            deleteMaterial={deleteMaterial}
            reorderMaterials={reorderMaterials}
            handleMaterialUpload={handleMaterialUpload}
            addTask={addTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            reorderTasks={reorderTasks}
          />
        )}

        {activeTab === 'styles' && (
          <StyleForm
            editingItem={editingItem}
            updateField={updateField}
            isUploadingImage={isUploadingImage}
            handleImageUpload={handleImageUpload}
          />
        )}

        {activeTab === 'prompts' && (
          <PromptForm
            editingItem={editingItem}
            updateField={updateField}
            promptCategories={promptCategories}
          />
        )}

        {activeTab === 'prompt-categories' && (
          <CategoryForm editingItem={editingItem} updateField={updateField} />
        )}

        {activeTab === 'glossary' && (
          <GlossaryForm editingItem={editingItem} updateField={updateField} />
        )}

        {activeTab === 'roadmaps' && (
          <RoadmapForm editingItem={editingItem} updateField={updateField} />
        )}

        {activeTab === 'stages' && (
          <StageForm editingItem={editingItem} updateField={updateField} />
        )}

        {/* Common Status/Order (for lessons, styles, prompts, categories) */}
        {activeTab !== 'glossary' && activeTab !== 'roadmaps' && activeTab !== 'stages' && (
          <StatusOrderFields editingItem={editingItem} updateField={updateField} />
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
          <div className="flex items-center gap-3">
            {activeTab === 'lessons' && (
              <button
                onClick={() => openModuleEditor()}
                className="px-6 py-3 bg-violet-600 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20"
              >
                <Plus size={18} />
                <span>Добавить модуль</span>
              </button>
            )}
            <button
              onClick={() => openEditor()}
              className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-zinc-500/10"
            >
              <Plus size={18} />
              <span>Добавить {activeTab === 'lessons' ? 'урок' : activeTab === 'styles' ? 'стиль' : activeTab === 'prompts' ? 'промпт' : activeTab === 'roadmaps' ? 'карту' : activeTab === 'stages' ? 'этап' : activeTab === 'prompt-categories' ? 'категорию' : 'термин'}</span>
            </button>
          </div>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 mb-8 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-2xl w-full md:w-fit border border-zinc-200 dark:border-white/5">
        {[
          { id: 'lessons', label: 'Уроки', icon: GraduationCap },
          { id: 'roadmaps', label: 'Карты', icon: Map },
          { id: 'stages', label: 'Этапы', icon: Target },
          { id: 'styles', label: 'Стили', icon: Palette },
          { id: 'prompts', label: 'Промпты', icon: Terminal },
          { id: 'prompt-categories', label: 'Категории', icon: Layers },
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
        {activeTab === 'lessons' && (
          <LessonsTab
            modules={modules}
            setModules={setModules}
            onEditLesson={(lesson) => openEditor(lesson)}
            onEditModule={(module) => openModuleEditor(module)}
            onDeleteLesson={(id) => confirmDelete(id, 'lessons')}
            onDeleteModule={(id) => confirmDelete(id, 'modules')}
            onAddLessonToModule={(moduleId) => openEditor({ moduleId })}
            onAddModule={() => openModuleEditor()}
          />
        )}
        {activeTab === 'styles' && (
          <StylesTab
            styles={styles}
            onEdit={(style) => openEditor(style)}
            onDelete={(id) => confirmDelete(id, 'styles')}
          />
        )}
        {activeTab === 'prompts' && (
          <PromptsTab
            prompts={prompts}
            onEdit={(prompt) => openEditor(prompt)}
            onDelete={(id) => confirmDelete(id, 'prompts')}
          />
        )}
        {activeTab === 'prompt-categories' && (
          <PromptCategoriesTab
            categories={promptCategories}
            onEdit={(cat) => openEditor(cat)}
            onDelete={(id) => confirmDelete(id, 'prompt-categories')}
          />
        )}
        {activeTab === 'glossary' && (
          <GlossaryTab
            glossary={glossary}
            onEdit={(term) => openEditor(term)}
            onDelete={(id) => confirmDelete(id, 'glossary')}
          />
        )}
        {activeTab === 'roadmaps' && (
          <RoadmapsTab
            roadmaps={roadmaps}
            onEdit={(map) => openEditor(map)}
            onDelete={(id) => confirmDelete(id, 'roadmaps')}
          />
        )}
        {activeTab === 'stages' && (
          <StagesTab
            stages={stages}
            onEdit={(stage) => openEditor(stage)}
            onDelete={(id) => confirmDelete(id, 'stages')}
            onSetActive={handleSetActive}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
          />
        )}
      </motion.div>

      {/* Edit Panel Drawer */}
      <Drawer
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setEditingModuleMode(false); }}
        title={editingModuleMode
          ? `${editingItem?.id ? 'Редактировать' : 'Создать'} модуль`
          : `${editingItem?.id ? 'Редактировать' : 'Создать'} ${activeTab === 'lessons' ? 'урок' : 'запись'}`
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => { setIsEditorOpen(false); setEditingModuleMode(false); }}
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
