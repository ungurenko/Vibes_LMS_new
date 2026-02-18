/**
 * Content API endpoint
 *
 * Handles:
 * - GET /api/content/styles
 * - GET /api/content/prompts
 * - GET /api/content/glossary
 * - GET /api/content/roadmaps
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
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Извлекаем content type из URL заранее для проверки метода
  const urlForMethod = new URL(req.url || '', `http://${req.headers.host}`);
  const pathPartsForMethod = urlForMethod.pathname.split('/').filter(Boolean);
  const contentTypeForMethod = pathPartsForMethod[pathPartsForMethod.length - 1];

  // Разрешаем POST/DELETE только для favorites
  if (req.method !== 'GET' && contentTypeForMethod !== 'favorites') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  // Проверяем авторизацию
  const tokenData = getUserFromRequest(req);
  if (!tokenData) {
    return res.status(401).json(errorResponse('Не авторизован'));
  }

  // Извлекаем content type из URL: /api/content/styles → 'styles'
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const contentType = pathParts[pathParts.length - 1]; // последний сегмент

  switch (contentType) {
    case 'styles':
      return getStyles(req, res);
    case 'prompts':
      return getPrompts(req, res, tokenData);
    case 'wizard':
      return getPromptsWizard(req, res);
    case 'categories':
      return getPromptCategories(req, res);
    case 'glossary':
      return getGlossary(req, res);
    case 'roadmaps':
      return getRoadmaps(req, res, tokenData);
    case 'quick-questions':
      return getQuickQuestionsPublic(req, res);
    case 'favorites':
      if (req.method === 'GET') return getFavorites(req, res, tokenData);
      if (req.method === 'POST') return addFavorite(req, res, tokenData);
      if (req.method === 'DELETE') return removeFavorite(req, res, tokenData);
      return res.status(405).json(errorResponse('Method not allowed'));
    case 'news':
      return getNews(req, res, tokenData);
    case 'content':
      return res.status(400).json(errorResponse('Content type required'));
    default:
      return res.status(404).json(errorResponse('Content type not found'));
  }
}

// ==================== STYLES ====================
async function getStyles(req: VercelRequest, res: VercelResponse) {
  try {
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

    // HTTP кэширование для статичных данных стилей
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

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
  } catch (error) {
    console.error('Get styles error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ==================== PROMPTS & CATEGORIES ====================

async function getPromptCategories(req: VercelRequest, res: VercelResponse) {
  try {
    const { rows } = await query(
      `SELECT id, name, color_theme as "colorTheme", sort_order as "sortOrder"
       FROM prompt_categories
       WHERE deleted_at IS NULL
       ORDER BY sort_order`
    );

    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

    return res.status(200).json(successResponse(rows));
  } catch (error) {
    console.error('Get prompt categories error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

async function getPrompts(req: VercelRequest, res: VercelResponse, tokenData: any) {
  try {
    const { category, categoryId, workStage, taskType } = req.query;

    // Единый запрос с LEFT JOIN и json_agg для шагов (вместо 2 отдельных)
    let sql = `
      SELECT
        p.id, p.title, p.description, p.content, p.usage_instruction,
        pc.name as category, pc.id as category_id, pc.color_theme,
        p.tags, p.copy_count, p.status, p.sort_order,
        p.work_stage, p.task_type,
        COALESCE(
          json_agg(
            json_build_object('title', ps.title, 'description', ps.description, 'content', ps.content)
            ORDER BY ps.sort_order
          ) FILTER (WHERE ps.id IS NOT NULL),
          NULL
        ) AS steps
      FROM prompts p
      LEFT JOIN prompt_categories pc ON p.category_id = pc.id
      LEFT JOIN prompt_steps ps ON ps.prompt_id = p.id
      WHERE p.deleted_at IS NULL AND p.status = 'published'
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Поддержка фильтрации и по ID, и по названию
    if (categoryId) {
      sql += ` AND p.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    } else if (category && category !== 'Все') {
      sql += ` AND pc.name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Фильтрация по этапу работы
    if (workStage && workStage !== 'all') {
      sql += ` AND p.work_stage = $${paramIndex}`;
      params.push(workStage);
      paramIndex++;
    }

    // Фильтрация по типу задачи
    if (taskType && taskType !== 'all') {
      sql += ` AND p.task_type = $${paramIndex}`;
      params.push(taskType);
      paramIndex++;
    }

    sql += ` GROUP BY p.id, pc.name, pc.id, pc.color_theme ORDER BY p.sort_order`;

    const { rows: prompts } = await query(sql, params);

    // HTTP кэширование для статичных данных
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');

    // Форматируем ответ
    const result = prompts.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      content: p.content,
      usage: p.usage_instruction,
      category: p.category,
      categoryId: p.category_id,
      colorTheme: p.color_theme,
      tags: p.tags || [],
      steps: p.steps || undefined,
      workStage: p.work_stage,
      taskType: p.task_type,
    }));

    return res.status(200).json(successResponse(result));
  } catch (error) {
    console.error('Get prompts error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ==================== WIZARD ====================

// Wizard endpoint — возвращает релевантные промпты по критериям
async function getPromptsWizard(req: VercelRequest, res: VercelResponse) {
  try {
    const { workStage, taskType, category } = req.query;

    let sql = `
      SELECT
        p.id, p.title, p.description,
        pc.name as category, pc.color_theme,
        p.work_stage, p.task_type
      FROM prompts p
      LEFT JOIN prompt_categories pc ON p.category_id = pc.id
      WHERE p.deleted_at IS NULL AND p.status = 'published'
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Фильтрация по этапу работы
    if (workStage && workStage !== 'unsure') {
      sql += ` AND p.work_stage = $${paramIndex}`;
      params.push(workStage);
      paramIndex++;
    }

    // Фильтрация по типу задачи
    if (taskType && taskType !== 'unsure') {
      sql += ` AND p.task_type = $${paramIndex}`;
      params.push(taskType);
      paramIndex++;
    }

    // Фильтрация по категории проекта
    if (category && category !== 'any') {
      sql += ` AND pc.name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    sql += ` ORDER BY p.copy_count DESC, p.sort_order LIMIT 5`;

    const { rows } = await query(sql, params);

    // Описания для объяснения "почему этот промпт"
    const stageLabels: Record<string, string> = {
      structure: 'работа со структурой',
      design: 'работа с дизайном',
      functionality: 'работа с функционалом',
    };

    const taskLabels: Record<string, string> = {
      modify: 'изменение и улучшение',
      fix: 'исправление проблем',
      optimize: 'оптимизация',
    };

    // HTTP кэширование
    res.setHeader('Cache-Control', 'public, max-age=1800');

    // Форматируем ответ с объяснениями
    const result = rows.map((p: any) => {
      const reasons: string[] = [];
      if (p.work_stage && stageLabels[p.work_stage]) {
        reasons.push(stageLabels[p.work_stage]);
      }
      if (p.task_type && taskLabels[p.task_type]) {
        reasons.push(taskLabels[p.task_type]);
      }

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        colorTheme: p.color_theme,
        workStage: p.work_stage,
        taskType: p.task_type,
        reason: reasons.length > 0 ? `Подходит для: ${reasons.join(', ')}` : undefined,
      };
    });

    return res.status(200).json(successResponse(result));
  } catch (error) {
    console.error('Get prompts wizard error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ==================== GLOSSARY ====================
async function getGlossary(req: VercelRequest, res: VercelResponse) {
  try {
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

    // HTTP кэширование для статичных данных
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

    const terms = rows.map((row: any) => ({
      id: row.id,
      term: row.term,
      slang: row.slang,
      definition: row.definition,
      category: row.category,
    }));

    return res.status(200).json(successResponse(terms));
  } catch (error) {
    console.error('Get glossary error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ==================== ROADMAPS ====================
async function getRoadmaps(req: VercelRequest, res: VercelResponse, tokenData: any) {
  try {
    const { category } = req.query;

    // Оптимизированный единый запрос с JOIN (вместо 3 отдельных)
    let sql = `
      SELECT
        r.id AS roadmap_id, r.title AS roadmap_title,
        r.description AS roadmap_description, r.category,
        r.icon, r.estimated_time, r.difficulty,
        r.sort_order AS roadmap_sort_order,
        rs.id AS step_id, rs.title AS step_title,
        rs.description AS step_description,
        rs.link_url, rs.link_text,
        rs.sort_order AS step_sort_order,
        CASE WHEN ursp.step_id IS NOT NULL THEN true ELSE false END AS step_completed
      FROM roadmaps r
      LEFT JOIN roadmap_steps rs ON rs.roadmap_id = r.id
      LEFT JOIN user_roadmap_step_progress ursp ON ursp.step_id = rs.id AND ursp.user_id = $1
      WHERE r.deleted_at IS NULL
    `;
    const params: any[] = [tokenData.userId];

    if (category && category !== 'Все') {
      sql += ` AND r.category = $2`;
      params.push(category);
    }

    sql += ` ORDER BY r.sort_order, rs.sort_order`;

    const { rows } = await query(sql, params);

    // HTTP кэширование для данных с прогрессом
    res.setHeader('Cache-Control', 'private, max-age=60');

    // Группируем результат в иерархическую структуру
    const roadmapsMap = new Map<string, any>();

    for (const row of rows) {
      // Добавляем roadmap если ещё нет
      if (!roadmapsMap.has(row.roadmap_id)) {
        roadmapsMap.set(row.roadmap_id, {
          id: row.roadmap_id,
          title: row.roadmap_title,
          description: row.roadmap_description,
          category: row.category,
          icon: row.icon,
          estimatedTime: row.estimated_time,
          difficulty: row.difficulty,
          sortOrder: row.roadmap_sort_order,
          steps: [],
          stepIds: new Set(), // Для дедупликации
        });
      }

      // Добавляем шаг если есть и ещё не добавлен
      if (row.step_id && !roadmapsMap.get(row.roadmap_id)!.stepIds.has(row.step_id)) {
        roadmapsMap.get(row.roadmap_id)!.stepIds.add(row.step_id);
        roadmapsMap.get(row.roadmap_id)!.steps.push({
          id: row.step_id,
          title: row.step_title,
          description: row.step_description,
          linkUrl: row.link_url,
          linkText: row.link_text,
          completed: row.step_completed,
        });
      }
    }

    // Форматируем ответ
    const result = Array.from(roadmapsMap.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ id, title, description, category, icon, estimatedTime, difficulty, steps }) => ({
        id,
        title,
        description,
        category,
        icon,
        estimatedTime,
        difficulty,
        steps,
      }));

    return res.status(200).json(successResponse(result));
  } catch (error) {
    console.error('Get roadmaps error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ==================== QUICK QUESTIONS (PUBLIC) ====================
async function getQuickQuestionsPublic(req: VercelRequest, res: VercelResponse) {
  try {
    const { rows } = await query(
      `SELECT id, text, sort_order
       FROM quick_questions
       WHERE is_active = TRUE
       ORDER BY sort_order`
    );

    // HTTP кэширование для статичных данных
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

    const questions = rows.map((row: any) => row.text);

    return res.status(200).json(successResponse(questions));
  } catch (error) {
    console.error('Get quick questions error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ==================== FAVORITES ====================

// GET — Получить ID избранных промптов
async function getFavorites(req: VercelRequest, res: VercelResponse, tokenData: any) {
  try {
    const { rows } = await query(
      'SELECT prompt_id FROM user_favorite_prompts WHERE user_id = $1',
      [tokenData.userId]
    );

    // Кэширование не нужно — персональные данные
    res.setHeader('Cache-Control', 'private, no-cache');

    return res.status(200).json(successResponse(rows.map((r: any) => r.prompt_id)));
  } catch (error) {
    console.error('Get favorites error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// POST — Добавить в избранное
async function addFavorite(req: VercelRequest, res: VercelResponse, tokenData: any) {
  try {
    const { promptId } = req.body;

    if (!promptId) {
      return res.status(400).json(errorResponse('promptId обязателен'));
    }

    await query(
      `INSERT INTO user_favorite_prompts (user_id, prompt_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [tokenData.userId, promptId]
    );

    return res.status(200).json(successResponse({ added: true }));
  } catch (error) {
    console.error('Add favorite error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// DELETE — Удалить из избранного
async function removeFavorite(req: VercelRequest, res: VercelResponse, tokenData: any) {
  try {
    const { promptId } = req.query;

    if (!promptId) {
      return res.status(400).json(errorResponse('promptId обязателен'));
    }

    await query(
      'DELETE FROM user_favorite_prompts WHERE user_id = $1 AND prompt_id = $2',
      [tokenData.userId, promptId]
    );

    return res.status(200).json(successResponse({ removed: true }));
  } catch (error) {
    console.error('Remove favorite error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}

// ==================== NEWS FEED ====================
async function getNews(req: VercelRequest, res: VercelResponse, tokenData: any) {
  try {
    const cohortId = await getUserCohortId(tokenData.userId);

    const sql = cohortId
      ? `
        SELECT 'lesson' as type, l.id, l.title as label, l.created_at
        FROM lessons l
        JOIN course_modules m ON m.id = l.module_id
        JOIN module_cohorts mc ON mc.module_id = m.id
        WHERE l.deleted_at IS NULL AND m.deleted_at IS NULL
          AND mc.cohort_id = $1
          AND l.status NOT IN ('draft', 'hidden')
        UNION ALL
        SELECT 'style' as type, id, name as label, created_at
        FROM style_cards WHERE deleted_at IS NULL
        UNION ALL
        SELECT 'prompt' as type, id, title as label, created_at
        FROM prompts WHERE deleted_at IS NULL AND status = 'published'
        UNION ALL
        SELECT 'update' as type, id, title as label, created_at
        FROM platform_updates WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 20
      `
      : `
        SELECT 'lesson' as type, l.id, l.title as label, l.created_at
        FROM lessons l
        JOIN course_modules m ON m.id = l.module_id
        WHERE l.deleted_at IS NULL AND m.deleted_at IS NULL
          AND l.status NOT IN ('draft', 'hidden')
        UNION ALL
        SELECT 'style' as type, id, name as label, created_at
        FROM style_cards WHERE deleted_at IS NULL
        UNION ALL
        SELECT 'prompt' as type, id, title as label, created_at
        FROM prompts WHERE deleted_at IS NULL AND status = 'published'
        UNION ALL
        SELECT 'update' as type, id, title as label, created_at
        FROM platform_updates WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 20
      `;

    const params = cohortId ? [cohortId] : [];
    const { rows } = await query(sql, params);

    return res.status(200).json(successResponse(rows));
  } catch (error: any) {
    console.error('News feed error:', error.message, error.code);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
