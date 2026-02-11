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
import { getUserCohortId } from './_lib/cohort.js';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method === 'POST') {
        try {
            const tokenData = getUserFromRequest(req);
            if (!tokenData) {
                return res.status(401).json(errorResponse('Не авторизован'));
            }

            const { lessonId, completed } = req.body;
            if (!lessonId) {
                return res.status(400).json(errorResponse('Не указан lessonId'));
            }

            const userId = tokenData.userId;

            if (completed) {
                // Mark as completed
                await query(
                    `INSERT INTO user_lesson_progress (user_id, lesson_id, status, completed_at, started_at)
                     VALUES ($1, $2, 'completed', NOW(), NOW())
                     ON CONFLICT (user_id, lesson_id)
                     DO UPDATE SET
                        status = 'completed',
                        completed_at = NOW(),
                        started_at = COALESCE(user_lesson_progress.started_at, NOW())`,
                    [userId, lessonId]
                );
            } else {
                // Mark as not completed (available)
                await query(
                    `UPDATE user_lesson_progress
                     SET status = 'available', completed_at = NULL
                     WHERE user_id = $1 AND lesson_id = $2`,
                    [userId, lessonId]
                );
            }

            // Also update total user progress (simple calculation based on total lessons)
            // 1. Get total active lessons count
            const totalRes = await query(`SELECT COUNT(*) as count FROM lessons WHERE deleted_at IS NULL AND status != 'draft'`);
            const totalLessons = parseInt(totalRes.rows[0].count) || 1;

            // 2. Get completed lessons count for user
            const completedRes = await query(
                `SELECT COUNT(*) as count FROM user_lesson_progress
                 WHERE user_id = $1 AND status = 'completed'`,
                [userId]
            );
            const completedLessons = parseInt(completedRes.rows[0].count) || 0;

            // 3. Update user profile
            const progressPercent = Math.min(100, Math.round((completedLessons / totalLessons) * 100));
            await query(`UPDATE users SET progress_percent = $1 WHERE id = $2`, [progressPercent, userId]);

            return res.status(200).json(successResponse({ completed, progressPercent }));
        } catch (error) {
            console.error('Update lesson progress error:', error);
            return res.status(500).json(errorResponse('Ошибка сервера при обновлении прогресса'));
        }
    }

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

        // Get user's cohort for module filtering
        const userCohortId = await getUserCohortId(userId);

        // Build cohort filter condition
        const cohortJoin = userCohortId
            ? `INNER JOIN module_cohorts mc ON mc.module_id = cm.id AND mc.cohort_id = $2`
            : '';
        const cohortParams = userCohortId ? [userId, userCohortId] : [userId];
        const userParam = '$1';
        const cohortFilterForMaterials = userCohortId
            ? `JOIN module_cohorts mc ON mc.module_id = cm.id AND mc.cohort_id = $1`
            : '';
        const cohortFilterForTasks = userCohortId
            ? `JOIN module_cohorts mc ON mc.module_id = cm.id AND mc.cohort_id = $2`
            : '';

        // 3 параллельных запроса вместо 1 mega-JOIN с 5 LEFT JOIN
        // (избегаем картезианского произведения materials × tasks)
        const [modulesLessonsResult, materialsResult, tasksResult] = await Promise.all([
            // 1. Модули + уроки + прогресс (2 JOIN) + cohort filter
            query(
                `SELECT
                    cm.id AS module_id, cm.title AS module_title,
                    cm.description AS module_description, cm.status AS module_status,
                    cm.sort_order AS module_sort_order,
                    l.id AS lesson_id, l.title AS lesson_title,
                    l.description AS lesson_description, l.duration,
                    l.video_url, l.status AS lesson_status,
                    l.sort_order AS lesson_sort_order,
                    CASE WHEN ulp.completed_at IS NOT NULL THEN true ELSE false END AS completed
                FROM course_modules cm
                ${cohortJoin}
                LEFT JOIN lessons l ON l.module_id = cm.id AND l.deleted_at IS NULL
                LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = ${userParam}
                WHERE cm.deleted_at IS NULL
                ORDER BY cm.sort_order, l.sort_order`,
                cohortParams
            ),
            // 2. Материалы (все для активных уроков)
            query(
                `SELECT lm.id, lm.lesson_id, lm.title, lm.type, lm.url, lm.sort_order
                FROM lesson_materials lm
                JOIN lessons l ON l.id = lm.lesson_id AND l.deleted_at IS NULL
                JOIN course_modules cm ON cm.id = l.module_id AND cm.deleted_at IS NULL
                ${cohortFilterForMaterials}
                ORDER BY lm.sort_order`,
                userCohortId ? [userCohortId] : []
            ),
            // 3. Задания + прогресс заданий
            query(
                `SELECT lt.id, lt.lesson_id, lt.text, lt.sort_order,
                    CASE WHEN ultp.completed_at IS NOT NULL THEN true ELSE false END AS task_completed
                FROM lesson_tasks lt
                JOIN lessons l ON l.id = lt.lesson_id AND l.deleted_at IS NULL
                JOIN course_modules cm ON cm.id = l.module_id AND cm.deleted_at IS NULL
                ${cohortFilterForTasks}
                LEFT JOIN user_lesson_task_progress ultp ON ultp.task_id = lt.id AND ultp.user_id = $1
                ORDER BY lt.sort_order`,
                userCohortId ? [userId, userCohortId] : [userId]
            )
        ]);

        // Кэширование на 2 мин для ускорения повторных загрузок
        // private — кэш только для конкретного пользователя
        // stale-while-revalidate — показывать устаревшие данные пока идёт обновление
        res.setHeader('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');

        // Индексируем материалы и задания по lesson_id
        const materialsByLesson = new Map<string, any[]>();
        for (const m of materialsResult.rows) {
            if (!materialsByLesson.has(m.lesson_id)) materialsByLesson.set(m.lesson_id, []);
            materialsByLesson.get(m.lesson_id)!.push({
                id: m.id, title: m.title, type: m.type, url: m.url,
            });
        }

        const tasksByLesson = new Map<string, any[]>();
        for (const t of tasksResult.rows) {
            if (!tasksByLesson.has(t.lesson_id)) tasksByLesson.set(t.lesson_id, []);
            tasksByLesson.get(t.lesson_id)!.push({
                id: t.id, text: t.text, completed: t.task_completed,
            });
        }

        // Собираем иерархию из плоского результата
        const modulesMap = new Map<string, any>();
        const seenLessons = new Set<string>();

        for (const row of modulesLessonsResult.rows) {
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

            if (!row.lesson_id || seenLessons.has(row.lesson_id)) continue;
            seenLessons.add(row.lesson_id);

            const computedStatus = row.completed ? 'completed' : row.lesson_status;
            modulesMap.get(row.module_id)!.lessons.push({
                id: row.lesson_id,
                moduleId: row.module_id,
                title: row.lesson_title,
                description: row.lesson_description,
                duration: row.duration,
                videoUrl: row.video_url,
                status: computedStatus,
                materials: materialsByLesson.get(row.lesson_id) || [],
                tasks: tasksByLesson.get(row.lesson_id) || [],
                completed: row.completed,
            });
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
