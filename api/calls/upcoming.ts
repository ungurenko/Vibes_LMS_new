/**
 * GET /api/calls/upcoming
 *
 * Получить ближайший запланированный созвон для студентов
 * Используется на Dashboard для отображения виджета "Следующий созвон"
 * Фильтрует по когорте пользователя + кросс-доступ через cohort_call_access
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db.js';
import {
    getUserFromRequest,
    successResponse,
    errorResponse,
} from '../_lib/auth.js';

function parseLocalDate(dateValue: string | Date): Date {
    if (dateValue instanceof Date) {
        return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
    }

    const [year, month, day] = dateValue.slice(0, 10).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
}

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
        // Логика доступа:
        // - студент: свой поток + расшаренные + глобальные созвоны (cohort_id IS NULL)
        // - админ: режим превью (без когортного ограничения)
        const { rows } = await query(
            `WITH current_user AS (
        SELECT cohort_id
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
      )
      SELECT
        ac.id, ac.topic, ac.description,
        ac.scheduled_date, ac.scheduled_time, ac.duration, ac.timezone,
        ac.status, ac.meeting_url
      FROM admin_calls ac
      WHERE ac.deleted_at IS NULL
        AND ac.status IN ('scheduled', 'live')
        AND (
          ac.scheduled_date > CURRENT_DATE
          OR (ac.scheduled_date = CURRENT_DATE AND ac.scheduled_time >= CURRENT_TIME)
        )
        AND (
          $2::text = 'admin'
          OR ac.cohort_id IS NULL
          OR ac.cohort_id = (SELECT cohort_id FROM current_user)
          OR ac.id IN (
            SELECT cca.call_id
            FROM cohort_call_access cca
            JOIN current_user cu ON cu.cohort_id IS NOT NULL
            WHERE cca.cohort_id = cu.cohort_id
          )
        )
      ORDER BY ac.scheduled_date ASC, ac.scheduled_time ASC
      LIMIT 1`,
            [tokenData.userId, tokenData.role]
        );

        if (rows.length === 0) {
            // Нет предстоящих созвонов
            return res.status(200).json(successResponse(null));
        }

        const row = rows[0];

        // Вычисляем относительную дату для отображения
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const callDate = parseLocalDate(row.scheduled_date);
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
