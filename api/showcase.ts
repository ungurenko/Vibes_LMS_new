/**
 * GET /api/showcase
 *
 * Получить проекты студентов для витрины
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

    // Фильтр по категории (опционально)
    const { category } = req.query;

    let sql = `
      SELECT
        sp.id,
        sp.title,
        sp.description,
        sp.image_url,
        sp.demo_url,
        sp.category,
        sp.likes_count,
        sp.created_at,
        u.id as author_id,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        u.avatar_url as author_avatar,
        u.role as author_role,
        CASE WHEN pl.id IS NOT NULL THEN true ELSE false END as is_liked
      FROM showcase_projects sp
      JOIN users u ON u.id = sp.author_id
      LEFT JOIN project_likes pl ON pl.project_id = sp.id AND pl.user_id = $1
      WHERE sp.deleted_at IS NULL AND sp.status = 'published'
    `;
    const params: any[] = [tokenData.userId];

    if (category && category !== 'Все') {
      sql += ` AND sp.category = $2`;
      params.push(category);
    }

    sql += ` ORDER BY sp.likes_count DESC, sp.created_at DESC`;

    const { rows } = await query(sql, params);

    // Форматируем ответ
    const projects = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      demoUrl: row.demo_url,
      category: row.category,
      likes: row.likes_count,
      isLikedByCurrentUser: row.is_liked,
      date: row.created_at,
      author: {
        name: [row.author_first_name, row.author_last_name].filter(Boolean).join(' '),
        avatar: row.author_avatar,
        level: row.author_role === 'mentor' ? 'Ментор' :
               row.author_role === 'admin' ? 'Admin' : 'Студент',
      },
    }));

    return res.status(200).json(successResponse(projects));
  } catch (error) {
    console.error('Get showcase error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
