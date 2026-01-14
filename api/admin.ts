/**
 * Unified Admin API - объединяет все admin endpoints
 *
 * Используйте query параметр resource:
 * - /api/admin?resource=students
 * - /api/admin?resource=stats
 * - /api/admin?resource=ai-instruction
 * - /api/admin?resource=invites
 * - /api/admin?resource=calls
 * - /api/admin?resource=lessons
 * - /api/admin?resource=stages
 * - /api/admin?resource=navigation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, getClient } from './_lib/db.js';
import {
  getUserFromRequest,
  successResponse,
  errorResponse,
} from './_lib/auth.js';

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

    // Роутинг по resource
    const { resource } = req.query;
    const resourceType = Array.isArray(resource) ? resource[0] : resource;

    // Специальная обработка для navigation: GET доступен всем, POST только админам
    if (resourceType === 'navigation') {
      if (req.method === 'POST' && tokenData.role !== 'admin') {
        return res.status(403).json(errorResponse('Только администраторы могут изменять настройки'));
      }
      return await handleNavigation(req, res, tokenData);
    }

    // Для остальных ресурсов требуется роль админа
    if (tokenData.role !== 'admin') {
      return res.status(403).json(errorResponse('Доступ запрещён'));
    }

    switch (resourceType) {
      case 'students':
        return await handleStudents(req, res, tokenData);
      case 'student-activity':
        return await handleActivityLog(req, res, tokenData);
      case 'stats':
        return await handleStats(req, res, tokenData);
      case 'ai-instruction':
        return await handleAiinstruction(req, res, tokenData);
      case 'invites':
        return await handleInvites(req, res, tokenData);
      case 'calls':
        return await handleCalls(req, res, tokenData);
      case 'lessons':
        return await handleLessons(req, res, tokenData);
      case 'stages':
        return await handleStages(req, res, tokenData);
      case 'quick-questions':
        return await handleQuickQuestions(req, res, tokenData);
      default:
        return res.status(400).json(errorResponse('Неверный resource'));
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ==================== RESOURCE HANDLERS ====================


// ===== STUDENTS =====

async function handleStudents(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  try {
    // GET - получить список студентов или одного студента
    if (req.method === 'GET') {
      const { status, search, id } = req.query;

      // Если передан ID, возвращаем детальный профиль
      if (id) {
        // 1. Основные данные студента
        const { rows: studentRows } = await query(
          `SELECT
            u.id, u.email, u.first_name, u.last_name, u.avatar_url,
            u.role, u.status, u.progress_percent,
            u.landing_url, u.service_url, u.github_url,
            u.admin_notes, u.last_active_at, u.created_at,
            cm.title as current_module
          FROM users u
          LEFT JOIN course_modules cm ON cm.id = u.current_module_id
          WHERE u.id = $1 AND u.role = 'student'`,
          [id]
        );

        if (studentRows.length === 0) {
          return res.status(404).json(errorResponse('Студент не найден'));
        }

        const student = studentRows[0];

        // 2. Статистика (параллельные запросы)
        const [lessonsResult, projectsResult, chatResult] = await Promise.all([
          query(
            `SELECT COUNT(*) as count FROM user_lesson_progress WHERE user_id = $1 AND status = 'completed'`,
            [id]
          ),
          query(
            `SELECT COUNT(*) as count FROM showcase_projects WHERE author_id = $1`,
            [id]
          ),
          query(
            `SELECT COUNT(*) as count FROM chat_messages WHERE user_id = $1 AND role = 'user'`,
            [id]
          )
        ]);
        
        // 3. Получаем прогресс по урокам для визуализации
        const { rows: progressRows } = await query(
           `SELECT 
              cm.id as module_id, 
              cm.title as module_title,
              l.id as lesson_id,
              l.title as lesson_title,
              COALESCE(ulp.status, 'locked') as status
            FROM course_modules cm
            JOIN lessons l ON l.module_id = cm.id
            LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = $1
            WHERE cm.deleted_at IS NULL AND l.deleted_at IS NULL
            ORDER BY cm.sort_order, l.sort_order`,
            [id]
        );
        
        // Группируем прогресс
        const curriculum = [];
        let currentModule = null;
        
        for (const row of progressRows) {
            if (!currentModule || currentModule.id !== row.module_id) {
                currentModule = {
                    id: row.module_id,
                    title: row.module_title,
                    lessons: []
                };
                curriculum.push(currentModule);
            }
            currentModule.lessons.push({
                id: row.lesson_id,
                title: row.lesson_title,
                status: row.status
            });
        }

        const result = {
          id: student.id,
          name: [student.first_name, student.last_name].filter(Boolean).join(' '),
          email: student.email,
          avatar: student.avatar_url,
          status: student.status,
          progress: student.progress_percent,
          currentModule: student.current_module || '',
          lastActive: formatLastActive(student.last_active_at),
          joinedDate: student.created_at?.toISOString().split('T')[0],
          projects: {
            landing: student.landing_url,
            service: student.service_url,
            github: student.github_url,
          },
          notes: student.admin_notes,
          stats: {
             lessonsCompleted: parseInt(lessonsResult.rows[0].count),
             projectsSubmitted: parseInt(projectsResult.rows[0].count),
             messagesSent: parseInt(chatResult.rows[0].count)
          },
          curriculum
        };

        return res.status(200).json(successResponse(result));
      }

      // Иначе возвращаем список (существующая логика)
      let sql = `
        SELECT
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
          u.admin_notes,
          u.last_active_at,
          u.created_at,
          cm.title as current_module
        FROM users u
        LEFT JOIN course_modules cm ON cm.id = u.current_module_id
        WHERE u.deleted_at IS NULL AND u.role = 'student'
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (status && status !== 'Все') {
        sql += ` AND u.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (search) {
        sql += ` AND (
          u.first_name ILIKE $${paramIndex} OR
          u.last_name ILIKE $${paramIndex} OR
          u.email ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      sql += ` ORDER BY u.last_active_at DESC NULLS LAST`;

      const { rows } = await query(sql, params);

      const students = rows.map((row: any) => ({
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(' '),
        email: row.email,
        avatar: row.avatar_url,
        status: row.status,
        progress: row.progress_percent,
        currentModule: row.current_module || '',
        lastActive: formatLastActive(row.last_active_at),
        joinedDate: row.created_at?.toISOString().split('T')[0],
        projects: {
          landing: row.landing_url,
          service: row.service_url,
          github: row.github_url,
        },
        notes: row.admin_notes,
      }));

      return res.status(200).json(successResponse(students));
    }

    // PUT - обновить студента
    if (req.method === 'PUT') {
      const { id, status, notes, progress } = req.body;

      if (!id) {
        return res.status(400).json(errorResponse('ID студента обязателен'));
      }

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (notes !== undefined) {
        updates.push(`admin_notes = $${paramIndex}`);
        params.push(notes);
        paramIndex++;
      }

      if (progress !== undefined) {
        updates.push(`progress_percent = $${paramIndex}`);
        params.push(progress);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json(errorResponse('Нет данных для обновления'));
      }

      params.push(id);

      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );

      return res.status(200).json(successResponse({ updated: true }));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error) {
    console.error('Admin students error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ===== ACTIVITY LOG =====

async function handleActivityLog(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
    if (req.method !== 'GET') {
        return res.status(405).json(errorResponse('Method not allowed'));
    }

    try {
        const { userId, limit = 50 } = req.query;
        
        if (!userId) {
            return res.status(400).json(errorResponse('UserId обязателен'));
        }

        const { rows } = await query(
            `SELECT 
                id, action_type, action_description, target_type, target_title, created_at
             FROM activity_log
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        const activity = rows.map((row: any) => ({
            id: row.id,
            action: row.action_description,
            target: row.target_title || '',
            date: formatActivityDate(row.created_at),
            timestamp: row.created_at, // For sorting if needed
            iconType: mapActionToIconType(row.action_type)
        }));

        return res.status(200).json(successResponse(activity));

    } catch (error) {
        console.error('Admin activity log error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

function mapActionToIconType(actionType: string): string {
    if (actionType === 'lesson' || actionType === 'task_complete') return 'lesson';
    if (actionType === 'chat') return 'chat';
    if (actionType === 'project') return 'project';
    if (actionType === 'login' || actionType === 'logout' || actionType === 'registration') return 'login';
    return 'login'; // default
}

function formatActivityDate(date: Date): string {
    return new Date(date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Форматирует дату последней активности в читаемый вид
 */
