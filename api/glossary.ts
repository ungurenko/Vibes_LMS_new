/**
 * GET /api/glossary
 *
 * Получить все термины глоссария
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db';
import {
  getUserFromRequest,
  successResponse,
  errorResponse,
} from './_lib/auth';

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
      SELECT id, term, slang, definition, category, sort_order
      FROM glossary_terms
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];

    if (category && category !== 'Все') {
      sql += ` AND category = $1`;
      params.push(category);
    }

    sql += ` ORDER BY sort_order, term`;

    const { rows } = await query(sql, params);

    // Форматируем ответ
    const terms = rows.map((row: any) => ({
      id: row.id,
      term: row.term,
      slang: row.slang,
      definition: row.definition,
      category: row.category,
    }));

    return res.status(200).json(successResponse(terms));
  } catch (error) {
    console.error('Get glossary error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
