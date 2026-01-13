/**
 * GET /api/calls/upcoming
 *
 * Получить ближайший запланированный созвон для студентов
 * Используется на Dashboard для отображения виджета "Следующий созвон"
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
    if (req.method !== 'GET') {
        return res.status(405).json(errorResponse('Method not allowed'));
    }

    try {
        // Проверяем авторизацию
        const tokenData = getUserFromRequest(req);
        if (!tokenData) {
            return res.status(401).json(errorResponse('Не авторизован'));
        }

        // Получаем ближайший созвон со статусом scheduled или live
        const { rows } = await query(
            `SELECT 
        id, topic, description, 
        scheduled_date, scheduled_time, duration, timezone,
        status, meeting_url
      FROM admin_calls 
      WHERE deleted_at IS NULL 
        AND status IN ('scheduled', 'live')
        AND (scheduled_date > CURRENT_DATE 
             OR (scheduled_date = CURRENT_DATE AND scheduled_time >= CURRENT_TIME))
      ORDER BY scheduled_date ASC, scheduled_time ASC
      LIMIT 1`
        );

        if (rows.length === 0) {
            // Нет предстоящих созвонов
            return res.status(200).json(successResponse(null));
        }

        const row = rows[0];

        // Вычисляем относительную дату для отображения
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const callDate = new Date(row.scheduled_date);
        callDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((callDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let relativeDate: string;
        if (diffDays === 0) {
            relativeDate = 'Сегодня';
        } else if (diffDays === 1) {
            relativeDate = 'Завтра';
        } else if (diffDays < 7) {
            const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
            relativeDate = days[callDate.getDay()];
        } else {
            relativeDate = callDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        }

        const call = {
            id: row.id,
            topic: row.topic,
            description: row.description,
            date: row.scheduled_date,
            time: row.scheduled_time?.slice(0, 5), // "19:00" формат
            duration: row.duration,
            timezone: row.timezone,
            status: row.status,
            meetingUrl: row.meeting_url,
            relativeDate, // "Завтра", "Сегодня", "Понедельник" и т.д.
        };

        return res.status(200).json(successResponse(call));
    } catch (error) {
        console.error('Get upcoming call error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}
