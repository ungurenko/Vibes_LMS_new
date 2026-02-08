/**
 * Admin Content: Prompts CRUD + Prompt Categories CRUD
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

// ==================== PROMPTS ====================

export async function handlePrompts(
    req: VercelRequest,
    res: VercelResponse,
    _tokenData: { userId: string; role: string }
) {
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

// ==================== PROMPT CATEGORIES ====================

export async function handlePromptCategories(
    req: VercelRequest,
    res: VercelResponse,
    _tokenData: { userId: string; role: string }
) {
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
