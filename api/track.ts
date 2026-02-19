/**
 * POST /api/track — fire-and-forget трекинг событий от студентов
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, successResponse, errorResponse } from './_lib/auth.js';
import { query } from './_lib/db.js';

const ALLOWED_EVENTS = new Set([
  'page_view',
  'prompt_copy',
  'prompt_favorite',
  'style_view',
  'style_copy',
  'tool_open',
  'tool_message',
  'quick_question_click',
]);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    const tokenData = getUserFromRequest(req);
    if (!tokenData) {
      return res.status(401).json(errorResponse('Unauthorized'));
    }

    const { eventType, targetType, targetId, targetTitle, metadata } = req.body || {};

    if (!eventType || !ALLOWED_EVENTS.has(eventType)) {
      return res.status(400).json(errorResponse('Invalid eventType'));
    }

    await query(
      `INSERT INTO analytics_events (user_id, event_type, target_type, target_id, target_title, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tokenData.userId,
        eventType,
        targetType || null,
        targetId || null,
        targetTitle || null,
        metadata ? JSON.stringify(metadata) : '{}',
      ]
    );

    return res.status(200).json(successResponse({ ok: true }));
  } catch (error: any) {
    console.error('Track API error:', error.message, error.code);
    return res.status(500).json(errorResponse('Internal server error'));
  }
}
