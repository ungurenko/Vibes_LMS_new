
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

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
        className={cn(
          'w-full pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors',
          Icon ? 'pl-11' : 'px-4',
          props.className
        )}
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
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors appearance-none',
          props.className
        )}
      >
        {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
);

// --- OVERLAYS ---

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<OverlayProps> = ({ isOpen, onClose, title, children, footer, width = 'md:w-[600px]' }) => (
  <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <SheetContent
      side="right"
      showCloseButton={true}
      className={cn(
        'w-full flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:max-w-none',
        width
      )}
    >
      <SheetHeader className="px-8 py-6 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
        <SheetTitle className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
          {title}
        </SheetTitle>
        <SheetDescription className="sr-only">{title}</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-8">
        {children}
      </div>

      {footer && (
        <div className="p-8 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900 flex justify-end gap-4">
          {footer}
        </div>
      )}
    </SheetContent>
  </Sheet>
);

export const Modal: React.FC<OverlayProps & { maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent
      showCloseButton={!!title}
      className={cn(
        'rounded-3xl border border-zinc-100 dark:border-white/10 p-6 md:p-8',
        maxWidth === 'max-w-md' && 'sm:max-w-md',
        maxWidth === 'max-w-lg' && 'sm:max-w-lg',
        maxWidth === 'max-w-xl' && 'sm:max-w-xl',
        maxWidth === 'max-w-2xl' && 'sm:max-w-2xl',
      )}
    >
      {title && (
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-zinc-900 dark:text-white">{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
      )}
      {children}
    </DialogContent>
  </Dialog>
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
  <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent className="rounded-3xl sm:max-w-md">
      <AlertDialogHeader className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500 dark:text-red-400 ring-4 ring-red-50 dark:ring-red-500/5">
          <AlertTriangle size={32} />
        </div>
        <AlertDialogTitle className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
          {message}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="grid grid-cols-2 gap-3 sm:flex-row">
        <AlertDialogCancel
          variant="outline"
          className="rounded-xl font-bold"
        >
          Отмена
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          className="rounded-xl font-bold bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
          onClick={onConfirm}
        >
          Удалить
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
