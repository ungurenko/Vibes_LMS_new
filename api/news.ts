import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, successResponse, errorResponse } from './_lib/auth.js';
import { getUserCohortId } from './_lib/cohort.js';
import { query } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    const tokenData = getUserFromRequest(req);
    if (!tokenData) {
      return res.status(401).json(errorResponse('Не авторизован'));
    }

    const cohortId = await getUserCohortId(tokenData.userId);

    // UNION query across 4 content tables
    // Lessons filtered by user's cohort via module_cohorts
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
    console.error('News API error:', error.message, error.code);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
