import React from 'react';
import { motion } from 'framer-motion';

// === Shimmer Animation Styles (injected once) ===
const shimmerStyles = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-shimmer-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerStyles;
    document.head.appendChild(style);
  }
}

// === Base Skeleton Element with Shimmer ===
interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string;
  height?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animate = true
}) => {
  const variantClasses = {
    rectangular: 'rounded-2xl',
    circular: 'rounded-full',
    text: 'rounded-md'
  };

  return (
    <div
      className={`
        relative overflow-hidden
        bg-zinc-200 dark:bg-zinc-800
        ${variantClasses[variant]}
        ${className}
      `}
      style={{ width, height }}
    >
      {animate && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            animation: 'shimmer 1.5s infinite'
          }}
        />
      )}
    </div>
  );
};

// === Style Library Card Skeleton ===
export const StyleCardSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-white/5 h-[400px] flex flex-col"
  >
    {/* Image Area - 65% */}
    <Skeleton className="h-[65%] rounded-none" />

    {/* Content Area - 35% */}
    <div className="flex-1 p-6 space-y-3">
      <Skeleton className="w-3/4 h-6" />
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-5/6 h-4" />

      <div className="flex gap-2 mt-4">
        <Skeleton className="w-16 h-6" />
        <Skeleton className="w-20 h-6" />
        <Skeleton className="w-14 h-6" />
      </div>
    </div>
  </motion.div>
);

// === Prompt Card Skeleton ===
export const PromptCardSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-white/5"
  >
    <div className="flex justify-between items-start mb-4">
      <Skeleton className="w-24 h-6" />
      <Skeleton className="w-16 h-6" />
    </div>

    <Skeleton className="w-full h-6 mb-2" />
    <Skeleton className="w-full h-4 mb-1" />
    <Skeleton className="w-4/5 h-4 mb-6" />

    <div className="flex gap-2">
      <Skeleton className="w-16 h-5" />
      <Skeleton className="w-20 h-5" />
    </div>
  </motion.div>
);

// === Lesson Timeline Item Skeleton ===
export const LessonItemSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="relative w-full flex items-start gap-4 p-3"
  >
    {/* Timeline Node */}
    <Skeleton variant="circular" className="shrink-0 w-10 h-10" />

    <div className="pt-1.5 flex-1 space-y-2">
      <Skeleton className="w-3/4 h-4" />
      <Skeleton className="w-1/4 h-3" />
    </div>
  </motion.div>
);

// === Glossary Term Skeleton ===
export const GlossaryTermSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="break-inside-avoid bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-white/5 mb-6"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <Skeleton className="w-2/3 h-6 mb-2" />
        <Skeleton className="w-1/3 h-3" />
      </div>
      <Skeleton className="w-20 h-6" />
    </div>

    <Skeleton className="w-full h-4 mb-2" />
    <Skeleton className="w-full h-4 mb-2" />
    <Skeleton className="w-4/5 h-4" />
  </motion.div>
);

// === Generic Grid Skeleton ===
interface GridSkeletonProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  SkeletonComponent: React.FC;
}

export const GridSkeleton: React.FC<GridSkeletonProps> = ({
  count = 6,
  columns = 3,
  SkeletonComponent
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-6 md:gap-8`}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonComponent key={idx} />
      ))}
    </div>
  );
};

// === Dashboard Skeleton (bento-grid layout) ===
export const DashboardSkeleton: React.FC = () => (
  <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-24">
    <div className="grid grid-cols-12 gap-4">
      {/* Hero card */}
      <div className="col-span-12">
        <Skeleton className="h-[200px] rounded-3xl" />
      </div>
      {/* Tasks card */}
      <div className="col-span-12 lg:col-span-7">
        <Skeleton className="h-[280px] rounded-3xl" />
      </div>
      {/* Quick Actions card */}
      <div className="col-span-12 lg:col-span-5">
        <Skeleton className="h-[280px] rounded-3xl" />
      </div>
    </div>
  </div>
);

// === View Skeleton (for lazy-loaded views) ===
export const ViewSkeleton: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px] w-full">
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 bg-violet-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
      <span className="text-sm text-zinc-400">Загрузка...</span>
    </div>
  </div>
);