function formatLastActive(date: Date | null): string {
  if (!date) return 'Никогда';

  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;

  return new Date(date).toLocaleDateString('ru-RU');
}


// ===== STATS =====

async function handleStats(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    // Получаем статистику одним запросом
    const { rows } = await query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL) as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL AND status = 'active') as active_students,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL
         AND last_active_at > NOW() - INTERVAL '7 days') as active_this_week,
        (SELECT COALESCE(ROUND(AVG(progress_percent)), 0) FROM users
         WHERE role = 'student' AND deleted_at IS NULL) as avg_progress,
        (SELECT COUNT(*) FROM showcase_projects WHERE deleted_at IS NULL AND status = 'published') as total_projects,
        (SELECT COUNT(*) FROM admin_calls WHERE deleted_at IS NULL AND status = 'scheduled') as upcoming_calls,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL
         AND created_at > NOW() - INTERVAL '7 days') as new_students_week
    `);

    const stats = rows[0];

    // Форматируем для фронтенда
    const result = [
      {
        label: 'Всего студентов',
        value: formatNumber(stats.total_students),
        change: `+${stats.new_students_week} за неделю`,
        isPositive: true,
      },
      {
        label: 'Активные (7 дней)',
        value: formatNumber(stats.active_this_week),
        change: `${Math.round((stats.active_this_week / stats.total_students) * 100)}%`,
        isPositive: stats.active_this_week > stats.total_students * 0.5,
      },
      {
        label: 'Средний прогресс',
        value: `${stats.avg_progress}%`,
        change: '',
        isPositive: stats.avg_progress > 40,
      },
      {
        label: 'Проектов в витрине',
        value: formatNumber(stats.total_projects),
        change: '',
        isPositive: true,
      },
    ];

    return res.status(200).json(successResponse(result));
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

/**
 * Форматирует число с разделителями
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}


// ===== AI-INSTRUCTION (TOOLS) =====

// Модели по умолчанию для каждого инструмента
const DEFAULT_TOOL_MODELS: Record<string, string> = {
  assistant: 'google/gemini-2.5-flash-lite',
  tz_helper: 'z-ai/glm-4.7',
  ideas: 'xiaomi/mimo-v2-flash:free'
};

async function handleAiinstruction(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  try {
    const { tool_type } = req.query;

    // GET - получить конфигурации инструментов
    if (req.method === 'GET') {
      // Если указан tool_type - возвращаем конфиг для конкретного инструмента
      if (tool_type && ['assistant', 'tz_helper', 'ideas'].includes(tool_type as string)) {
        const { rows } = await query(
          `SELECT id, name, content, model_id, tool_type, is_active, updated_at
           FROM ai_system_instructions
           WHERE tool_type = $1 AND is_active = true
           LIMIT 1`,
          [tool_type]
        );

        if (rows.length === 0) {
          return res.status(200).json(successResponse({
            tool_type,
            content: '',
            model_id: DEFAULT_TOOL_MODELS[tool_type as string] || '',
            updatedAt: null,
          }));
        }

        return res.status(200).json(successResponse({
          id: rows[0].id,
          tool_type: rows[0].tool_type,
          content: rows[0].content,
          model_id: rows[0].model_id || DEFAULT_TOOL_MODELS[tool_type as string],
          updatedAt: rows[0].updated_at,
        }));
      }

      // Без tool_type - возвращаем все конфигурации для всех инструментов
      const { rows } = await query(
        `SELECT id, name, content, model_id, tool_type, is_active, updated_at
         FROM ai_system_instructions
         WHERE is_active = true AND tool_type IS NOT NULL`
      );

      // Формируем объект с конфигурациями для всех инструментов
      const toolTypes = ['assistant', 'tz_helper', 'ideas'];
      const configs: Record<string, any> = {};

      for (const tt of toolTypes) {
        const found = rows.find((r: any) => r.tool_type === tt);
        configs[tt] = found ? {
          id: found.id,
          content: found.content,
          model_id: found.model_id || DEFAULT_TOOL_MODELS[tt],
          updatedAt: found.updated_at,
        } : {
          content: '',
          model_id: DEFAULT_TOOL_MODELS[tt],
          updatedAt: null,
        };
      }

      return res.status(200).json(successResponse(configs));
    }

    // PUT - обновить конфигурацию инструмента
    if (req.method === 'PUT') {
      const { content, model_id, tool_type: bodyToolType } = req.body;
      const toolType = bodyToolType || tool_type;

      if (!toolType || !['assistant', 'tz_helper', 'ideas'].includes(toolType as string)) {
        return res.status(400).json(errorResponse('Укажите корректный tool_type (assistant, tz_helper, ideas)'));
      }

      // Деактивируем предыдущие инструкции для этого tool_type
      await query(
        `UPDATE ai_system_instructions SET is_active = false WHERE tool_type = $1`,
        [toolType]
      );

      // Создаём новую активную инструкцию
      const { rows } = await query(
        `INSERT INTO ai_system_instructions (name, content, model_id, tool_type, is_active, created_by_id)
         VALUES ($1, $2, $3, $4, true, $5)
         RETURNING id, content, model_id, tool_type, updated_at`,
        [
          `${toolType}_custom`,
          content || '',
          model_id || DEFAULT_TOOL_MODELS[toolType as string],
          toolType,
          tokenData.userId
        ]
      );

      return res.status(200).json(successResponse({
        id: rows[0].id,
        tool_type: rows[0].tool_type,
        content: rows[0].content,
        model_id: rows[0].model_id,
        updatedAt: rows[0].updated_at,
      }));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error) {
    console.error('Admin AI instruction error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}


// ===== INVITES =====

async function handleInvites(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
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


// ===== CALLS =====

async function handleCalls(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  try {
    switch (req.method) {
            case 'GET':
                return await getCalls(req, res);
            case 'POST':
                return await createCall(req, res);
            case 'PUT':
                return await updateCall(req, res);
            case 'DELETE':
                return await deleteCall(req, res);
            default:
                return res.status(405).json(errorResponse('Method not allowed'));
        }
    } catch (error) {
        console.error('Admin calls API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

// GET - Получить все созвоны
async function getCalls(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT
      id, topic, description,
      scheduled_date, scheduled_time, duration, timezone,
      status, meeting_url, recording_url, attendees_count,
      reminders,
      created_at, updated_at
    FROM admin_calls
    WHERE deleted_at IS NULL
    ORDER BY scheduled_date DESC, scheduled_time DESC`
    );

    const calls = rows.map((row: any) => ({
        id: row.id,
        topic: row.topic,
        description: row.description,
        date: row.scheduled_date,
        time: row.scheduled_time,
        duration: row.duration,
        timezone: row.timezone,
        status: row.status,
        meetingUrl: row.meeting_url,
        recordingUrl: row.recording_url,
        attendeesCount: row.attendees_count,
        reminders: row.reminders || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));

    return res.status(200).json(successResponse(calls));
}

