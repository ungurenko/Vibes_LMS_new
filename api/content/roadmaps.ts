/**
 * GET /api/content/roadmaps
 * Получение дорожных карт
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

    const { category } = req.query;

    let sql = `
      SELECT
        id, title, description, category, icon,
        estimated_time, difficulty, sort_order
      FROM roadmaps
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];

    if (category && category !== 'Все') {
      sql += ` AND category = $1`;
      params.push(category);
    }

    sql += ` ORDER BY sort_order`;

    const { rows: roadmaps } = await query(sql, params);

    // Получаем шаги для всех roadmaps
    const roadmapIds = roadmaps.map((r: any) => r.id);

    let steps: any[] = [];
    if (roadmapIds.length > 0) {
      const stepsResult = await query(
        `SELECT id, roadmap_id, title, description, link_url, link_text, sort_order
         FROM roadmap_steps
         WHERE roadmap_id = ANY($1)
         ORDER BY roadmap_id, sort_order`,
        [roadmapIds]
      );
      steps = stepsResult.rows;
    }

    // Получаем прогресс пользователя по шагам
    const userProgressResult = await query(
      `SELECT step_id, completed_at
       FROM user_roadmap_step_progress
       WHERE user_id = $1`,
      [tokenData.userId]
    );
    const completedStepIds = new Set(userProgressResult.rows.map((p: any) => p.step_id));

    // Группируем шаги по roadmaps
    const stepsByRoadmap = new Map<string, any[]>();
    for (const step of steps) {
      if (!stepsByRoadmap.has(step.roadmap_id)) {
        stepsByRoadmap.set(step.roadmap_id, []);
      }
      stepsByRoadmap.get(step.roadmap_id)!.push({
        id: step.id,
        title: step.title,
        description: step.description,
        linkUrl: step.link_url,
        linkText: step.link_text,
        completed: completedStepIds.has(step.id),
      });
    }

    // Форматируем ответ
    const result = roadmaps.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      icon: r.icon,
      estimatedTime: r.estimated_time,
      difficulty: r.difficulty,
      steps: stepsByRoadmap.get(r.id) || [],
    }));

    return res.status(200).json(successResponse(result));
  } catch (error) {
    console.error('Get roadmaps error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
