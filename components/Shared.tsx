
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

// --- TYPOGRAPHY & LAYOUT ---

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action, children }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
    <div>
      <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
        {title}
      </h2>
      {description && <p className="text-zinc-500 dark:text-zinc-400">{description}</p>}
    </div>
    <div className="flex items-center gap-3">
        {children}
        {action}
    </div>
  </div>
);

// --- FORM ELEMENTS ---

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ElementType;
}

export const Input: React.FC<InputProps> = ({ label, icon: Icon, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{label}</label>}
    <div className="relative">
      {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />}
      <input
        {...props}
        className={`w-full ${Icon ? 'pl-11' : 'px-4'} pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors ${props.className || ''}`}
      />
    </div>
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
    <div className={className}>
      {label && <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{label}</label>}
      <select
        {...props}
        className={`w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors appearance-none ${props.className || ''}`}
      >
        {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
);

// --- OVERLAYS (DRY PRINCIPLE) ---

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string; // e.g., 'md:w-[600px]'
}

export const Drawer: React.FC<OverlayProps> = ({ isOpen, onClose, title, children, footer, width = 'md:w-[600px]' }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`fixed top-0 right-0 h-full w-full ${width} bg-white dark:bg-zinc-900 z-[101] shadow-2xl flex flex-col`}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/[0.02]">
            <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
              {title}
            </h3>
            <button onClick={onClose} className="p-2.5 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-8 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900 flex justify-end gap-4">
              {footer}
            </div>
          )}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export const Modal: React.FC<OverlayProps & { maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => (
    <AnimatePresence>
    {isOpen && (
        <>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
                aria-hidden="true"
                onClick={onClose}
            />
            
            <div className="fixed inset-0 z-[101] overflow-y-auto pointer-events-none">
                <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6 pointer-events-auto" onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full ${maxWidth} bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 md:p-8 border border-zinc-100 dark:border-white/10 text-left relative`}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white">{title}</h3>
                            <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                                <X size={20} />
                            </button>
                        </div>

                        {children}
                    </motion.div>
                </div>
            </div>
        </>
    )}
  </AnimatePresence>
);

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Вы уверены?", 
  message = "Это действие нельзя отменить."
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="">
     <div className="text-center pt-2">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 dark:text-red-400 ring-4 ring-red-50 dark:ring-red-500/5">
           <AlertTriangle size={32} />
        </div>
        <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white mb-2">{title}</h3>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed max-w-xs mx-auto">
           {message}
        </p>
        <div className="grid grid-cols-2 gap-3">
           <button 
              onClick={onClose}
              className="py-3 rounded-xl border border-zinc-200 dark:border-white/10 font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
           >
              Отмена
           </button>
           <button 
              onClick={onConfirm}
              className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
           >
              Удалить
           </button>
        </div>
     </div>
  </Modal>
);
