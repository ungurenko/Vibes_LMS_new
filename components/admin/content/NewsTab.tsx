import React from 'react';
import { Edit, Trash2, Newspaper } from 'lucide-react';
import { PlatformUpdate } from '../../../types';

interface NewsTabProps {
  news: PlatformUpdate[];
  onEdit: (item: PlatformUpdate) => void;
  onDelete: (id: string) => void;
}

const NewsTab: React.FC<NewsTabProps> = ({ news, onEdit, onDelete }) => {
  if (news.length === 0) {
    return (
      <div className="text-center py-16">
        <Newspaper size={48} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Нет новостей</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Создайте первую новость для ленты студентов</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-zinc-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Заголовок</th>
            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Дата</th>
            <th className="px-6 py-4 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
          {news.map((item) => (
            <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] group">
              <td className="px-6 py-4">
                <div className="font-bold text-zinc-900 dark:text-white text-sm">{item.title}</div>
                {item.description && (
                  <div className="text-xs text-zinc-500 truncate max-w-[400px] mt-0.5">{item.description}</div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                {new Date(item.created_at).toLocaleDateString('ru-RU')}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(item)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Edit size={16} /></button>
                  <button onClick={() => onDelete(item.id)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NewsTab;
