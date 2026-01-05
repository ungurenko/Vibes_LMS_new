
import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Camera, 
  Edit2, 
  Save, 
  Upload,
  Lock,
  X
} from 'lucide-react';
import { Student } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../components/Shared';

interface UserProfileProps {
  user: Student;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // State for form fields
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);
  const [firstName, setFirstName] = useState(user.name.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user.name.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(user.email); // Usually emails require confirmation to change, keeping simple for now
  
  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = () => {
      // Validation logic could go here
      if (newPassword && newPassword !== confirmPassword) {
          alert("Пароли не совпадают");
          return;
      }
      
      // In a real app, this would send a PATCH request to the API
      console.log("Saving profile:", { firstName, lastName, email, newPassword, avatarUrl });
      
      setIsEditing(false);
      setNewPassword('');
      setConfirmPassword('');
  };

  const handleCancel = () => {
      setIsEditing(false);
      // Reset fields to original
      setFirstName(user.name.split(' ')[0] || '');
      setLastName(user.name.split(' ').slice(1).join(' ') || '');
      setNewPassword('');
      setConfirmPassword('');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAvatarUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-8 py-12 pb-32">
      
      <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-display font-bold text-zinc-900 dark:text-white">Настройки профиля</h2>
          {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
              >
                <Edit2 size={16} />
                Редактировать
              </button>
          )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm">
          
          {/* Avatar Section */}
          <div className="p-8 border-b border-zinc-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-8">
              <div className="relative group shrink-0">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-100 dark:border-zinc-800 shadow-xl bg-zinc-100 dark:bg-zinc-800">
                      <img 
                          src={avatarUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover" 
                      />
                  </div>
                  
                  {/* Upload Overlay - Only visible in Edit Mode */}
                  {isEditing && (
                      <label className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                          <Camera size={24} className="mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Загрузить</span>
                          <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleAvatarUpload}
                          />
                      </label>
                  )}
              </div>

              <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
                      {firstName} {lastName}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      {email}
                  </p>
                  {isEditing && (
                      <div className="mt-4">
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold transition-colors">
                              <Upload size={14} />
                              Загрузить фото
                              <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={handleAvatarUpload}
                              />
                          </label>
                      </div>
                  )}
              </div>
          </div>

          {/* Form Section */}
          <div className="p-8 space-y-8">
              <AnimatePresence mode="wait">
                  {isEditing ? (
                      <motion.div 
                          key="edit-form"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-6"
                      >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <Input 
                                  label="Имя"
                                  value={firstName}
                                  onChange={(e) => setFirstName(e.target.value)}
                                  placeholder="Ваше имя"
                              />
                              <Input 
                                  label="Фамилия"
                                  value={lastName}
                                  onChange={(e) => setLastName(e.target.value)}
                                  placeholder="Ваша фамилия"
                              />
                          </div>

                          <Input 
                              label="Email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              icon={Mail}
                              // Assuming email change might require more logic, strictly simplistic here
                          />

                          <div className="pt-6 border-t border-zinc-100 dark:border-white/5">
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                  <Lock size={16} className="text-zinc-400" />
                                  Смена пароля
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <Input 
                                      label="Новый пароль"
                                      type="password"
                                      placeholder="••••••••"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                  />
                                  <Input 
                                      label="Подтверждение"
                                      type="password"
                                      placeholder="••••••••"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                  />
                              </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-4">
                              <button 
                                  onClick={handleCancel}
                                  className="px-6 py-3 rounded-xl border border-zinc-200 dark:border-white/10 font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                              >
                                  <X size={18} />
                                  Отмена
                              </button>
                              <button 
                                  onClick={handleSave}
                                  className="px-6 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/20 flex items-center gap-2"
                              >
                                  <Save size={18} />
                                  Сохранить
                              </button>
                          </div>
                      </motion.div>
                  ) : (
                      <motion.div 
                          key="view-mode"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12"
                      >
                          <div>
                              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Имя</label>
                              <div className="text-lg font-medium text-zinc-900 dark:text-white">{firstName}</div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Фамилия</label>
                              <div className="text-lg font-medium text-zinc-900 dark:text-white">{lastName}</div>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Email</label>
                              <div className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                                  <Mail size={16} className="text-zinc-400" />
                                  {email}
                              </div>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Пароль</label>
                              <div className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                                  <span className="text-2xl leading-none text-zinc-400">••••••••</span>
                              </div>
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
      </div>
    </div>
  );
};

export default UserProfile;
