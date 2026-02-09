import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

// GET - Список когорт с доступом к созвону
async function getCallAccess(req: VercelRequest, res: VercelResponse) {
    const { callId } = req.query;

    if (!callId) {
        return res.status(400).json(errorResponse('callId обязателен'));
    }

    const { rows } = await query(
        `SELECT cca.id, cca.cohort_id, c.name as cohort_name, cca.granted_at
         FROM cohort_call_access cca
         JOIN cohorts c ON c.id = cca.cohort_id
         WHERE cca.call_id = $1
         ORDER BY c.sort_order`,
        [callId]
    );

    const access = rows.map((row: any) => ({
        id: row.id,
        cohortId: row.cohort_id,
        cohortName: row.cohort_name,
        grantedAt: row.granted_at,
    }));

    return res.status(200).json(successResponse(access));
}

// POST - Дать доступ когорте к созвону
async function grantCallAccess(req: VercelRequest, res: VercelResponse) {
    const { callId, cohortId } = req.body;

    if (!callId || !cohortId) {
        return res.status(400).json(errorResponse('callId и cohortId обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO cohort_call_access (call_id, cohort_id)
         VALUES ($1, $2)
         ON CONFLICT (call_id, cohort_id) DO NOTHING
         RETURNING *`,
        [callId, cohortId]
    );

    return res.status(201).json(successResponse(rows[0] || { callId, cohortId, exists: true }));
}

// DELETE - Отозвать доступ
async function revokeCallAccess(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID записи доступа обязателен'));
    }

    const { rowCount } = await query(
        `DELETE FROM cohort_call_access WHERE id = $1`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Запись доступа не найдена'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

export async function handleCallAccess(
    req: VercelRequest,
    res: VercelResponse,
    tokenData: { userId: string; role: string }
) {
    try {
        switch (req.method) {
            case 'GET':
                return await getCallAccess(req, res);
            case 'POST':
                return await grantCallAccess(req, res);
            case 'DELETE':
                return await revokeCallAccess(req, res);
            default:
                return res.status(405).json(errorResponse('Method not allowed'));
        }
    } catch (error) {
        console.error('Admin call-access API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}
