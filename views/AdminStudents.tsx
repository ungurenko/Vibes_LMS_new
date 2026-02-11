import React, { useState, useMemo } from 'react';
import { Student, StudentProfile as StudentProfileType } from '../types';
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
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '../components/Shared';
import { StudentProfile } from '../components/admin/students/StudentProfile';
import { fetchWithAuthGet, fetchWithAuth } from '../lib/fetchWithAuth';
import ScopeBanner from '../components/admin/ScopeBanner';
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

const AdminStudents: React.FC<AdminStudentsProps> = ({ students, onUpdateStudent, onAddStudent, onDeleteStudent, selectedCohortId, selectedCohortName }) => {
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
      password: ''
  });

  const [showPassword, setShowPassword] = useState(false);

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
      setFormData({ firstName: '', lastName: '', email: '', password: '' });
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
          password: '' // Don't show old password
      });
      setIsModalOpen(true);
  };

  const confirmDelete = (id: string) => {
      setStudentToDelete(id);
      setIsDeleteModalOpen(true);
  };

  const executeDelete = () => {
      if (studentToDelete) {
          onDeleteStudent(studentToDelete);
          setIsDeleteModalOpen(false);
          setStudentToDelete(null);
          // If viewing profile of deleted student, go back
          if (viewMode === 'profile' && selectedStudentId === studentToDelete) {
              closeProfile();
          }
      }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      if (modalMode === 'add') {
          const student: Student = {
              id: Date.now().toString(),
              name: fullName,
              email: formData.email,
              avatar: `https://ui-avatars.com/api/?name=${fullName}&background=8b5cf6&color=fff`,
              status: 'active',
              progress: 0,
              currentModule: 'Модуль 1',
              lastActive: 'Только что',
              joinedDate: new Date().toISOString(),
              projects: {},
              notes: `Аккаунт создан вручную. Пароль: ${formData.password}`
          };
          onAddStudent(student);
          alert(`Студент добавлен! Передайте ему пароль: ${formData.password}`);
      } else {
          // Edit Mode
          const studentToUpdate = students.find(s => s.id === selectedStudentId);
          if (studentToUpdate) {
              const updatedStudent = {
                  ...studentToUpdate,
                  name: fullName,
                  email: formData.email,
                  // If password logic existed in real backend, we'd handle it here
              };
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
