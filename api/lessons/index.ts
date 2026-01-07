/**
 * GET /api/lessons
 *
 * Получить все модули курса с уроками
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

    // Получаем модули
    const modulesResult = await query(
      `SELECT id, title, description, status, sort_order
       FROM course_modules
       WHERE deleted_at IS NULL
       ORDER BY sort_order`
    );

    // Получаем уроки для всех модулей
    const lessonsResult = await query(
      `SELECT
        l.id,
        l.module_id,
        l.title,
        l.description,
        l.duration,
        l.video_url,
        l.status,
        l.sort_order,
        l.views_count,
        l.completions_count
       FROM lessons l
       WHERE l.deleted_at IS NULL
       ORDER BY l.module_id, l.sort_order`
    );

    // Получаем материалы для всех уроков
    const materialsResult = await query(
      `SELECT id, lesson_id, title, type, url, sort_order
       FROM lesson_materials
       ORDER BY lesson_id, sort_order`
    );

    // Получаем задачи для всех уроков
    const tasksResult = await query(
      `SELECT id, lesson_id, text, sort_order
       FROM lesson_tasks
       ORDER BY lesson_id, sort_order`
    );

    // Получаем прогресс пользователя по урокам
    const userProgressResult = await query(
      `SELECT lesson_id, status, completed_at
       FROM user_lesson_progress
       WHERE user_id = $1`,
      [tokenData.userId]
    );

    // Получаем выполненные задачи пользователя
    const userTasksResult = await query(
      `SELECT task_id, completed_at
       FROM user_lesson_task_progress
       WHERE user_id = $1`,
      [tokenData.userId]
    );

    // Группируем материалы и задачи по урокам
    const materialsByLesson = new Map<string, any[]>();
    for (const m of materialsResult.rows) {
      if (!materialsByLesson.has(m.lesson_id)) {
        materialsByLesson.set(m.lesson_id, []);
      }
      materialsByLesson.get(m.lesson_id)!.push({
        id: m.id,
        title: m.title,
        type: m.type,
        url: m.url,
      });
    }

    const tasksByLesson = new Map<string, any[]>();
    const completedTaskIds = new Set(userTasksResult.rows.map((t: any) => t.task_id));

    for (const t of tasksResult.rows) {
      if (!tasksByLesson.has(t.lesson_id)) {
        tasksByLesson.set(t.lesson_id, []);
      }
      tasksByLesson.get(t.lesson_id)!.push({
        id: t.id,
        text: t.text,
        completed: completedTaskIds.has(t.id),
      });
    }

    // Группируем уроки по модулям
    const userLessonProgress = new Map<string, any>();
    for (const p of userProgressResult.rows) {
      userLessonProgress.set(p.lesson_id, p);
    }

    const lessonsByModule = new Map<string, any[]>();
    for (const lesson of lessonsResult.rows) {
      if (!lessonsByModule.has(lesson.module_id)) {
        lessonsByModule.set(lesson.module_id, []);
      }

      const progress = userLessonProgress.get(lesson.id);

      lessonsByModule.get(lesson.module_id)!.push({
        id: lesson.id,
        moduleId: lesson.module_id,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        videoUrl: lesson.video_url,
        status: progress?.status || lesson.status,
        materials: materialsByLesson.get(lesson.id) || [],
        tasks: tasksByLesson.get(lesson.id) || [],
      });
    }

    // Формируем итоговый результат
    const modules = modulesResult.rows.map((module: any) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      status: module.status,
      lessons: lessonsByModule.get(module.id) || [],
    }));

    return res.status(200).json(successResponse(modules));
  } catch (error) {
    console.error('Get lessons error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
