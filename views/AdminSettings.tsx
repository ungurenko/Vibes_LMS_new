
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings, 
  Link, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  CheckCircle2, 
  Ban,
  Clock,
  Users,
  Volume2,
  Volume1,
  Music,
  X,
  Eye,
  Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InviteLink, NavigationConfig } from '../types';
import { useSound } from '../SoundContext';
import { Modal, PageHeader, ConfirmModal } from '../components/Shared';

interface AdminSettingsProps {
    invites: InviteLink[];
    onGenerateInvites: (count: number, daysValid: number | null) => void;
    onDeleteInvite: (id: string) => void;
    onDeactivateInvite: (id: string) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ invites, onGenerateInvites, onDeleteInvite, onDeactivateInvite }) => {
  
  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'invites' | 'general'>('invites');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'neutral' | 'error' } | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  
  // --- Sound Context ---
  const { isEnabled, toggleSound, volume, setVolume, playSound } = useSound();

  // --- Invite Management State ---
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [genDuration, setGenDuration] = useState<number | null>(null); // null = infinite
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'used' | 'deactivated'>('all');

  // Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<string | null>(null);

  // Navigation Config State
  const [navConfig, setNavConfig] = useState<NavigationConfig | null>(null);
  const [navConfigLoading, setNavConfigLoading] = useState(true);
  const [navConfigSaving, setNavConfigSaving] = useState<string | null>(null);

  // --- Helpers ---

  const showToast = (message: string, type: 'success' | 'neutral' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = (id: string, token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}?invite=${token}`;
    
    navigator.clipboard.writeText(link);
    setCopyId(id);
    setTimeout(() => setCopyId(null), 2000);
    showToast('Ссылка скопирована');
  };
  
  const handleGenerateSubmit = () => {
      onGenerateInvites(genCount, genDuration);
      setIsGenerateModalOpen(false);
      showToast(`Сгенерировано ${genCount} инвайтов`);
  };

  const confirmDelete = (id: string) => {
      setInviteToDelete(id);
      setIsDeleteModalOpen(true);
  };

  const executeDelete = () => {
      if (inviteToDelete) {
          onDeleteInvite(inviteToDelete);
          setIsDeleteModalOpen(false);
          setInviteToDelete(null);
          showToast('Инвайт удален', 'neutral');
      }
  };

  // --- Computed Stats ---
  const stats = useMemo(() => {
      return {
          total: invites.length,
          active: invites.filter(i => i.status === 'active').length,
          used: invites.filter(i => i.status === 'used').length,
      };
  }, [invites]);

  const filteredInvites = useMemo(() => {
      return invites.filter(i => filterStatus === 'all' || i.status === filterStatus);
  }, [invites, filterStatus]);

  const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
      });
  };

  // --- Navigation Config Effects ---
  useEffect(() => {
    // Загружаем конфигурацию навигации при монтировании
    fetch('/api/admin?resource=navigation', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('vibes_token')}`
      }
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setNavConfig(result.data);
        }
      })
      .catch(err => {
        console.error('Failed to load navigation config:', err);
        showToast('Ошибка загрузки настроек навигации', 'error');
      })
      .finally(() => setNavConfigLoading(false));
  }, []);

  const handleNavToggle = async (key: keyof NavigationConfig) => {
    if (!navConfig || key === 'dashboard') return; // Dashboard нельзя скрыть

    const updatedConfig = { ...navConfig, [key]: !navConfig[key] };

    // Optimistic update
    setNavConfig(updatedConfig);
    setNavConfigSaving(key);

    try {
      const response = await fetch('/api/admin?resource=navigation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vibes_token')}`
        },
        body: JSON.stringify(updatedConfig)
      });

      const result = await response.json();

      if (result.success) {
        setNavConfig(result.data);
        showToast('Настройки сохранены', 'success');
      } else {
        // Откат при ошибке
        setNavConfig(navConfig);
        showToast('Ошибка сохранения', 'error');
      }
    } catch (error) {
      // Откат при ошибке
      setNavConfig(navConfig);
      console.error('Failed to update navigation config:', error);
      showToast('Ошибка сохранения', 'error');
    } finally {
      setNavConfigSaving(null);
    }
  };

  const navItems = [
    { key: 'dashboard' as keyof NavigationConfig, label: 'Дашборд', disabled: true },
    { key: 'lessons' as keyof NavigationConfig, label: 'Уроки', disabled: false },
    { key: 'roadmaps' as keyof NavigationConfig, label: 'Дорожные карты', disabled: false },
    { key: 'styles' as keyof NavigationConfig, label: 'Стили', disabled: false },
    { key: 'prompts' as keyof NavigationConfig, label: 'Промпты', disabled: false },
    { key: 'glossary' as keyof NavigationConfig, label: 'Словарик', disabled: false },
    { key: 'tools' as keyof NavigationConfig, label: 'Инструменты', disabled: false },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      
      {/* Header */}
      <PageHeader 
        title="Настройки"
        description="Управление доступами и системой."
        action={
            <div className="bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-xl flex gap-1 border border-zinc-200 dark:border-white/5">
                <button
                    onClick={() => setActiveTab('invites')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'invites' 
                        ? 'bg-white dark:bg-zinc-800 text-violet-600 dark:text-violet-400 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                    }`}
                >
                    <Link size={16} />
                    Инвайты
                </button>
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'general' 
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                    }`}
                >
                    <Settings size={16} />
                    Общие
                </button>
            </div>
        }
      />

      <AnimatePresence mode="wait">
        {activeTab === 'invites' && (
            <motion.div
                key="invites"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
            >
                {/* Stats & Actions Bar */}
                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Stats Cards */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-white/5 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Всего ссылок</div>
                                <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{stats.total}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500">
                                <Link size={20} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-white/5 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Активных</div>
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 size={20} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-white/5 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Использовано</div>
                                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-1">{stats.used}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-500">
                                <Users size={20} />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="xl:w-auto flex flex-col sm:flex-row gap-3">
                         <button 
                            onClick={() => setIsGenerateModalOpen(true)}
                            className="h-full min-h-[80px] px-8 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
                         >
                            <Plus size={24} />
                            <span>Сгенерировать</span>
                         </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm">
                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-50/50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-zinc-900 dark:text-white">Инвайт-ссылки</h3>
                        </div>
                        <div className="flex gap-2">
                            {['all', 'active', 'used', 'deactivated'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                                        filterStatus === status 
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' 
                                        : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                                    }`}
                                >
                                    {status === 'all' ? 'Все' : status === 'active' ? 'Активные' : status === 'used' ? 'Исп.' : 'Откл.'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                                <tr>
                                    <th className="px-6 py-4">Ссылка / Токен</th>
                                    <th className="px-6 py-4">Статус</th>
                                    <th className="px-6 py-4">Создан</th>
                                    <th className="px-6 py-4">Использован</th>
                                    <th className="px-6 py-4 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                                {filteredInvites.length > 0 ? filteredInvites.map(invite => (
                                    <tr key={invite.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] group transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-sm text-zinc-900 dark:text-white font-medium">
                                                ...{invite.token}
                                            </div>
                                            <div className="text-xs text-zinc-400 mt-0.5">
                                                {window.location.host}/invite/...
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {invite.status === 'active' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wide">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Активна
                                                </span>
                                            )}
                                            {invite.status === 'used' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase tracking-wide">
                                                    <CheckCircle2 size={12} />
                                                    Использована
                                                </span>
                                            )}
                                            {invite.status === 'deactivated' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wide">
                                                    <Ban size={12} />
                                                    Отключена
                                                </span>
                                            )}
                                            {invite.expiresAt && (
                                                <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    до {formatDate(invite.expiresAt)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-500">
                                            {formatDate(invite.created)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {invite.status === 'used' ? (
                                                <div>
                                                    <div className="text-sm font-bold text-zinc-900 dark:text-white">{invite.usedByEmail}</div>
                                                    <div className="text-xs text-zinc-400">{invite.usedByName} • {formatDate(invite.usedAt!)}</div>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-300 dark:text-zinc-700 text-2xl">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {invite.status === 'active' && (
                                                    <>
                                                        <button
                                                            onClick={() => copyToClipboard(invite.id, invite.token)}
                                                            className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                            title="Копировать"
                                                        >
                                                            {copyId === invite.id ? <Check size={16} /> : <Copy size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => onDeactivateInvite(invite.id)}
                                                            className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                            title="Деактивировать"
                                                        >
                                                            <Ban size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                {invite.status === 'deactivated' && (
                                                    <button
                                                        onClick={() => confirmDelete(invite.id)}
                                                        className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                        title="Удалить"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                                            Инвайты не найдены.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
        )}

        {activeTab === 'general' && (
            <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
                {/* Sound Settings Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                            <Music size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Звуки интерфейса</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Настройка системных уведомлений</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Toggle Switch */}
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Включить звуки</span>
                            <button 
                                onClick={toggleSound}
                                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isEnabled ? 'bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Volume Slider */}
                        <div className={`space-y-4 transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div className="flex justify-between items-center text-sm font-bold text-zinc-500">
                                <span>Громкость</span>
                                <span>{Math.round(volume * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Volume1 size={20} className="text-zinc-400" />
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.05" 
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                                />
                                <Volume2 size={20} className="text-zinc-400" />
                            </div>
                        </div>

                        {/* Test Button */}
                        <button 
                            onClick={() => playSound('success')}
                            className="w-full py-3 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                        >
                            <Volume2 size={18} />
                            Тест звука
                        </button>
                    </div>
                </div>

                {/* Navigation Visibility Settings Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Eye size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Видимость меню</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Управление разделами для студентов</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {navConfigLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader size={24} className="animate-spin text-zinc-400" />
                            </div>
                        ) : (
                            navItems.map(item => (
                                <div key={item.key} className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-medium ${item.disabled ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                            {item.label}
                                        </span>
                                        {item.disabled && (
                                            <span className="text-xs text-zinc-400 dark:text-zinc-600">(обязательно)</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleNavToggle(item.key)}
                                        disabled={item.disabled || navConfigSaving === item.key}
                                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${
                                            item.disabled
                                                ? 'bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed opacity-50'
                                                : navConfig && navConfig[item.key]
                                                    ? 'bg-emerald-600'
                                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                        } ${navConfigSaving === item.key ? 'opacity-50' : ''}`}
                                    >
                                        {navConfigSaving === item.key ? (
                                            <div className="flex items-center justify-center w-full h-full">
                                                <Loader size={14} className="animate-spin text-white" />
                                            </div>
                                        ) : (
                                            <div
                                                className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${
                                                    navConfig && navConfig[item.key] ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {!navConfigLoading && (
                        <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-white/10">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Скрытые разделы не будут отображаться в меню студентов. Изменения применяются сразу после переключения.
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Modal - Fixed with Scrollable Overlay */}
      <Modal 
        isOpen={isGenerateModalOpen} 
        onClose={() => setIsGenerateModalOpen(false)}
        title="Сгенерировать ссылки"
      >
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">Количество</label>
                <div className="grid grid-cols-4 gap-2">
                    {[1, 5, 10, 50].map(num => (
                        <button
                            key={num}
                            onClick={() => setGenCount(num)}
                            className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                                genCount === num 
                                ? 'bg-violet-600 text-white border-violet-600' 
                                : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-violet-300'
                            }`}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">Срок действия</label>
                <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${genDuration === null ? 'bg-zinc-50 dark:bg-white/5 border-violet-500' : 'border-zinc-200 dark:border-white/10'}`}>
                        <input type="radio" name="duration" checked={genDuration === null} onChange={() => setGenDuration(null)} className="accent-violet-600 w-5 h-5" />
                        <span className="font-medium text-zinc-900 dark:text-white">Бессрочно</span>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${genDuration === 7 ? 'bg-zinc-50 dark:bg-white/5 border-violet-500' : 'border-zinc-200 dark:border-white/10'}`}>
                        <input type="radio" name="duration" checked={genDuration === 7} onChange={() => setGenDuration(7)} className="accent-violet-600 w-5 h-5" />
                        <span className="font-medium text-zinc-900 dark:text-white">7 дней</span>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${genDuration === 30 ? 'bg-zinc-50 dark:bg-white/5 border-violet-500' : 'border-zinc-200 dark:border-white/10'}`}>
                        <input type="radio" name="duration" checked={genDuration === 30} onChange={() => setGenDuration(30)} className="accent-violet-600 w-5 h-5" />
                        <span className="font-medium text-zinc-900 dark:text-white">30 дней</span>
                    </label>
                </div>
            </div>

            <button 
                onClick={handleGenerateSubmit}
                className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
            >
                Сгенерировать
            </button>
        </div>
      </Modal>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-4 px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl shadow-2xl border border-zinc-700 dark:border-zinc-200"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'neutral' ? 'bg-zinc-700 dark:bg-zinc-300' : 'bg-emerald-500'
            }`}>
              {toast.type === 'neutral' ? <Trash2 size={16} className="text-white dark:text-black" /> : <CheckCircle2 size={18} className="text-white" />}
            </div>
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDelete}
        message="Вы уверены, что хотите удалить эту ссылку? Действие необратимо."
      />
    </div>
  );
};

export default AdminSettings;
