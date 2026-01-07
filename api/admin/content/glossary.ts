/**
 * API для управления глоссарием (Admin)
 *
 * GET    /api/admin/content/glossary     - Получить все термины
 * POST   /api/admin/content/glossary     - Создать термин
 * PUT    /api/admin/content/glossary     - Обновить термин
 * DELETE /api/admin/content/glossary?id=X - Удалить термин
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
    } catch (error) {
        console.error('Admin glossary API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
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
