import React from 'react';
import { Edit, Trash2, Upload, Download } from 'lucide-react';
import { GlossaryTerm } from '../../../types';

interface GlossaryTabProps {
  glossary: GlossaryTerm[];
  onEdit: (term: GlossaryTerm) => void;
  onDelete: (id: string) => void;
}

const GlossaryTab: React.FC<GlossaryTabProps> = ({ glossary, onEdit, onDelete }) => {
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
                  {term.slang || '\u2014'}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                    {term.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(term)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Edit size={16} /></button>
                    <button onClick={() => onDelete(term.id)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
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

export default GlossaryTab;
