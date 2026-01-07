/**
 * POST /api/auth/login
 *
 * Вход в систему
 * Принимает email и password, возвращает JWT токен
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db';
import {
  createToken,
  comparePassword,
  successResponse,
  errorResponse,
} from '../_lib/auth';

interface LoginRequest {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'admin' | 'mentor';
  status: string;
  progress_percent: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    const { email, password } = req.body as LoginRequest;

    // Валидация
    if (!email || !password) {
      return res.status(400).json(errorResponse('Email и пароль обязательны'));
    }

    // Ищем пользователя по email
    const { rows } = await query<User>(
      `SELECT id, email, password_hash, first_name, last_name, avatar_url, role, status, progress_percent
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json(errorResponse('Неверный email или пароль'));
    }

    const user = rows[0];

    // Проверяем статус пользователя
    if (user.status === 'inactive') {
      return res.status(403).json(errorResponse('Аккаунт деактивирован'));
    }

    // Проверяем пароль
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json(errorResponse('Неверный email или пароль'));
    }

    // Обновляем last_active_at
    await query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Создаём JWT токен
    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Возвращаем токен и данные пользователя (без пароля)
    return res.status(200).json(
      successResponse({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          avatarUrl: user.avatar_url,
          role: user.role,
          status: user.status,
          progressPercent: user.progress_percent,
        },
      })
    );
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
