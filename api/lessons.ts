/**
 * GET /api/lessons
 *
 * Публичный API для получения уроков студентами
 * Включает прогресс пользователя по урокам
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import {
    getUserFromRequest,
    successResponse,
    errorResponse,
} from './_lib/auth.js';

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

        const userId = tokenData.userId;

        // Оптимизированный единый запрос с JOIN (вместо 4 отдельных)
        const { rows } = await query(
            `SELECT
                cm.id AS module_id, cm.title AS module_title,
                cm.description AS module_description, cm.status AS module_status,
                cm.sort_order AS module_sort_order,
                l.id AS lesson_id, l.title AS lesson_title,
                l.description AS lesson_description, l.duration,
                l.video_url, l.status AS lesson_status,
                l.sort_order AS lesson_sort_order,
                lm.id AS material_id, lm.title AS material_title,
                lm.type AS material_type, lm.url AS material_url,
                CASE WHEN ulp.completed_at IS NOT NULL THEN true ELSE false END AS completed
            FROM course_modules cm
            LEFT JOIN lessons l ON l.module_id = cm.id AND l.deleted_at IS NULL
            LEFT JOIN lesson_materials lm ON lm.lesson_id = l.id
            LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = $1
            WHERE cm.deleted_at IS NULL
            ORDER BY cm.sort_order, l.sort_order, lm.id`,
            [userId]
        );

        // HTTP кэширование для данных с прогрессом
        res.setHeader('Cache-Control', 'private, max-age=60');

        // Группируем результат в иерархическую структуру
        const modulesMap = new Map<string, any>();
        const lessonsMap = new Map<string, any>();

        for (const row of rows) {
            // Добавляем модуль если ещё нет
            if (!modulesMap.has(row.module_id)) {
                modulesMap.set(row.module_id, {
                    id: row.module_id,
                    title: row.module_title,
                    description: row.module_description,
                    status: row.module_status,
                    sortOrder: row.module_sort_order,
                    lessons: [],
                });
            }

            // Пропускаем если нет урока (модуль без уроков)
            if (!row.lesson_id) continue;

            // Добавляем урок если ещё нет
            if (!lessonsMap.has(row.lesson_id)) {
                const lesson = {
                    id: row.lesson_id,
                    moduleId: row.module_id,
                    title: row.lesson_title,
                    description: row.lesson_description,
                    duration: row.duration,
                    videoUrl: row.video_url,
                    status: row.lesson_status,
                    materials: [],
                    completed: row.completed,
                };
                lessonsMap.set(row.lesson_id, lesson);
                modulesMap.get(row.module_id)!.lessons.push(lesson);
            }

            // Добавляем материал если есть
            if (row.material_id) {
                lessonsMap.get(row.lesson_id)!.materials.push({
                    id: row.material_id,
                    title: row.material_title,
                    type: row.material_type,
                    url: row.material_url,
                });
            }
        }

        // Формируем результат с прогрессом
        const result = Array.from(modulesMap.values())
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((module) => {
                const completedCount = module.lessons.filter((l: any) => l.completed).length;
                const totalCount = module.lessons.length;
                return {
                    id: module.id,
                    title: module.title,
                    description: module.description,
                    status: module.status,
                    lessons: module.lessons,
                    progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
                };
            });

        return res.status(200).json(successResponse(result));
    } catch (error) {
        console.error('Get lessons error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}
