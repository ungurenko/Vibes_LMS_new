/**
 * API для управления промптами (Admin)
 *
 * GET    /api/admin/content/prompts     - Получить все промпты
 * POST   /api/admin/content/prompts     - Создать промпт
 * PUT    /api/admin/content/prompts     - Обновить промпт
 * DELETE /api/admin/content/prompts?id=X - Удалить промпт
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
    } catch (error) {
        console.error('Admin prompts API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

async function getPrompts(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT id, title, description, category, prompt_text
     FROM prompts
     WHERE deleted_at IS NULL
     ORDER BY category, title`
    );

    const prompts = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        promptText: row.prompt_text,
    }));

    return res.status(200).json(successResponse(prompts));
}

async function createPrompt(req: VercelRequest, res: VercelResponse) {
    const { title, description, category, promptText } = req.body;

    if (!title || !promptText) {
        return res.status(400).json(errorResponse('title и promptText обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO prompts (title, description, category, prompt_text)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [title, description, category, promptText]
    );

    const prompt = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        promptText: rows[0].prompt_text,
    };

    return res.status(201).json(successResponse(prompt));
}

async function updatePrompt(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, category, promptText } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID промпта обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE prompts SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      prompt_text = COALESCE($4, prompt_text),
      updated_at = NOW()
    WHERE id = $5 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, category, promptText, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Промпт не найден'));
    }

    const prompt = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        promptText: rows[0].prompt_text,
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