// POST - Создать созвон
async function createCall(req: VercelRequest, res: VercelResponse) {
    const {
        topic,
        description,
        date,
        time,
        duration,
        timezone = 'Europe/Moscow',
        status = 'scheduled',
        meetingUrl,
        recordingUrl,
        reminders = [],
    } = req.body;

    if (!topic || !date || !time) {
        return res.status(400).json(errorResponse('Тема, дата и время обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO admin_calls (
      topic, description, scheduled_date, scheduled_time,
      duration, timezone, status, meeting_url, recording_url, reminders
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
        [topic, description, date, time, duration, timezone, status, meetingUrl, recordingUrl, reminders]
    );

    const row = rows[0];
    const call = {
        id: row.id,
        topic: row.topic,
        description: row.description,
        date: row.scheduled_date,
        time: row.scheduled_time,
        duration: row.duration,
        timezone: row.timezone,
        status: row.status,
        meetingUrl: row.meeting_url,
        recordingUrl: row.recording_url,
        attendeesCount: row.attendees_count,
        reminders: row.reminders || [],
        createdAt: row.created_at,
    };

    return res.status(201).json(successResponse(call));
}

// PUT - Обновить созвон
async function updateCall(req: VercelRequest, res: VercelResponse) {
    const {
        id,
        topic,
        description,
        date,
        time,
        duration,
        timezone,
        status,
        meetingUrl,
        recordingUrl,
        reminders,
    } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID созвона обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE admin_calls SET
      topic = COALESCE($1, topic),
      description = COALESCE($2, description),
      scheduled_date = COALESCE($3, scheduled_date),
      scheduled_time = COALESCE($4, scheduled_time),
      duration = COALESCE($5, duration),
      timezone = COALESCE($6, timezone),
      status = COALESCE($7, status),
      meeting_url = COALESCE($8, meeting_url),
      recording_url = COALESCE($9, recording_url),
      reminders = COALESCE($10, reminders),
      updated_at = NOW()
    WHERE id = $11 AND deleted_at IS NULL
    RETURNING *`,
        [topic, description, date, time, duration, timezone, status, meetingUrl, recordingUrl, reminders, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Созвон не найден'));
    }

    const row = rows[0];
    const call = {
        id: row.id,
        topic: row.topic,
        description: row.description,
        date: row.scheduled_date,
        time: row.scheduled_time,
        duration: row.duration,
        timezone: row.timezone,
        status: row.status,
        meetingUrl: row.meeting_url,
        recordingUrl: row.recording_url,
        attendeesCount: row.attendees_count,
        reminders: row.reminders || [],
        updatedAt: row.updated_at,
    };

    return res.status(200).json(successResponse(call));
}

// DELETE - Удалить созвон (soft delete)
async function deleteCall(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID созвона обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE admin_calls 
     SET deleted_at = NOW() 
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Созвон не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}


// ===== LESSONS =====

async function handleLessons(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  try {
    // Определяем операцию (modules или lessons)
        const { module } = req.query;

        if (module === 'modules') {
            return await handleModules(req, res);
        }

        switch (req.method) {
            case 'GET':
                return await getLessons(req, res);
            case 'POST':
                return await createLesson(req, res);
            case 'PUT':
                return await updateLesson(req, res);
            case 'DELETE':
                return await deleteLesson(req, res);
            default:
                return res.status(405).json(errorResponse('Method not allowed'));
        }
    } catch (error) {
        console.error('Admin lessons API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

// ===== LESSONS =====

// GET - Получить все модули с уроками
async function getLessons(req: VercelRequest, res: VercelResponse) {
    // Получаем модули
    const { rows: modules } = await query(
        `SELECT id, title, description, status, sort_order, created_at
     FROM course_modules
     WHERE deleted_at IS NULL
     ORDER BY sort_order`
    );

    // Получаем уроки для всех модулей
    const { rows: lessons } = await query(
        `SELECT 
      id, module_id, title, description, duration, 
      video_url, status, sort_order
     FROM lessons
     WHERE deleted_at IS NULL
     ORDER BY module_id, sort_order`
    );

    // Получаем материалы для всех уроков
    const { rows: materials } = await query(
        `SELECT id, lesson_id, title, type, url, sort_order
     FROM lesson_materials
     ORDER BY lesson_id, sort_order`
    );

    // Получаем задания для всех уроков
    const { rows: tasks } = await query(
        `SELECT id, lesson_id, text, sort_order
     FROM lesson_tasks
     ORDER BY lesson_id, sort_order`
    );

    // Группируем материалы по урокам
    const materialsByLesson = new Map<string, any[]>();
    for (const material of materials) {
        if (!materialsByLesson.has(material.lesson_id)) {
            materialsByLesson.set(material.lesson_id, []);
        }
        materialsByLesson.get(material.lesson_id)!.push({
            id: material.id,
            title: material.title,
            type: material.type,
            url: material.url,
            sortOrder: material.sort_order,
        });
    }

    // Группируем задания по урокам
    const tasksByLesson = new Map<string, any[]>();
    for (const task of tasks) {
        if (!tasksByLesson.has(task.lesson_id)) {
            tasksByLesson.set(task.lesson_id, []);
        }
        tasksByLesson.get(task.lesson_id)!.push({
            id: task.id,
            text: task.text,
            sortOrder: task.sort_order,
        });
    }

    // Группируем уроки по модулям
    const lessonsByModule = new Map<string, any[]>();
    for (const lesson of lessons) {
        if (!lessonsByModule.has(lesson.module_id)) {
            lessonsByModule.set(lesson.module_id, []);
        }
        lessonsByModule.get(lesson.module_id)!.push({
            id: lesson.id,
            moduleId: lesson.module_id,
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration,
            videoUrl: lesson.video_url,
            status: lesson.status,
            sortOrder: lesson.sort_order,
            materials: materialsByLesson.get(lesson.id) || [],
            tasks: tasksByLesson.get(lesson.id) || [],
        });
    }

    // Формируем результат
    const result = modules.map((module: any) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        status: module.status,
        sortOrder: module.sort_order,
        lessons: lessonsByModule.get(module.id) || [],
    }));

    return res.status(200).json(successResponse(result));
}

// POST - Создать урок
async function createLesson(req: VercelRequest, res: VercelResponse) {
    const {
        moduleId,
        title,
        description,
        duration,
        videoUrl,
        status = 'draft',
        sortOrder,
        materials = [],
        tasks = []
    } = req.body;

    if (!moduleId || !title) {
        return res.status(400).json(errorResponse('moduleId и title обязательны'));
    }

    // Создаём урок
    const { rows } = await query(
        `INSERT INTO lessons (
      module_id, title, description, duration,
      video_url, status, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
        [moduleId, title, description, duration, videoUrl, status, sortOrder || 0]
    );

    const lessonId = rows[0].id;

    // Добавляем материалы если есть
    const createdMaterials = [];
    for (let i = 0; i < materials.length; i++) {
        const material = materials[i];
        const { rows: matRows } = await query(
            `INSERT INTO lesson_materials (lesson_id, title, type, url, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [lessonId, material.title, material.type, material.url, material.sortOrder || i + 1]
        );
        createdMaterials.push({
            id: matRows[0].id,
            title: matRows[0].title,
            type: matRows[0].type,
            url: matRows[0].url,
            sortOrder: matRows[0].sort_order,
        });
    }

    // Добавляем задания если есть
    const createdTasks = [];
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const { rows: taskRows } = await query(
            `INSERT INTO lesson_tasks (lesson_id, text, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [lessonId, task.text, task.sortOrder || i + 1]
        );
        createdTasks.push({
            id: taskRows[0].id,
            text: taskRows[0].text,
            sortOrder: taskRows[0].sort_order,
        });
    }

    const lesson = {
        id: rows[0].id,
        moduleId: rows[0].module_id,
        title: rows[0].title,
        description: rows[0].description,
        duration: rows[0].duration,
        videoUrl: rows[0].video_url,
        status: rows[0].status,
        sortOrder: rows[0].sort_order,
        materials: createdMaterials,
        tasks: createdTasks,
    };

    return res.status(201).json(successResponse(lesson));
}

// PUT - Обновить урок
async function updateLesson(req: VercelRequest, res: VercelResponse) {
    const {
        id,
        title,
        description,
        duration,
        videoUrl,
        status,
        sortOrder,
        materials,
        tasks
    } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID урока обязателен'));
    }

    // 1. Обновляем урок
    const { rows, rowCount } = await query(
        `UPDATE lessons SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      duration = COALESCE($3, duration),
      video_url = COALESCE($4, video_url),
      status = COALESCE($5, status),
      sort_order = COALESCE($6, sort_order),
      updated_at = NOW()
    WHERE id = $7 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, duration, videoUrl, status, sortOrder, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Урок не найден'));
    }

    // 2. Если переданы материалы - обновляем их
    let updatedMaterials = [];
    if (materials && Array.isArray(materials)) {
        // Удаляем старые материалы
        await query(
            `DELETE FROM lesson_materials WHERE lesson_id = $1`,
            [id]
        );

        // Добавляем новые материалы
        for (let i = 0; i < materials.length; i++) {
            const material = materials[i];
            const { rows: matRows } = await query(
                `INSERT INTO lesson_materials (lesson_id, title, type, url, sort_order)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [id, material.title, material.type, material.url, material.sortOrder || i + 1]
            );
            updatedMaterials.push({
                id: matRows[0].id,
                title: matRows[0].title,
                type: matRows[0].type,
                url: matRows[0].url,
                sortOrder: matRows[0].sort_order,
            });
        }
    } else {
        // 3. Если материалы не переданы, получаем существующие
        const { rows: existingMaterials } = await query(
            `SELECT id, title, type, url, sort_order FROM lesson_materials WHERE lesson_id = $1 ORDER BY sort_order`,
            [id]
        );
        updatedMaterials = existingMaterials.map((m: any) => ({
            id: m.id,
            title: m.title,
            type: m.type,
            url: m.url,
            sortOrder: m.sort_order,
        }));
    }

    // 4. Если переданы задания - обновляем их
    let updatedTasks = [];
    if (tasks && Array.isArray(tasks)) {
        // Удаляем старые задания
        await query(
            `DELETE FROM lesson_tasks WHERE lesson_id = $1`,
            [id]
        );

        // Добавляем новые задания
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const { rows: taskRows } = await query(
                `INSERT INTO lesson_tasks (lesson_id, text, sort_order)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [id, task.text, task.sortOrder || i + 1]
            );
            updatedTasks.push({
                id: taskRows[0].id,
                text: taskRows[0].text,
                sortOrder: taskRows[0].sort_order,
            });
        }
    } else {
        // 5. Если задания не переданы, получаем существующие
        const { rows: existingTasks } = await query(
            `SELECT id, text, sort_order FROM lesson_tasks WHERE lesson_id = $1 ORDER BY sort_order`,
            [id]
        );
        updatedTasks = existingTasks.map((t: any) => ({
            id: t.id,
            text: t.text,
            sortOrder: t.sort_order,
        }));
    }

    const lesson = {
        id: rows[0].id,
        moduleId: rows[0].module_id,
        title: rows[0].title,
        description: rows[0].description,
        duration: rows[0].duration,
        videoUrl: rows[0].video_url,
        status: rows[0].status,
        sortOrder: rows[0].sort_order,
        materials: updatedMaterials,
        tasks: updatedTasks,
    };

    return res.status(200).json(successResponse(lesson));
}

// DELETE - Удалить урок (soft delete)
async function deleteLesson(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID урока обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE lessons 
     SET deleted_at = NOW() 
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Урок не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

// ===== MODULES =====

async function handleModules(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'POST':
            return await createModule(req, res);
        case 'PUT':
            return await updateModule(req, res);
        case 'DELETE':
            return await deleteModule(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

// POST - Создать модуль
async function createModule(req: VercelRequest, res: VercelResponse) {
    const { title, description, status = 'locked', sortOrder } = req.body;

    if (!title) {
        return res.status(400).json(errorResponse('Название модуля обязательно'));
    }

    const { rows } = await query(
        `INSERT INTO course_modules (title, description, status, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [title, description, status, sortOrder || 0]
    );

    const module = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        status: rows[0].status,
        sortOrder: rows[0].sort_order,
        lessons: [],
    };

    return res.status(201).json(successResponse(module));
}

// PUT - Обновить модуль
async function updateModule(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, status, sortOrder } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID модуля обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE course_modules SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      status = COALESCE($3, status),
      sort_order = COALESCE($4, sort_order),
      updated_at = NOW()
    WHERE id = $5 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, status, sortOrder, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Модуль не найден'));
    }

    const module = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        status: rows[0].status,
        sortOrder: rows[0].sort_order,
    };

    return res.status(200).json(successResponse(module));
}

