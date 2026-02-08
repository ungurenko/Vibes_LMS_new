import React from 'react';
import { Edit, Trash2, GripVertical, Video, Eye, Plus, Link as LinkIcon } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { Lesson, CourseModule } from '../../../types';

interface LessonsTabProps {
  modules: CourseModule[];
  setModules: React.Dispatch<React.SetStateAction<CourseModule[]>>;
  onEditLesson: (lesson: Lesson | { moduleId: string }) => void;
  onEditModule: (module: CourseModule) => void;
  onDeleteLesson: (id: string) => void;
  onDeleteModule: (id: string) => void;
  onAddLessonToModule: (moduleId: string) => void;
  onAddModule: () => void;
}

const LessonsTab: React.FC<LessonsTabProps> = ({
  modules,
  setModules,
  onEditLesson,
  onEditModule,
  onDeleteLesson,
  onDeleteModule,
  onAddLessonToModule,
}) => {
  const handleReorderModules = (newOrder: CourseModule[]) => {
    setModules(newOrder);
  };

  const handleReorderLessons = (moduleId: string, newModuleLessons: Lesson[]) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, lessons: newModuleLessons } : m
    ));
  };

  return (
    <Reorder.Group axis="y" values={modules} onReorder={handleReorderModules} className="space-y-6">
      {modules.map((module) => (
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
                onClick={(e) => { e.stopPropagation(); onEditModule(module); }}
                className="p-1.5 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                title="Редактировать модуль"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDeleteModule(module.id)}
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
                    {lesson.status === 'locked' && <span className="text-xs px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded">Draft</span>}
                    {lesson.status === 'completed' && <span className="text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded">Live</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><Video size={12} /> {lesson.duration}</span>
                    <span className="flex items-center gap-1"><Eye size={12} /> {(lesson as any).views || 0}</span>
                    {lesson.videoUrl && <span className="flex items-center gap-1 text-violet-500"><LinkIcon size={12} /> URL</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEditLesson(lesson)} className="p-2 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => onDeleteLesson(lesson.id)} className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 px-4 py-2 text-center">
            <button onClick={() => onAddLessonToModule(module.id)} className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline py-2 w-full">
              + Добавить урок в модуль
            </button>
          </div>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
};

export default LessonsTab;
