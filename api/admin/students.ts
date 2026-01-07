/**
 * GET/PUT /api/admin/students
 *
 * Управление студентами (только для админов)
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

    // GET - получить список студентов
    if (req.method === 'GET') {
      const { status, search } = req.query;

      let sql = `
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.role,
          u.status,
          u.progress_percent,
          u.landing_url,
          u.service_url,
          u.github_url,
          u.admin_notes,
          u.last_active_at,
          u.created_at,
          cm.title as current_module
        FROM users u
        LEFT JOIN course_modules cm ON cm.id = u.current_module_id
        WHERE u.deleted_at IS NULL AND u.role = 'student'
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (status && status !== 'Все') {
        sql += ` AND u.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (search) {
        sql += ` AND (
          u.first_name ILIKE $${paramIndex} OR
          u.last_name ILIKE $${paramIndex} OR
          u.email ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      sql += ` ORDER BY u.last_active_at DESC NULLS LAST`;

      const { rows } = await query(sql, params);

      const students = rows.map((row: any) => ({
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(' '),
        email: row.email,
        avatar: row.avatar_url,
        status: row.status,
        progress: row.progress_percent,
        currentModule: row.current_module || '',
        lastActive: formatLastActive(row.last_active_at),
        joinedDate: row.created_at?.toISOString().split('T')[0],
        projects: {
          landing: row.landing_url,
          service: row.service_url,
          github: row.github_url,
        },
        notes: row.admin_notes,
      }));

      return res.status(200).json(successResponse(students));
    }

    // PUT - обновить студента
    if (req.method === 'PUT') {
      const { id, status, notes, progress } = req.body;

      if (!id) {
        return res.status(400).json(errorResponse('ID студента обязателен'));
      }

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (notes !== undefined) {
        updates.push(`admin_notes = $${paramIndex}`);
        params.push(notes);
        paramIndex++;
      }

      if (progress !== undefined) {
        updates.push(`progress_percent = $${paramIndex}`);
        params.push(progress);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json(errorResponse('Нет данных для обновления'));
      }

      params.push(id);

      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );

      return res.status(200).json(successResponse({ updated: true }));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error) {
    console.error('Admin students error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

/**
 * Форматирует дату последней активности в читаемый вид
 */
function formatLastActive(date: Date | null): string {
  if (!date) return 'Никогда';

  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;

  return new Date(date).toLocaleDateString('ru-RU');
}
