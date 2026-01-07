/**
 * POST /api/auth/register
 *
 * Регистрация нового пользователя по инвайт-коду
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, getClient } from '../_lib/db.js';
import {
  createToken,
  hashPassword,
  successResponse,
  errorResponse,
} from '../_lib/auth.js';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  inviteCode: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  const client = await getClient();

  try {
    const { email, password, firstName, lastName, inviteCode } = req.body as RegisterRequest;

    // Валидация
    if (!email || !password || !firstName || !inviteCode) {
      return res.status(400).json(
        errorResponse('Email, пароль, имя и инвайт-код обязательны')
      );
    }

    if (password.length < 6) {
      return res.status(400).json(
        errorResponse('Пароль должен быть минимум 6 символов')
      );
    }

    // Начинаем транзакцию
    await client.query('BEGIN');

    // Проверяем инвайт-код
    const inviteResult = await client.query(
      `SELECT id, status, expires_at
       FROM invite_links
       WHERE token = $1`,
      [inviteCode]
    );

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json(errorResponse('Неверный инвайт-код'));
    }

    const invite = inviteResult.rows[0];

    if (invite.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json(errorResponse('Инвайт-код уже использован'));
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json(errorResponse('Инвайт-код истёк'));
    }

    // Проверяем, не занят ли email
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json(errorResponse('Email уже зарегистрирован'));
    }

    // Хешируем пароль
    const passwordHash = await hashPassword(password);

    // Создаём пользователя
    const userResult = await client.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name,
        role, status, progress_percent, last_active_at
      ) VALUES ($1, $2, $3, $4, 'student', 'active', 0, NOW())
      RETURNING id, email, first_name, last_name, role`,
      [email.toLowerCase(), passwordHash, firstName, lastName || null]
    );

    const newUser = userResult.rows[0];

    // Помечаем инвайт как использованный
    await client.query(
      `UPDATE invite_links
       SET status = 'used', used_by_id = $1, used_at = NOW()
       WHERE id = $2`,
      [newUser.id, invite.id]
    );

    // Создаём начальный прогресс для первой стадии
    const stageResult = await client.query(
      `SELECT id FROM dashboard_stages ORDER BY sort_order LIMIT 1`
    );

    if (stageResult.rows.length > 0) {
      await client.query(
        `INSERT INTO user_stage_progress (user_id, stage_id, status)
         VALUES ($1, $2, 'current')`,
        [newUser.id, stageResult.rows[0].id]
      );
    }

    // Фиксируем транзакцию
    await client.query('COMMIT');

    // Создаём JWT токен
    const token = createToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return res.status(201).json(
      successResponse({
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          status: 'active',
          progressPercent: 0,
        },
      })
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  } finally {
    client.release();
  }
}
