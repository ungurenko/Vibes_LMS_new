import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse, hashPassword } from '../auth.js';

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

export async function handleStudents(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
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
            u.cohort_id,
            cm.title as current_module
          FROM users u
          LEFT JOIN course_modules cm ON cm.id = u.current_module_id
          LEFT JOIN cohorts c ON c.id = u.cohort_id
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
        const curriculum: any[] = [];
        let currentModule: any = null;

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
          cohortId: student.cohort_id,
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
          u.cohort_id,
          c.name as cohort_name,
          cm.title as current_module
        FROM users u
        LEFT JOIN course_modules cm ON cm.id = u.current_module_id
        LEFT JOIN cohorts c ON c.id = u.cohort_id
        WHERE u.deleted_at IS NULL AND u.role = 'student'
      `;
      const params: any[] = [];
      let paramIndex = 1;

      const cohortId = req.query.cohortId;
      if (cohortId) {
        sql += ` AND u.cohort_id = $${paramIndex}`;
        params.push(cohortId);
        paramIndex++;
      }

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
        cohortId: row.cohort_id,
        cohortName: row.cohort_name,
      }));

      return res.status(200).json(successResponse(students));
    }

    // PUT - обновить студента
    if (req.method === 'PUT') {
      const { id, status, notes, progress, newPassword, cohortId } = req.body;

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

      if (cohortId !== undefined) {
        updates.push(`cohort_id = $${paramIndex}`);
        params.push(cohortId || null);
        paramIndex++;
      }

      // Сброс пароля
      if (newPassword !== undefined) {
        if (newPassword.length < 8) {
          return res.status(400).json(errorResponse('Пароль должен быть минимум 8 символов'));
        }
        const passwordHash = await hashPassword(newPassword);
        updates.push(`password_hash = $${paramIndex}`);
        params.push(passwordHash);
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
