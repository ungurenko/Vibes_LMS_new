import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, successResponse, errorResponse } from './_lib/auth.js';
import { query } from './_lib/db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const tokenData = getUserFromRequest(req);
    if (!tokenData) {
      return res.status(401).json(errorResponse('Не авторизован'));
    }

    // GET - мои непрочитанные уведомления
    if (req.method === 'GET') {
      const { rows } = await query(
        `SELECT id, title, message, type, is_read, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [tokenData.userId]
      );

      const unreadCount = rows.filter((r: any) => !r.is_read).length;

      return res.status(200).json(successResponse({
        notifications: rows,
        unreadCount,
      }));
    }

    // PATCH - пометить прочитанным
    if (req.method === 'PATCH') {
      const id = req.query.id as string;
      const all = req.query.all as string;

      if (all === 'true') {
        await query(
          'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
          [tokenData.userId]
        );
        return res.status(200).json(successResponse({ marked: true }));
      }

      if (id) {
        await query(
          'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
          [id, tokenData.userId]
        );
        return res.status(200).json(successResponse({ marked: true }));
      }

      return res.status(400).json(errorResponse('Укажите id или all=true'));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error: any) {
    console.error('Notifications API error:', error.message, error.code);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
