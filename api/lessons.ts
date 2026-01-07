/**
 * GET /api/lessons
 *
 * Публичный API для получения уроков студентами
 * Включает прогресс пользователя по урокам
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

        const userId = tokenData.userId;

        // Получаем модули
        const { rows: modules } = await query(
            `SELECT id, title, description, status, sort_order
       FROM course_modules
       WHERE deleted_at IS NULL
       ORDER BY sort_order`
        );

        // Получаем уроки
        const { rows: lessons } = await query(
            `SELECT 
        id, module_id, title, description, duration, 
        video_url, status, sort_order
       FROM lessons
       WHERE deleted_at IS NULL
       ORDER BY module_id, sort_order`
        );

        // Получаем материалы
        const { rows: materials } = await query(
            `SELECT id, lesson_id, title, type, url
       FROM lesson_materials
       ORDER BY lesson_id`
        );

        // Получаем прогресс пользователя
        const { rows: progress } = await query(
            `SELECT lesson_id, completed_at
       FROM user_lesson_progress
       WHERE user_id = $1`,
            [userId]
        );

        // Создаём Map для быстрого доступа к прогрессу
        const progressMap = new Map();
        for (const p of progress) {
            progressMap.set(p.lesson_id, {
                completed: !!p.completed_at,
            });
        }

        // Группируем материалы по урокам
        const materialsByLesson = new Map<string, any[]>();
        for (const material of materials) {
            if (!materialsByLesson.has(material.lesson_id)) {
                materialsByLesson.set(material.lesson_id, []);
            }
            materialsByLesson.get(material.lesson_id)!.push({
                id: material.id,
                title: material.title,
                type: material.type,
                url: material.url,
            });
        }

        // Группируем уроки по модулям и добавляем прогресс
        const lessonsByModule = new Map<string, any[]>();
        for (const lesson of lessons) {
            if (!lessonsByModule.has(lesson.module_id)) {
                lessonsByModule.set(lesson.module_id, []);
            }

            const userProgress = progressMap.get(lesson.id) || { completed: false };

            lessonsByModule.get(lesson.module_id)!.push({
                id: lesson.id,
                moduleId: lesson.module_id,
                title: lesson.title,
                description: lesson.description,
                duration: lesson.duration,
                videoUrl: lesson.video_url,
                status: lesson.status,
                materials: materialsByLesson.get(lesson.id) || [],
                completed: userProgress.completed,
            });
        }

        // Формируем результат
        const result = modules.map((module: any) => {
            const moduleLessons = lessonsByModule.get(module.id) || [];
            const completedCount = moduleLessons.filter((l: any) => l.completed).length;
            const totalCount = moduleLessons.length;

            return {
                id: module.id,
                title: module.title,
                description: module.description,
                status: module.status,
                lessons: moduleLessons,
                progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
            };
        });

        return res.status(200).json(successResponse(result));
    } catch (error) {
        console.error('Get lessons error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}
