import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

function mapActionToIconType(actionType: string): string {
    if (actionType === 'lesson' || actionType === 'task_complete') return 'lesson';
    if (actionType === 'chat') return 'chat';
    if (actionType === 'project') return 'project';
    if (actionType === 'login' || actionType === 'logout' || actionType === 'registration') return 'login';
    return 'login'; // default
}

function formatActivityDate(date: Date): string {
    return new Date(date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export async function handleActivityLog(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
    if (req.method !== 'GET') {
        return res.status(405).json(errorResponse('Method not allowed'));
    }

    try {
        const { userId, limit = 50 } = req.query;

        if (!userId) {
            return res.status(400).json(errorResponse('UserId обязателен'));
        }

        const { rows } = await query(
            `SELECT
                id, action_type, action_description, target_type, target_title, created_at
             FROM activity_log
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        const activity = rows.map((row: any) => ({
            id: row.id,
            action: row.action_description,
            target: row.target_title || '',
            date: formatActivityDate(row.created_at),
            timestamp: row.created_at, // For sorting if needed
            iconType: mapActionToIconType(row.action_type)
        }));

        return res.status(200).json(successResponse(activity));

    } catch (error) {
        console.error('Admin activity log error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}
