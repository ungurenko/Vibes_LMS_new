import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import { verifyToken } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Auth Check
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // 2. GET Progress
    if (req.method === 'GET') {
        try {
            // Получаем все выполненные шаги пользователя, сгруппированные по roadmap_id
            const result = await query(`
                SELECT rs.roadmap_id, ursp.step_id
                FROM user_roadmap_step_progress ursp
                JOIN roadmap_steps rs ON rs.id = ursp.step_id
                WHERE ursp.user_id = $1
            `, [user.userId]);

            // Преобразуем в структуру: { roadmapId: [stepId, stepId, ...] }
            const progressMap: Record<string, string[]> = {};
            
            result.rows.forEach((row: any) => {
                if (!progressMap[row.roadmap_id]) {
                    progressMap[row.roadmap_id] = [];
                }
                progressMap[row.roadmap_id].push(row.step_id);
            });

            return res.status(200).json({ success: true, data: progressMap });
        } catch (error) {
            console.error('Error fetching progress:', error);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
    }

    // 3. POST Toggle Step (Mark complete/incomplete)
    if (req.method === 'POST') {
        const { stepId, roadmapId, completed } = req.body;

        if (!stepId || !roadmapId) {
            return res.status(400).json({ success: false, error: 'Missing stepId or roadmapId' });
        }

        try {
            if (completed) {
                // 1. Вставляем шаг + создаём запись прогресса roadmap (параллельно)
                await Promise.all([
                    query(`
                        INSERT INTO user_roadmap_step_progress (user_id, step_id)
                        VALUES ($1, $2)
                        ON CONFLICT (user_id, step_id) DO NOTHING
                    `, [user.userId, stepId]),
                    query(`
                        INSERT INTO user_roadmap_progress (user_id, roadmap_id, started_at)
                        VALUES ($1, $2, NOW())
                        ON CONFLICT (user_id, roadmap_id) DO NOTHING
                    `, [user.userId, roadmapId])
                ]);
            } else {
                // Удаляем шаг из выполненных
                await query(`
                    DELETE FROM user_roadmap_step_progress
                    WHERE user_id = $1 AND step_id = $2
                `, [user.userId, stepId]);
            }

            // 2. Единый запрос: считаем total и completed одновременно
            const countsRes = await query(`
                SELECT
                    (SELECT COUNT(*) FROM roadmap_steps WHERE roadmap_id = $2) AS total,
                    (SELECT COUNT(ursp.step_id)
                     FROM user_roadmap_step_progress ursp
                     JOIN roadmap_steps rs ON rs.id = ursp.step_id
                     WHERE ursp.user_id = $1 AND rs.roadmap_id = $2) AS completed
            `, [user.userId, roadmapId]);
            const totalSteps = parseInt(countsRes.rows[0].total);
            const completedSteps = parseInt(countsRes.rows[0].completed);

            // 3. Обновляем статус roadmap
            await query(`
                UPDATE user_roadmap_progress
                SET completed_at = CASE WHEN $3 THEN NOW() ELSE NULL END
                WHERE user_id = $1 AND roadmap_id = $2
            `, [user.userId, roadmapId, completedSteps === totalSteps && totalSteps > 0]);

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error updating progress:', error);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
}