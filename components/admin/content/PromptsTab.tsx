import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { PromptItem } from '../../../types';

interface AdminPrompt extends PromptItem {
  copyCount: number;
  status: 'published' | 'draft';
}

interface PromptsTabProps {
  prompts: AdminPrompt[];
  onEdit: (prompt: AdminPrompt) => void;
  onDelete: (id: string) => void;
}

const PromptsTab: React.FC<PromptsTabProps> = ({ prompts, onEdit, onDelete }) => {
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
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                  prompt.status === 'published' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 text-amber-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prompt.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {prompt.status}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(prompt)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Edit size={16} /></button>
                  <button onClick={() => onDelete(prompt.id)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PromptsTab;
export type { AdminPrompt };
