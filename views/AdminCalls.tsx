
import React, { useState } from 'react';
import { 
  Video, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Link, 
  Bell, 
  FileText, 
  CheckCircle2, 
  Save, 
  Upload,
  PlayCircle,
  Users,
  X,
  BellRing,
  CalendarCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer, PageHeader, Input, Select, ConfirmModal } from '../components/Shared';

// --- Types ---

interface CallMaterial {
  name: string;
  size: string;
}

type ReminderType = '24h' | '1h' | '15m';

interface AdminCall {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: string;
  topic: string;
  description: string;
  status: 'scheduled' | 'live' | 'completed';
  meetingUrl: string;
  recordingUrl?: string;
  materials?: CallMaterial[];
  attendeesCount?: number;
  reminders: ReminderType[];
}

// --- Mock Data ---

const INITIAL_CALLS: AdminCall[] = [
  {
    id: '1',
    date: '2024-10-24',
    time: '19:00',
    duration: '90 мин',
    topic: 'Разбор домашних заданий: Лендинг',
    description: 'Смотрим работы студентов, разбираем типичные ошибки в верстке и дизайне. Q&A сессия в конце.',
    status: 'scheduled',
    meetingUrl: 'https://zoom.us/j/123456789',
    attendeesCount: 45,
    reminders: ['24h', '1h']
  },
  {
    id: '2',
    date: '2024-10-24',
    time: '18:00', 
    duration: '60 мин',
    topic: 'Live Coding: Анимации во Framer Motion',
    description: 'В прямом эфире верстаем сложную анимацию появления карточек. Практический мастер-класс.',
    status: 'live',
    meetingUrl: 'https://zoom.us/j/987654321',
    attendeesCount: 128,
    reminders: ['15m']
  },
  {
    id: '3',
    date: '2024-10-20',
    time: '20:00',
    duration: '120 мин',
    topic: 'Введение в React: Компоненты и Пропсы',
    description: 'Фундаментальная лекция модуля 2. Разбираем, почему React так популярен и как мыслить компонентами.',
    status: 'completed',
    meetingUrl: 'https://zoom.us/j/111222333',
    recordingUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    materials: [{ name: 'Syllabus.pdf', size: '2.4 MB' }, { name: 'Code_Snippets.zip', size: '1.1 MB' }],
    attendeesCount: 210,
    reminders: []
  }
];

const REMINDER_OPTIONS: { id: ReminderType; label: string }[] = [
    { id: '24h', label: 'За 24 часа' },
    { id: '1h', label: 'За 1 час' },
    { id: '15m', label: 'За 15 минут' },
];

