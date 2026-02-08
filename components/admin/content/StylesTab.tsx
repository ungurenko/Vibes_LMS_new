import React from 'react';
import { Edit, Trash2, Image as ImageIcon, Copy } from 'lucide-react';
import { StyleCard } from '../../../types';

interface AdminStyle extends StyleCard {
  usageCount: number;
  status: 'published' | 'draft';
}

interface StylesTabProps {
  styles: AdminStyle[];
  onEdit: (style: AdminStyle) => void;
  onDelete: (id: string) => void;
}

const StylesTab: React.FC<StylesTabProps> = ({ styles, onEdit, onDelete }) => {
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
              <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-xs font-bold uppercase tracking-wider">
                {style.category}
              </span>
            </div>
          </div>
          <div className="p-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{style.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => onEdit(style)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white">
                  <Edit size={16} />
                </button>
                <button onClick={() => onDelete(style.id)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500">
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
                <span key={tag} className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">#{tag}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StylesTab;
export type { AdminStyle };
