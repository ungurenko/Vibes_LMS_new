/**
 * API для управления стилями (Admin)
 *
 * GET    /api/admin/content/styles     - Получить все стили
 * POST   /api/admin/content/styles     - Создать стиль
 * PUT    /api/admin/content/styles     - Обновить стиль
 * DELETE /api/admin/content/styles?id=X - Удалить стиль
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

        // Только админы
        if (tokenData.role !== 'admin') {
            return res.status(403).json(errorResponse('Доступ запрещён'));
        }

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
    } catch (error) {
        console.error('Admin styles API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

// GET - Получить все стили
async function getStyles(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT id, title, description, category, css_code, preview_html, status
     FROM style_cards
     WHERE deleted_at IS NULL
     ORDER BY category, title`
    );

    const styles = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        cssCode: row.css_code,
        previewHtml: row.preview_html,
        status: row.status,
    }));

    return res.status(200).json(successResponse(styles));
}

// POST - Создать стиль
async function createStyle(req: VercelRequest, res: VercelResponse) {
    const { title, description, category, cssCode, previewHtml, status = 'draft' } = req.body;

    if (!title || !category) {
        return res.status(400).json(errorResponse('title и category обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO style_cards (title, description, category, css_code, preview_html, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [title, description, category, cssCode, previewHtml, status]
    );

    const style = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        cssCode: rows[0].css_code,
        previewHtml: rows[0].preview_html,
        status: rows[0].status,
    };

    return res.status(201).json(successResponse(style));
}

// PUT - Обновить стиль
async function updateStyle(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, category, cssCode, previewHtml, status } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID стиля обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE style_cards SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      css_code = COALESCE($4, css_code),
      preview_html = COALESCE($5, preview_html),
      status = COALESCE($6, status),
      updated_at = NOW()
    WHERE id = $7 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, category, cssCode, previewHtml, status, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Стиль не найден'));
    }

    const style = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        cssCode: rows[0].css_code,
        previewHtml: rows[0].preview_html,
        status: rows[0].status,
    };

    return res.status(200).json(successResponse(style));
}

// DELETE - Удалить стиль
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
