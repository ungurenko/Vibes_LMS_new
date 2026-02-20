import React, { useState, useMemo, useEffect } from 'react';
import { Student, StudentProfile as StudentProfileType, Cohort, AdminStat } from '../types';
import {
  Search,
  ArrowUpDown,
  Trash2,
  ChevronRight,
  Github,
  Globe,
  Layout,
  Plus,
  X,
  Eye,
  EyeOff,
  Edit,
  Key,
  Copy,
  Check,
  RefreshCw,
  Users,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  UserPlus,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '../components/Shared';
import { StudentProfile } from '../components/admin/students/StudentProfile';
import { fetchWithAuthGet, fetchWithAuth, fetchWithAuthPost, fetchWithAuthDelete, fetchWithAuthPatch } from '../lib/fetchWithAuth';
import ScopeBanner from '../components/admin/ScopeBanner';
import { useCachedFetch } from '../lib/hooks/useCachedFetch';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

// --- Types ---
type ViewMode = 'list' | 'profile';
type SortField = 'name' | 'progress' | 'joinedDate';
type SortOrder = 'asc' | 'desc';

interface AdminStudentsProps {
    students: Student[];
    onUpdateStudent: (student: Student) => void;
    onAddStudent: (student: Student) => void;
    onDeleteStudent: (id: string) => void;
    selectedCohortId?: string | null;
    selectedCohortName?: string | null;
    cohorts?: Cohort[];
}

// --- Sub-components ---

const ProjectIcon: React.FC<{ url?: string; type: 'landing' | 'service' | 'github' }> = ({ url, type }) => {
  if (!url) return (
    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-600 cursor-not-allowed">
      {type === 'landing' && <Layout size={14} />}
      {type === 'service' && <Globe size={14} />}
      {type === 'github' && <Github size={14} />}
    </div>
  );

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 transition-colors shadow-sm" title={type}>
       {type === 'landing' && <Layout size={14} />}
       {type === 'service' && <Globe size={14} />}
       {type === 'github' && <Github size={14} />}
    </a>
  );
};

