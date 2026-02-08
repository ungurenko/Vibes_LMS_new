/**
 * Admin Content: Style Cards CRUD
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

export async function handleStyles(
    req: VercelRequest,
    res: VercelResponse,
    _tokenData: { userId: string; role: string }
) {
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
