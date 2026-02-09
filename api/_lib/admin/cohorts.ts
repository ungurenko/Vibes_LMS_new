import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, getClient } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

// GET - Список когорт с количеством студентов
async function getCohorts(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT c.id, c.name, c.description, c.start_date, c.is_active, c.sort_order,
                c.created_at, c.updated_at,
                COUNT(u.id) FILTER (WHERE u.deleted_at IS NULL AND u.role = 'student') as student_count
         FROM cohorts c
         LEFT JOIN users u ON u.cohort_id = c.id
         WHERE c.deleted_at IS NULL
         GROUP BY c.id
         ORDER BY c.sort_order, c.created_at`
    );

    const cohorts = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        startDate: row.start_date,
        isActive: row.is_active,
        sortOrder: row.sort_order,
        studentCount: parseInt(row.student_count) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));

    return res.status(200).json(successResponse(cohorts));
}

// POST - Создать когорту (с опцией клонирования стадий)
async function createCohort(req: VercelRequest, res: VercelResponse) {
    const { name, description, startDate, isActive, sortOrder, cloneStagesFrom } = req.body;

    if (!name) {
        return res.status(400).json(errorResponse('Название когорты обязательно'));
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `INSERT INTO cohorts (name, description, start_date, is_active, sort_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, description || null, startDate || null, isActive ?? true, sortOrder || 0]
        );

        const cohort = rows[0];

        // Клонировать стадии из другой когорты
        if (cloneStagesFrom) {
            // Получить стадии и задачи исходной когорты
            const { rows: sourceStages } = await client.query(
                `SELECT id, title, subtitle, description, week_label, is_active, sort_order
                 FROM dashboard_stages WHERE cohort_id = $1 ORDER BY sort_order`,
                [cloneStagesFrom]
            );

            for (const stage of sourceStages) {
                const { rows: newStages } = await client.query(
                    `INSERT INTO dashboard_stages (title, subtitle, description, week_label, is_active, sort_order, cohort_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING id`,
                    [stage.title, stage.subtitle, stage.description, stage.week_label, stage.is_active, stage.sort_order, cohort.id]
                );

                // Клонировать задачи стадии
                const { rows: sourceTasks } = await client.query(
                    `SELECT title, sort_order FROM stage_tasks WHERE stage_id = $1 ORDER BY sort_order`,
                    [stage.id]
                );

                for (const task of sourceTasks) {
                    await client.query(
                        `INSERT INTO stage_tasks (stage_id, title, sort_order) VALUES ($1, $2, $3)`,
                        [newStages[0].id, task.title, task.sort_order]
                    );
                }
            }
        }

        await client.query('COMMIT');

        return res.status(201).json(successResponse({
            id: cohort.id,
            name: cohort.name,
            description: cohort.description,
            startDate: cohort.start_date,
            isActive: cohort.is_active,
            sortOrder: cohort.sort_order,
            studentCount: 0,
        }));
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// PUT - Обновить когорту
async function updateCohort(req: VercelRequest, res: VercelResponse) {
    const { id, name, description, startDate, isActive, sortOrder } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID когорты обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE cohorts SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            start_date = COALESCE($3, start_date),
            is_active = COALESCE($4, is_active),
            sort_order = COALESCE($5, sort_order),
            updated_at = NOW()
         WHERE id = $6 AND deleted_at IS NULL
         RETURNING *`,
        [name, description, startDate, isActive, sortOrder, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Когорта не найдена'));
    }

    const cohort = rows[0];
    return res.status(200).json(successResponse({
        id: cohort.id,
        name: cohort.name,
        description: cohort.description,
        startDate: cohort.start_date,
        isActive: cohort.is_active,
        sortOrder: cohort.sort_order,
    }));
}

// DELETE - Soft delete когорты (запретить если есть студенты)
async function deleteCohort(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID когорты обязателен'));
    }

    // Проверить наличие студентов
    const { rows: students } = await query(
        `SELECT COUNT(*) as count FROM users WHERE cohort_id = $1 AND deleted_at IS NULL AND role = 'student'`,
        [id]
    );

    if (parseInt(students[0].count) > 0) {
        return res.status(400).json(errorResponse('Нельзя удалить когорту с активными студентами'));
    }

    const { rowCount } = await query(
        `UPDATE cohorts SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Когорта не найдена'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

export async function handleCohorts(
    req: VercelRequest,
    res: VercelResponse,
    tokenData: { userId: string; role: string }
) {
    try {
        switch (req.method) {
            case 'GET':
                return await getCohorts(req, res);
            case 'POST':
                return await createCohort(req, res);
            case 'PUT':
                return await updateCohort(req, res);
            case 'DELETE':
                return await deleteCohort(req, res);
            default:
                return res.status(405).json(errorResponse('Method not allowed'));
        }
    } catch (error) {
        console.error('Admin cohorts API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}
