import React from 'react';
import { motion } from 'framer-motion';

const SplashScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
      {/* Background Ambient Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-violet-500/10 rounded-full blur-[120px]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with animation */}
        <motion.img
          src="https://i.imgur.com/f3UfhpM.png"
          alt="VIBES"
          className="h-28 w-auto object-contain drop-shadow-md filter dark:invert dark:brightness-200"
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1]
          }}
        />

        {/* Loading dots */}
        <div className="flex items-center gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-violet-500/60 dark:bg-violet-400/60"
              initial={{ opacity: 0.4, scale: 0.8 }}
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.1, 0.8]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Optional loading text */}
        <motion.p
          className="mt-6 text-sm text-zinc-400 dark:text-zinc-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          Загрузка...
        </motion.p>
      </div>
    </div>
  );
};

export default SplashScreen;
