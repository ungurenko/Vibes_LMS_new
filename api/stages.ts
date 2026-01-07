/**
 * API для работы со стадиями дашборда
 *
 * GET    /api/stages                      - Получить стадии с задачами и прогрессом
 * POST   /api/stages?action=complete-task - Отметить задачу как выполненную
 * DELETE /api/stages?action=complete-task - Убрать отметку выполнения задачи
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db.js';
import {
  getUserFromRequest,
  successResponse,
  errorResponse,
} from '../_lib/auth.js';

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

    // Получаем стадии
    const { rows: stages } = await query(
      `SELECT id, title, subtitle, sort_order
       FROM dashboard_stages
       ORDER BY sort_order`
    );

    // Получаем задачи для всех стадий
    const { rows: tasks } = await query(
      `SELECT id, stage_id, title, sort_order
       FROM stage_tasks
       ORDER BY stage_id, sort_order`
    );

    // Получаем прогресс пользователя по стадиям
    const { rows: stageProgress } = await query(
      `SELECT stage_id, status
       FROM user_stage_progress
       WHERE user_id = $1`,
      [tokenData.userId]
    );
    const stageStatusMap = new Map(
      stageProgress.map((p: any) => [p.stage_id, p.status])
    );

    // Получаем выполненные задачи пользователя
    const { rows: completedTasks } = await query(
      `SELECT task_id
       FROM user_stage_task_progress
       WHERE user_id = $1`,
      [tokenData.userId]
    );
    const completedTaskIds = new Set(completedTasks.map((t: any) => t.task_id));

    // Группируем задачи по стадиям
    const tasksByStage = new Map<string, any[]>();
    for (const task of tasks) {
      if (!tasksByStage.has(task.stage_id)) {
        tasksByStage.set(task.stage_id, []);
      }
      tasksByStage.get(task.stage_id)!.push({
        id: task.id,
        title: task.title,
        completed: completedTaskIds.has(task.id),
      });
    }

    // Формируем результат
    const result = stages.map((stage: any, index: number) => {
      // Определяем статус стадии
      let status = stageStatusMap.get(stage.id);

      // Если нет сохранённого статуса, определяем по порядку
      if (!status) {
        status = index === 0 ? 'current' : 'locked';
      }

      return {
        id: stage.id,
        title: stage.title,
        subtitle: stage.subtitle,
        status,
        tasks: tasksByStage.get(stage.id) || [],
      };
    });

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