// DELETE - Удалить модуль (soft delete)
async function deleteModule(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID модуля обязателен'));
    }

    // Удаляем модуль и все его уроки (CASCADE)
    const { rowCount } = await query(
        `UPDATE course_modules 
     SET deleted_at = NOW() 
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Модуль не найден'));
    }

    // Также помечаем все уроки модуля как удалённые
    await query(
        `UPDATE lessons 
     SET deleted_at = NOW() 
     WHERE module_id = $1 AND deleted_at IS NULL`,
        [id]
    );

    return res.status(200).json(successResponse({ deleted: true }));
}


// ===== STAGES =====

async function handleStages(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  try {
    // Определяем какая операция (stages или tasks)
        const { task } = req.query;

        if (task === 'tasks') {
            return await handleTasks(req, res);
        }

        switch (req.method) {
            case 'GET':
                return await getStages(req, res);
            case 'POST':
                return await createStage(req, res);
            case 'PUT':
                return await updateStage(req, res);
            case 'DELETE':
                return await deleteStage(req, res);
            default:
                return res.status(405).json(errorResponse('Method not allowed'));
        }
    } catch (error) {
        console.error('Admin stages API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

// ===== STAGES =====

// GET - Получить все стадии с задачами
async function getStages(req: VercelRequest, res: VercelResponse) {
    // Получаем стадии
    const { rows: stages } = await query(
        `SELECT id, title, subtitle, description, week_label, is_active, sort_order
     FROM dashboard_stages
     ORDER BY sort_order`
    );

    // Получаем задачи для всех стадий
    const { rows: tasks } = await query(
        `SELECT id, stage_id, title, sort_order
     FROM stage_tasks
     ORDER BY stage_id, sort_order`
    );

    // Группируем задачи по стадиям
    const tasksByStage = new Map<string, any[]>();
    for (const task of tasks) {
        if (!tasksByStage.has(task.stage_id)) {
            tasksByStage.set(task.stage_id, []);
        }
        tasksByStage.get(task.stage_id)!.push({
            id: task.id,
            title: task.title,
            sortOrder: task.sort_order,
        });
    }

    // Формируем результат
    const result = stages.map((stage: any) => ({
        id: stage.id,
        title: stage.title,
        subtitle: stage.subtitle,
        description: stage.description,
        weekLabel: stage.week_label,
        isActive: stage.is_active,
        sortOrder: stage.sort_order,
        tasks: tasksByStage.get(stage.id) || [],
    }));

    return res.status(200).json(successResponse(result));
}

// POST - Создать стадию
async function createStage(req: VercelRequest, res: VercelResponse) {
    const { title, subtitle, description, weekLabel, isActive, sortOrder } = req.body;

    if (!title) {
        return res.status(400).json(errorResponse('Название стадии обязательно'));
    }

    // Если создаём активную стадию, сбрасываем флаг у всех остальных
    if (isActive) {
        await query(`UPDATE dashboard_stages SET is_active = FALSE`);
    }

    const { rows } = await query(
        `INSERT INTO dashboard_stages (title, subtitle, description, week_label, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [title, subtitle, description, weekLabel, isActive || false, sortOrder || 0]
    );

    const stage = {
        id: rows[0].id,
        title: rows[0].title,
        subtitle: rows[0].subtitle,
        description: rows[0].description,
        weekLabel: rows[0].week_label,
        isActive: rows[0].is_active,
        sortOrder: rows[0].sort_order,
        tasks: [],
    };

    return res.status(201).json(successResponse(stage));
}

