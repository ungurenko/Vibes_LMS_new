
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
  Layers,
  Newspaper
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlossaryTerm, CourseModule, PromptCategoryItem, Cohort, PlatformUpdate } from '../types';
import { Drawer, PageHeader, Input, ConfirmModal } from '../components/Shared';
import { removeCache, CACHE_KEYS } from '../lib/cache';
import ScopeBanner from '../components/admin/ScopeBanner';
import { useAdminFetch } from '../lib/hooks/useAdminFetch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  LessonsTab,
  StylesTab,
  PromptsTab,
  PromptCategoriesTab,
  GlossaryTab,
  RoadmapsTab,
  StagesTab,
  NewsTab,
  ModuleForm,
  LessonForm,
  StyleForm,
  PromptForm,
  CategoryForm,
  GlossaryForm,
  RoadmapForm,
  StageForm,
  NewsForm,
  StatusOrderFields,
} from '../components/admin/content';
import type { AdminStyle, AdminPrompt, AdminRoadmap, AdminStage } from '../components/admin/content';

// --- Types & Config ---

type ContentTab = 'lessons' | 'styles' | 'prompts' | 'prompt-categories' | 'glossary' | 'roadmaps' | 'stages' | 'news';

interface AdminContentProps {
  modules?: CourseModule[];
  onUpdateModules?: (modules: CourseModule[]) => void;
  selectedCohortId?: string | null;
  selectedCohortName?: string | null;
  cohorts?: Cohort[];
}

