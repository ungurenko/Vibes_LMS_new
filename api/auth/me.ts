/**
 * GET /api/auth/me
 *
 * Получить данные текущего пользователя по JWT токену
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db';
import {
  getUserFromRequest,
  successResponse,
  errorResponse,
} from '../_lib/auth';

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'admin' | 'mentor';
  status: string;
  progress_percent: number;
  landing_url: string | null;
  service_url: string | null;
  github_url: string | null;
  onboarding_completed: boolean;
  current_stage_title: string | null;
}

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

    // Получаем данные пользователя из БД
    const { rows } = await query<UserData>(
      `SELECT
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
        u.onboarding_completed,
        ds.title as current_stage_title
      FROM users u
      LEFT JOIN user_stage_progress usp ON usp.user_id = u.id AND usp.status = 'current'
      LEFT JOIN dashboard_stages ds ON ds.id = usp.stage_id
      WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [tokenData.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json(errorResponse('Пользователь не найден'));
    }

    const user = rows[0];

    // Обновляем last_active_at
    await query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    );

    return res.status(200).json(
      successResponse({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        role: user.role,
        status: user.status,
        progressPercent: user.progress_percent,
        projects: {
          landing: user.landing_url,
          service: user.service_url,
          github: user.github_url,
        },
        onboardingCompleted: user.onboarding_completed,
        currentStage: user.current_stage_title,
      })
    );
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
