import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

// ===== TASKS =====

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

// ===== STAGES =====

// GET - Получить все стадии с задачами
async function getStages(req: VercelRequest, res: VercelResponse) {
    const cohortId = req.query.cohortId;

    // Получаем стадии (с фильтром по когорте если указан)
    const { rows: stages } = await query(
        `SELECT id, title, subtitle, description, week_label, is_active, sort_order, cohort_id
     FROM dashboard_stages
     ${cohortId ? 'WHERE cohort_id = $1' : ''}
     ORDER BY sort_order`,
        cohortId ? [cohortId] : []
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
        cohortId: stage.cohort_id,
        tasks: tasksByStage.get(stage.id) || [],
    }));

    return res.status(200).json(successResponse(result));
}

// POST - Создать стадию
async function createStage(req: VercelRequest, res: VercelResponse) {
    const { title, subtitle, description, weekLabel, isActive, sortOrder, cohortId } = req.body;

    if (!title) {
        return res.status(400).json(errorResponse('Название стадии обязательно'));
    }

    // Если создаём активную стадию, сбрасываем флаг у остальных (в пределах когорты)
    if (isActive && cohortId) {
        await query(`UPDATE dashboard_stages SET is_active = FALSE WHERE cohort_id = $1`, [cohortId]);
    } else if (isActive) {
        await query(`UPDATE dashboard_stages SET is_active = FALSE`);
    }

    const { rows } = await query(
        `INSERT INTO dashboard_stages (title, subtitle, description, week_label, is_active, sort_order, cohort_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [title, subtitle, description, weekLabel, isActive || false, sortOrder || 0, cohortId || null]
    );

    const stage = {
        id: rows[0].id,
        title: rows[0].title,
        subtitle: rows[0].subtitle,
        description: rows[0].description,
        weekLabel: rows[0].week_label,
        isActive: rows[0].is_active,
        sortOrder: rows[0].sort_order,
        cohortId: rows[0].cohort_id,
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

    // Если делаем стадию активной, сбрасываем флаг у всех остальных в той же когорте
    if (isActive === true) {
        await query(
            `UPDATE dashboard_stages SET is_active = FALSE
             WHERE id != $1 AND cohort_id = (SELECT cohort_id FROM dashboard_stages WHERE id = $1)`,
            [id]
        );
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
        cohortId: rows[0].cohort_id,
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

export async function handleStages(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
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
