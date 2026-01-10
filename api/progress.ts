import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/db';
import { verifyToken } from './_lib/auth';

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
            const result = await db.query(`
                SELECT rs.roadmap_id, ursp.step_id
                FROM user_roadmap_step_progress ursp
                JOIN roadmap_steps rs ON rs.id = ursp.step_id
                WHERE ursp.user_id = $1
            `, [user.id]);

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
                // Добавляем шаг в выполненные
                await db.query(`
                    INSERT INTO user_roadmap_step_progress (user_id, step_id)
                    VALUES ($1, $2)
                    ON CONFLICT (user_id, step_id) DO NOTHING
                `, [user.id, stepId]);

                // Проверяем, начат ли roadmap, если нет - создаем запись
                await db.query(`
                    INSERT INTO user_roadmap_progress (user_id, roadmap_id, started_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (user_id, roadmap_id) DO NOTHING
                `, [user.id, roadmapId]);

            } else {
                // Удаляем шаг из выполненных
                await db.query(`
                    DELETE FROM user_roadmap_step_progress
                    WHERE user_id = $1 AND step_id = $2
                `, [user.id, stepId]);
            }

            // Проверяем, завершен ли весь roadmap
            // 1. Считаем всего шагов в roadmap
            const totalStepsRes = await db.query(`
                SELECT COUNT(*) as count FROM roadmap_steps WHERE roadmap_id = $1
            `, [roadmapId]);
            const totalSteps = parseInt(totalStepsRes.rows[0].count);

            // 2. Считаем выполненные шаги пользователя в этом roadmap
            const completedStepsRes = await db.query(`
                SELECT COUNT(ursp.step_id) as count
                FROM user_roadmap_step_progress ursp
                JOIN roadmap_steps rs ON rs.id = ursp.step_id
                WHERE ursp.user_id = $1 AND rs.roadmap_id = $2
            `, [user.id, roadmapId]);
            const completedSteps = parseInt(completedStepsRes.rows[0].count);

            // 3. Обновляем статус roadmap
            if (completedSteps === totalSteps && totalSteps > 0) {
                await db.query(`
                    UPDATE user_roadmap_progress
                    SET completed_at = NOW()
                    WHERE user_id = $1 AND roadmap_id = $2
                `, [user.id, roadmapId]);
            } else {
                // Если не все выполнены - сбрасываем completed_at (вдруг пользователь снял галочку)
                await db.query(`
                    UPDATE user_roadmap_progress
                    SET completed_at = NULL
                    WHERE user_id = $1 AND roadmap_id = $2
                `, [user.id, roadmapId]);
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error updating progress:', error);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
}
