import React from 'react';
import {
  Trash2,
  Plus,
  GripVertical,
  Image as ImageIcon,
  Video,
  Upload,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Link as LinkIcon,
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import { Input, Select } from '../../Shared';
import { RoadmapStep, CourseModule, PromptCategoryItem } from '../../../types';

// --- Common props for all forms ---

interface EditorFormProps {
  editingItem: any;
  updateField: (field: string, value: any) => void;
}

// --- Module Form ---

interface ModuleFormProps extends EditorFormProps {
  validationErrors: string[];
}

export const ModuleForm: React.FC<ModuleFormProps> = ({ editingItem, updateField, validationErrors }) => (
  <div className="space-y-6">
    {validationErrors.length > 0 && (
      <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
        <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
          {validationErrors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      </div>
    )}

    <Input
      label="Название модуля"
      placeholder="Например: Прямые эфиры"
      value={editingItem?.title || ''}
      onChange={(e) => updateField('title', e.target.value)}
    />

    <div>
      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Описание</label>
      <textarea
        rows={3}
        value={editingItem?.description || ''}
        onChange={(e) => updateField('description', e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500"
        placeholder="Краткое описание модуля..."
      />
    </div>

    <Select
      label="Статус"
      value={editingItem?.status || 'locked'}
      onChange={(e) => updateField('status', e.target.value)}
      options={[
        { value: 'locked', label: 'Заблокирован' },
        { value: 'available', label: 'Доступен' },
        { value: 'completed', label: 'Завершён' }
      ]}
    />
  </div>
);

// --- Lesson Form ---

interface LessonFormProps extends EditorFormProps {
  modules: CourseModule[];
  isUploadingImage: boolean;
  addMaterial: () => void;
  updateMaterial: (index: number, field: string, value: string) => void;
  deleteMaterial: (index: number) => void;
  reorderMaterials: (newOrder: any[]) => void;
  handleMaterialUpload: (index: number, file: File) => void;
  addTask: () => void;
  updateTask: (index: number, text: string) => void;
  deleteTask: (index: number) => void;
  reorderTasks: (newOrder: any[]) => void;
}

export const LessonForm: React.FC<LessonFormProps> = ({
  editingItem,
  updateField,
  modules,
  isUploadingImage,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  reorderMaterials,
  handleMaterialUpload,
  addTask,
  updateTask,
  deleteTask,
  reorderTasks,
}) => (
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

    {/* Materials section */}
    <div className="pt-6 border-t border-zinc-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <LinkIcon size={16} className="text-violet-500" />
          Материалы урока
        </label>
        <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
          {editingItem?.materials?.length || 0} шт
        </span>
      </div>

      {editingItem?.materials && editingItem.materials.length > 0 ? (
        <Reorder.Group axis="y" values={editingItem.materials} onReorder={reorderMaterials} className="space-y-2 mb-4">
          {editingItem.materials.map((material: any, index: number) => (
            <Reorder.Item key={material.id} value={material}>
              <div className="flex gap-2 items-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-white/5 group">
                <div className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                  <GripVertical size={16} />
                </div>
                <select
                  value={material.type || 'link'}
                  onChange={(e) => updateMaterial(index, 'type', e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500"
                >
                  <option value="link">Ссылка</option>
                  <option value="pdf">Документ</option>
                  <option value="code">Код</option>
                  <option value="figma">Figma</option>
                  <option value="video">Видео</option>
                </select>
                <input
                  type="text"
                  placeholder="Название"
                  value={material.title || ''}
                  onChange={(e) => updateMaterial(index, 'title', e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500"
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={material.url || ''}
                  onChange={(e) => updateMaterial(index, 'url', e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500"
                />
                {material.type === 'pdf' && (
                  <label className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${isUploadingImage ? 'bg-zinc-200 dark:bg-zinc-600 cursor-not-allowed' : 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/30 cursor-pointer'}`}>
                    <Upload size={12} className={isUploadingImage ? 'animate-spin' : ''} />
                    {isUploadingImage ? '...' : 'Файл'}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={isUploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMaterialUpload(index, file);
                      }}
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => deleteMaterial(index)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <p className="text-sm text-zinc-400 mb-4">Нет материалов</p>
      )}

      <button
        type="button"
        onClick={addMaterial}
        className="w-full py-2.5 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:border-violet-300 dark:hover:border-violet-500/30 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Добавить материал
      </button>
    </div>

    {/* Tasks section */}
    <div className="pt-6 border-t border-zinc-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500" />
          Задания (чек-лист)
        </label>
        <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
          {editingItem?.tasks?.length || 0} шт
        </span>
      </div>

      {editingItem?.tasks && editingItem.tasks.length > 0 ? (
        <Reorder.Group axis="y" values={editingItem.tasks} onReorder={reorderTasks} className="space-y-2 mb-4">
          {editingItem.tasks.map((task: any, index: number) => (
            <Reorder.Item key={task.id} value={task}>
              <div className="flex gap-2 items-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-white/5 group">
                <div className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                  <GripVertical size={16} />
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-emerald-300 dark:border-emerald-500/50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-emerald-500">{index + 1}</span>
                </div>
                <input
                  type="text"
                  placeholder="Текст задания..."
                  value={task.text || ''}
                  onChange={(e) => updateTask(index, e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={() => deleteTask(index)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <p className="text-sm text-zinc-400 mb-4">Нет заданий</p>
      )}

      <button
        type="button"
        onClick={addTask}
        className="w-full py-2.5 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Добавить задание
      </button>
    </div>
  </>
);

// --- Style Form ---

interface StyleFormProps extends EditorFormProps {
  isUploadingImage: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StyleForm: React.FC<StyleFormProps> = ({ editingItem, updateField, isUploadingImage, handleImageUpload }) => (
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
            disabled={isUploadingImage}
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">или</span>
            <label className={`px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-bold text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-2 ${isUploadingImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
              <Upload size={14} className={isUploadingImage ? 'animate-spin' : ''} />
              {isUploadingImage ? 'Загрузка...' : 'Загрузить файл'}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} />
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
);

// --- Prompt Form ---

interface PromptFormProps extends EditorFormProps {
  promptCategories: PromptCategoryItem[];
}

export const PromptForm: React.FC<PromptFormProps> = ({ editingItem, updateField, promptCategories }) => (
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
      value={editingItem?.categoryId || (promptCategories.length > 0 ? promptCategories[0].id : '')}
      onChange={(e) => updateField('categoryId', e.target.value)}
      options={promptCategories.map(c => ({ value: c.id, label: c.name }))}
    />
    <div className="grid grid-cols-2 gap-4">
      <Select
        label="Этап работы"
        value={editingItem?.workStage || ''}
        onChange={(e) => updateField('workStage', e.target.value || null)}
        options={[
          { value: '', label: 'Не указан' },
          { value: 'structure', label: 'Структура' },
          { value: 'design', label: 'Дизайн' },
          { value: 'functionality', label: 'Функционал' }
        ]}
      />
      <Select
        label="Тип задачи"
        value={editingItem?.taskType || ''}
        onChange={(e) => updateField('taskType', e.target.value || null)}
        options={[
          { value: '', label: 'Не указан' },
          { value: 'modify', label: 'Изменить' },
          { value: 'fix', label: 'Исправить' },
          { value: 'optimize', label: 'Оптимизировать' }
        ]}
      />
    </div>
    <Input
      label="Теги (через запятую)"
      value={editingItem?.tags?.join(', ') || ''}
      onChange={(e) => updateField('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
      placeholder="landing, hero, cta"
    />
  </>
);

// --- Category Form ---

export const CategoryForm: React.FC<EditorFormProps> = ({ editingItem, updateField }) => (
  <>
    <Input
      label="Порядок сортировки"
      type="number"
      value={editingItem?.sortOrder || 0}
      onChange={(e) => updateField('sortOrder', parseInt(e.target.value))}
    />
    <Input
      label="Тема (цвет/класс)"
      value={editingItem?.colorTheme || 'default'}
      onChange={(e) => updateField('colorTheme', e.target.value)}
    />
  </>
);

// --- Glossary Form ---

export const GlossaryForm: React.FC<EditorFormProps> = ({ editingItem, updateField }) => (
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
);

// --- Roadmap Form ---

export const RoadmapForm: React.FC<EditorFormProps> = ({ editingItem, updateField }) => (
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
        placeholder="\uD83D\uDE80"
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
);

// --- Stage Form ---

export const StageForm: React.FC<EditorFormProps> = ({ editingItem, updateField }) => (
  <>
    <Input
      label="Подзаголовок"
      value={editingItem?.subtitle || ''}
      onChange={(e) => updateField('subtitle', e.target.value)}
      placeholder="Неделя 1"
    />
    <Input
      label="Метка недели (для баннера)"
      value={editingItem?.weekLabel || ''}
      onChange={(e) => updateField('weekLabel', e.target.value)}
      placeholder="WEEK 01 // BASICS"
    />
    <div>
      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Описание (для баннера)</label>
      <textarea
        rows={3}
        value={editingItem?.description || ''}
        onChange={(e) => updateField('description', e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500"
        placeholder="Разбираем HTTP, DNS и как браузер отрисовывает страницы..."
      />
    </div>
    <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
      <input
        type="checkbox"
        id="isActive"
        checked={editingItem?.isActive || false}
        onChange={(e) => updateField('isActive', e.target.checked)}
        className="w-5 h-5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
      />
      <label htmlFor="isActive" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Сделать активным этапом (отображается на дашборде)
      </label>
    </div>
    <Input
      label="Порядок сортировки"
      type="number"
      value={editingItem?.sortOrder || 0}
      onChange={(e) => updateField('sortOrder', parseInt(e.target.value))}
    />
  </>
);

// --- Status/Order Footer (shared between lessons, styles, prompts, categories) ---

export const StatusOrderFields: React.FC<EditorFormProps> = ({ editingItem, updateField }) => (
  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-white/5">
    <Select
      label="Статус"
      value={editingItem?.status || 'available'}
      onChange={(e) => updateField('status', e.target.value)}
      options={[
        { value: "available", label: "Опубликован" },
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
);
