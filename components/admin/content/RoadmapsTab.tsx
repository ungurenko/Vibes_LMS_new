import React from 'react';
import { Edit, Trash2, ListOrdered, Clock } from 'lucide-react';
import { Roadmap } from '../../../types';

interface AdminRoadmap extends Roadmap {
  activeUsers?: number;
  completions?: number;
}

interface RoadmapsTabProps {
  roadmaps: AdminRoadmap[];
  onEdit: (roadmap: AdminRoadmap) => void;
  onDelete: (id: string) => void;
}

const RoadmapsTab: React.FC<RoadmapsTabProps> = ({ roadmaps, onEdit, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {roadmaps.map((map) => (
        <div key={map.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 p-6 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all shadow-sm group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">
              {map.icon}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(map)} className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white">
                <Edit size={16} />
              </button>
              <button onClick={() => onDelete(map.id)} className="p-2 rounded-lg text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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

export default RoadmapsTab;
export type { AdminRoadmap };
