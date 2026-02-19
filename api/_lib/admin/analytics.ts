/**
 * Admin Analytics Handler
 * GET /api/admin?resource=analytics&period=7d|30d|all&cohortId=...
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { successResponse, errorResponse, JwtPayload } from '../auth.js';
import { query } from '../db.js';

function getPeriodCondition(period: string): { sql: string; params: any[] } {
  switch (period) {
    case '7d':
      return { sql: `AND ae.created_at >= NOW() - INTERVAL '7 days'`, params: [] };
    case '30d':
      return { sql: `AND ae.created_at >= NOW() - INTERVAL '30 days'`, params: [] };
    default:
      return { sql: '', params: [] };
  }
}

export async function handleAnalytics(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: JwtPayload
) {
  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    const period = (Array.isArray(req.query.period) ? req.query.period[0] : req.query.period) || '7d';
    const cohortId = Array.isArray(req.query.cohortId) ? req.query.cohortId[0] : req.query.cohortId;

    const periodCond = getPeriodCondition(period);
    const cohortJoin = cohortId ? 'JOIN users u ON ae.user_id = u.id AND u.cohort_id = $1' : '';
    const cohortParams = cohortId ? [cohortId] : [];
    const paramOffset = cohortParams.length;

    // 1. Общие метрики
    const metricsResult = await query(
      `SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT ae.user_id) as unique_users,
        COUNT(*) FILTER (WHERE ae.event_type = 'prompt_copy') as prompt_copies,
        COUNT(*) FILTER (WHERE ae.event_type = 'style_view') as style_views,
        COUNT(*) FILTER (WHERE ae.event_type = 'tool_message') as ai_messages,
        COUNT(*) FILTER (WHERE ae.event_type = 'quick_question_click') as quick_clicks
      FROM analytics_events ae
      ${cohortJoin}
      WHERE 1=1 ${periodCond.sql}`,
      [...cohortParams]
    );

    const metrics = metricsResult.rows[0] || {};

    // 2. Топ промптов по копированиям
    const topPrompts = await query(
      `SELECT ae.target_id, ae.target_title, COUNT(*) as count
      FROM analytics_events ae
      ${cohortJoin}
      WHERE ae.event_type = 'prompt_copy' AND ae.target_id IS NOT NULL ${periodCond.sql}
      GROUP BY ae.target_id, ae.target_title
      ORDER BY count DESC
      LIMIT 10`,
      [...cohortParams]
    );

    // 3. Топ в избранном (из user_prompt_favorites)
    const topFavoritesQuery = cohortId
      ? `SELECT upf.prompt_id as target_id, p.title as target_title, COUNT(*) as count
         FROM user_prompt_favorites upf
         JOIN prompts p ON p.id = upf.prompt_id
         JOIN users u ON upf.user_id = u.id AND u.cohort_id = $1
         GROUP BY upf.prompt_id, p.title
         ORDER BY count DESC
         LIMIT 10`
      : `SELECT upf.prompt_id as target_id, p.title as target_title, COUNT(*) as count
         FROM user_prompt_favorites upf
         JOIN prompts p ON p.id = upf.prompt_id
         GROUP BY upf.prompt_id, p.title
         ORDER BY count DESC
         LIMIT 10`;
    const topFavorites = await query(topFavoritesQuery, cohortParams);

    // 4. Топ стилей по просмотрам/копированиям
    const topStyles = await query(
      `SELECT ae.target_id, ae.target_title,
        COUNT(*) FILTER (WHERE ae.event_type = 'style_view') as views,
        COUNT(*) FILTER (WHERE ae.event_type = 'style_copy') as copies
      FROM analytics_events ae
      ${cohortJoin}
      WHERE ae.event_type IN ('style_view', 'style_copy') AND ae.target_id IS NOT NULL ${periodCond.sql}
      GROUP BY ae.target_id, ae.target_title
      ORDER BY views DESC
      LIMIT 10`,
      [...cohortParams]
    );

    // 5. Использование AI инструментов
    const toolUsage = await query(
      `SELECT ae.target_id as tool_type,
        COUNT(*) as messages,
        COUNT(DISTINCT ae.user_id) as unique_users
      FROM analytics_events ae
      ${cohortJoin}
      WHERE ae.event_type = 'tool_message' ${periodCond.sql}
      GROUP BY ae.target_id
      ORDER BY messages DESC`,
      [...cohortParams]
    );

    // 6. Топ быстрых вопросов
    const topQuickQuestions = await query(
      `SELECT ae.target_title as question, ae.target_id as tool_type, COUNT(*) as count
      FROM analytics_events ae
      ${cohortJoin}
      WHERE ae.event_type = 'quick_question_click' AND ae.target_title IS NOT NULL ${periodCond.sql}
      GROUP BY ae.target_title, ae.target_id
      ORDER BY count DESC
      LIMIT 10`,
      [...cohortParams]
    );

    // 7. Популярные страницы
    const topPages = await query(
      `SELECT ae.target_id as page, COUNT(*) as views, COUNT(DISTINCT ae.user_id) as unique_users
      FROM analytics_events ae
      ${cohortJoin}
      WHERE ae.event_type = 'page_view' ${periodCond.sql}
      GROUP BY ae.target_id
      ORDER BY views DESC
      LIMIT 15`,
      [...cohortParams]
    );

    return res.status(200).json(successResponse({
      metrics: {
        totalEvents: parseInt(metrics.total_events) || 0,
        uniqueUsers: parseInt(metrics.unique_users) || 0,
        promptCopies: parseInt(metrics.prompt_copies) || 0,
        styleViews: parseInt(metrics.style_views) || 0,
        aiMessages: parseInt(metrics.ai_messages) || 0,
        quickClicks: parseInt(metrics.quick_clicks) || 0,
      },
      topPrompts: topPrompts.rows.map(r => ({
        id: r.target_id,
        title: r.target_title || 'Без названия',
        count: parseInt(r.count),
      })),
      topFavorites: topFavorites.rows.map(r => ({
        id: r.target_id,
        title: r.target_title || 'Без названия',
        count: parseInt(r.count),
      })),
      topStyles: topStyles.rows.map(r => ({
        id: r.target_id,
        name: r.target_title || 'Без названия',
        views: parseInt(r.views),
        copies: parseInt(r.copies),
      })),
      toolUsage: toolUsage.rows.map(r => ({
        toolType: r.tool_type,
        messages: parseInt(r.messages),
        uniqueUsers: parseInt(r.unique_users),
      })),
      topQuickQuestions: topQuickQuestions.rows.map(r => ({
        question: r.question,
        toolType: r.tool_type,
        count: parseInt(r.count),
      })),
      topPages: topPages.rows.map(r => ({
        page: r.page,
        views: parseInt(r.views),
        uniqueUsers: parseInt(r.unique_users),
      })),
    }));
  } catch (error: any) {
    console.error('Analytics handler error:', error.message, error.code);
    return res.status(500).json(errorResponse('Internal server error'));
  }
}
