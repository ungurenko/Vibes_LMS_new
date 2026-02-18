import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

function normalizeCohortId(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    if (!normalized || normalized.toLowerCase() === 'all') {
        return null;
    }

    return normalized;
}

// GET - Получить все созвоны
async function getCalls(req: VercelRequest, res: VercelResponse) {
    const cohortId = req.query.cohortId;

    const { rows } = await query(
        `SELECT
      id, topic, description,
      scheduled_date, scheduled_time, duration, timezone,
      status, meeting_url, recording_url, attendees_count,
      reminders, cohort_id,
      created_at, updated_at
    FROM admin_calls
    WHERE deleted_at IS NULL
      ${cohortId ? 'AND (cohort_id = $1 OR cohort_id IS NULL)' : ''}
    ORDER BY scheduled_date DESC, scheduled_time DESC`,
        cohortId ? [cohortId] : []
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
        reminders: row.reminders || [],
        cohortId: row.cohort_id,
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
        reminders = [],
        cohortId,
    } = req.body;

    if (!topic || !date || !time) {
        return res.status(400).json(errorResponse('Тема, дата и время обязательны'));
    }

    const normalizedCohortId = normalizeCohortId(cohortId);

    const { rows } = await query(
        `INSERT INTO admin_calls (
      topic, description, scheduled_date, scheduled_time,
      duration, timezone, status, meeting_url, recording_url, reminders, cohort_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
        [topic, description, date, time, duration, timezone, status, meetingUrl, recordingUrl, reminders, normalizedCohortId]
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
        reminders: row.reminders || [],
        cohortId: row.cohort_id,
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
        reminders,
        cohortId,
    } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID созвона обязателен'));
    }

    const hasCohortIdField = Object.prototype.hasOwnProperty.call(req.body, 'cohortId');
    const normalizedCohortId = hasCohortIdField ? normalizeCohortId(cohortId) : null;

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
      reminders = COALESCE($10, reminders),
      cohort_id = CASE
        WHEN $11::boolean THEN $12::uuid
        ELSE cohort_id
      END,
      updated_at = NOW()
    WHERE id = $13 AND deleted_at IS NULL
    RETURNING *`,
        [
            topic,
            description,
            date,
            time,
            duration,
            timezone,
            status,
            meetingUrl,
            recordingUrl,
            reminders,
            hasCohortIdField,
            normalizedCohortId,
            id
        ]
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
        reminders: row.reminders || [],
        cohortId: row.cohort_id,
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

export async function handleCalls(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
  try {
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