const AdminContent: React.FC<AdminContentProps> = ({ selectedCohortId, selectedCohortName, cohorts = [] }) => {
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
  const stagesUrl = selectedCohortId
    ? `/api/admin?resource=stages&cohortId=${selectedCohortId}`
    : '/api/admin?resource=stages';
  const { data: stages, reload: reloadStages } = useAdminFetch<AdminStage[]>(stagesUrl, []);
  const { data: news, reload: reloadNews } = useAdminFetch<PlatformUpdate[]>('/api/admin?resource=platform-updates', []);

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
      else if (type === 'news') {
        await fetch(`/api/admin?resource=platform-updates&id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await reloadNews();
        removeCache(CACHE_KEYS.NEWS);
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
      } else if (activeTab === 'news') {
        setEditingItem({
          title: '',
          description: ''
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
        sortOrder: (modules.length + 1) * 10,
        cohortIds: cohorts.filter(c => c.isActive).map(c => c.id),
      });
    } else {
      setEditingItem({
        id: module.id,
        title: module.title,
        description: module.description || '',
        status: module.status || 'locked',
        cohortIds: module.cohortIds || [],
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
      else if (activeTab === 'news') {
        const response = await fetch('/api/admin?resource=platform-updates', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(isUpdate ? { id: editingItem.id, title: editingItem.title, description: editingItem.description } : editingItem)
        });

        if (!response.ok) throw new Error('Failed to save news');
        await reloadNews();
        removeCache(CACHE_KEYS.NEWS);
      }
      else if (activeTab === 'stages') {
        const stagePayload = isUpdate ? editingItem : { ...editingItem, cohortId: selectedCohortId };
        const response = await fetch('/api/admin?resource=stages', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(stagePayload)
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
      return <ModuleForm editingItem={editingItem} updateField={updateField} validationErrors={validationErrors} cohorts={cohorts} />;
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

        {activeTab === 'news' && (
          <NewsForm editingItem={editingItem} updateField={updateField} />
        )}

        {/* Common Status/Order (for lessons, styles, prompts, categories) */}
        {activeTab !== 'glossary' && activeTab !== 'roadmaps' && activeTab !== 'stages' && activeTab !== 'news' && (
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
              <Button
                variant="primary"
                onClick={() => openModuleEditor()}
              >
                <Plus size={18} />
                <span>Добавить модуль</span>
              </Button>
            )}
            <Button onClick={() => openEditor()}>
              <Plus size={18} />
              <span>Добавить {activeTab === 'news' ? 'новость' : activeTab === 'lessons' ? 'урок' : activeTab === 'styles' ? 'стиль' : activeTab === 'prompts' ? 'промпт' : activeTab === 'roadmaps' ? 'карту' : activeTab === 'stages' ? 'этап' : activeTab === 'prompt-categories' ? 'категорию' : 'термин'}</span>
            </Button>
          </div>
        }
      />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentTab)} className="mb-8">
        <TabsList className="flex overflow-x-auto scrollbar-none w-full md:w-fit h-auto p-1 rounded-2xl">
          {[
            { id: 'lessons', label: 'Уроки', icon: GraduationCap },
            { id: 'roadmaps', label: 'Карты', icon: Map },
            { id: 'stages', label: 'Этапы', icon: Target },
            { id: 'styles', label: 'Стили', icon: Palette },
            { id: 'prompts', label: 'Промпты', icon: Terminal },
            { id: 'prompt-categories', label: 'Категории', icon: Layers },
            { id: 'glossary', label: 'Словарь', icon: Book },
            { id: 'news', label: 'Новости', icon: Newspaper },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap"
            >
              <tab.icon size={16} />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Scope Banner */}
        {activeTab === 'stages' ? (
          <ScopeBanner type="filtered" cohortName={selectedCohortName} label={selectedCohortName ? `Стадии потока: ${selectedCohortName}` : undefined} />
        ) : activeTab === 'news' ? (
          <ScopeBanner type="shared" label="Новости видны всем студентам" />
        ) : activeTab === 'lessons' ? (
          <ScopeBanner type="shared" label="Модули привязаны к потокам индивидуально" />
        ) : (
          <ScopeBanner type="shared" />
        )}

        {/* Main Content Area */}
        <TabsContent value="lessons">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <LessonsTab
              modules={modules}
              setModules={setModules}
              onEditLesson={(lesson) => openEditor(lesson)}
              onEditModule={(module) => openModuleEditor(module)}
              onDeleteLesson={(id) => confirmDelete(id, 'lessons')}
              onDeleteModule={(id) => confirmDelete(id, 'modules')}
              onAddLessonToModule={(moduleId) => openEditor({ moduleId })}
              onAddModule={() => openModuleEditor()}
              cohorts={cohorts}
            />
          </motion.div>
        </TabsContent>
        <TabsContent value="styles">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <StylesTab
              styles={styles}
              onEdit={(style) => openEditor(style)}
              onDelete={(id) => confirmDelete(id, 'styles')}
            />
          </motion.div>
        </TabsContent>
        <TabsContent value="prompts">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <PromptsTab
              prompts={prompts}
              onEdit={(prompt) => openEditor(prompt)}
              onDelete={(id) => confirmDelete(id, 'prompts')}
            />
          </motion.div>
        </TabsContent>
        <TabsContent value="prompt-categories">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <PromptCategoriesTab
              categories={promptCategories}
              onEdit={(cat) => openEditor(cat)}
              onDelete={(id) => confirmDelete(id, 'prompt-categories')}
            />
          </motion.div>
        </TabsContent>
        <TabsContent value="glossary">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <GlossaryTab
              glossary={glossary}
              onEdit={(term) => openEditor(term)}
              onDelete={(id) => confirmDelete(id, 'glossary')}
            />
          </motion.div>
        </TabsContent>
        <TabsContent value="roadmaps">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <RoadmapsTab
              roadmaps={roadmaps}
              onEdit={(map) => openEditor(map)}
              onDelete={(id) => confirmDelete(id, 'roadmaps')}
            />
          </motion.div>
        </TabsContent>
        <TabsContent value="news">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <NewsTab
              news={news}
              onEdit={(item) => openEditor(item)}
              onDelete={(id) => confirmDelete(id, 'news')}
            />
          </motion.div>
        </TabsContent>
        <TabsContent value="stages">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <StagesTab
              stages={stages}
              onEdit={(stage) => openEditor(stage)}
              onDelete={(id) => confirmDelete(id, 'stages')}
              onSetActive={handleSetActive}
              onDeleteTask={handleDeleteTask}
              onAddTask={handleAddTask}
            />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Edit Panel Drawer */}
      <Drawer
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setEditingModuleMode(false); }}
        title={editingModuleMode
          ? `${editingItem?.id ? 'Редактировать' : 'Создать'} модуль`
          : `${editingItem?.id ? 'Редактировать' : 'Создать'} ${activeTab === 'news' ? 'новость' : activeTab === 'lessons' ? 'урок' : 'запись'}`
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsEditorOpen(false); setEditingModuleMode(false); }}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              form="edit-form"
              variant="primary"
            >
              <Save size={18} />
              Сохранить
            </Button>
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
