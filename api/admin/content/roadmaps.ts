/**
 * API для управления roadmaps (Admin)
 *
 * GET    /api/admin/content/roadmaps     - Получить все roadmaps
 * POST   /api/admin/content/roadmaps     - Создать roadmap
 * PUT    /api/admin/content/roadmaps     - Обновить roadmap
 * DELETE /api/admin/content/roadmaps?id=X - Удалить roadmap
 * 
 * POST   /api/admin/content/roadmaps/steps - Создать шаг
 * PUT    /api/admin/content/roadmaps/steps - Обновить шаг
 * DELETE /api/admin/content/roadmaps/steps?id=X - Удалить шаг
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
        const tokenData = getUserFromRequest(req);
        if (!tokenData) {
            return res.status(401).json(errorResponse('Не авторизован'));
        }

        if (tokenData.role !== 'admin') {
            return res.status(403).json(errorResponse('Доступ запрещён'));
        }

        // Определяем операцию
        const { step } = req.query;

        if (step === 'steps') {
            return await handleSteps(req, res);
        }

        switch (req.method) {
            case 'GET':
                return await getRoadmaps(req, res);
            case 'POST':
                return await createRoadmap(req, res);
            case 'PUT':
                return await updateRoadmap(req, res);
            case 'DELETE':
                return await deleteRoadmap(req, res);
            default:
                return res.status(405).json(errorResponse('Method not allowed'));
        }
    } catch (error) {
        console.error('Admin roadmaps API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

// ===== ROADMAPS =====

async function getRoadmaps(req: VercelRequest, res: VercelResponse) {
    // Получаем roadmaps
    const { rows: roadmaps } = await query(
        `SELECT id, title, description, category
     FROM roadmaps
     WHERE deleted_at IS NULL
     ORDER BY category, title`
    );

    // Получаем шаги
    const { rows: steps } = await query(
        `SELECT id, roadmap_id, title, description, sort_order
     FROM roadmap_steps
     WHERE deleted_at IS NULL
     ORDER BY roadmap_id, sort_order`
    );

    // Группируем шаги по roadmaps
    const stepsByRoadmap = new Map<string, any[]>();
    for (const step of steps) {
        if (!stepsByRoadmap.has(step.roadmap_id)) {
            stepsByRoadmap.set(step.roadmap_id, []);
        }
        stepsByRoadmap.get(step.roadmap_id)!.push({
            id: step.id,
            title: step.title,
            description: step.description,
            sortOrder: step.sort_order,
        });
    }

    const result = roadmaps.map((roadmap: any) => ({
        id: roadmap.id,
        title: roadmap.title,
        description: roadmap.description,
        category: roadmap.category,
        steps: stepsByRoadmap.get(roadmap.id) || [],
    }));

    return res.status(200).json(successResponse(result));
}

async function createRoadmap(req: VercelRequest, res: VercelResponse) {
    const { title, description, category } = req.body;

    if (!title) {
        return res.status(400).json(errorResponse('title обязателен'));
    }

    const { rows } = await query(
        `INSERT INTO roadmaps (title, description, category)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [title, description, category]
    );

    const roadmap = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        steps: [],
    };

    return res.status(201).json(successResponse(roadmap));
}

async function updateRoadmap(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, category } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID roadmap обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE roadmaps SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      updated_at = NOW()
    WHERE id = $4 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, category, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Roadmap не найден'));
    }

    const roadmap = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
    };

    return res.status(200).json(successResponse(roadmap));
}

async function deleteRoadmap(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID roadmap обязателен'));
    }

    // Удаляем roadmap и все шаги
    const { rowCount } = await query(
        `UPDATE roadmaps 
     SET deleted_at = NOW() 
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Roadmap не найден'));
    }

    // Также удаляем шаги
    await query(
        `UPDATE roadmap_steps 
     SET deleted_at = NOW() 
     WHERE roadmap_id = $1 AND deleted_at IS NULL`,
        [id]
    );

    return res.status(200).json(successResponse({ deleted: true }));
}

// ===== STEPS =====

async function handleSteps(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'POST':
            return await createStep(req, res);
        case 'PUT':
            return await updateStep(req, res);
        case 'DELETE':
            return await deleteStep(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function createStep(req: VercelRequest, res: VercelResponse) {
    const { roadmapId, title, description, sortOrder } = req.body;

    if (!roadmapId || !title) {
        return res.status(400).json(errorResponse('roadmapId и title обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO roadmap_steps (roadmap_id, title, description, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [roadmapId, title, description, sortOrder || 0]
    );

    const step = {
        id: rows[0].id,
        roadmapId: rows[0].roadmap_id,
        title: rows[0].title,
        description: rows[0].description,
        sortOrder: rows[0].sort_order,
    };

    return res.status(201).json(successResponse(step));
}

async function updateStep(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, sortOrder } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID шага обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE roadmap_steps SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      sort_order = COALESCE($3, sort_order)
    WHERE id = $4 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, sortOrder, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Шаг не найден'));
    }

    const step = {
        id: rows[0].id,
        roadmapId: rows[0].roadmap_id,
        title: rows[0].title,
        description: rows[0].description,
        sortOrder: rows[0].sort_order,
    };

    return res.status(200).json(successResponse(step));
}

async function deleteStep(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID шага обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE roadmap_steps 
     SET deleted_at = NOW() 
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Шаг не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}
