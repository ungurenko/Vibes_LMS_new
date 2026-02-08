/**
 * Unified Admin API - тонкий роутер
 *
 * Используйте query параметр resource:
 * - /api/admin?resource=students
 * - /api/admin?resource=student-activity
 * - /api/admin?resource=stats
 * - /api/admin?resource=dashboard-stats
 * - /api/admin?resource=ai-instruction
 * - /api/admin?resource=invites
 * - /api/admin?resource=calls
 * - /api/admin?resource=lessons
 * - /api/admin?resource=stages
 * - /api/admin?resource=navigation
 * - /api/admin?resource=quick-questions
 * - /api/admin?resource=ai-chats
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, errorResponse } from './_lib/auth.js';

import { handleStudents } from './_lib/admin/students.js';
import { handleActivityLog } from './_lib/admin/activity.js';
import { handleStats, handleDashboardStats } from './_lib/admin/stats.js';
import { handleAiInstruction } from './_lib/admin/ai-instruction.js';
import { handleInvites } from './_lib/admin/invites.js';
import { handleCalls } from './_lib/admin/calls.js';
import { handleLessons } from './_lib/admin/lessons.js';
import { handleStages } from './_lib/admin/stages.js';
import { handleNavigation } from './_lib/admin/navigation.js';
import { handleQuickQuestions } from './_lib/admin/quick-questions.js';
import { handleAiChats } from './_lib/admin/ai-chats.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Проверяем авторизацию
    const tokenData = getUserFromRequest(req);
    if (!tokenData) {
      return res.status(401).json(errorResponse('Не авторизован'));
    }

    // Роутинг по resource
    const { resource } = req.query;
    const resourceType = Array.isArray(resource) ? resource[0] : resource;

    // Специальная обработка для navigation: GET доступен всем, POST только админам
    if (resourceType === 'navigation') {
      if (req.method === 'POST' && tokenData.role !== 'admin') {
        return res.status(403).json(errorResponse('Только администраторы могут изменять настройки'));
      }
      return await handleNavigation(req, res, tokenData);
    }

    // Для остальных ресурсов требуется роль админа
    if (tokenData.role !== 'admin') {
      return res.status(403).json(errorResponse('Доступ запрещён'));
    }

    switch (resourceType) {
      case 'students':
        return await handleStudents(req, res, tokenData);
      case 'student-activity':
        return await handleActivityLog(req, res, tokenData);
      case 'stats':
        return await handleStats(req, res, tokenData);
      case 'ai-instruction':
        return await handleAiInstruction(req, res, tokenData);
      case 'invites':
        return await handleInvites(req, res, tokenData);
      case 'calls':
        return await handleCalls(req, res, tokenData);
      case 'lessons':
        return await handleLessons(req, res, tokenData);
      case 'stages':
        return await handleStages(req, res, tokenData);
      case 'quick-questions':
        return await handleQuickQuestions(req, res, tokenData);
      case 'dashboard-stats':
        return await handleDashboardStats(req, res, tokenData);
      case 'ai-chats':
        return await handleAiChats(req, res, tokenData);
      default:
        return res.status(400).json(errorResponse('Неверный resource'));
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
