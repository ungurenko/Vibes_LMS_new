
import React from 'react';
import { Filter, Globe } from 'lucide-react';

interface ScopeBannerProps {
  cohortName?: string | null;
  type: 'filtered' | 'shared';
  label?: string;
}

const ScopeBanner: React.FC<ScopeBannerProps> = ({ cohortName, type, label }) => {
  if (type === 'filtered' && cohortName) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 mb-6">
        <Filter size={14} className="text-purple-500 dark:text-purple-400 shrink-0" />
        <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
          {label || `Данные потока: ${cohortName}`}
        </span>
      </div>
    );
  }

  if (type === 'shared') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 mb-6">
        <Globe size={14} className="text-zinc-400 shrink-0" />
        <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
          {label || 'Общий контент для всех потоков'}
        </span>
      </div>
    );
  }

  return null;
};

export default ScopeBanner;