// PUT - Обновить стадию
async function updateStage(req: VercelRequest, res: VercelResponse) {
    const { id, title, subtitle, description, weekLabel, isActive, sortOrder } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID стадии обязателен'));
    }

    // Если делаем стадию активной, сбрасываем флаг у всех остальных
    if (isActive === true) {
        await query(`UPDATE dashboard_stages SET is_active = FALSE WHERE id != $1`, [id]);
    }

    const { rows, rowCount } = await query(
        `UPDATE dashboard_stages SET
      title = COALESCE($1, title),
      subtitle = COALESCE($2, subtitle),
      description = COALESCE($3, description),
      week_label = COALESCE($4, week_label),
      is_active = COALESCE($5, is_active),
      sort_order = COALESCE($6, sort_order),
      updated_at = NOW()
    WHERE id = $7
    RETURNING *`,
        [title, subtitle, description, weekLabel, isActive, sortOrder, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Стадия не найдена'));
    }

    const stage = {
        id: rows[0].id,
        title: rows[0].title,
        subtitle: rows[0].subtitle,
        description: rows[0].description,
        weekLabel: rows[0].week_label,
        isActive: rows[0].is_active,
        sortOrder: rows[0].sort_order,
    };

    return res.status(200).json(successResponse(stage));
}

