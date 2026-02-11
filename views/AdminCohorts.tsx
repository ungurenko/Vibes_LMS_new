
import React, { useState } from 'react';
import {
  Plus,
  Users,
  Calendar,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cohort } from '../types';
import { Modal, PageHeader } from '../components/Shared';
import { fetchWithAuthPost, fetchWithAuthPut } from '../lib/fetchWithAuth';
import { Button } from '@/components/ui/button';

interface AdminCohortsProps {
  cohorts: Cohort[];
  onCohortsChange: () => void;
}

const AdminCohorts: React.FC<AdminCohortsProps> = ({ cohorts, onCohortsChange }) => {
  const [isAddCohortOpen, setIsAddCohortOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Partial<Cohort> | null>(null);
  const [cohortForm, setCohortForm] = useState({ name: '', description: '', startDate: '', cloneStagesFrom: '' });
  const [isCohortSaving, setIsCohortSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveCohort = async () => {
    if (!cohortForm.name.trim()) return;
    setIsCohortSaving(true);
    try {
      if (editingCohort?.id) {
        await fetchWithAuthPut('/api/admin?resource=cohorts', {
          id: editingCohort.id,
          name: cohortForm.name,
          description: cohortForm.description,
          startDate: cohortForm.startDate || null,
        });
      } else {
        await fetchWithAuthPost('/api/admin?resource=cohorts', {
          name: cohortForm.name,
          description: cohortForm.description,
          startDate: cohortForm.startDate || null,
          cloneStagesFrom: cohortForm.cloneStagesFrom || undefined,
        });
      }
      onCohortsChange();
      setIsAddCohortOpen(false);
      setEditingCohort(null);
      setCohortForm({ name: '', description: '', startDate: '', cloneStagesFrom: '' });
      showToast(editingCohort?.id ? 'Поток обновлён' : 'Поток создан');
    } catch (error) {
      console.error('Error saving cohort:', error);
      showToast('Ошибка сохранения', 'error');
    } finally {
      setIsCohortSaving(false);
    }
  };

  const handleArchiveCohort = async (id: string) => {
    try {
      await fetchWithAuthPut('/api/admin?resource=cohorts', {
        id,
        isActive: false,
      });
      onCohortsChange();
      showToast('Поток архивирован');
    } catch (error) {
      console.error('Error archiving cohort:', error);
      showToast('Ошибка архивирования', 'error');
    }
  };

  const openEditCohort = (cohort: Cohort) => {
    setEditingCohort(cohort);
    setCohortForm({
      name: cohort.name,
      description: cohort.description || '',
      startDate: cohort.startDate || '',
      cloneStagesFrom: '',
    });
    setIsAddCohortOpen(true);
  };

  const openAddCohort = () => {
    setEditingCohort(null);
    setCohortForm({ name: '', description: '', startDate: '', cloneStagesFrom: '' });
    setIsAddCohortOpen(true);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      <PageHeader
        title="Потоки"
        description="Управление учебными потоками."
        action={
          <Button onClick={openAddCohort}>
            <Plus size={18} />
            Создать поток
          </Button>
        }
      />

      {/* Cohorts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cohorts.map(cohort => (
          <motion.div
            key={cohort.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-zinc-900 rounded-2xl border p-6 transition-all ${
              cohort.isActive
                ? 'border-rose-200 dark:border-rose-500/20 shadow-sm'
                : 'border-zinc-200 dark:border-white/5 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-lg text-zinc-900 dark:text-white">{cohort.name}</h4>
                {cohort.description && (
                  <p className="text-sm text-zinc-500 mt-1">{cohort.description}</p>
                )}
              </div>
              {cohort.isActive ? (
                <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  Активен
                </span>
              ) : (
                <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">
                  Архив
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
              <span className="flex items-center gap-1">
                <Users size={14} />
                {cohort.studentCount || 0} студентов
              </span>
              {cohort.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(cohort.startDate).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditCohort(cohort)}
                className="flex-1"
              >
                Редактировать
              </Button>
              {cohort.isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchiveCohort(cohort.id)}
                  title="Архивировать"
                  className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Ban size={16} />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {cohorts.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          Потоки не созданы. Создайте первый поток.
        </div>
      )}

      {/* Add/Edit Cohort Modal */}
      <Modal
        isOpen={isAddCohortOpen}
        onClose={() => { setIsAddCohortOpen(false); setEditingCohort(null); }}
        title={editingCohort?.id ? 'Редактировать поток' : 'Создать поток'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Название</label>
            <input
              type="text"
              value={cohortForm.name}
              onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
              placeholder="Например: Поток 2"
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-rose-500 transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Описание</label>
            <input
              type="text"
              value={cohortForm.description}
              onChange={(e) => setCohortForm({ ...cohortForm, description: e.target.value })}
              placeholder="Краткое описание потока"
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Дата старта</label>
            <input
              type="date"
              value={cohortForm.startDate}
              onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
          {!editingCohort?.id && cohorts.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Клонировать стадии из</label>
              <select
                value={cohortForm.cloneStagesFrom}
                onChange={(e) => setCohortForm({ ...cohortForm, cloneStagesFrom: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-rose-500 transition-colors appearance-none"
              >
                <option value="">Не клонировать</option>
                {cohorts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button
            onClick={handleSaveCohort}
            disabled={!cohortForm.name.trim() || isCohortSaving}
            className="w-full"
          >
            {isCohortSaving ? 'Сохранение...' : editingCohort?.id ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </Modal>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border font-bold text-sm ${
              toast.type === 'error'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-700 dark:border-zinc-200'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCohorts;
