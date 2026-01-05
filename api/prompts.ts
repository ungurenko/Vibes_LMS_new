/**
 * GET /api/prompts
 *
 * Получить все промпты
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db';
import {
  getUserFromRequest,
  successResponse,
  errorResponse,
} from './_lib/auth';

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

    // Фильтр по категории (опционально)
    const { category } = req.query;

    let sql = `
      SELECT
        id, title, description, content, usage_instruction,
        category, tags, copy_count, status, sort_order
      FROM prompts
      WHERE deleted_at IS NULL AND status = 'published'
    `;
    const params: any[] = [];

    if (category) {
      sql += ` AND category = $1`;
      params.push(category);
    }

    sql += ` ORDER BY sort_order`;

    const { rows: prompts } = await query(sql, params);

    // Получаем шаги для multi-step промптов
    const promptIds = prompts.map((p: any) => p.id);

    let steps: any[] = [];
    if (promptIds.length > 0) {
      const stepsResult = await query(
        `SELECT id, prompt_id, title, description, content, sort_order
         FROM prompt_steps
         WHERE prompt_id = ANY($1)
         ORDER BY prompt_id, sort_order`,
        [promptIds]
      );
      steps = stepsResult.rows;
    }

    // Группируем шаги по промптам
    const stepsByPrompt = new Map<string, any[]>();
    for (const step of steps) {
      if (!stepsByPrompt.has(step.prompt_id)) {
        stepsByPrompt.set(step.prompt_id, []);
      }
      stepsByPrompt.get(step.prompt_id)!.push({
        title: step.title,
        description: step.description,
        content: step.content,
      });
    }

    // Форматируем ответ
    const result = prompts.map((p: any) => {
      const promptSteps = stepsByPrompt.get(p.id);

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        content: p.content,
        usage: p.usage_instruction,
        category: p.category,
        tags: p.tags || [],
        // Если есть шаги, это multi-step промпт
        steps: promptSteps || undefined,
      };
    });

    return res.status(200).json(successResponse(result));
  } catch (error) {
    console.error('Get prompts error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
