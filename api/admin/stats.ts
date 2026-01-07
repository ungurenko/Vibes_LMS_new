/**
 * GET /api/admin/stats
 *
 * Статистика для админ-панели
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db.js';
import {
  getUserFromRequest,
  successResponse,
  errorResponse,
} from '../_lib/auth.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    // Проверяем авторизацию
    const tokenData = getUserFromRequest(req);
    if (!tokenData) {
      return res.status(401).json(errorResponse('Не авторизован'));
    }

    // Проверяем роль админа
    if (tokenData.role !== 'admin') {
      return res.status(403).json(errorResponse('Доступ запрещён'));
    }

    // Получаем статистику одним запросом
    const { rows } = await query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL) as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL AND status = 'active') as active_students,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL
         AND last_active_at > NOW() - INTERVAL '7 days') as active_this_week,
        (SELECT COALESCE(ROUND(AVG(progress_percent)), 0) FROM users
         WHERE role = 'student' AND deleted_at IS NULL) as avg_progress,
        (SELECT COUNT(*) FROM showcase_projects WHERE deleted_at IS NULL AND status = 'published') as total_projects,
        (SELECT COUNT(*) FROM admin_calls WHERE deleted_at IS NULL AND status = 'scheduled') as upcoming_calls,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL
         AND created_at > NOW() - INTERVAL '7 days') as new_students_week
    `);

    const stats = rows[0];

    // Форматируем для фронтенда
    const result = [
      {
        label: 'Всего студентов',
        value: formatNumber(stats.total_students),
        change: `+${stats.new_students_week} за неделю`,
        isPositive: true,
      },
      {
        label: 'Активные (7 дней)',
        value: formatNumber(stats.active_this_week),
        change: `${Math.round((stats.active_this_week / stats.total_students) * 100)}%`,
        isPositive: stats.active_this_week > stats.total_students * 0.5,
      },
      {
        label: 'Средний прогресс',
        value: `${stats.avg_progress}%`,
        change: '',
        isPositive: stats.avg_progress > 40,
      },
      {
        label: 'Проектов в витрине',
        value: formatNumber(stats.total_projects),
        change: '',
        isPositive: true,
      },
    ];

    return res.status(200).json(successResponse(result));
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

/**
 * Форматирует число с разделителями
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}
