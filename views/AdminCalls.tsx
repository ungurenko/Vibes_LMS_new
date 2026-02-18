
import React, { useState, useEffect, useMemo } from 'react';
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
    CalendarCheck,
    Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer, PageHeader, Input, Select, ConfirmModal } from '../components/Shared';
import { fetchWithAuthGet, fetchWithAuthPost, fetchWithAuthPut, fetchWithAuthDelete } from '../lib/fetchWithAuth';
import { Cohort } from '../types';
import ScopeBanner from '../components/admin/ScopeBanner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

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
    cohortId?: string | null;
    cohortName?: string | null;
}

const REMINDER_OPTIONS: { id: ReminderType; label: string }[] = [
    { id: '24h', label: 'За 24 часа' },
    { id: '1h', label: 'За 1 час' },
    { id: '15m', label: 'За 15 минут' },
];

const ALL_COHORTS_VALUE = '__all__';

interface AdminCallsProps {
    selectedCohortId?: string | null;
    cohorts?: Cohort[];
    selectedCohortName?: string | null;
}

const AdminCalls: React.FC<AdminCallsProps> = ({ selectedCohortId, cohorts = [], selectedCohortName }) => {
    const [calls, setCalls] = useState<AdminCall[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingCall, setEditingCall] = useState<Partial<AdminCall>>({});
    const [reminderSentId, setReminderSentId] = useState<string | null>(null);

    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [callToDelete, setCallToDelete] = useState<string | null>(null);

    // Cross-access sharing state
    const [sharingCallId, setSharingCallId] = useState<string | null>(null);
    const [sharedCohorts, setSharedCohorts] = useState<string[]>([]);
    const cohortsById = useMemo(() => {
        const map = new Map<string, string>();
        cohorts.forEach(cohort => map.set(cohort.id, cohort.name));
        return map;
    }, [cohorts]);
    const cohortSelectOptions = useMemo(
        () => [
            { value: ALL_COHORTS_VALUE, label: 'Все потоки' },
            ...cohorts.map(cohort => ({ value: cohort.id, label: cohort.name })),
        ],
        [cohorts]
    );
    const sharingCall = useMemo(
        () => calls.find(call => call.id === sharingCallId) || null,
        [calls, sharingCallId]
    );
    const isSharingGlobalCall = !sharingCall?.cohortId;

    // --- API Functions ---

    const fetchCalls = async () => {
        try {
            setIsLoading(true);
            const url = selectedCohortId
                ? `/api/admin?resource=calls&cohortId=${selectedCohortId}`
                : '/api/admin?resource=calls';
            const data = await fetchWithAuthGet<AdminCall[]>(url);
            setCalls(data);
        } catch (error) {
            console.error('Error fetching calls:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCalls();
    }, [selectedCohortId]);

    // --- Actions ---

    const confirmDelete = (id: string) => {
        setCallToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!callToDelete) return;

        try {
            await fetchWithAuthDelete(`/api/admin?resource=calls&id=${callToDelete}`);
            setCalls(prev => prev.filter(c => c.id !== callToDelete));
            setIsDeleteModalOpen(false);
            setCallToDelete(null);
        } catch (error) {
            console.error('Error deleting call:', error);
            alert('Ошибка при удалении созвона');
        }
    };

    const handleSendReminder = (id: string) => {
        setReminderSentId(id);
        // Simulate API call to send push/email immediate reminder
        setTimeout(() => setReminderSentId(null), 3000);
    };

    const openEditor = (call?: AdminCall) => {
        if (call) {
            setEditingCall({
                ...call,
                cohortId: call.cohortId ?? null,
            });
        } else {
            setEditingCall({
                date: new Date().toISOString().split('T')[0],
                time: '19:00',
                duration: '60 мин',
                status: 'scheduled',
                materials: [],
                reminders: ['1h', '15m'],
                cohortId: selectedCohortId || null,
            });
        }
        setIsEditorOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCall.topic) return;

        try {
            const isUpdate = !!editingCall.id;
            const payload: Partial<AdminCall> = {
                ...editingCall,
                cohortId: editingCall.cohortId ?? null,
            };
            const saved = isUpdate
                ? await fetchWithAuthPut<AdminCall>('/api/admin?resource=calls', payload)
                : await fetchWithAuthPost<AdminCall>('/api/admin?resource=calls', payload);

            if (isUpdate) {
                setCalls(prev => prev.map(c => c.id === saved.id ? saved : c));
            } else {
                setCalls(prev => [saved, ...prev]);
            }

            setIsEditorOpen(false);
        } catch (error) {
            console.error('Error saving call:', error);
            alert('Ошибка при сохранении созвона');
        }
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

    // --- Cross-access sharing ---
    const openShareModal = async (callId: string) => {
        setSharingCallId(callId);
        const call = calls.find(item => item.id === callId);
        if (!call || !call.cohortId) {
            setSharedCohorts([]);
            return;
        }

        try {
            const data = await fetchWithAuthGet<{ cohortId: string }[]>(`/api/admin?resource=call-access&callId=${callId}`);
            setSharedCohorts(data.map(d => d.cohortId));
        } catch (error) {
            console.error('Error loading call access:', error);
            setSharedCohorts([]);
        }
    };

    const toggleCohortAccess = async (cohortId: string) => {
        if (!sharingCallId || !sharingCall?.cohortId) return;

        if (sharedCohorts.includes(cohortId)) {
            // Найти и удалить
            try {
                const data = await fetchWithAuthGet<{ id: string; cohortId: string }[]>(`/api/admin?resource=call-access&callId=${sharingCallId}`);
                const record = data.find(d => d.cohortId === cohortId);
                if (record) {
                    await fetchWithAuthDelete(`/api/admin?resource=call-access&id=${record.id}`);
                    setSharedCohorts(prev => prev.filter(id => id !== cohortId));
                }
            } catch (error) {
                console.error('Error revoking access:', error);
            }
        } else {
            // Добавить доступ
            try {
                await fetchWithAuthPost('/api/admin?resource=call-access', {
                    callId: sharingCallId,
                    cohortId,
                });
                setSharedCohorts(prev => [...prev, cohortId]);
            } catch (error) {
                console.error('Error granting access:', error);
            }
        }
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

    const getCohortLabel = (call: AdminCall) => {
        if (!call.cohortId) {
            return 'Все потоки';
        }
        const cohortName = call.cohortName || cohortsById.get(call.cohortId) || 'Без названия';
        return `Поток: ${cohortName}`;
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">

            {/* Scope Banner */}
            <ScopeBanner
                type={selectedCohortName ? 'filtered' : 'shared'}
                cohortName={selectedCohortName}
                label={selectedCohortName ? `Созвоны потока: ${selectedCohortName} + общие` : 'Все созвоны'}
            />

            {/* Header */}
            <PageHeader
                title="Расписание созвонов"
                description="Планирование лекций, воркшопов и управление уведомлениями."
                action={
                    <Button onClick={() => openEditor()}>
                        <Plus size={18} />
                        <span>Добавить созвон</span>
                    </Button>
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
                            className={`relative bg-white dark:bg-zinc-900 rounded-3xl border overflow-hidden transition-all ${call.status === 'live'
                                ? 'border-red-500/50 shadow-xl shadow-red-500/10 ring-1 ring-red-500/20'
                                : 'border-zinc-200 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/30'
                                }`}
                        >
                            <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">

                                {/* Left: Date & Time */}
                                <div className="lg:w-48 shrink-0 flex lg:flex-col items-center lg:items-start gap-4 lg:gap-2 lg:border-r border-zinc-100 dark:border-white/5 pr-8">
                                    <div className={`text-center lg:text-left px-4 py-2 rounded-xl border ${call.status === 'live' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-white/5'
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
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-white/10">
                                            {getCohortLabel(call)}
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
                                                className="inline-flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-500/20"
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
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditor(call)}
                                        className="w-full justify-center lg:justify-start"
                                    >
                                        <Edit size={16} />
                                        Редактировать
                                    </Button>

                                    {call.status !== 'completed' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSendReminder(call.id)}
                                            className="w-full justify-center lg:justify-start group"
                                        >
                                            {reminderSentId === call.id ? <CheckCircle2 size={16} className="text-emerald-500" /> : <BellRing size={16} className="group-hover:animate-swing" />}
                                            {reminderSentId === call.id ? 'Отправлено' : 'Напомнить'}
                                        </Button>
                                    )}

                                    {!call.recordingUrl && call.status === 'completed' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditor(call)}
                                            className="w-full justify-center lg:justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                        >
                                            <Video size={16} />
                                            Добавить запись
                                        </Button>
                                    )}

                                    {call.status !== 'completed' && cohorts.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openShareModal(call.id)}
                                            className="w-full justify-center lg:justify-start text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                                        >
                                            <Share2 size={16} />
                                            Доступ
                                        </Button>
                                    )}

                                    <div className="h-px bg-zinc-100 dark:bg-white/5 my-1 hidden lg:block" />

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => confirmDelete(call.id)}
                                        className="w-full justify-center lg:justify-start text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                    >
                                        <Trash2 size={16} />
                                        Удалить
                                    </Button>
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
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditorOpen(false)}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            form="call-form"
                            variant="primary"
                        >
                            <Save size={18} />
                            Сохранить
                        </Button>
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

                    <Select
                        label="Поток"
                        value={editingCall.cohortId || ALL_COHORTS_VALUE}
                        onChange={e => updateField('cohortId', e.target.value === ALL_COHORTS_VALUE ? null : e.target.value)}
                        options={cohortSelectOptions}
                    />

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
                        <Textarea
                            rows={4}
                            placeholder="О чем будем говорить..."
                            value={editingCall.description || ''}
                            onChange={e => updateField('description', e.target.value)}
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
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${isActive
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

                            <label className="cursor-pointer flex items-center justify-center gap-2 w-full p-4 rounded-xl border-2 border-dashed border-zinc-200 dark:border-white/10 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400">
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

            {/* Call Access Modal */}
            {sharingCallId && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
                        onClick={() => setSharingCallId(null)}
                    />
                    <div className="fixed inset-0 z-[101] overflow-y-auto pointer-events-none">
                        <div className="flex min-h-full items-center justify-center p-4 pointer-events-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-100 dark:border-white/10 p-6"
                            >
                                <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white mb-4">
                                    Доступ к созвону
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">Выберите потоки, которым открыть доступ:</p>
                                {isSharingGlobalCall && (
                                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                        Этот созвон уже доступен всем потокам.
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {cohorts.filter(c => c.id !== sharingCall?.cohortId).map(cohort => (
                                        <label
                                            key={cohort.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                isSharingGlobalCall
                                                    ? 'cursor-not-allowed opacity-60 border-zinc-200 dark:border-white/10'
                                                    : 'cursor-pointer'
                                            } ${
                                                sharedCohorts.includes(cohort.id)
                                                    ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30'
                                                    : 'border-zinc-200 dark:border-white/10 hover:border-purple-200'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={sharedCohorts.includes(cohort.id)}
                                                disabled={isSharingGlobalCall}
                                                onCheckedChange={() => !isSharingGlobalCall && toggleCohortAccess(cohort.id)}
                                            />
                                            <span className="font-medium text-zinc-900 dark:text-white">{cohort.name}</span>
                                            {cohort.studentCount !== undefined && (
                                                <span className="text-xs text-zinc-400 ml-auto">{cohort.studentCount} студ.</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                                <Button
                                    onClick={() => setSharingCallId(null)}
                                    className="w-full mt-4"
                                >
                                    Готово
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminCalls;
