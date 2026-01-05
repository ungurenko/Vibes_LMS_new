
import React, { useState, useMemo } from 'react';
import { STUDENT_ACTIVITY_LOG, STUDENT_CHAT_HISTORY } from '../data';
import { Student } from '../types';
import { 
  Search, 
  MoreHorizontal, 
  Mail, 
  ArrowUpDown, 
  Download, 
  Trash2, 
  ChevronRight,
  Github,
  Globe,
  Layout,
  MessageSquare,
  Clock,
  X,
  Save,
  User,
  Plus,
  Eye,
  EyeOff,
  Edit,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '../components/Shared';

// --- Types ---
type ViewMode = 'list' | 'profile';
type SortField = 'name' | 'progress' | 'joinedDate';
type SortOrder = 'asc' | 'desc';

interface AdminStudentsProps {
    students: Student[];
    onUpdateStudent: (student: Student) => void;
    onAddStudent: (student: Student) => void;
    onDeleteStudent: (id: string) => void;
}

// --- Sub-components ---

const Badge: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${color}`}>
    {children}
  </span>
);

const ProjectIcon: React.FC<{ url?: string; type: 'landing' | 'service' | 'github' }> = ({ url, type }) => {
  if (!url) return (
    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-600 cursor-not-allowed">
      {type === 'landing' && <Layout size={14} />}
      {type === 'service' && <Globe size={14} />}
      {type === 'github' && <Github size={14} />}
    </div>
  );

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 transition-colors shadow-sm" title={type}>
       {type === 'landing' && <Layout size={14} />}
       {type === 'service' && <Globe size={14} />}
       {type === 'github' && <Github size={14} />}
    </a>
  );
};

const AdminStudents: React.FC<AdminStudentsProps> = ({ students, onUpdateStudent, onAddStudent, onDeleteStudent }) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  
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

  // Form State (Separated First/Last for Admin)
  const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);

  // Note State (for profile)
  const [adminNote, setAdminNote] = useState('');

  // --- Logic ---

  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRowIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRowIds(newSelected);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
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

  const openProfile = (student: Student) => {
    setSelectedStudentId(student.id);
    setAdminNote(student.notes || '');
    setViewMode('profile');
  };

  const closeProfile = () => {
    setViewMode('list');
    setTimeout(() => setSelectedStudentId(null), 300);
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

  // Filter & Sort Data
  const filteredStudents = useMemo(() => {
    let result = students.filter(student => 
      (student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       student.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || student.status === statusFilter)
    );

    return result.sort((a, b) => {
      const order = sortConfig.order === 'asc' ? 1 : -1;
      if (sortConfig.field === 'name') return a.name.localeCompare(b.name) * order;
      if (sortConfig.field === 'progress') return (a.progress - b.progress) * order;
      if (sortConfig.field === 'joinedDate') return (new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime()) * order;
      return 0;
    });
  }, [students, searchTerm, statusFilter, sortConfig]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

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
                   className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 shadow-sm transition-colors"
                />
             </div>
             
             {/* Add Button */}
             <button 
                onClick={openAddModal}
                className="px-4 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
             >
                 <Plus size={18} />
                 <span>Добавить</span>
             </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-zinc-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                      <th className="px-6 py-4 w-12">
                         <input 
                            type="checkbox" 
                            className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                            checked={selectedRowIds.size === filteredStudents.length && filteredStudents.length > 0}
                            onChange={handleSelectAll}
                         />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => handleSort('name')}>
                         <div className="flex items-center gap-1">Имя <ArrowUpDown size={12} /></div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => handleSort('progress')}>
                         <div className="flex items-center gap-1">Прогресс <ArrowUpDown size={12} /></div>
                      </th>
                      <th className="px-6 py-4">Активность</th>
                      <th className="px-6 py-4">Проекты</th>
                      <th className="px-6 py-4 text-right">Действия</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                   {filteredStudents.map((student) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={student.id} 
                        className={`group transition-colors ${selectedRowIds.has(student.id) ? 'bg-violet-50/50 dark:bg-violet-900/10' : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'}`}
                      >
                         <td className="px-6 py-4">
                             <input 
                                type="checkbox" 
                                className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                                checked={selectedRowIds.has(student.id)}
                                onChange={() => handleRowSelect(student.id)}
                             />
                         </td>
                         <td className="px-6 py-4">
                            <button onClick={() => openProfile(student)} className="flex items-center gap-3 text-left group-hover:translate-x-1 transition-transform">
                               <img src={student.avatar} alt="" className="w-10 h-10 rounded-full bg-zinc-200 object-cover" />
                               <div>
                                  <div className="font-bold text-zinc-900 dark:text-white text-sm group-hover:text-violet-600 transition-colors">{student.name}</div>
                                  <div className="text-xs text-zinc-500">{student.email}</div>
                               </div>
                            </button>
                         </td>
                         <td className="px-6 py-4">
                            <div className="w-32">
                               <div className="flex justify-between text-xs mb-1">
                                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{student.progress}%</span>
                                  <span className="text-zinc-400">{student.currentModule.split(':')[0]}</span>
                               </div>
                               <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${
                                     student.status === 'completed' ? 'bg-emerald-500' : 
                                     student.status === 'stalled' ? 'bg-amber-500' : 'bg-violet-600'
                                  }`} style={{ width: `${student.progress}%` }} />
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            <div className="text-sm text-zinc-500">
                               {student.lastActive.includes('дней') ? <span className="text-red-400 font-medium">{student.lastActive}</span> : student.lastActive}
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex gap-2">
                               <ProjectIcon type="landing" url={student.projects.landing} />
                               <ProjectIcon type="service" url={student.projects.service} />
                            </div>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                  onClick={(e) => openEditModal(e, student)}
                                  className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                  title="Редактировать"
                               >
                                  <Edit size={16} />
                               </button>
                               <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      confirmDelete(student.id);
                                  }}
                                  className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                  title="Удалить"
                               >
                                  <Trash2 size={16} />
                               </button>
                               <button 
                                  onClick={() => openProfile(student)}
                                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                               >
                                  <ChevronRight size={16} />
                               </button>
                            </div>
                         </td>
                      </motion.tr>
                   ))}
                </tbody>
             </table>
          </div>
          <div className="p-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] flex justify-center text-xs text-zinc-400">
             Показано {filteredStudents.length} из {students.length}
          </div>
        </div>
      </motion.div>

      {/* --- PROFILE VIEW --- */}
      <AnimatePresence>
        {viewMode === 'profile' && selectedStudent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 bg-slate-50 dark:bg-zinc-950 overflow-y-auto pb-32"
          >
            {/* Nav Back */}
            <div className="mb-6">
               <button 
                  onClick={closeProfile}
                  className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
               >
                  <ChevronRight size={16} className="rotate-180" />
                  Назад к списку
               </button>
            </div>

            {/* Profile Header */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-white/5 mb-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                   <div className="flex items-center gap-6">
                      <div className="relative">
                         <img src={selectedStudent.avatar} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-zinc-50 dark:border-zinc-800" />
                         <span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 ${
                            selectedStudent.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                         }`}></span>
                      </div>
                      <div>
                         <h1 className="text-3xl font-display font-bold text-zinc-900 dark:text-white mb-1">{selectedStudent.name}</h1>
                         <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 text-sm mb-3">
                            <span className="flex items-center gap-1"><Mail size={14} /> {selectedStudent.email}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                            <span>В клубе с {new Date(selectedStudent.joinedDate).toLocaleDateString()}</span>
                         </div>
                         <div className="flex gap-2">
                             <Badge color={
                                selectedStudent.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                selectedStudent.status === 'stalled' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
                             }>
                                {selectedStudent.status === 'stalled' ? 'Застрял' : selectedStudent.status === 'active' ? 'Активен' : 'Завершил'}
                             </Badge>
                             <Badge color="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                {selectedStudent.currentModule}
                             </Badge>
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex gap-3">
                      <button 
                        onClick={(e) => openEditModal(e, selectedStudent)}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                      >
                         <Edit size={14} />
                         Редактировать
                      </button>
                      <button 
                        onClick={() => confirmDelete(selectedStudent.id)}
                        className="p-2 border border-zinc-200 dark:border-white/10 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors"
                      >
                         <Trash2 size={20} />
                      </button>
                   </div>
                </div>
            </div>

            {/* Content Grid (Same as before) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-white/5">
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Прогресс</h3>
                        <div className="relative w-32 h-32 mx-auto mb-4">
                           <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="2" className="dark:stroke-zinc-800"/>
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray={`${selectedStudent.progress}, 100`} />
                           </svg>
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedStudent.progress}%</span>
                           </div>
                        </div>
                        <p className="text-center text-sm text-zinc-500 mb-6">Текущий: {selectedStudent.currentModule}</p>
                    </div>
                    {/* Notes */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-white/5">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="font-bold text-zinc-900 dark:text-white">Заметки ментора</h3>
                           <Save size={16} className="text-zinc-400 hover:text-violet-600 cursor-pointer" />
                        </div>
                        <textarea 
                           className="w-full h-32 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-xl p-3 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-amber-300 resize-none"
                           placeholder="Напишите заметку о студенте..."
                           value={adminNote}
                           onChange={(e) => setAdminNote(e.target.value)}
                        />
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                           <Clock size={20} className="text-zinc-400" />
                           <h3 className="font-bold text-zinc-900 dark:text-white">История активности</h3>
                        </div>
                        <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-100 dark:before:bg-zinc-800">
                           {STUDENT_ACTIVITY_LOG.map((log) => (
                              <div key={log.id} className="relative flex items-start gap-4">
                                 <div className={`relative z-10 w-8 h-8 rounded-full border-4 border-white dark:border-zinc-900 flex items-center justify-center shrink-0 ${
                                    log.iconType === 'lesson' ? 'bg-emerald-100 text-emerald-600' : 
                                    log.iconType === 'chat' ? 'bg-violet-100 text-violet-600' : 'bg-zinc-100 text-zinc-500'
                                 }`}>
                                    {log.iconType === 'lesson' && <CheckCircle size={14} />}
                                    {log.iconType === 'chat' && <MessageSquare size={14} />}
                                    {log.iconType === 'login' && <User size={14} />}
                                    {log.iconType === 'project' && <Layout size={14} />}
                                 </div>
                                 <div className="pt-1">
                                    <p className="text-sm text-zinc-900 dark:text-white">
                                       <span className="font-bold">Студент</span> {log.action} <span className="font-medium text-violet-600 dark:text-violet-400">«{log.target}»</span>
                                    </p>
                                    <span className="text-xs text-zinc-400">{log.date}</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                    </div>
                </div>
            </div>
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
                                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 p-2 rounded-full transition-colors">
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
                                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors"
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
                                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors"
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
                                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors"
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
                                                className="w-full pl-4 pr-12 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>

                            <div className="p-6 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900 flex justify-end gap-3">
                                 <button 
                                     type="button"
                                     onClick={() => setIsModalOpen(false)}
                                     className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                                 >
                                     Отмена
                                 </button>
                                 <button 
                                     type="submit"
                                     form="student-form"
                                     className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
                                 >
                                     {modalMode === 'add' ? 'Создать' : 'Сохранить'}
                                 </button>
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
    </div>
  );
};

export default AdminStudents;
