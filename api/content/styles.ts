/**
 * GET /api/content/styles
 * Получение стилей дизайна
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

    const { category } = req.query;

    let sql = `
      SELECT
        id, name, gradient, image_url, description,
        long_description, prompt, tags, category,
        usage_count, status, sort_order
      FROM style_cards
      WHERE deleted_at IS NULL AND status = 'published'
    `;
    const params: any[] = [];

    if (category && category !== 'Все') {
      sql += ` AND category = $1`;
      params.push(category);
    }

    sql += ` ORDER BY sort_order`;

    const { rows } = await query(sql, params);

    const styles = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      gradient: row.gradient,
      image: row.image_url,
      description: row.description,
      longDescription: row.long_description,
      prompt: row.prompt,
      tags: row.tags || [],
      category: row.category,
    }));

    return res.status(200).json(successResponse(styles));
  } catch (error) {
    console.error('Get styles error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
