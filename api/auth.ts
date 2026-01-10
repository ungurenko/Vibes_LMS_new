/**
 * Auth API endpoint
 *
 * Handles:
 * - POST /api/auth/login
 * - POST /api/auth/register
 * - GET /api/auth/me
 * - PATCH /api/auth/me - обновление профиля
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, getClient } from './_lib/db.js';
import {
  createToken,
  comparePassword,
  hashPassword,
  getUserFromRequest,
  successResponse,
  errorResponse,
} from './_lib/auth.js';

// Interfaces
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  inviteCode: string;
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  newPassword?: string;
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
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Извлекаем endpoint из URL: /api/auth/login → 'login'
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const endpoint = pathParts[pathParts.length - 1]; // последний сегмент

  switch (endpoint) {
    case 'login':
      return handleLogin(req, res);
    case 'register':
      return handleRegister(req, res);
    case 'me':
      return handleMe(req, res);
    case 'auth':
      return res.status(400).json(errorResponse('Endpoint required'));
    default:
      return res.status(404).json(errorResponse('Auth endpoint not found'));
  }
}

// ==================== LOGIN ====================
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json(errorResponse('Email и пароль обязательны'));
    }

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

    if (user.status === 'inactive') {
      return res.status(403).json(errorResponse('Аккаунт деактивирован'));
    }

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json(errorResponse('Неверный email или пароль'));
    }

    await query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    );

    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

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

// ==================== REGISTER ====================
async function handleRegister(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  const client = await getClient();

  try {
    const { email, password, firstName, lastName, inviteCode } = req.body as RegisterRequest;

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

    await client.query('BEGIN');

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

    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json(errorResponse('Email уже зарегистрирован'));
    }

    const passwordHash = await hashPassword(password);

    const userResult = await client.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name,
        role, status, progress_percent, last_active_at
      ) VALUES ($1, $2, $3, $4, 'student', 'active', 0, NOW())
      RETURNING id, email, first_name, last_name, role`,
      [email.toLowerCase(), passwordHash, firstName, lastName || null]
    );

    const newUser = userResult.rows[0];

    await client.query(
      `UPDATE invite_links
       SET status = 'used', used_by_id = $1, used_at = NOW()
       WHERE id = $2`,
      [newUser.id, invite.id]
    );

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

    await client.query('COMMIT');

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

// ==================== ME ====================
async function handleMe(req: VercelRequest, res: VercelResponse) {
  // GET - получить данные профиля
  if (req.method === 'GET') {
    return handleGetMe(req, res);
  }

  // PATCH - обновить профиль
  if (req.method === 'PATCH') {
    return handleUpdateProfile(req, res);
  }

  return res.status(405).json(errorResponse('Method not allowed'));
}

// GET /api/auth/me - получить данные текущего пользователя
async function handleGetMe(req: VercelRequest, res: VercelResponse) {
  try {
    const tokenData = getUserFromRequest(req);
    if (!tokenData) {
      return res.status(401).json(errorResponse('Не авторизован'));
    }

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

// PATCH /api/auth/me - обновить профиль текущего пользователя
async function handleUpdateProfile(req: VercelRequest, res: VercelResponse) {
  try {
    const tokenData = getUserFromRequest(req);
    if (!tokenData) {
      return res.status(401).json(errorResponse('Не авторизован'));
    }

    const { firstName, lastName, avatarUrl, newPassword } = req.body as UpdateProfileRequest;

    // Проверяем, что есть что обновлять
    if (!firstName && lastName === undefined && !avatarUrl && !newPassword) {
      return res.status(400).json(errorResponse('Нет данных для обновления'));
    }

    // Валидация пароля
    if (newPassword && newPassword.length < 6) {
      return res.status(400).json(errorResponse('Пароль должен быть минимум 6 символов'));
    }

    // Формируем динамический UPDATE запрос
    const updates: string[] = [];
    const params: (string | null)[] = [];
    let paramIndex = 1;

    if (firstName) {
      updates.push(`first_name = $${paramIndex}`);
      params.push(firstName);
      paramIndex++;
    }

    if (lastName !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      params.push(lastName || null);
      paramIndex++;
    }

    if (avatarUrl) {
      updates.push(`avatar_url = $${paramIndex}`);
      params.push(avatarUrl);
      paramIndex++;
    }

    if (newPassword) {
      const passwordHash = await hashPassword(newPassword);
      updates.push(`password_hash = $${paramIndex}`);
      params.push(passwordHash);
      paramIndex++;
    }

    // Добавляем updated_at
    updates.push(`updated_at = NOW()`);

    // Добавляем user id в конец параметров
    params.push(tokenData.userId);

    // Выполняем обновление
    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL`,
      params
    );

    // Получаем обновленные данные пользователя
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
    console.error('Update profile error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
