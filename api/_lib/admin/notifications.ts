import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

export async function handleNotifications(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
  try {
    // POST - создать уведомление (одному или массово)
    if (req.method === 'POST') {
      const { userIds, title, message, type = 'info' } = req.body;

      if (!title) {
        return res.status(400).json(errorResponse('Заголовок обязателен'));
      }

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json(errorResponse('Список получателей обязателен'));
      }

      const values: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      for (const userId of userIds) {
        values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4})`);
        params.push(userId, title, message || null, type, tokenData.userId);
        paramIdx += 5;
      }

      await query(
        `INSERT INTO notifications (user_id, title, message, type, created_by) VALUES ${values.join(',')}`,
        params
      );

      return res.status(201).json(successResponse({ sent: userIds.length }));
    }

    // GET - список уведомлений студента (для админа)
    if (req.method === 'GET') {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json(errorResponse('userId обязателен'));
      }

      const { rows } = await query(
        `SELECT id, title, message, type, is_read, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );

      return res.status(200).json(successResponse(rows));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error: any) {
    console.error('Admin notifications error:', error.message, error.code);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
