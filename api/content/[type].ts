/**
 * GET /api/content/[type]
 *
 * Универсальный эндпоинт для получения контента:
 * - /api/content/glossary - термины глоссария
 * - /api/content/prompts - промпты
 * - /api/content/styles - стили дизайна
 * - /api/content/roadmaps - дорожные карты
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

    const { type } = req.query;
    const contentType = Array.isArray(type) ? type[0] : type;

    // Роутинг по типу контента
    switch (contentType) {
      case 'glossary':
        return await getGlossary(req, res, tokenData);
      case 'prompts':
        return await getPrompts(req, res, tokenData);
      case 'styles':
        return await getStyles(req, res, tokenData);
      case 'roadmaps':
        return await getRoadmaps(req, res, tokenData);
      default:
        return res.status(404).json(errorResponse('Content type not found'));
    }
  } catch (error) {
    console.error('Get content error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// Получить термины глоссария
async function getGlossary(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  const { category } = req.query;

  let sql = `
    SELECT id, term, slang, definition, category, sort_order
    FROM glossary_terms
    WHERE deleted_at IS NULL
  `;
  const params: any[] = [];

  if (category && category !== 'Все') {
    sql += ` AND category = $1`;
    params.push(category);
  }

  sql += ` ORDER BY sort_order, term`;

  const { rows } = await query(sql, params);

  const terms = rows.map((row: any) => ({
    id: row.id,
    term: row.term,
    slang: row.slang,
    definition: row.definition,
    category: row.category,
  }));

  return res.status(200).json(successResponse(terms));
}

// Получить промпты
async function getPrompts(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
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
      steps: promptSteps || undefined,
    };
  });

  return res.status(200).json(successResponse(result));
}

// Получить стили
async function getStyles(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
  const { category } = req.query;

  let sql = `
    SELECT
      id, name, gradient, image_url, description,
      long_description, prompt, tags, category,
      usage_count, status, sort_order
    FROM style_cards
    WHERE deleted_at IS NULL AND status = 'published'
  `;
  const params: any[] = [];

  if (category && category !== 'Все') {
    sql += ` AND category = $1`;
    params.push(category);
  }

  sql += ` ORDER BY sort_order`;

  const { rows } = await query(sql, params);

  const styles = rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    gradient: row.gradient,
    image: row.image_url,
    description: row.description,
    longDescription: row.long_description,
    prompt: row.prompt,
    tags: row.tags || [],
    category: row.category,
  }));

  return res.status(200).json(successResponse(styles));
}

// Получить дорожные карты
async function getRoadmaps(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: any
) {
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
}
