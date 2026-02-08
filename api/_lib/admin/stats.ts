import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

/**
 * Форматирует число с разделителями
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}

export async function handleStats(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
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

export async function handleDashboardStats(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    // Получаем все метрики одним оптимизированным запросом
    const { rows } = await query(`
      SELECT
        -- Основные метрики
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL) as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL
         AND last_active_at > NOW() - INTERVAL '7 days') as active_week,
        (SELECT COALESCE(ROUND(AVG(progress_percent)), 0) FROM users
         WHERE role = 'student' AND deleted_at IS NULL) as avg_progress,
        (SELECT COUNT(*) FROM showcase_projects
         WHERE deleted_at IS NULL AND status = 'published') as total_projects,

        -- Изменения за неделю
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL
         AND created_at > NOW() - INTERVAL '7 days') as new_students_week,
        (SELECT COUNT(*) FROM showcase_projects
         WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days') as new_projects_week
    `);

    const stats = rows[0];

    // Получаем pipeline по стадиям (студенты по этапам обучения)
    const { rows: pipelineRows } = await query(`
      SELECT
        ds.id,
        ds.title,
        ds.sort_order,
        COUNT(DISTINCT usp.user_id) as user_count
      FROM dashboard_stages ds
      LEFT JOIN user_stage_progress usp ON usp.stage_id = ds.id
        AND usp.status IN ('current', 'completed')
      GROUP BY ds.id, ds.title, ds.sort_order
      ORDER BY ds.sort_order
    `);

    // Получаем аватары для pipeline (до 5 для каждой стадии)
    const pipelineWithAvatars = await Promise.all(
      pipelineRows.map(async (stage: any) => {
        const { rows: avatarRows } = await query(`
          SELECT u.avatar_url
          FROM users u
          JOIN user_stage_progress usp ON usp.user_id = u.id
          WHERE usp.stage_id = $1 AND usp.status IN ('current', 'completed')
            AND u.deleted_at IS NULL AND u.avatar_url IS NOT NULL
          LIMIT 5
        `, [stage.id]);

        return {
          id: stage.id,
          title: stage.title,
          count: parseInt(stage.user_count) || 0,
          avatars: avatarRows.map((r: any) => r.avatar_url),
        };
      })
    );

    // Вычисляем тренды (% изменение)
    const totalStudents = parseInt(stats.total_students) || 0;
    const activeWeek = parseInt(stats.active_week) || 0;
    const newStudentsWeek = parseInt(stats.new_students_week) || 0;
    const newProjectsWeek = parseInt(stats.new_projects_week) || 0;

    // Формируем ответ
    const result = {
      metrics: {
        totalStudents: {
          value: formatNumber(totalStudents),
          change: `+${newStudentsWeek}`,
          changePercent: totalStudents > 0 ? Math.round((newStudentsWeek / totalStudents) * 100) : 0,
        },
        activeNow: {
          value: formatNumber(activeWeek),
          change: `${Math.round((activeWeek / Math.max(totalStudents, 1)) * 100)}%`,
          isPositive: activeWeek > totalStudents * 0.3,
        },
        avgProgress: {
          value: `${stats.avg_progress}%`,
          isPositive: parseInt(stats.avg_progress) > 40,
        },
        newProjects: {
          value: formatNumber(parseInt(stats.total_projects) || 0),
          change: `+${newProjectsWeek}`,
        },
      },
      pipeline: pipelineWithAvatars,
      lastUpdated: new Date().toISOString(),
    };

    return res.status(200).json(successResponse(result));
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json(errorResponse('Ошибка получения статистики'));
  }
}
