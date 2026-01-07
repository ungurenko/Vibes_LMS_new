
import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Save, 
  Edit2,
  X,
  Check,
  MessageSquare,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, ConfirmModal } from '../components/Shared';
import { DEFAULT_AI_SYSTEM_INSTRUCTION } from '../data';

const INITIAL_QUESTIONS = [
  "Как задеплоить на Vercel?",
  "Что такое API простыми словами?",
  "Как исправить ошибку 404?",
  "Напиши промпт для кнопки"
];

const AdminAssistant: React.FC = () => {
  const [questions, setQuestions] = useState<string[]>(INITIAL_QUESTIONS);
  const [newQuestion, setNewQuestion] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // System Prompt State
  const [systemPrompt, setSystemPrompt] = useState('');
  
  // Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<number | null>(null);

  useEffect(() => {
      const saved = localStorage.getItem('vibes_ai_system_instruction');
      setSystemPrompt(saved || DEFAULT_AI_SYSTEM_INSTRUCTION);
  }, []);

  // --- Handlers ---

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    
    setQuestions(prev => [...prev, newQuestion.trim()]);
    setNewQuestion('');
  };

  const confirmDelete = (index: number) => {
      setIndexToDelete(index);
      setIsDeleteModalOpen(true);
  };

  const executeDelete = () => {
    if (indexToDelete !== null) {
      setQuestions(prev => prev.filter((_, i) => i !== indexToDelete));
      setIsDeleteModalOpen(false);
      setIndexToDelete(null);
    }
  };

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index);
    setEditingText(text);
  };

  const saveEditing = () => {
    if (editingIndex !== null && editingText.trim()) {
      setQuestions(prev => {
        const newArr = [...prev];
        newArr[editingIndex] = editingText.trim();
        return newArr;
      });
      setEditingIndex(null);
      setEditingText('');
    }
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const handleSaveSystemPrompt = () => {
      localStorage.setItem('vibes_ai_system_instruction', systemPrompt);
      alert('Системный промпт обновлен и сохранен.');
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      
      <PageHeader 
        title="Чат-ассистент" 
        description="Настройка поведения ИИ и быстрых вопросов для студентов."
      />

      <div className="grid grid-cols-1 gap-8">
        
        {/* System Prompt Editor */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm">
            <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-500 rounded-xl">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Системный промпт</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Инструкция, определяющая личность и поведение ИИ.</p>
                    </div>
                </div>
            </div>
            
            <div className="p-6 md:p-8">
                <textarea 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={12}
                    className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 font-mono text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors resize-y leading-relaxed"
                    placeholder="Введите системный промпт..."
                />
                <div className="flex justify-end mt-4">
                    <button 
                        onClick={handleSaveSystemPrompt}
                        className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        <Save size={18} />
                        Сохранить промпт
                    </button>
                </div>
            </div>
        </div>

        {/* Quick Questions Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm">
            <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl">
                        <Zap size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Быстрые вопросы</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Студенты видят эти подсказки при открытии чата.</p>
                    </div>
                </div>
                <span className="text-xs font-bold bg-zinc-200 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-600 dark:text-zinc-400">
                    {questions.length} активных
                </span>
            </div>

            <div className="p-6 md:p-8 space-y-6">
                
                {/* List */}
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {questions.map((q, idx) => (
                            <motion.div 
                                key={idx}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all group ${
                                    editingIndex === idx 
                                    ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-500/30 ring-2 ring-violet-500/20' 
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                                }`}
                            >
                                <div className="p-2 text-zinc-300 dark:text-zinc-600">
                                    <MessageSquare size={18} />
                                </div>

                                {editingIndex === idx ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            autoFocus
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                                            className="flex-1 bg-transparent border-none focus:outline-none text-zinc-900 dark:text-white font-medium"
                                        />
                                        <button onClick={saveEditing} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors">
                                            <Check size={16} />
                                        </button>
                                        <button onClick={cancelEditing} className="p-1.5 bg-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-300 transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="flex-1 text-zinc-700 dark:text-zinc-300 font-medium">
                                            {q}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => startEditing(idx, q)}
                                                className="p-2 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                                                title="Редактировать"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => confirmDelete(idx)}
                                                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Удалить"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Add New Input */}
                <form onSubmit={handleAdd} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-2xl opacity-0 group-focus-within:opacity-10 blur transition-opacity duration-500"></div>
                    <div className="relative flex gap-2">
                        <input 
                            type="text"
                            placeholder="Введите новый вопрос..."
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            className="flex-1 px-5 py-4 rounded-2xl bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 transition-all text-zinc-900 dark:text-white placeholder-zinc-400"
                        />
                        <button 
                            type="submit"
                            disabled={!newQuestion.trim()}
                            className="px-6 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg flex items-center justify-center"
                        >
                            <Plus size={24} />
                        </button>
                    </div>
                </form>

            </div>
        </div>

      </div>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDelete}
        message="Вы уверены, что хотите удалить этот вопрос?"
      />
    </div>
  );
};

export default AdminAssistant;