const AdminStudents: React.FC<AdminStudentsProps> = ({ students, onUpdateStudent, onAddStudent, onDeleteStudent, selectedCohortId, selectedCohortName, cohorts }) => {
  // Stats cards
  const statsUrl = `/api/admin?resource=stats${selectedCohortId ? `&cohortId=${selectedCohortId}` : ''}`;
  const { data: statsCards } = useCachedFetch<AdminStat[]>(
    statsUrl,
    [],
    { cacheKey: `admin-students-stats-${selectedCohortId || 'all'}`, cacheTTL: 60000, staleWhileRevalidate: true }
  );

  const statsIcons = [Users, TrendingUp, BarChart3, Layout, AlertTriangle];
  const statsColors = [
    'bg-purple-50 dark:bg-purple-500/10 text-purple-600',
    'bg-blue-50 dark:bg-blue-500/10 text-blue-600',
    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600',
    'bg-amber-50 dark:bg-amber-500/10 text-amber-600',
    'bg-red-50 dark:bg-red-500/10 text-red-600',
  ];

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Profile Data State
  const [detailedProfile, setDetailedProfile] = useState<StudentProfileType | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Student['status']>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({ field: 'name', order: 'asc' });

  // Add/Edit Student Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  // Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  // Password Reset Modal State
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [studentToResetPassword, setStudentToResetPassword] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Form State (Separated First/Last for Admin)
  const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      cohortId: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  // Bulk actions state
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkNotifyModalOpen, setIsBulkNotifyModalOpen] = useState(false);
  const [bulkNotifyMessage, setBulkNotifyMessage] = useState('');

  // --- Bulk Action Handlers ---

  const bulkAction = async (action: string, value?: string) => {
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;
    setIsBulkLoading(true);
    try {
      const result = await fetchWithAuthPatch<{ affected: number; passwords?: { id: string; email: string; password: string }[] }>('/api/admin?resource=students', {
        ids, action, value,
      });
      if (action === 'delete') {
        ids.forEach(id => onDeleteStudent(id));
      }
      if (action === 'resetPasswords' && result.passwords) {
        const text = result.passwords.map(p => `${p.email}: ${p.password}`).join('\n');
        await navigator.clipboard.writeText(text);
        alert(`Пароли сброшены (${result.affected}) и скопированы в буфер обмена`);
      }
      setSelectedRowIds(new Set());
    } catch (error: any) {
      alert(error.message || 'Ошибка массовой операции');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const exportToCSV = () => {
    const ids = selectedRowIds.size > 0 ? selectedRowIds : new Set(filteredStudents.map(s => s.id));
    const selected = filteredStudents.filter(s => ids.has(s.id));
    const BOM = '\uFEFF';
    const header = 'Имя,Email,Статус,Прогресс,Текущий модуль,Последняя активность,Дата регистрации,Лендинг,Сервис,GitHub\n';
    const rows = selected.map(s =>
      [s.name, s.email, s.status, `${s.progress}%`, s.currentModule, s.lastActive, s.joinedDate,
       s.projects.landing || '', s.projects.service || '', s.projects.github || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');
    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Logic ---

  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRowIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRowIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(new Set(filteredStudents.map(s => s.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const openProfile = async (student: Student) => {
    setSelectedStudentId(student.id);
    setViewMode('profile');
    setIsLoadingProfile(true);

    try {
        const data = await fetchWithAuthGet<StudentProfileType>(`/api/admin?resource=students&id=${student.id}`);
        setDetailedProfile(data);
    } catch (error) {
        console.error("Failed to fetch profile", error);
    } finally {
        setIsLoadingProfile(false);
    }
  };

  const closeProfile = () => {
    setViewMode('list');
    setTimeout(() => {
        setSelectedStudentId(null);
        setDetailedProfile(null);
    }, 300);
  };

  const handleProfileUpdate = (updates: Partial<StudentProfileType>) => {
      if (detailedProfile) {
          setDetailedProfile({ ...detailedProfile, ...updates });
          // Also update the list view state if needed
          const studentInList = students.find(s => s.id === detailedProfile.id);
          if (studentInList) {
              onUpdateStudent({ ...studentInList, ...updates });
          }
      }
  };

  const openAddModal = () => {
      setModalMode('add');
      setFormData({ firstName: '', lastName: '', email: '', password: '', cohortId: '' });
      setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, student: Student) => {
      e.stopPropagation(); // Prevent row click
      setModalMode('edit');
      setSelectedStudentId(student.id);

      const names = student.name.split(' ');
      setFormData({
          firstName: names[0] || '',
          lastName: names.slice(1).join(' ') || '',
          email: student.email,
          password: '', // Don't show old password
          cohortId: student.cohortId || ''
      });
      setIsModalOpen(true);
  };

  const confirmDelete = (id: string) => {
      setStudentToDelete(id);
      setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
      if (studentToDelete) {
          try {
              await fetchWithAuthDelete(`/api/admin?resource=students&id=${studentToDelete}`);
              onDeleteStudent(studentToDelete);
              setIsDeleteModalOpen(false);
              setStudentToDelete(null);
              if (viewMode === 'profile' && selectedStudentId === studentToDelete) {
                  closeProfile();
              }
          } catch (error) {
              console.error('Delete student failed:', error);
              alert('Ошибка удаления студента');
          }
      }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      if (modalMode === 'add') {
          try {
              const result = await fetchWithAuthPost<{ id: string; email: string; name: string; cohortId?: string }>('/api/admin?resource=students', {
                  email: formData.email,
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  password: formData.password,
                  cohortId: formData.cohortId || undefined,
              });
              const student: Student = {
                  id: result.id,
                  name: result.name || fullName,
                  email: result.email,
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=8b5cf6&color=fff`,
                  status: 'active',
                  progress: 0,
                  currentModule: '',
                  lastActive: 'Только что',
                  joinedDate: new Date().toISOString(),
                  projects: {},
                  cohortId: result.cohortId,
              };
              onAddStudent(student);
              alert(`Студент создан! Передайте пароль: ${formData.password}`);
          } catch (error: any) {
              alert(error.message || 'Ошибка создания студента');
              return;
          }
      } else {
          // Edit Mode
          const studentToUpdate = students.find(s => s.id === selectedStudentId);
          if (studentToUpdate) {
              const updatedStudent: Student = {
                  ...studentToUpdate,
                  name: fullName,
                  email: formData.email,
                  cohortId: formData.cohortId || undefined,
              };
              await fetchWithAuth(`/api/admin?resource=students`, {
                  method: 'PUT',
                  body: JSON.stringify({ id: selectedStudentId, cohortId: formData.cohortId || null }),
              });
              onUpdateStudent(updatedStudent);
          }
      }

      setIsModalOpen(false);
  };

  // --- Password Reset Functions ---

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const openResetPasswordModal = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setStudentToResetPassword(student);
    setNewPassword(generatePassword());
    setPasswordResetSuccess(false);
    setCopiedPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!studentToResetPassword || newPassword.length < 8) return;

    setIsResettingPassword(true);
    try {
      await fetchWithAuth('/api/admin?resource=students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: studentToResetPassword.id,
          newPassword
        })
      });
      setPasswordResetSuccess(true);
    } catch (error) {
      console.error('Password reset failed:', error);
      alert('Ошибка сброса пароля');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const copyPasswordToClipboard = async () => {
    await navigator.clipboard.writeText(newPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  // Filter & Sort Data
  const filteredStudents = useMemo(() => {
    let result = students.filter(student =>
      (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       student.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || student.status === statusFilter) &&
      (!selectedCohortId || student.cohortId === selectedCohortId)
    );

    return result.sort((a, b) => {
      const order = sortConfig.order === 'asc' ? 1 : -1;
      if (sortConfig.field === 'name') return a.name.localeCompare(b.name) * order;
      if (sortConfig.field === 'progress') return (a.progress - b.progress) * order;
      if (sortConfig.field === 'joinedDate') return (new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime()) * order;
      return 0;
    });
  }, [students, searchTerm, statusFilter, sortConfig, selectedCohortId]);

  return (
    <div className="relative max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32 min-h-screen">

      {/* --- LIST VIEW --- */}
      <motion.div
        initial={{ opacity: 1, x: 0 }}
        animate={{
            opacity: viewMode === 'list' ? 1 : 0,
            x: viewMode === 'list' ? 0 : -20,
            pointerEvents: viewMode === 'list' ? 'auto' : 'none'
        }}
        transition={{ duration: 0.3 }}
        className={viewMode === 'list' ? 'block' : 'hidden'}
      >
        {/* Scope Banner */}
        <ScopeBanner type="filtered" cohortName={selectedCohortName} label={selectedCohortName ? `Студенты потока: ${selectedCohortName}` : undefined} />

        {/* Stats Cards */}
        {statsCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {statsCards.map((stat, i) => {
              const Icon = statsIcons[i] || Users;
              const colorClass = statsColors[i] || statsColors[0];
              return (
                <div key={stat.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/5 p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">{stat.value}</div>
                    <div className="text-xs text-zinc-500 truncate">{stat.label}</div>
                    {stat.change && (
                      <div className={`text-[10px] font-bold ${stat.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {stat.change}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="font-display text-3xl font-bold text-zinc-900 dark:text-white mb-2">Студенты</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Управление пользователями и доступами.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             {/* Search */}
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                   type="text"
                   placeholder="Поиск..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 shadow-sm transition-colors"
                />
             </div>

             {/* Add Button */}
             <Button onClick={openAddModal}>
                 <Plus size={18} />
                 <span>Добавить</span>
             </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-white/5 text-xs uppercase tracking-wider">
                <TableHead className="px-6 py-4 w-12">
                  <Checkbox
                    checked={selectedRowIds.size === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead className="px-6 py-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Имя <ArrowUpDown size={12} /></div>
                </TableHead>
                <TableHead className="px-6 py-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => handleSort('progress')}>
                  <div className="flex items-center gap-1">Прогресс <ArrowUpDown size={12} /></div>
                </TableHead>
                <TableHead className="px-6 py-4">Активность</TableHead>
                <TableHead className="px-6 py-4">Проекты</TableHead>
                <TableHead className="px-6 py-4 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow
                  key={student.id}
                  className={`group transition-colors ${selectedRowIds.has(student.id) ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}
                >
                  <TableCell className="px-6 py-4">
                    <Checkbox
                      checked={selectedRowIds.has(student.id)}
                      onCheckedChange={() => handleRowSelect(student.id)}
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <button onClick={() => openProfile(student)} className="flex items-center gap-3 text-left group-hover:translate-x-1 transition-transform">
                      <img
                        src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=8b5cf6&color=fff`}
                        alt=""
                        className="w-10 h-10 rounded-full bg-zinc-200 object-cover"
                      />
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm group-hover:text-purple-600 transition-colors flex items-center gap-2">
                          {student.name}
                          {student.cohortName && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">{student.cohortName}</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">{student.email}</div>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{student.progress}%</span>
                        <span className="text-zinc-400">{student.currentModule.split(':')[0]}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          student.status === 'completed' ? 'bg-emerald-500' :
                          student.status === 'stalled' ? 'bg-amber-500' : 'bg-purple-600'
                        }`} style={{ width: `${student.progress}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="text-sm text-zinc-500">
                      {student.lastActive.includes('дней') ? <span className="text-red-400 font-medium">{student.lastActive}</span> : student.lastActive}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex gap-2">
                      <ProjectIcon type="landing" url={student.projects.landing} />
                      <ProjectIcon type="service" url={student.projects.service} />
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => openEditModal(e, student)}
                        title="Редактировать"
                        className="text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => openResetPasswordModal(e, student)}
                        title="Сбросить пароль"
                        className="text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                      >
                        <Key size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(student.id);
                        }}
                        title="Удалить"
                        className="text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openProfile(student)}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] flex justify-center text-xs text-zinc-400">
             Показано {filteredStudents.length} из {students.length}
          </div>
        </div>
      </motion.div>

      {/* --- BULK ACTION TOOLBAR --- */}
      <AnimatePresence>
        {selectedRowIds.size > 0 && viewMode === 'list' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl shadow-2xl shadow-black/20 px-5 py-3 flex items-center gap-3 flex-wrap max-w-[90vw]"
          >
            <span className="text-sm font-bold whitespace-nowrap">{selectedRowIds.size} выбрано</span>
            <button onClick={() => setSelectedRowIds(new Set())} className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-white dark:hover:text-zinc-900 transition-colors">Снять</button>
            <div className="w-px h-6 bg-zinc-700 dark:bg-zinc-300" />

            {/* Change Cohort */}
            {cohorts && cohorts.length > 0 && (
              <select
                onChange={(e) => { if (e.target.value) bulkAction('changeCohort', e.target.value); e.target.value = ''; }}
                className="bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg px-2 py-1.5 border border-zinc-700 dark:border-zinc-300"
                defaultValue=""
                disabled={isBulkLoading}
              >
                <option value="" disabled>Сменить поток</option>
                {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {/* Change Status */}
            <select
              onChange={(e) => { if (e.target.value) bulkAction('changeStatus', e.target.value); e.target.value = ''; }}
              className="bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg px-2 py-1.5 border border-zinc-700 dark:border-zinc-300"
              defaultValue=""
              disabled={isBulkLoading}
            >
              <option value="" disabled>Статус</option>
              <option value="active">Активен</option>
              <option value="stalled">Застрял</option>
              <option value="inactive">Неактивен</option>
            </select>

            {/* Reset Passwords */}
            <button
              onClick={() => bulkAction('resetPasswords')}
              disabled={isBulkLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors disabled:opacity-50"
            >
              <Key size={12} className="inline mr-1" />Пароли
            </button>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 dark:bg-zinc-200 hover:bg-zinc-600 dark:hover:bg-zinc-300 font-bold transition-colors"
            >
              <Download size={12} className="inline mr-1" />CSV
            </button>

            {/* Bulk Delete */}
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              disabled={isBulkLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} className="inline mr-1" />Удалить
            </button>

            {isBulkLoading && (
              <div className="w-4 h-4 border-2 border-zinc-500 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={async () => {
          setIsBulkDeleteModalOpen(false);
          await bulkAction('delete');
        }}
        message={`Удалить ${selectedRowIds.size} студентов? Это действие нельзя отменить.`}
      />

      {/* --- PROFILE VIEW --- */}
      <AnimatePresence>
        {viewMode === 'profile' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 bg-slate-50 dark:bg-zinc-950 overflow-y-auto pb-32"
          >
             {isLoadingProfile || !detailedProfile ? (
                 <div className="flex items-center justify-center h-full">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                 </div>
             ) : (
                 <StudentProfile
                    student={detailedProfile}
                    onBack={closeProfile}
                    onUpdate={handleProfileUpdate}
                 />
             )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ADD / EDIT MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
                    aria-hidden="true"
                    onClick={() => setIsModalOpen(false)}
                />
                <div className="fixed inset-0 z-[101] overflow-y-auto pointer-events-none">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6 pointer-events-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-100 dark:border-white/10 text-left overflow-hidden relative"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-white/5">
                                <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
                                    {modalMode === 'add' ? 'Добавить студента' : 'Редактировать студента'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} id="student-form" className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Имя</label>
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            placeholder="Иван"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Фамилия</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Иванов"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="student@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                                {modalMode === 'edit' && cohorts && cohorts.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Поток</label>
                                        <select
                                            value={formData.cohortId}
                                            onChange={(e) => setFormData({...formData, cohortId: e.target.value})}
                                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors"
                                        >
                                            <option value="">Без потока</option>
                                            {cohorts.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {modalMode === 'add' && (
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Временный пароль</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                placeholder="vibes123"
                                                value={formData.password}
                                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                                className="w-full pl-4 pr-12 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>

                            <div className="p-6 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900 flex justify-end gap-3">
                                 <Button
                                     type="button"
                                     variant="outline"
                                     size="sm"
                                     onClick={() => setIsModalOpen(false)}
                                 >
                                     Отмена
                                 </Button>
                                 <Button
                                     type="submit"
                                     form="student-form"
                                     size="sm"
                                 >
                                     {modalMode === 'add' ? 'Создать' : 'Сохранить'}
                                 </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDelete}
        message="Вы уверены, что хотите удалить этого студента? Все данные и прогресс будут потеряны безвозвратно."
      />

      {/* Reset Password Modal */}
      <AnimatePresence>
        {isResetPasswordModalOpen && studentToResetPassword && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
              aria-hidden="true"
              onClick={() => setIsResetPasswordModalOpen(false)}
            />
            <div className="fixed inset-0 z-[101] overflow-y-auto pointer-events-none">
              <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-100 dark:border-white/10 text-left overflow-hidden relative"
                >
                  {/* Header */}
                  <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
                        Сброс пароля
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsResetPasswordModalOpen(false)}
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-5">
                    {/* Student Info */}
                    <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl">
                      <img
                        src={studentToResetPassword.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentToResetPassword.name)}&background=8b5cf6&color=fff`}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white">
                          {studentToResetPassword.name}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {studentToResetPassword.email}
                        </div>
                      </div>
                    </div>

                    {passwordResetSuccess ? (
                      /* Success State */
                      <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h4 className="font-bold text-zinc-900 dark:text-white mb-2">
                          Пароль успешно изменён
                        </h4>
                        <p className="text-sm text-zinc-500 mb-4">
                          Передайте новый пароль студенту
                        </p>

                        {/* Show password to copy */}
                        <div className="flex items-center gap-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-mono text-lg">
                          <span className="flex-1 text-zinc-900 dark:text-white select-all">
                            {newPassword}
                          </span>
                          <button
                            onClick={copyPasswordToClipboard}
                            className={`p-2 rounded-lg transition-colors ${
                              copiedPassword
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600'
                                : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500'
                            }`}
                            title="Скопировать"
                          >
                            {copiedPassword ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Edit State */
                      <>
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                            Новый пароль
                          </label>
                          <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors font-mono text-lg mb-3"
                            placeholder="Минимум 8 символов"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setNewPassword(generatePassword())}
                              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                              <RefreshCw size={18} />
                              Сгенерировать
                            </button>
                            <button
                              onClick={copyPasswordToClipboard}
                              className={`flex-1 px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium ${
                                copiedPassword
                                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600'
                                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {copiedPassword ? <Check size={18} /> : <Copy size={18} />}
                              {copiedPassword ? 'Скопировано' : 'Скопировать'}
                            </button>
                          </div>
                          {newPassword.length > 0 && newPassword.length < 8 && (
                            <p className="text-sm text-red-500 mt-2">
                              Пароль должен быть минимум 8 символов
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsResetPasswordModalOpen(false)}
                    >
                      {passwordResetSuccess ? 'Закрыть' : 'Отмена'}
                    </Button>
                    {!passwordResetSuccess && (
                      <Button
                        onClick={handleResetPassword}
                        disabled={isResettingPassword || newPassword.length < 8}
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white"
                      >
                        {isResettingPassword ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <Key size={18} />
                            Сбросить пароль
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminStudents;
