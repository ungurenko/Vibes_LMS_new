import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

// ===== MODULES =====

// POST - Создать модуль
async function createModule(req: VercelRequest, res: VercelResponse) {
    const { title, description, status = 'locked', sortOrder, cohortIds } = req.body;

    if (!title) {
        return res.status(400).json(errorResponse('Название модуля обязательно'));
    }

    const { rows } = await query(
        `INSERT INTO course_modules (title, description, status, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [title, description, status, sortOrder || 0]
    );

    const moduleId = rows[0].id;

    // Save cohort associations
    if (cohortIds && Array.isArray(cohortIds) && cohortIds.length > 0) {
        const values = cohortIds.map((_: string, i: number) => `($1, $${i + 2})`).join(', ');
        await query(
            `INSERT INTO module_cohorts (module_id, cohort_id) VALUES ${values} ON CONFLICT DO NOTHING`,
            [moduleId, ...cohortIds]
        );
    }

    const module = {
        id: moduleId,
        title: rows[0].title,
        description: rows[0].description,
        status: rows[0].status,
        sortOrder: rows[0].sort_order,
        lessons: [],
        cohortIds: cohortIds || [],
    };

    return res.status(201).json(successResponse(module));
}

// PUT - Обновить модуль
async function updateModule(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, status, sortOrder, cohortIds } = req.body;

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

    // Sync cohort associations if provided
    if (cohortIds && Array.isArray(cohortIds)) {
        await query(`DELETE FROM module_cohorts WHERE module_id = $1`, [id]);
        if (cohortIds.length > 0) {
            const values = cohortIds.map((_: string, i: number) => `($1, $${i + 2})`).join(', ');
            await query(
                `INSERT INTO module_cohorts (module_id, cohort_id) VALUES ${values} ON CONFLICT DO NOTHING`,
                [id, ...cohortIds]
            );
        }
    }

    const module = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        status: rows[0].status,
        sortOrder: rows[0].sort_order,
        cohortIds: cohortIds || [],
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

    // Получаем привязки модулей к когортам
    const { rows: moduleCohorts } = await query(
        `SELECT module_id, cohort_id FROM module_cohorts`
    );

    // Группируем когорты по модулям
    const cohortsByModule = new Map<string, string[]>();
    for (const mc of moduleCohorts) {
        if (!cohortsByModule.has(mc.module_id)) {
            cohortsByModule.set(mc.module_id, []);
        }
        cohortsByModule.get(mc.module_id)!.push(mc.cohort_id);
    }

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
        cohortIds: cohortsByModule.get(module.id) || [],
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

    // Валидация статуса
    const validStatuses = ['locked', 'available', 'completed', 'current', 'draft', 'hidden'];
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json(errorResponse(`Недопустимый статус: ${status}`));
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

    // Валидация статуса
    const validStatuses = ['locked', 'available', 'completed', 'current', 'draft', 'hidden'];
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json(errorResponse(`Недопустимый статус: ${status}`));
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
        // Валидация материалов перед сохранением
        for (const material of materials) {
            if (!material.title?.trim() || !material.url?.trim()) {
                return res.status(400).json(errorResponse('Название и URL материала обязательны'));
            }
        }

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

export async function handleLessons(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
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
