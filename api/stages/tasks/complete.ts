/**
 * API для отметки задач стадий как выполненных/невыполненных
 *
 * POST   /api/stages/tasks/complete   - Отметить задачу как выполненную
 * DELETE /api/stages/tasks/complete   - Убрать отметку выполнения
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../_lib/db.js';
import {
    getUserFromRequest,
    successResponse,
    errorResponse,
} from '../../_lib/auth.js';

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

        const { taskId } = req.body;

        if (!taskId) {
            return res.status(400).json(errorResponse('taskId обязателен'));
        }

        switch (req.method) {
            case 'POST':
                return await completeTask(req, res, tokenData.userId, taskId);
            case 'DELETE':
                return await uncompleteTask(req, res, tokenData.userId, taskId);
            default:
                return res.status(405).json(errorResponse('Method not allowed'));
        }
    } catch (error) {
        console.error('Task completion API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

// POST - Отметить задачу как выполненную
async function completeTask(
    req: VercelRequest,
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
    req: VercelRequest,
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
