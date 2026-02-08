/**
 * Admin Content: Glossary Terms CRUD
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

export async function handleGlossary(
    req: VercelRequest,
    res: VercelResponse,
    _tokenData: { userId: string; role: string }
) {
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
