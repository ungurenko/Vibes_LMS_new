import React from 'react';
import { Edit, Trash2, GripVertical, Plus, Target } from 'lucide-react';
import { DashboardStage } from '../../../types';

interface AdminStageTask {
  id: string;
  title: string;
  sortOrder?: number;
}

interface AdminStage extends DashboardStage {
  tasks: AdminStageTask[];
}

interface StagesTabProps {
  stages: AdminStage[];
  onEdit: (stage: AdminStage) => void;
  onDelete: (id: string) => void;
  onSetActive: (stageId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (stageId: string, title: string) => void;
}

const StagesTab: React.FC<StagesTabProps> = ({
  stages,
  onEdit,
  onDelete,
  onSetActive,
  onDeleteTask,
  onAddTask,
}) => {
  return (
    <div className="space-y-6">
      {stages.map((stage) => (
        <div key={stage.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm">
          {/* Stage Header */}
          <div className="p-6 flex items-center justify-between border-b border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                <Target className="text-violet-600 dark:text-violet-400" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{stage.title}</h3>
                  {stage.isActive && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold rounded-full">
                      Активный
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {stage.weekLabel || stage.subtitle} · {stage.tasks?.length || 0} задач
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!stage.isActive && (
                <button
                  onClick={() => onSetActive(stage.id)}
                  className="px-3 py-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                >
                  Сделать активным
                </button>
              )}
              <button
                onClick={() => onEdit(stage)}
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDelete(stage.id)}
                className="p-2 rounded-lg text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Stage Description */}
          {stage.description && (
            <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 text-sm text-zinc-600 dark:text-zinc-400">
              {stage.description}
            </div>
          )}

          {/* Tasks List */}
          <div className="p-4">
            <div className="space-y-2">
              {stage.tasks?.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical size={14} className="text-zinc-300 dark:text-zinc-600" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{task.title}</span>
                  </div>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Task */}
            <div className="mt-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                  if (input.value.trim()) {
                    onAddTask(stage.id, input.value.trim());
                    input.value = '';
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Новая задача..."
                  className="flex-1 px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-violet-500 rounded-xl outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-500 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StagesTab;
export type { AdminStage, AdminStageTask };
