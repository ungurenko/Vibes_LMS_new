import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { PromptCategoryItem } from '../../../types';

interface PromptCategoriesTabProps {
  categories: PromptCategoryItem[];
  onEdit: (category: PromptCategoryItem) => void;
  onDelete: (id: string) => void;
}

const PromptCategoriesTab: React.FC<PromptCategoriesTabProps> = ({ categories, onEdit, onDelete }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-zinc-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Название</th>
            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Порядок</th>
            <th className="px-6 py-4 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
          {categories.map((cat) => (
            <tr key={cat.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] group">
              <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                {cat.name}
              </td>
              <td className="px-6 py-4 text-sm text-zinc-500">
                {cat.sortOrder}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(cat)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Edit size={16} /></button>
                  <button onClick={() => onDelete(cat.id)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PromptCategoriesTab;