// DELETE - Удалить стадию
async function deleteStage(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID стадии обязателен'));
    }

    // Удаляем стадию и все её задачи (CASCADE)
    const { rowCount } = await query(
        `DELETE FROM dashboard_stages WHERE id = $1`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Стадия не найдена'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

// ===== TASKS =====

async function handleTasks(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'POST':
            return await createTask(req, res);
        case 'PUT':
            return await updateTask(req, res);
        case 'DELETE':
            return await deleteTask(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

// POST - Создать задачу
async function createTask(req: VercelRequest, res: VercelResponse) {
    const { stageId, title, sortOrder } = req.body;

    if (!stageId || !title) {
        return res.status(400).json(errorResponse('stageId и title обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO stage_tasks (stage_id, title, sort_order)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [stageId, title, sortOrder || 0]
    );

    const task = {
        id: rows[0].id,
        stageId: rows[0].stage_id,
        title: rows[0].title,
        sortOrder: rows[0].sort_order,
    };

    return res.status(201).json(successResponse(task));
}

// PUT - Обновить задачу
async function updateTask(req: VercelRequest, res: VercelResponse) {
    const { id, title, sortOrder } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID задачи обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE stage_tasks SET
      title = COALESCE($1, title),
      sort_order = COALESCE($2, sort_order)
    WHERE id = $3
    RETURNING *`,
        [title, sortOrder, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Задача не найдена'));
    }

    const task = {
        id: rows[0].id,
        stageId: rows[0].stage_id,
        title: rows[0].title,
        sortOrder: rows[0].sort_order,
    };

    return res.status(200).json(successResponse(task));
}

// DELETE - Удалить задачу
async function deleteTask(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID задачи обязателен'));
    }

    const { rowCount } = await query(
        `DELETE FROM stage_tasks WHERE id = $1`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Задача не найдена'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}


// ===== NAVIGATION =====

async function handleNavigation(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  try {
    // GET - получить настройки навигации
    if (req.method === 'GET') {
      const { rows } = await query(
        `SELECT setting_value FROM platform_settings WHERE setting_key = 'navigation_config'`
      );

      // Если настройки не найдены - вернуть дефолтные значения (все видимы)
      if (rows.length === 0) {
        const defaultConfig = {
          dashboard: true,
          lessons: true,
          roadmaps: true,
          styles: true,
          prompts: true,
          glossary: true,
          assistant: true,
        };

        // Создаём запись с дефолтными настройками
        await query(
          `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
           VALUES ('navigation_config', $1, $2)
           ON CONFLICT (setting_key) DO NOTHING`,
          [JSON.stringify(defaultConfig), tokenData.userId]
        );

        return res.status(200).json(successResponse(defaultConfig));
      }

      return res.status(200).json(successResponse(rows[0].setting_value));
    }

    // POST - обновить настройки навигации
    if (req.method === 'POST') {
      const config = req.body;

      // Валидация: проверяем что все ключи присутствуют и являются boolean
      const requiredKeys = ['dashboard', 'lessons', 'roadmaps', 'styles', 'prompts', 'glossary', 'assistant'];
      const missingKeys = requiredKeys.filter(key => !(key in config));

      if (missingKeys.length > 0) {
        return res.status(400).json(
          errorResponse(`Отсутствуют обязательные ключи: ${missingKeys.join(', ')}`)
        );
      }

      // Проверяем что все значения boolean
      const invalidKeys = requiredKeys.filter(key => typeof config[key] !== 'boolean');
      if (invalidKeys.length > 0) {
        return res.status(400).json(
          errorResponse(`Неверный тип данных для ключей: ${invalidKeys.join(', ')} (ожидается boolean)`)
        );
      }

      // Защита: dashboard всегда должен быть true
      if (config.dashboard !== true) {
        return res.status(400).json(
          errorResponse('Вкладка "Дашборд" не может быть скрыта')
        );
      }

      // Обновляем настройки в БД
      const { rows } = await query(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
         VALUES ('navigation_config', $1, $2)
         ON CONFLICT (setting_key)
         DO UPDATE SET
           setting_value = $1,
           updated_by = $2,
           updated_at = NOW()
         RETURNING setting_value`,
        [JSON.stringify(config), tokenData.userId]
      );

      return res.status(200).json(successResponse(rows[0].setting_value));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error) {
    console.error('Navigation settings error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ===== QUICK QUESTIONS =====

async function handleQuickQuestions(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getQuickQuestions(req, res);
      case 'POST':
        return await createQuickQuestion(req, res);
      case 'PUT':
        return await updateQuickQuestion(req, res);
      case 'DELETE':
        return await deleteQuickQuestion(req, res);
      default:
        return res.status(405).json(errorResponse('Method not allowed'));
    }
  } catch (error) {
    console.error('Quick Questions API error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// GET - Получить все активные вопросы
async function getQuickQuestions(req: VercelRequest, res: VercelResponse) {
  const { rows } = await query(
    `SELECT id, text, sort_order, is_active
     FROM quick_questions
     WHERE is_active = TRUE
     ORDER BY sort_order`
  );

  const questions = rows.map((row: any) => ({
    id: row.id,
    text: row.text,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));

  return res.status(200).json(successResponse(questions));
}

// POST - Создать новый вопрос
async function createQuickQuestion(req: VercelRequest, res: VercelResponse) {
  const { text, sortOrder = 0 } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json(errorResponse('Текст вопроса обязателен'));
  }

  if (text.length > 255) {
    return res.status(400).json(errorResponse('Текст вопроса не может превышать 255 символов'));
  }

  const { rows } = await query(
    `INSERT INTO quick_questions (text, sort_order, is_active)
     VALUES ($1, $2, TRUE)
     RETURNING id, text, sort_order, is_active`,
    [text.trim(), sortOrder]
  );

  const question = {
    id: rows[0].id,
    text: rows[0].text,
    sortOrder: rows[0].sort_order,
    isActive: rows[0].is_active,
  };

  return res.status(201).json(successResponse(question));
}

// PUT - Обновить вопрос
async function updateQuickQuestion(req: VercelRequest, res: VercelResponse) {
  const { id, text, sortOrder } = req.body;

  if (!id) {
    return res.status(400).json(errorResponse('ID вопроса обязателен'));
  }

  if (text && text.length > 255) {
    return res.status(400).json(errorResponse('Текст вопроса не может превышать 255 символов'));
  }

  const { rows, rowCount } = await query(
    `UPDATE quick_questions SET
      text = COALESCE($1, text),
      sort_order = COALESCE($2, sort_order),
      updated_at = NOW()
     WHERE id = $3 AND is_active = TRUE
     RETURNING id, text, sort_order, is_active`,
    [text?.trim(), sortOrder, id]
  );

  if (rowCount === 0) {
    return res.status(404).json(errorResponse('Вопрос не найден'));
  }

  const question = {
    id: rows[0].id,
    text: rows[0].text,
    sortOrder: rows[0].sort_order,
    isActive: rows[0].is_active,
  };

  return res.status(200).json(successResponse(question));
}

// DELETE - Удалить вопрос (soft delete через is_active = false)
async function deleteQuickQuestion(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json(errorResponse('ID вопроса обязателен'));
  }

  const { rowCount } = await query(
    `UPDATE quick_questions
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1 AND is_active = TRUE`,
    [id]
  );

  if (rowCount === 0) {
    return res.status(404).json(errorResponse('Вопрос не найден'));
  }

  return res.status(200).json(successResponse({ deleted: true }));
}
