
import React from 'react';

export type TabId = 
  | 'dashboard' | 'lessons' | 'roadmaps' | 'styles' | 'prompts' | 'glossary' | 'assistant' | 'community' | 'profile' | 'practice'
  | 'admin-students' | 'admin-content' | 'admin-calls' | 'admin-assistant' | 'admin-settings';

export interface NavItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
  href?: string;
}

export type StyleCategory = 'Все' | 'Светлые' | 'Тёмные' | 'Яркие' | 'Минимализм';

export interface StyleCard {
  id: string;
  name: string;
  gradient: string; // Keeping for fallback/backgrounds
  image: string;    // New: for visual preview
  description: string;
  longDescription?: string; // New: for modal details
  prompt: string;
  tags: string[];   // New: characteristics
  category: StyleCategory; // New: for filtering
  // Admin specific
  usageCount?: number;
  status?: 'published' | 'draft' | 'archived';
}

export type GlossaryCategory = 'Все' | 'Базовые' | 'Код' | 'Инструменты' | 'API' | 'Ошибки' | 'Вайб-кодинг';

export interface GlossaryTerm {
  id: string;
  term: string;
  slang?: string;
  definition: string;
  category: GlossaryCategory;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export type LessonStatus = 'locked' | 'available' | 'completed' | 'current' | 'draft' | 'hidden';

export interface LessonMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'code' | 'figma';
  url: string;
}

export interface LessonTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  duration: string;
  videoUrl?: string; // Placeholder for embed URL
  status: LessonStatus;
  materials: LessonMaterial[];
  tasks: LessonTask[];
  // Admin specific
  views?: number;
  completions?: number;
  order?: number;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'locked' | 'completed';
  lessons: Lesson[];
}

export type PromptCategory = string;

export interface PromptCategoryItem {
  id: string;
  name: string;
  colorTheme?: string;
  sortOrder?: number;
}

export interface PromptStep {
  title: string;
  description?: string;
  content: string;
}

export interface PromptItem {
  id: string;
  title: string;
  description: string;
  content?: string; // Optional if using steps
  steps?: PromptStep[]; // New: Chain of prompts
  usage: string; // Instruction on how to use
  category: PromptCategory;
  categoryId?: string;
  colorTheme?: string;
  tags: string[];
  // Admin specific
  copyCount?: number;
  status?: 'published' | 'draft';
}

export interface StageTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface DashboardStage {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  weekLabel?: string;
  isActive?: boolean;
  sortOrder?: number;
  status: 'completed' | 'current' | 'locked';
  tasks: StageTask[];
}

// Roadmap Types
export type RoadmapCategory = 'Подготовка' | 'Лендинг' | 'Веб-сервис' | 'Полезное';

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  linkUrl?: string;
  linkText?: string;
}

export interface Roadmap {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  icon: string; // Emoji
  estimatedTime: string; // e.g., "15 мин"
  difficulty: 'Легко' | 'Средне' | 'Сложно';
  steps: RoadmapStep[];
}

// Admin Types
export interface StudentProjects {
  landing?: string; // URL or null
  service?: string; // URL or null
  github?: string;  // URL or null
}

export interface Student {
  id: string;
  name: string;
  avatar: string;
  email: string;
  status: 'active' | 'inactive' | 'completed' | 'stalled';
  progress: number;
  currentModule: string;
  lastActive: string; // ISO Date string or relative time for mocks
  joinedDate: string; // ISO Date string
  projects: StudentProjects;
  notes?: string;
  onboardingCompleted?: boolean;
}

export interface StudentProfile extends Student {
  stats: {
    lessonsCompleted: number;
    projectsSubmitted: number;
    messagesSent: number;
  };
  curriculum: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      status: string;
    }[];
  }[];
}

export interface AdminStat {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
}

export interface ActivityLogItem {
  id: string;
  studentId: string;
  action: string;
  target: string;
  date: string;
  iconType: 'lesson' | 'project' | 'chat' | 'login';
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  target: string;
  date: string;
  timestamp: string;
  iconType: 'lesson' | 'project' | 'chat' | 'login';
}

export interface InviteLink {
  id: string;
  token: string;
  status: 'active' | 'used' | 'deactivated';
  created: string; // ISO Date
  expiresAt?: string | null; // ISO Date or null for infinite
  usedByEmail?: string;
  usedByName?: string;
  usedAt?: string; // ISO Date
}

// Platform Settings Types
export interface NavigationConfig {
  dashboard: boolean;
  lessons: boolean;
  roadmaps: boolean;
  styles: boolean;
  prompts: boolean;
  glossary: boolean;
  assistant: boolean;
}

// Community / Showcase Types
export type ProjectCategory = 'Лендинг' | 'Веб-сервис' | 'E-commerce' | 'Креатив';

export interface ShowcaseProject {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  demoUrl: string;
  category: ProjectCategory;
  author: {
    name: string;
    avatar: string;
    level: string;
  };
  likes: number;
  isLikedByCurrentUser: boolean;
  date: string;
}

export interface QuickQuestion {
  id: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
}
