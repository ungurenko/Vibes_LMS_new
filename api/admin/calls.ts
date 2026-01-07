/**
 * API для управления созвонами (Admin Calls)
 *
 * GET    /api/admin/calls       - Получить все созвоны
 * POST   /api/admin/calls       - Создать созвон
 * PUT    /api/admin/calls       - Обновить созвон
 * DELETE /api/admin/calls?id=X  - Удалить созвон
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

        // Только админы могут управлять созвонами
        if (tokenData.role !== 'admin') {
            return res.status(403).json(errorResponse('Доступ запрещён'));
        }

        switch (req.method) {
            case 'GET':
                return await getCalls(req, res);
            case 'POST':
                return await createCall(req, res);
            case 'PUT':
                return await updateCall(req, res);
            case 'DELETE':
                return await deleteCall(req, res);
            default:
                return res.status(405).json(errorResponse('Method not allowed'));
        }
    } catch (error) {
        console.error('Admin calls API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

// GET - Получить все созвоны
async function getCalls(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT 
      id, topic, description, 
      scheduled_date, scheduled_time, duration, timezone,
      status, meeting_url, recording_url, attendees_count,
      created_at, updated_at
    FROM admin_calls 
    WHERE deleted_at IS NULL 
    ORDER BY scheduled_date DESC, scheduled_time DESC`
    );

    const calls = rows.map((row: any) => ({
        id: row.id,
        topic: row.topic,
        description: row.description,
        date: row.scheduled_date,
        time: row.scheduled_time,
        duration: row.duration,
        timezone: row.timezone,
        status: row.status,
        meetingUrl: row.meeting_url,
        recordingUrl: row.recording_url,
        attendeesCount: row.attendees_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));

    return res.status(200).json(successResponse(calls));
}

// POST - Создать созвон
async function createCall(req: VercelRequest, res: VercelResponse) {
    const {
        topic,
        description,
        date,
        time,
        duration,
        timezone = 'Europe/Moscow',
        status = 'scheduled',
        meetingUrl,
        recordingUrl,
    } = req.body;

    if (!topic || !date || !time) {
        return res.status(400).json(errorResponse('Тема, дата и время обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO admin_calls (
      topic, description, scheduled_date, scheduled_time, 
      duration, timezone, status, meeting_url, recording_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
        [topic, description, date, time, duration, timezone, status, meetingUrl, recordingUrl]
    );

    const row = rows[0];
    const call = {
        id: row.id,
        topic: row.topic,
        description: row.description,
        date: row.scheduled_date,
        time: row.scheduled_time,
        duration: row.duration,
        timezone: row.timezone,
        status: row.status,
        meetingUrl: row.meeting_url,
        recordingUrl: row.recording_url,
        attendeesCount: row.attendees_count,
        createdAt: row.created_at,
    };

    return res.status(201).json(successResponse(call));
}

// PUT - Обновить созвон
async function updateCall(req: VercelRequest, res: VercelResponse) {
    const {
        id,
        topic,
        description,
        date,
        time,
        duration,
        timezone,
        status,
        meetingUrl,
        recordingUrl,
    } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID созвона обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE admin_calls SET
      topic = COALESCE($1, topic),
      description = COALESCE($2, description),
      scheduled_date = COALESCE($3, scheduled_date),
      scheduled_time = COALESCE($4, scheduled_time),
      duration = COALESCE($5, duration),
      timezone = COALESCE($6, timezone),
      status = COALESCE($7, status),
      meeting_url = COALESCE($8, meeting_url),
      recording_url = COALESCE($9, recording_url),
      updated_at = NOW()
    WHERE id = $10 AND deleted_at IS NULL
    RETURNING *`,
        [topic, description, date, time, duration, timezone, status, meetingUrl, recordingUrl, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Созвон не найден'));
    }

    const row = rows[0];
    const call = {
        id: row.id,
        topic: row.topic,
        description: row.description,
        date: row.scheduled_date,
        time: row.scheduled_time,
        duration: row.duration,
        timezone: row.timezone,
        status: row.status,
        meetingUrl: row.meeting_url,
        recordingUrl: row.recording_url,
        attendeesCount: row.attendees_count,
        updatedAt: row.updated_at,
    };

    return res.status(200).json(successResponse(call));
}

// DELETE - Удалить созвон (soft delete)
async function deleteCall(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID созвона обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE admin_calls 
     SET deleted_at = NOW() 
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Созвон не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}
