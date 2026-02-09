/**
 * API для работы со стадиями дашборда
 *
 * GET    /api/stages                      - Получить стадии с задачами и прогрессом
 * POST   /api/stages?action=complete-task - Отметить задачу как выполненную
 * DELETE /api/stages?action=complete-task - Убрать отметку выполнения задачи
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
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

    // Роутинг по действиям
    const { action } = req.query;

    if (action === 'complete-task') {
      return await handleTaskCompletion(req, res, tokenData.userId);
    }

    // GET - получить стадии
    if (req.method !== 'GET') {
      return res.status(405).json(errorResponse('Method not allowed'));
    }

    // Оптимизированный единый запрос с JOIN (вместо 4 отдельных)
    // Фильтрация по когорте текущего пользователя
    const { rows } = await query(
      `SELECT
          ds.id AS stage_id, ds.title AS stage_title,
          ds.subtitle, ds.description, ds.week_label, ds.is_active,
          ds.sort_order AS stage_sort_order,
          st.id AS task_id, st.title AS task_title,
          st.sort_order AS task_sort_order,
          usp.status AS stage_status,
          CASE WHEN ustp.task_id IS NOT NULL THEN true ELSE false END AS task_completed
      FROM dashboard_stages ds
      LEFT JOIN stage_tasks st ON st.stage_id = ds.id
      LEFT JOIN user_stage_progress usp ON usp.stage_id = ds.id AND usp.user_id = $1
      LEFT JOIN user_stage_task_progress ustp ON ustp.task_id = st.id AND ustp.user_id = $1
      WHERE ds.cohort_id = (SELECT cohort_id FROM users WHERE id = $1)
      ORDER BY ds.sort_order, st.sort_order`,
      [tokenData.userId]
    );

    // HTTP кэширование для данных с прогрессом
    res.setHeader('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');

    // Группируем результат в иерархическую структуру
    const stagesMap = new Map<string, any>();
    let stageIndex = 0;

    for (const row of rows) {
      // Добавляем стадию если ещё нет
      if (!stagesMap.has(row.stage_id)) {
        const status = row.stage_status || (stageIndex === 0 ? 'current' : 'locked');
        stagesMap.set(row.stage_id, {
          id: row.stage_id,
          title: row.stage_title,
          subtitle: row.subtitle,
          description: row.description,
          weekLabel: row.week_label,
          isActive: row.is_active,
          sortOrder: row.stage_sort_order,
          status,
          tasks: [],
          taskIds: new Set(), // Для дедупликации задач
        });
        stageIndex++;
      }

      // Добавляем задачу если есть и ещё не добавлена
      if (row.task_id && !stagesMap.get(row.stage_id)!.taskIds.has(row.task_id)) {
        stagesMap.get(row.stage_id)!.taskIds.add(row.task_id);
        stagesMap.get(row.stage_id)!.tasks.push({
          id: row.task_id,
          title: row.task_title,
          completed: row.task_completed,
        });
      }
    }

    // Формируем результат
    const result = Array.from(stagesMap.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ id, title, subtitle, description, weekLabel, isActive, status, tasks }) => ({
        id,
        title,
        subtitle,
        description,
        weekLabel,
        isActive,
        status,
        tasks,
      }));

    return res.status(200).json(successResponse(result));
  } catch (error) {
    console.error('Get stages error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ==================== TASK COMPLETION ====================

async function handleTaskCompletion(
  req: VercelRequest,
  res: VercelResponse,
  userId: string
) {
  const { taskId } = req.body;

  if (!taskId) {
    return res.status(400).json(errorResponse('taskId обязателен'));
  }

  try {
    switch (req.method) {
      case 'POST':
        return await completeTask(res, userId, taskId);
      case 'DELETE':
        return await uncompleteTask(res, userId, taskId);
      default:
        return res.status(405).json(errorResponse('Method not allowed'));
    }
  } catch (error) {
    console.error('Task completion error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// POST - Отметить задачу как выполненную
async function completeTask(
  res: VercelResponse,
  userId: string,
  taskId: string
) {
  // Используем INSERT ... ON CONFLICT для идемпотентности
  await query(
    `INSERT INTO user_stage_task_progress (user_id, task_id, completed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id, task_id) DO NOTHING`,
    [userId, taskId]
  );

  return res.status(200).json(successResponse({ completed: true }));
}

// DELETE - Убрать отметку выполнения
async function uncompleteTask(
  res: VercelResponse,
  userId: string,
  taskId: string
) {
  await query(
    `DELETE FROM user_stage_task_progress
     WHERE user_id = $1 AND task_id = $2`,
    [userId, taskId]
  );

  return res.status(200).json(successResponse({ completed: false }));
}
