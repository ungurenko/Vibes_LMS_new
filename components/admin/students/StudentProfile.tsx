import React, { useState, useOptimistic, useTransition } from 'react';
import { 
  StudentProfile as StudentProfileType, 
  ActivityLogEntry 
} from '@/types';
import {
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  MessageSquare,
  Layout,
  Github,
  Globe,
  MoreHorizontal,
  ArrowLeft,
  Lock,
  PlayCircle,
  FileText,
  Bell,
  Send,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithAuth, fetchWithAuthGet, fetchWithAuthPost } from '@/lib/fetchWithAuth';

interface StudentProfileProps {
  student: StudentProfileType;
  onBack: () => void;
  onUpdate: (updatedData: Partial<StudentProfileType>) => void;
}

type Tab = 'overview' | 'curriculum' | 'activity' | 'projects';

const Badge: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${color}`}>
    {children}
  </span>
);

export const StudentProfile: React.FC<StudentProfileProps> = ({ student, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isPending, startTransition] = useTransition();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [isSendingNotify, setIsSendingNotify] = useState(false);

  // Optimistic Notes
  const [optimisticNotes, setOptimisticNotes] = useOptimistic(
    student.notes || '',
    (state, newNotes: string) => newNotes
  );
  
  // Local state for the textarea to drive the optimistic update
  const [noteInput, setNoteInput] = useState(student.notes || '');

  const handleSaveNotes = async () => {
    startTransition(async () => {
      setOptimisticNotes(noteInput);
      try {
        await fetchWithAuth('/api/admin?resource=students', {
            method: 'PUT',
            body: JSON.stringify({ id: student.id, notes: noteInput })
        });
        onUpdate({ notes: noteInput });
      } catch (error) {
        console.error('Failed to save notes:', error);
        // Revert is automatic if we trigger a re-render with old prop, 
        // but here we might want to show an error toast.
      }
    });
  };

  const handleStatusToggle = async () => {
      const newStatus = student.status === 'active' ? 'stalled' : 'active';
      // We could add optimistic UI here too, but let's stick to notes for now as the main example
      try {
          await fetchWithAuth('/api/admin?resource=students', {
              method: 'PUT',
              body: JSON.stringify({ id: student.id, status: newStatus })
          });
          onUpdate({ status: newStatus });
      } catch (error) {
          console.error('Failed to update status', error);
      }
  };

  const handleSendNotification = async () => {
    if (!notifyTitle.trim()) return;
    setIsSendingNotify(true);
    try {
      await fetchWithAuthPost('/api/admin?resource=notifications', {
        userIds: [student.id],
        title: notifyTitle,
        message: notifyMessage || undefined,
        type: 'info',
      });
      setShowNotifyModal(false);
      setNotifyTitle('');
      setNotifyMessage('');
      alert('Уведомление отправлено');
    } catch (err) {
      alert('Ошибка отправки уведомления');
    } finally {
      setIsSendingNotify(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-zinc-950 min-h-screen pb-20">
      {/* Header / Nav */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-white/5 px-6 py-4 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <button 
                onClick={onBack}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
                 <img 
                    src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=8b5cf6&color=fff`} 
                    alt={student.name}
                    className="w-10 h-10 rounded-full bg-zinc-200 object-cover"
                 />
                 <div>
                     <h2 className="font-bold text-zinc-900 dark:text-white leading-tight">{student.name}</h2>
                     <div className="flex items-center gap-2 text-xs text-zinc-500">
                         <span>{student.email}</span>
                         <span className="w-1 h-1 rounded-full bg-zinc-300" />
                         <span className={student.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}>
                             {student.status === 'active' ? 'Активен' : 'Приостановлен'}
                         </span>
                     </div>
                 </div>
            </div>
         </div>
         
         <div className="flex gap-2">
             <button 
                onClick={handleStatusToggle}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 transition-colors"
             >
                 {student.status === 'active' ? 'Приостановить' : 'Активировать'}
             </button>
             <div className="relative">
               <button
                 onClick={() => setShowMoreMenu(!showMoreMenu)}
                 className="p-2 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
               >
                 <MoreHorizontal size={18} />
               </button>
               {showMoreMenu && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                   <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/10 shadow-xl py-1">
                     <button
                       onClick={() => { setShowMoreMenu(false); setShowNotifyModal(true); }}
                       className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
                     >
                       <Bell size={15} /> Отправить уведомление
                     </button>
                     <button
                       onClick={() => { setShowMoreMenu(false); window.open(`mailto:${student.email}`); }}
                       className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
                     >
                       <Mail size={15} /> Написать email
                     </button>
                   </div>
                 </>
               )}
             </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-white/5 w-fit">
              {(['overview', 'curriculum', 'activity', 'projects'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === tab 
                        ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                      {tab === 'overview' && 'Обзор'}
                      {tab === 'curriculum' && 'Программа'}
                      {tab === 'activity' && 'Активность'}
                      {tab === 'projects' && 'Проекты'}
                  </button>
              ))}
          </div>

          {/* Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
              {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Stats Column */}
                      <div className="space-y-6">
                          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-white/5">
                              <h3 className="font-bold text-zinc-900 dark:text-white mb-6">Статистика</h3>
                              <div className="space-y-4">
                                  <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-50 dark:bg-purple-500/10">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-white dark:bg-white/10 rounded-lg text-purple-600">
                                              <CheckCircle size={20} />
                                          </div>
                                          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Уроков пройдено</span>
                                      </div>
                                      <span className="text-xl font-bold text-zinc-900 dark:text-white">{student.stats.lessonsCompleted}</span>
                                  </div>
                                  <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-white dark:bg-white/10 rounded-lg text-emerald-600">
                                              <Layout size={20} />
                                          </div>
                                          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Проектов сдано</span>
                                      </div>
                                      <span className="text-xl font-bold text-zinc-900 dark:text-white">{student.stats.projectsSubmitted}</span>
                                  </div>
                                  <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-white dark:bg-white/10 rounded-lg text-amber-600">
                                              <MessageSquare size={20} />
                                          </div>
                                          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Сообщений AI</span>
                                      </div>
                                      <span className="text-xl font-bold text-zinc-900 dark:text-white">{student.stats.messagesSent}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-white/5">
                              <div className="flex items-center justify-between mb-4">
                                  <h3 className="font-bold text-zinc-900 dark:text-white">Заметки</h3>
                                  <button 
                                    onClick={handleSaveNotes}
                                    disabled={isPending}
                                    className={`p-2 rounded-lg transition-colors ${
                                        optimisticNotes !== noteInput 
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                                        : 'text-zinc-400 hover:text-purple-600 hover:bg-purple-50'
                                    }`}
                                  >
                                      <Save size={18} />
                                  </button>
                              </div>
                              <textarea 
                                  value={noteInput}
                                  onChange={(e) => setNoteInput(e.target.value)}
                                  placeholder="Заметки о студенте (цели, проблемы, особенности)..."
                                  className="w-full h-48 p-4 rounded-xl bg-yellow-50/50 dark:bg-yellow-900/5 border border-yellow-100 dark:border-yellow-900/20 resize-none focus:outline-none focus:border-yellow-300 dark:focus:border-yellow-700 transition-colors text-sm text-zinc-700 dark:text-zinc-300"
                              />
                              <div className="mt-2 text-xs text-zinc-400 flex justify-end">
                                  {optimisticNotes !== student.notes ? 'Сохранение...' : 'Сохранено'}
                              </div>
                          </div>
                      </div>

                      {/* Main Info */}
                      <div className="lg:col-span-2 space-y-6">
                           <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5">
                               <h3 className="font-bold text-zinc-900 dark:text-white mb-6">Детали профиля</h3>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                   <div>
                                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Дата регистрации</label>
                                       <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-medium">
                                           <Calendar size={16} className="text-zinc-400" />
                                           {new Date(student.joinedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                       </div>
                                   </div>
                                   <div>
                                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Последняя активность</label>
                                       <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-medium">
                                           <Clock size={16} className="text-zinc-400" />
                                           {student.lastActive}
                                       </div>
                                   </div>
                                   <div>
                                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Текущий модуль</label>
                                       <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-medium">
                                           <PlayCircle size={16} className="text-purple-500" />
                                           {student.currentModule}
                                       </div>
                                   </div>
                                   <div>
                                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">GitHub</label>
                                       {student.projects.github ? (
                                           <a href={student.projects.github} target="_blank" rel="noopener" className="flex items-center gap-2 text-purple-600 hover:underline font-medium">
                                               <Github size={16} />
                                               {student.projects.github.replace('https://github.com/', '')}
                                           </a>
                                       ) : (
                                           <span className="text-zinc-400 text-sm">Не указан</span>
                                       )}
                                   </div>
                               </div>
                           </div>

                           {/* Weekly Progress Chart */}
                           {student.weeklyProgress && student.weeklyProgress.length > 0 && (
                             <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5">
                               <h3 className="font-bold text-zinc-900 dark:text-white mb-6">Прогресс по неделям</h3>
                               <WeeklyProgressChart data={student.weeklyProgress} />
                             </div>
                           )}

                           {/* Daily Activity Heatmap */}
                           {student.dailyActivity && student.dailyActivity.length > 0 && (
                             <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5">
                               <h3 className="font-bold text-zinc-900 dark:text-white mb-6">Активность за 30 дней</h3>
                               <DailyActivityChart data={student.dailyActivity} />
                             </div>
                           )}

                           {/* Recent Activity Short List */}
                           <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5">
                               <div className="flex items-center justify-between mb-6">
                                   <h3 className="font-bold text-zinc-900 dark:text-white">Последняя активность</h3>
                                   <button onClick={() => setActiveTab('activity')} className="text-sm text-purple-600 font-bold hover:underline">Смотреть все</button>
                               </div>
                               <div className="text-zinc-500 text-sm">Перейдите на вкладку "Активность" для полной истории.</div>
                           </div>
                      </div>
                  </div>
              )}

              {activeTab === 'curriculum' && (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5">
                      <h3 className="font-bold text-2xl text-zinc-900 dark:text-white mb-8">Учебная программа</h3>
                      <div className="space-y-12">
                          {student.curriculum.map((module, mIndex) => (
                              <div key={module.id} className="relative">
                                  {mIndex !== student.curriculum.length - 1 && (
                                      <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-zinc-100 dark:bg-zinc-800 -z-10" />
                                  )}
                                  <div className="flex items-start gap-4 mb-6">
                                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-lg shadow-lg shadow-zinc-200 dark:shadow-none z-10">
                                          {mIndex + 1}
                                      </div>
                                      <div className="pt-2">
                                          <h4 className="font-bold text-lg text-zinc-900 dark:text-white">{module.title}</h4>
                                          <p className="text-zinc-500 text-sm">{module.lessons.length} уроков</p>
                                      </div>
                                  </div>
                                  
                                  <div className="ml-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {module.lessons.map((lesson, lIndex) => (
                                          <div 
                                            key={lesson.id} 
                                            className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                                                lesson.status === 'completed' 
                                                ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10' 
                                                : lesson.status === 'available' || lesson.status === 'current'
                                                ? 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-white/5'
                                                : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-white/5 opacity-60'
                                            }`}
                                          >
                                              <div className={`mt-0.5 ${
                                                  lesson.status === 'completed' ? 'text-emerald-500' : 
                                                  lesson.status === 'locked' ? 'text-zinc-300' : 'text-purple-500'
                                              }`}>
                                                  {lesson.status === 'completed' ? <CheckCircle size={18} /> : 
                                                   lesson.status === 'locked' ? <Lock size={18} /> : <PlayCircle size={18} />}
                                              </div>
                                              <div>
                                                  <div className="text-sm font-bold text-zinc-900 dark:text-white mb-1 line-clamp-1">{lesson.title}</div>
                                                  <div className="text-xs text-zinc-500 capitalize">{lesson.status === 'available' ? 'Доступен' : lesson.status === 'completed' ? 'Пройден' : lesson.status === 'current' ? 'Текущий' : 'Закрыт'}</div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              
              {activeTab === 'activity' && (
                  <ActivityFeed userId={student.id} />
              )}

              {activeTab === 'projects' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {([
                        { key: 'landing' as const, label: 'Лендинг', icon: Layout, color: 'purple' },
                        { key: 'service' as const, label: 'Веб-сервис', icon: Globe, color: 'blue' },
                        { key: 'github' as const, label: 'GitHub', icon: Github, color: 'zinc' },
                      ]).map(({ key, label, icon: Icon, color }) => {
                        const url = student.projects[key];
                        return (
                          <div key={key} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden">
                            {url ? (
                              <>
                                <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                                  {key !== 'github' ? (
                                    <img
                                      src={`https://image.thum.io/get/width/600/${url}`}
                                      alt={label}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Github size={48} className="text-zinc-300 dark:text-zinc-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="p-5">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Icon size={16} className={`text-${color}-500`} />
                                    <h4 className="font-bold text-zinc-900 dark:text-white">{label}</h4>
                                  </div>
                                  <p className="text-xs text-zinc-500 truncate mb-4">{url}</p>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-${color}-50 dark:bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 text-sm font-bold hover:bg-${color}-100 dark:hover:bg-${color}-500/20 transition-colors`}
                                  >
                                    Открыть
                                  </a>
                                </div>
                              </>
                            ) : (
                              <div className="p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                  <Icon size={28} className="text-zinc-300 dark:text-zinc-600" />
                                </div>
                                <h4 className="font-bold text-zinc-900 dark:text-white mb-1">{label}</h4>
                                <p className="text-sm text-zinc-400">Проект не добавлен</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
              )}
          </motion.div>
      </div>

      {/* Send Notification Modal */}
      <AnimatePresence>
        {showNotifyModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
              onClick={() => setShowNotifyModal(false)}
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-100 dark:border-white/10 overflow-hidden"
              >
                <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                      Уведомление для {student.name}
                    </h3>
                  </div>
                  <button onClick={() => setShowNotifyModal(false)} className="p-2 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Заголовок</label>
                    <input
                      type="text"
                      value={notifyTitle}
                      onChange={(e) => setNotifyTitle(e.target.value)}
                      placeholder="Тема уведомления"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Сообщение (необязательно)</label>
                    <textarea
                      value={notifyMessage}
                      onChange={(e) => setNotifyMessage(e.target.value)}
                      placeholder="Текст уведомления..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900 flex justify-end gap-3">
                  <button onClick={() => setShowNotifyModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    Отмена
                  </button>
                  <button
                    onClick={handleSendNotification}
                    disabled={!notifyTitle.trim() || isSendingNotify}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSendingNotify ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                    Отправить
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// SVG Chart: Weekly Progress (bar chart)
const WeeklyProgressChart: React.FC<{ data: { week: string; count: number }[] }> = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barWidth = Math.min(40, Math.floor(500 / data.length) - 8);
  const chartHeight = 120;
  const chartWidth = data.length * (barWidth + 8);

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(chartWidth, 200)} height={chartHeight + 30} className="w-full" viewBox={`0 0 ${Math.max(chartWidth, 200)} ${chartHeight + 30}`} preserveAspectRatio="xMinYMid meet">
        {data.map((item, i) => {
          const barHeight = (item.count / maxCount) * chartHeight;
          const x = i * (barWidth + 8) + 4;
          const y = chartHeight - barHeight;
          const weekDate = new Date(item.week);
          const label = `${weekDate.getDate()}.${weekDate.getMonth() + 1}`;
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barWidth} height={barHeight}
                rx={4} className="fill-purple-500/80"
              />
              <text
                x={x + barWidth / 2} y={chartHeight + 16}
                textAnchor="middle" className="fill-zinc-400 text-[9px]"
              >{label}</text>
              <text
                x={x + barWidth / 2} y={y - 4}
                textAnchor="middle" className="fill-zinc-500 text-[10px] font-bold"
              >{item.count}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// SVG Chart: Daily Activity (bar chart, 30 days)
const DailyActivityChart: React.FC<{ data: { day: string; count: number }[] }> = ({ data }) => {
  // Build full 30-day range
  const days: { day: string; count: number }[] = [];
  const dataMap = new Map(data.map(d => [d.day.split('T')[0], d.count]));
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    days.push({ day: key, count: dataMap.get(key) || 0 });
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);
  const barW = 12;
  const gap = 3;
  const chartHeight = 80;
  const chartWidth = days.length * (barW + gap);

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth} height={chartHeight + 20} className="w-full" viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} preserveAspectRatio="xMinYMid meet">
        {days.map((item, i) => {
          const barHeight = Math.max((item.count / maxCount) * chartHeight, item.count > 0 ? 4 : 1);
          const x = i * (barW + gap);
          const y = chartHeight - barHeight;
          const date = new Date(item.day);
          const showLabel = date.getDate() === 1 || i === 0 || i === days.length - 1;
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barW} height={barHeight}
                rx={2}
                className={item.count > 0 ? 'fill-blue-500/70' : 'fill-zinc-200 dark:fill-zinc-700'}
              />
              {showLabel && (
                <text
                  x={x + barW / 2} y={chartHeight + 14}
                  textAnchor="middle" className="fill-zinc-400 text-[8px]"
                >{date.getDate()}.{date.getMonth() + 1}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Sub-component for Activity Feed (Fetches its own data)
const ActivityFeed: React.FC<{ userId: string }> = ({ userId }) => {
    const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchActivity = async () => {
            try {
                const data = await fetchWithAuthGet<ActivityLogEntry[]>(`/api/admin?resource=student-activity&userId=${userId}`);
                setActivity(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [userId]);

    if (loading) return <div className="text-center py-12 text-zinc-400">Загрузка активности...</div>;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-white/5">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-8">История действий</h3>
            <div className="space-y-8 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-zinc-100 dark:before:bg-zinc-800">
                {activity.map((item) => (
                    <div key={item.id} className="relative flex gap-6">
                        <div className={`relative z-10 w-10 h-10 rounded-full border-4 border-white dark:border-zinc-900 flex items-center justify-center shrink-0 ${
                           item.iconType === 'lesson' ? 'bg-emerald-100 text-emerald-600' : 
                           item.iconType === 'chat' ? 'bg-purple-100 text-purple-600' : 
                           item.iconType === 'project' ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                           {item.iconType === 'lesson' && <CheckCircle size={16} />}
                           {item.iconType === 'chat' && <MessageSquare size={16} />}
                           {item.iconType === 'project' && <Layout size={16} />}
                           {item.iconType === 'login' && <Clock size={16} />}
                        </div>
                        <div className="pt-2">
                             <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                                 <span className="font-medium text-zinc-900 dark:text-white">{item.action}</span>
                                 <span className="text-xs text-zinc-400">{item.date}</span>
                             </div>
                             {item.target && (
                                 <div className="text-sm text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-lg w-fit">
                                     {item.target}
                                 </div>
                             )}
                        </div>
                    </div>
                ))}
            </div>
            {activity.length === 0 && (
                <div className="text-center py-8 text-zinc-500">Активности пока нет</div>
            )}
        </div>
    );
};