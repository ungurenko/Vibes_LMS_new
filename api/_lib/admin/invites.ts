import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

/**
 * Генерирует случайный токен для инвайта
 */
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function handleInvites(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
  try {
    // GET - получить все инвайты
    if (req.method === 'GET') {
      const { rows } = await query(`
        SELECT
          il.id,
          il.token,
          il.status,
          il.expires_at,
          il.created_at,
          il.used_at,
          u.first_name as used_by_name,
          u.email as used_by_email
        FROM invite_links il
        LEFT JOIN users u ON u.id = il.used_by_id
        ORDER BY il.created_at DESC
      `);

      const invites = rows.map((row: any) => ({
        id: row.id,
        token: row.token,
        status: row.status,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        usedAt: row.used_at,
        usedByName: row.used_by_name,
        usedByEmail: row.used_by_email,
      }));

      return res.status(200).json(successResponse(invites));
    }

    // POST - создать новый инвайт
    if (req.method === 'POST') {
      const { expiresInDays } = req.body;

      // Генерируем уникальный токен
      const token = generateToken();

      // Вычисляем дату истечения (если указана)
      let expiresAt = null;
      if (expiresInDays && expiresInDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      }

      const { rows } = await query(
        `INSERT INTO invite_links (token, status, expires_at, created_by_id)
         VALUES ($1, 'active', $2, $3)
         RETURNING id, token, status, expires_at, created_at`,
        [token, expiresAt, tokenData.userId]
      );

      return res.status(201).json(successResponse(rows[0]));
    }

    // DELETE - деактивировать инвайт
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json(errorResponse('ID инвайта обязателен'));
      }

      await query(
        `UPDATE invite_links SET status = 'deactivated' WHERE id = $1`,
        [id]
      );

      return res.status(200).json(successResponse({ deactivated: true }));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error) {
    console.error('Admin invites error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