const AdminCalls: React.FC = () => {
  const [calls, setCalls] = useState<AdminCall[]>(INITIAL_CALLS);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<Partial<AdminCall>>({});
  const [reminderSentId, setReminderSentId] = useState<string | null>(null);
  
  // Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [callToDelete, setCallToDelete] = useState<string | null>(null);

  // --- Actions ---

  const confirmDelete = (id: string) => {
      setCallToDelete(id);
      setIsDeleteModalOpen(true);
  };

  const executeDelete = () => {
    if (callToDelete) {
      setCalls(prev => prev.filter(c => c.id !== callToDelete));
      setIsDeleteModalOpen(false);
      setCallToDelete(null);
    }
  };

  const handleSendReminder = (id: string) => {
    setReminderSentId(id);
    // Simulate API call to send push/email immediate reminder
    setTimeout(() => setReminderSentId(null), 3000);
  };

  const openEditor = (call?: AdminCall) => {
    if (call) {
      setEditingCall({ ...call });
    } else {
      setEditingCall({
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        duration: '60 мин',
        status: 'scheduled',
        materials: [],
        reminders: ['1h', '15m'] // Defaults
      });
    }
    setIsEditorOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCall.topic) return;

    setCalls(prev => {
      const exists = prev.find(c => c.id === editingCall.id);
      if (exists) {
        return prev.map(c => c.id === editingCall.id ? { ...c, ...editingCall } as AdminCall : c);
      } else {
        const newCall = { 
            ...editingCall, 
            id: Date.now().toString(),
            attendeesCount: 0 
        } as AdminCall;
        return [newCall, ...prev];
      }
    });
    setIsEditorOpen(false);
  };

  const updateField = (field: keyof AdminCall, value: any) => {
    setEditingCall(prev => ({ ...prev, [field]: value }));
  };

  const toggleReminder = (type: ReminderType) => {
      setEditingCall(prev => {
          const current = prev.reminders || [];
          if (current.includes(type)) {
              return { ...prev, reminders: current.filter(r => r !== type) };
          } else {
              return { ...prev, reminders: [...current, type] };
          }
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newMaterial = { name: file.name, size: '1.2 MB' }; // Mock size
      setEditingCall(prev => ({
        ...prev,
        materials: [...(prev.materials || []), newMaterial]
      }));
    }
  };

  const removeMaterial = (index: number) => {
    setEditingCall(prev => ({
        ...prev,
        materials: prev.materials?.filter((_, i) => i !== index)
    }));
  };

  // --- UI Helpers ---

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20';
      case 'completed': return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-white/5';
      default: return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'live': return 'Идёт сейчас';
      case 'completed': return 'Завершён';
      default: return 'Запланирован';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      
      {/* Header */}
      <PageHeader 
        title="Расписание созвонов" 
        description="Планирование лекций, воркшопов и управление уведомлениями."
        action={
            <button 
                onClick={() => openEditor()}
                className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-zinc-500/10"
            >
                <Plus size={18} />
                <span>Добавить созвон</span>
            </button>
        }
      />

      {/* Calls List */}
      <div className="space-y-6">
        <AnimatePresence>
            {calls.map((call) => (
                <motion.div
                    key={call.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`relative bg-white dark:bg-zinc-900 rounded-3xl border overflow-hidden transition-all ${
                        call.status === 'live' 
                        ? 'border-red-500/50 shadow-xl shadow-red-500/10 ring-1 ring-red-500/20' 
                        : 'border-zinc-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/30'
                    }`}
                >
                    <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
                        
                        {/* Left: Date & Time */}
                        <div className="lg:w-48 shrink-0 flex lg:flex-col items-center lg:items-start gap-4 lg:gap-2 lg:border-r border-zinc-100 dark:border-white/5 pr-8">
                            <div className={`text-center lg:text-left px-4 py-2 rounded-xl border ${
                                call.status === 'live' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-white/5'
                            }`}>
                                <div className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                                    {new Date(call.date).toLocaleDateString('ru-RU', { month: 'short' })}
                                </div>
                                <div className={`text-3xl font-display font-bold ${call.status === 'live' ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
                                    {new Date(call.date).getDate()}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-lg">
                                    <Clock size={18} className={call.status === 'live' ? 'text-red-500' : 'text-zinc-400'} />
                                    {call.time}
                                </div>
                                <div className="text-sm text-zinc-500 dark:text-zinc-400 pl-6.5">
                                    {call.duration}
                                </div>
                            </div>
                        </div>

                        {/* Middle: Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getStatusColor(call.status)}`}>
                                    {call.status === 'live' && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
                                    {getStatusLabel(call.status)}
                                </span>
                                
                                {call.status !== 'completed' && call.reminders.length > 0 && (
                                    <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-500/20 text-xs font-bold">
                                        <CalendarCheck size={12} />
                                        <span>Напоминания: {call.reminders.join(', ')}</span>
                                    </div>
                                )}

                                {call.attendeesCount !== undefined && (
                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                        <Users size={12} /> {call.attendeesCount} участников
                                    </span>
                                )}
                            </div>
                            
                            <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                                {call.topic}
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-2xl">
                                {call.description}
                            </p>

                            {/* Materials & Links */}
                            <div className="flex flex-wrap gap-4">
                                {call.meetingUrl && call.status !== 'completed' && (
                                    <a 
                                        href={call.meetingUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-500/20"
                                    >
                                        <Video size={16} />
                                        Ссылка на встречу
                                    </a>
                                )}
                                {call.recordingUrl && (
                                    <a 
                                        href={call.recordingUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 hover:underline bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20"
                                    >
                                        <PlayCircle size={16} />
                                        Смотреть запись
                                    </a>
                                )}
                                {call.materials?.map(m => (
                                    <div key={m.name} className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/5">
                                        <FileText size={14} />
                                        {m.name}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="lg:w-48 shrink-0 flex flex-row lg:flex-col justify-end lg:justify-start gap-2 pt-6 lg:pt-0 lg:border-l border-zinc-100 dark:border-white/5 lg:pl-8">
                            <button 
                                onClick={() => openEditor(call)}
                                className="w-full py-2 px-4 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors flex items-center justify-center lg:justify-start gap-2"
                            >
                                <Edit size={16} />
                                Редактировать
                            </button>
                            
                            {call.status !== 'completed' && (
                                <button 
                                    onClick={() => handleSendReminder(call.id)}
                                    className="w-full py-2 px-4 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors flex items-center justify-center lg:justify-start gap-2 group"
                                >
                                    {reminderSentId === call.id ? <CheckCircle2 size={16} className="text-emerald-500" /> : <BellRing size={16} className="group-hover:animate-swing" />}
                                    {reminderSentId === call.id ? 'Отправлено' : 'Напомнить'}
                                </button>
                            )}

                            {!call.recordingUrl && call.status === 'completed' && (
                                <button 
                                    onClick={() => openEditor(call)}
                                    className="w-full py-2 px-4 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center justify-center lg:justify-start gap-2"
                                >
                                    <Video size={16} />
                                    Добавить запись
                                </button>
                            )}
                            
                            <div className="h-px bg-zinc-100 dark:bg-white/5 my-1 hidden lg:block" />
                            
                            <button 
                                onClick={() => confirmDelete(call.id)}
                                className="w-full py-2 px-4 rounded-xl text-sm font-bold text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center justify-center lg:justify-start gap-2"
                            >
                                <Trash2 size={16} />
                                Удалить
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Editor Drawer */}
      <Drawer 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)}
        title={editingCall.id ? 'Редактировать' : 'Новый созвон'}
        width="md:w-[500px]"
        footer={
            <>
                <button 
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-6 py-3 rounded-xl border border-zinc-200 dark:border-white/10 font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                >
                    Отмена
                </button>
                <button 
                    type="submit"
                    form="call-form"
                    className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/20 flex items-center gap-2"
                >
                    <Save size={18} />
                    Сохранить
                </button>
            </>
        }
      >
        <form id="call-form" onSubmit={handleSave} className="space-y-6">
                            
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Дата"
                    type="date"
                    required
                    value={editingCall.date || ''}
                    onChange={e => updateField('date', e.target.value)}
                />
                <Input 
                    label="Время (МСК)"
                    type="time"
                    required
                    value={editingCall.time || ''}
                    onChange={e => updateField('time', e.target.value)}
                />
            </div>

            {/* Info */}
            <Input 
                label="Тема созвона"
                type="text"
                required
                placeholder="Например: Q&A по React..."
                value={editingCall.topic || ''}
                onChange={e => updateField('topic', e.target.value)}
            />
            
            <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Описание</label>
                <textarea 
                    rows={4}
                    placeholder="О чем будем говорить..."
                    value={editingCall.description || ''}
                    onChange={e => updateField('description', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Длительность"
                    type="text"
                    placeholder="60 мин"
                    value={editingCall.duration || ''}
                    onChange={e => updateField('duration', e.target.value)}
                />
                <Select
                    label="Статус"
                    value={editingCall.status || 'scheduled'}
                    onChange={e => updateField('status', e.target.value)}
                    options={[
                        { value: 'scheduled', label: 'Запланирован' },
                        { value: 'live', label: 'Идёт сейчас' },
                        { value: 'completed', label: 'Завершён' }
                    ]}
                />
            </div>

            {/* Reminders Section */}
            <div className="bg-amber-50 dark:bg-amber-500/5 p-4 rounded-2xl border border-amber-100 dark:border-amber-500/10">
                <label className="block text-sm font-bold text-amber-900 dark:text-amber-400 mb-3 flex items-center gap-2">
                    <BellRing size={16} />
                    Автоматические уведомления
                </label>
                <div className="flex flex-wrap gap-2">
                    {REMINDER_OPTIONS.map(opt => {
                        const isActive = (editingCall.reminders || []).includes(opt.id);
                        return (
                            <button
                                type="button"
                                key={opt.id}
                                onClick={() => toggleReminder(opt.id)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                    isActive 
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-md' 
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-amber-300'
                                }`}
                            >
                                {isActive && <CheckCircle2 size={12} className="inline mr-1" />}
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Links */}
            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                <Input 
                    label="Ссылка на встречу (Zoom/Meet)"
                    icon={Link}
                    type="text"
                    placeholder="https://zoom.us/..."
                    value={editingCall.meetingUrl || ''}
                    onChange={e => updateField('meetingUrl', e.target.value)}
                />
                
                <Input 
                    label="Ссылка на запись"
                    icon={Video}
                    type="text"
                    placeholder="Добавьте после завершения..."
                    value={editingCall.recordingUrl || ''}
                    onChange={e => updateField('recordingUrl', e.target.value)}
                />
            </div>

            {/* Materials Upload Simulation */}
            <div className="pt-4 border-t border-zinc-100 dark:border-white/5">
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">Материалы</label>
                <div className="space-y-3">
                    {editingCall.materials?.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-zinc-500" />
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{m.name}</span>
                                <span className="text-xs text-zinc-400">({m.size})</span>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => removeMaterial(idx)}
                                className="p-1 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg text-zinc-400"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    
                    <label className="cursor-pointer flex items-center justify-center gap-2 w-full p-4 rounded-xl border-2 border-dashed border-zinc-200 dark:border-white/10 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400">
                        <Upload size={18} />
                        <span className="font-bold text-sm">Загрузить файл</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>

        </form>
      </Drawer>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDelete}
        message="Вы уверены, что хотите удалить этот созвон?"
      />
    </div>
  );
};

export default AdminCalls;
