/**
 * GET/PUT /api/admin/ai-instruction
 *
 * Управление системной инструкцией для AI-ассистента
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db';
import {
  getUserFromRequest,
  successResponse,
  errorResponse,
} from '../_lib/auth';

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

    // GET - получить активную инструкцию
    if (req.method === 'GET') {
      const { rows } = await query(
        `SELECT id, name, content, is_active, updated_at
         FROM ai_system_instructions
         WHERE is_active = true
         LIMIT 1`
      );

      if (rows.length === 0) {
        return res.status(200).json(successResponse({
          content: '',
          updatedAt: null,
        }));
      }

      return res.status(200).json(successResponse({
        id: rows[0].id,
        name: rows[0].name,
        content: rows[0].content,
        updatedAt: rows[0].updated_at,
      }));
    }

    // PUT - обновить инструкцию
    if (req.method === 'PUT') {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json(errorResponse('Текст инструкции обязателен'));
      }

      // Деактивируем все текущие инструкции
      await query(`UPDATE ai_system_instructions SET is_active = false`);

      // Создаём новую активную инструкцию
      const { rows } = await query(
        `INSERT INTO ai_system_instructions (name, content, is_active, created_by_id)
         VALUES ('custom', $1, true, $2)
         RETURNING id, content, updated_at`,
        [content, tokenData.userId]
      );

      return res.status(200).json(successResponse({
        id: rows[0].id,
        content: rows[0].content,
        updatedAt: rows[0].updated_at,
      }));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error) {
    console.error('Admin AI instruction error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
