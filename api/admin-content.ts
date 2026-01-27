/**
 * API для управления контентом (Admin) - Объединенный endpoint
 *
 * Используйте query параметр type для указания типа контента:
 * - /api/admin-content?type=styles
 * - /api/admin-content?type=glossary
 * - /api/admin-content?type=prompts
 * - /api/admin-content?type=roadmaps
 *
 * Поддерживаемые методы: GET, POST, PUT, DELETE
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

        // Только админы
        if (tokenData.role !== 'admin') {
            return res.status(403).json(errorResponse('Доступ запрещён'));
        }

        // Определяем тип контента
        const { type } = req.query;
        const contentType = Array.isArray(type) ? type[0] : type;

        // Роутинг по типу контента
        switch (contentType) {
            case 'styles':
                return await handleStyles(req, res);
            case 'glossary':
                return await handleGlossary(req, res);
            case 'prompts':
                return await handlePrompts(req, res);
            case 'categories':
                return await handlePromptCategories(req, res);
            case 'roadmaps':
                return await handleRoadmaps(req, res);
            default:
                return res.status(400).json(errorResponse('Неверный тип контента'));
        }
    } catch (error) {
        console.error('Admin content API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

// ==================== STYLES ====================

async function handleStyles(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'GET':
            return await getStyles(req, res);
        case 'POST':
            return await createStyle(req, res);
        case 'PUT':
            return await updateStyle(req, res);
        case 'DELETE':
            return await deleteStyle(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function getStyles(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT id, name, description, long_description, gradient, image_url,
                prompt, tags, category, usage_count, status, sort_order
     FROM style_cards
     WHERE deleted_at IS NULL
     ORDER BY category, sort_order, name`
    );

    const styles = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        longDescription: row.long_description,
        gradient: row.gradient,
        image: row.image_url,
        prompt: row.prompt,
        tags: row.tags || [],
        category: row.category,
        usageCount: row.usage_count,
        status: row.status,
    }));

    return res.status(200).json(successResponse(styles));
}

async function createStyle(req: VercelRequest, res: VercelResponse) {
    const { name, description, longDescription, gradient, image, prompt, category, tags } = req.body;

    if (!name || !prompt) {
        return res.status(400).json(errorResponse('name и prompt обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO style_cards (name, description, long_description, gradient, image_url, prompt, category, tags, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published')
     RETURNING *`,
        [name, description, longDescription, gradient, image, prompt, category, tags || []]
    );

    const style = {
        id: rows[0].id,
        name: rows[0].name,
        description: rows[0].description,
        longDescription: rows[0].long_description,
        gradient: rows[0].gradient,
        image: rows[0].image_url,
        prompt: rows[0].prompt,
        tags: rows[0].tags || [],
        category: rows[0].category,
        status: rows[0].status,
    };

    return res.status(201).json(successResponse(style));
}

async function updateStyle(req: VercelRequest, res: VercelResponse) {
    const { id, name, description, longDescription, gradient, image, prompt, category, tags, status } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID стиля обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE style_cards SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      long_description = COALESCE($3, long_description),
      gradient = COALESCE($4, gradient),
      image_url = COALESCE($5, image_url),
      prompt = COALESCE($6, prompt),
      category = COALESCE($7, category),
      tags = COALESCE($8, tags),
      status = COALESCE($9, status),
      updated_at = NOW()
    WHERE id = $10 AND deleted_at IS NULL
    RETURNING *`,
        [name, description, longDescription, gradient, image, prompt, category, tags, status, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Стиль не найден'));
    }

    const style = {
        id: rows[0].id,
        name: rows[0].name,
        description: rows[0].description,
        longDescription: rows[0].long_description,
        gradient: rows[0].gradient,
        image: rows[0].image_url,
        prompt: rows[0].prompt,
        tags: rows[0].tags || [],
        category: rows[0].category,
        status: rows[0].status,
    };

    return res.status(200).json(successResponse(style));
}

async function deleteStyle(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID стиля обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE style_cards
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Стиль не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

// ==================== GLOSSARY ====================

async function handleGlossary(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'GET':
            return await getTerms(req, res);
        case 'POST':
            return await createTerm(req, res);
        case 'PUT':
            return await updateTerm(req, res);
        case 'DELETE':
            return await deleteTerm(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function getTerms(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT id, term, definition, category
     FROM glossary_terms
     WHERE deleted_at IS NULL
     ORDER BY category, term`
    );

    const terms = rows.map((row: any) => ({
        id: row.id,
        term: row.term,
        definition: row.definition,
        category: row.category,
    }));

    return res.status(200).json(successResponse(terms));
}

async function createTerm(req: VercelRequest, res: VercelResponse) {
    const { term, definition, category } = req.body;

    if (!term || !definition) {
        return res.status(400).json(errorResponse('term и definition обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO glossary_terms (term, definition, category)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [term, definition, category]
    );

    const newTerm = {
        id: rows[0].id,
        term: rows[0].term,
        definition: rows[0].definition,
        category: rows[0].category,
    };

    return res.status(201).json(successResponse(newTerm));
}

async function updateTerm(req: VercelRequest, res: VercelResponse) {
    const { id, term, definition, category } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID термина обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE glossary_terms SET
      term = COALESCE($1, term),
      definition = COALESCE($2, definition),
      category = COALESCE($3, category),
      updated_at = NOW()
    WHERE id = $4 AND deleted_at IS NULL
    RETURNING *`,
        [term, definition, category, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Термин не найден'));
    }

    const updatedTerm = {
        id: rows[0].id,
        term: rows[0].term,
        definition: rows[0].definition,
        category: rows[0].category,
    };

    return res.status(200).json(successResponse(updatedTerm));
}

async function deleteTerm(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID термина обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE glossary_terms
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Термин не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

// ==================== PROMPTS & CATEGORIES ====================

async function handlePromptCategories(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'GET':
            return await getPromptCategories(req, res);
        case 'POST':
            return await createPromptCategory(req, res);
        case 'PUT':
            return await updatePromptCategory(req, res);
        case 'DELETE':
            return await deletePromptCategory(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function getPromptCategories(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT id, name, color_theme as "colorTheme", sort_order as "sortOrder"
         FROM prompt_categories
         WHERE deleted_at IS NULL
         ORDER BY sort_order`
    );
    return res.status(200).json(successResponse(rows));
}

async function createPromptCategory(req: VercelRequest, res: VercelResponse) {
    const { name, colorTheme, sortOrder } = req.body;
    if (!name) return res.status(400).json(errorResponse('name обязателен'));

    const { rows } = await query(
        `INSERT INTO prompt_categories (name, color_theme, sort_order)
         VALUES ($1, $2, $3)
         RETURNING id, name, color_theme as "colorTheme", sort_order as "sortOrder"`,
        [name, colorTheme || 'default', sortOrder || 0]
    );
    return res.status(201).json(successResponse(rows[0]));
}

async function updatePromptCategory(req: VercelRequest, res: VercelResponse) {
    const { id, name, colorTheme, sortOrder } = req.body;
    if (!id) return res.status(400).json(errorResponse('ID обязателен'));

    const { rows, rowCount } = await query(
        `UPDATE prompt_categories SET
         name = COALESCE($1, name),
         color_theme = COALESCE($2, color_theme),
         sort_order = COALESCE($3, sort_order),
         updated_at = NOW()
         WHERE id = $4 AND deleted_at IS NULL
         RETURNING id, name, color_theme as "colorTheme", sort_order as "sortOrder"`,
        [name, colorTheme, sortOrder, id]
    );

    if (rowCount === 0) return res.status(404).json(errorResponse('Категория не найдена'));
    return res.status(200).json(successResponse(rows[0]));
}

async function deletePromptCategory(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;
    if (!id) return res.status(400).json(errorResponse('ID обязателен'));

    // Check usage
    const { rows: usage } = await query(`SELECT COUNT(*) as count FROM prompts WHERE category_id = $1 AND deleted_at IS NULL`, [id]);
    if (parseInt(usage[0].count) > 0) {
        return res.status(400).json(errorResponse('Нельзя удалить категорию, к которой привязаны промпты'));
    }

    const { rowCount } = await query(
        `UPDATE prompt_categories SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) return res.status(404).json(errorResponse('Категория не найдена'));
    return res.status(200).json(successResponse({ deleted: true }));
}

async function handlePrompts(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'GET':
            return await getPrompts(req, res);
        case 'POST':
            return await createPrompt(req, res);
        case 'PUT':
            return await updatePrompt(req, res);
        case 'DELETE':
            return await deletePrompt(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function getPrompts(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT p.id, p.title, p.description, p.content, p.usage_instruction,
                pc.name as category, pc.id as category_id,
                p.tags, p.copy_count, p.status, p.sort_order,
                p.work_stage, p.task_type
         FROM prompts p
         LEFT JOIN prompt_categories pc ON p.category_id = pc.id
         WHERE p.deleted_at IS NULL
         ORDER BY pc.sort_order, p.sort_order, p.title`
    );

    const prompts = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        content: row.content,
        usage: row.usage_instruction,
        category: row.category,
        categoryId: row.category_id,
        tags: row.tags || [],
        copyCount: row.copy_count,
        status: row.status,
        workStage: row.work_stage,
        taskType: row.task_type,
    }));

    return res.status(200).json(successResponse(prompts));
}

async function createPrompt(req: VercelRequest, res: VercelResponse) {
    const { title, description, content, usage, categoryId, tags, workStage, taskType } = req.body;

    if (!title || !content || !categoryId) {
        return res.status(400).json(errorResponse('title, content и categoryId обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO prompts (title, description, content, usage_instruction, category_id, tags, status, work_stage, task_type)
         VALUES ($1, $2, $3, $4, $5, $6, 'published', $7, $8)
         RETURNING *`,
        [title, description, content, usage, categoryId, tags || [], workStage || null, taskType || null]
    );

    // Fetch category name for response
    const { rows: catRows } = await query(`SELECT name FROM prompt_categories WHERE id = $1`, [categoryId]);
    const categoryName = catRows[0]?.name || '';

    const prompt = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        content: rows[0].content,
        usage: rows[0].usage_instruction,
        categoryId: rows[0].category_id,
        category: categoryName,
        tags: rows[0].tags || [],
        status: rows[0].status,
        workStage: rows[0].work_stage,
        taskType: rows[0].task_type,
    };

    return res.status(201).json(successResponse(prompt));
}

async function updatePrompt(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, content, usage, categoryId, tags, status, workStage, taskType } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID промпта обязателен'));
    }

    // Для workStage и taskType: undefined = не менять, null или '' = сбросить в NULL
    const workStageValue = workStage === undefined ? undefined : (workStage || null);
    const taskTypeValue = taskType === undefined ? undefined : (taskType || null);

    const { rows, rowCount } = await query(
        `UPDATE prompts SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          content = COALESCE($3, content),
          usage_instruction = COALESCE($4, usage_instruction),
          category_id = COALESCE($5, category_id),
          tags = COALESCE($6, tags),
          status = COALESCE($7, status),
          work_stage = CASE WHEN $8::boolean THEN $9 ELSE work_stage END,
          task_type = CASE WHEN $10::boolean THEN $11 ELSE task_type END,
          updated_at = NOW()
        WHERE id = $12 AND deleted_at IS NULL
        RETURNING *`,
        [
            title, description, content, usage, categoryId, tags, status,
            workStage !== undefined, workStageValue,
            taskType !== undefined, taskTypeValue,
            id
        ]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Промпт не найден'));
    }

    // Fetch category name
    const { rows: catRows } = await query(`SELECT name FROM prompt_categories WHERE id = $1`, [rows[0].category_id]);
    const categoryName = catRows[0]?.name || '';

    const prompt = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        content: rows[0].content,
        usage: rows[0].usage_instruction,
        categoryId: rows[0].category_id,
        category: categoryName,
        tags: rows[0].tags || [],
        status: rows[0].status,
        workStage: rows[0].work_stage,
        taskType: rows[0].task_type,
    };

    return res.status(200).json(successResponse(prompt));
}

async function deletePrompt(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID промпта обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE prompts
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Промпт не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

// ==================== ROADMAPS ====================

async function handleRoadmaps(req: VercelRequest, res: VercelResponse) {
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
}

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
