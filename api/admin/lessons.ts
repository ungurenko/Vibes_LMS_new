/**
 * API для управления уроками и модулями курса (Admin)
 *
 * GET    /api/admin/lessons              - Получить все модули с уроками
 * POST   /api/admin/lessons/modules      - Создать модуль
 * PUT    /api/admin/lessons/modules      - Обновить модуль
 * DELETE /api/admin/lessons/modules?id=X - Удалить модуль
 * 
 * POST   /api/admin/lessons              - Создать урок
 * PUT    /api/admin/lessons              - Обновить урок
 * DELETE /api/admin/lessons?id=X         - Удалить урок
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

        // Только админы могут управлять уроками
        if (tokenData.role !== 'admin') {
            return res.status(403).json(errorResponse('Доступ запрещён'));
        }

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
        `SELECT id, lesson_id, title, type, url
     FROM lesson_materials
     ORDER BY lesson_id`
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
        materials = []
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
    for (const material of materials) {
        const { rows: matRows } = await query(
            `INSERT INTO lesson_materials (lesson_id, title, type, url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [lessonId, material.title, material.type, material.url]
        );
        createdMaterials.push({
            id: matRows[0].id,
            title: matRows[0].title,
            type: matRows[0].type,
            url: matRows[0].url,
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
        sortOrder
    } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID урока обязателен'));
    }

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

    const lesson = {
        id: rows[0].id,
        moduleId: rows[0].module_id,
        title: rows[0].title,
        description: rows[0].description,
        duration: rows[0].duration,
        videoUrl: rows[0].video_url,
        status: rows[0].status,
        sortOrder: rows[0].sort_order,
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
