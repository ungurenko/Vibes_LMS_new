/**
 * API для управления стадиями дашборда (Admin Dashboard Stages)
 *
 * GET    /api/admin/stages        - Получить все стадии с задачами
 * POST   /api/admin/stages        - Создать стадию
 * PUT    /api/admin/stages        - Обновить стадию
 * DELETE /api/admin/stages?id=X   - Удалить стадию
 * 
 * POST   /api/admin/stages/tasks  - Создать задачу
 * PUT    /api/admin/stages/tasks  - Обновить задачу
 * DELETE /api/admin/stages/tasks?id=X - Удалить задачу
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

        // Только админы могут управлять стадиями
        if (tokenData.role !== 'admin') {
            return res.status(403).json(errorResponse('Доступ запрещён'));
        }

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
        sortOrder: stage.sort_order,
        tasks: tasksByStage.get(stage.id) || [],
    }));

    return res.status(200).json(successResponse(result));
}

// POST - Создать стадию
async function createStage(req: VercelRequest, res: VercelResponse) {
    const { title, subtitle, sortOrder } = req.body;

    if (!title) {
        return res.status(400).json(errorResponse('Название стадии обязательно'));
    }

    const { rows } = await query(
        `INSERT INTO dashboard_stages (title, subtitle, sort_order)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [title, subtitle, sortOrder || 0]
    );

    const stage = {
        id: rows[0].id,
        title: rows[0].title,
        subtitle: rows[0].subtitle,
        sortOrder: rows[0].sort_order,
        tasks: [],
    };

    return res.status(201).json(successResponse(stage));
}

// PUT - Обновить стадию
async function updateStage(req: VercelRequest, res: VercelResponse) {
    const { id, title, subtitle, sortOrder } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID стадии обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE dashboard_stages SET
      title = COALESCE($1, title),
      subtitle = COALESCE($2, subtitle),
      sort_order = COALESCE($3, sort_order),
      updated_at = NOW()
    WHERE id = $4
    RETURNING *`,
        [title, subtitle, sortOrder, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Стадия не найдена'));
    }

    const stage = {
        id: rows[0].id,
        title: rows[0].title,
        subtitle: rows[0].subtitle,
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
