/**
 * API для управления контентом (Admin) - Объединенный endpoint
 *
 * Используйте query параметр type для указания типа контента:
 * - /api/admin-content?type=styles
 * - /api/admin-content?type=glossary
 * - /api/admin-content?type=prompts
 * - /api/admin-content?type=roadmaps
 *
 * Поддерживаемые методы: GET, POST, PUT, DELETE
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import {
    getUserFromRequest,
    successResponse,
    errorResponse,
} from './_lib/auth.js';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    try {
        // Проверяем авторизацию
        const tokenData = getUserFromRequest(req);
        if (!tokenData) {
            return res.status(401).json(errorResponse('Не авторизован'));
        }

        // Только админы
        if (tokenData.role !== 'admin') {
            return res.status(403).json(errorResponse('Доступ запрещён'));
        }

        // Определяем тип контента
        const { type } = req.query;
        const contentType = Array.isArray(type) ? type[0] : type;

        // Роутинг по типу контента
        switch (contentType) {
            case 'styles':
                return await handleStyles(req, res);
            case 'glossary':
                return await handleGlossary(req, res);
            case 'prompts':
                return await handlePrompts(req, res);
            case 'roadmaps':
                return await handleRoadmaps(req, res);
            default:
                return res.status(400).json(errorResponse('Неверный тип контента'));
        }
    } catch (error) {
        console.error('Admin content API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}

// ==================== STYLES ====================

async function handleStyles(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'GET':
            return await getStyles(req, res);
        case 'POST':
            return await createStyle(req, res);
        case 'PUT':
            return await updateStyle(req, res);
        case 'DELETE':
            return await deleteStyle(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function getStyles(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT id, title, description, category, css_code, preview_html, status
     FROM style_cards
     WHERE deleted_at IS NULL
     ORDER BY category, title`
    );

    const styles = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        cssCode: row.css_code,
        previewHtml: row.preview_html,
        status: row.status,
    }));

    return res.status(200).json(successResponse(styles));
}

async function createStyle(req: VercelRequest, res: VercelResponse) {
    const { title, description, category, cssCode, previewHtml } = req.body;

    if (!title) {
        return res.status(400).json(errorResponse('title обязателен'));
    }

    const { rows } = await query(
        `INSERT INTO style_cards (title, description, category, css_code, preview_html)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [title, description, category, cssCode, previewHtml]
    );

    const style = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        cssCode: rows[0].css_code,
        previewHtml: rows[0].preview_html,
    };

    return res.status(201).json(successResponse(style));
}

async function updateStyle(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, category, cssCode, previewHtml, status } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID стиля обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE style_cards SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      css_code = COALESCE($4, css_code),
      preview_html = COALESCE($5, preview_html),
      status = COALESCE($6, status),
      updated_at = NOW()
    WHERE id = $7 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, category, cssCode, previewHtml, status, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Стиль не найден'));
    }

    const style = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        cssCode: rows[0].css_code,
        previewHtml: rows[0].preview_html,
        status: rows[0].status,
    };

    return res.status(200).json(successResponse(style));
}

async function deleteStyle(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID стиля обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE style_cards
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Стиль не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

// ==================== GLOSSARY ====================

async function handleGlossary(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'GET':
            return await getTerms(req, res);
        case 'POST':
            return await createTerm(req, res);
        case 'PUT':
            return await updateTerm(req, res);
        case 'DELETE':
            return await deleteTerm(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function getTerms(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT id, term, definition, category
     FROM glossary_terms
     WHERE deleted_at IS NULL
     ORDER BY category, term`
    );

    const terms = rows.map((row: any) => ({
        id: row.id,
        term: row.term,
        definition: row.definition,
        category: row.category,
    }));

    return res.status(200).json(successResponse(terms));
}

async function createTerm(req: VercelRequest, res: VercelResponse) {
    const { term, definition, category } = req.body;

    if (!term || !definition) {
        return res.status(400).json(errorResponse('term и definition обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO glossary_terms (term, definition, category)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [term, definition, category]
    );

    const newTerm = {
        id: rows[0].id,
        term: rows[0].term,
        definition: rows[0].definition,
        category: rows[0].category,
    };

    return res.status(201).json(successResponse(newTerm));
}

async function updateTerm(req: VercelRequest, res: VercelResponse) {
    const { id, term, definition, category } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID термина обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE glossary_terms SET
      term = COALESCE($1, term),
      definition = COALESCE($2, definition),
      category = COALESCE($3, category),
      updated_at = NOW()
    WHERE id = $4 AND deleted_at IS NULL
    RETURNING *`,
        [term, definition, category, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Термин не найден'));
    }

    const updatedTerm = {
        id: rows[0].id,
        term: rows[0].term,
        definition: rows[0].definition,
        category: rows[0].category,
    };

    return res.status(200).json(successResponse(updatedTerm));
}

async function deleteTerm(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID термина обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE glossary_terms
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Термин не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

// ==================== PROMPTS ====================

async function handlePrompts(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'GET':
            return await getPrompts(req, res);
        case 'POST':
            return await createPrompt(req, res);
        case 'PUT':
            return await updatePrompt(req, res);
        case 'DELETE':
            return await deletePrompt(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function getPrompts(req: VercelRequest, res: VercelResponse) {
    const { rows } = await query(
        `SELECT id, title, description, category, prompt_text
     FROM prompts
     WHERE deleted_at IS NULL
     ORDER BY category, title`
    );

    const prompts = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        promptText: row.prompt_text,
    }));

    return res.status(200).json(successResponse(prompts));
}

async function createPrompt(req: VercelRequest, res: VercelResponse) {
    const { title, description, category, promptText } = req.body;

    if (!title || !promptText) {
        return res.status(400).json(errorResponse('title и promptText обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO prompts (title, description, category, prompt_text)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [title, description, category, promptText]
    );

    const prompt = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        promptText: rows[0].prompt_text,
    };

    return res.status(201).json(successResponse(prompt));
}

async function updatePrompt(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, category, promptText } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID промпта обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE prompts SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      prompt_text = COALESCE($4, prompt_text),
      updated_at = NOW()
    WHERE id = $5 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, category, promptText, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Промпт не найден'));
    }

    const prompt = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        promptText: rows[0].prompt_text,
    };

    return res.status(200).json(successResponse(prompt));
}

async function deletePrompt(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID промпта обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE prompts
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Промпт не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}

// ==================== ROADMAPS ====================

async function handleRoadmaps(req: VercelRequest, res: VercelResponse) {
    const { step } = req.query;

    if (step === 'steps') {
        return await handleSteps(req, res);
    }

    switch (req.method) {
        case 'GET':
            return await getRoadmaps(req, res);
        case 'POST':
            return await createRoadmap(req, res);
        case 'PUT':
            return await updateRoadmap(req, res);
        case 'DELETE':
            return await deleteRoadmap(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function getRoadmaps(req: VercelRequest, res: VercelResponse) {
    // Получаем roadmaps
    const { rows: roadmaps } = await query(
        `SELECT id, title, description, category
     FROM roadmaps
     WHERE deleted_at IS NULL
     ORDER BY category, title`
    );

    // Получаем шаги
    const { rows: steps } = await query(
        `SELECT id, roadmap_id, title, description, sort_order
     FROM roadmap_steps
     WHERE deleted_at IS NULL
     ORDER BY roadmap_id, sort_order`
    );

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
            sortOrder: step.sort_order,
        });
    }

    const result = roadmaps.map((roadmap: any) => ({
        id: roadmap.id,
        title: roadmap.title,
        description: roadmap.description,
        category: roadmap.category,
        steps: stepsByRoadmap.get(roadmap.id) || [],
    }));

    return res.status(200).json(successResponse(result));
}

async function createRoadmap(req: VercelRequest, res: VercelResponse) {
    const { title, description, category } = req.body;

    if (!title) {
        return res.status(400).json(errorResponse('title обязателен'));
    }

    const { rows } = await query(
        `INSERT INTO roadmaps (title, description, category)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [title, description, category]
    );

    const roadmap = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
        steps: [],
    };

    return res.status(201).json(successResponse(roadmap));
}

async function updateRoadmap(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, category } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID roadmap обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE roadmaps SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      updated_at = NOW()
    WHERE id = $4 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, category, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Roadmap не найден'));
    }

    const roadmap = {
        id: rows[0].id,
        title: rows[0].title,
        description: rows[0].description,
        category: rows[0].category,
    };

    return res.status(200).json(successResponse(roadmap));
}

async function deleteRoadmap(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID roadmap обязателен'));
    }

    // Удаляем roadmap и все шаги
    const { rowCount } = await query(
        `UPDATE roadmaps
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Roadmap не найден'));
    }

    // Также удаляем шаги
    await query(
        `UPDATE roadmap_steps
     SET deleted_at = NOW()
     WHERE roadmap_id = $1 AND deleted_at IS NULL`,
        [id]
    );

    return res.status(200).json(successResponse({ deleted: true }));
}

// ===== STEPS =====

async function handleSteps(req: VercelRequest, res: VercelResponse) {
    switch (req.method) {
        case 'POST':
            return await createStep(req, res);
        case 'PUT':
            return await updateStep(req, res);
        case 'DELETE':
            return await deleteStep(req, res);
        default:
            return res.status(405).json(errorResponse('Method not allowed'));
    }
}

async function createStep(req: VercelRequest, res: VercelResponse) {
    const { roadmapId, title, description, sortOrder } = req.body;

    if (!roadmapId || !title) {
        return res.status(400).json(errorResponse('roadmapId и title обязательны'));
    }

    const { rows } = await query(
        `INSERT INTO roadmap_steps (roadmap_id, title, description, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [roadmapId, title, description, sortOrder || 0]
    );

    const step = {
        id: rows[0].id,
        roadmapId: rows[0].roadmap_id,
        title: rows[0].title,
        description: rows[0].description,
        sortOrder: rows[0].sort_order,
    };

    return res.status(201).json(successResponse(step));
}

async function updateStep(req: VercelRequest, res: VercelResponse) {
    const { id, title, description, sortOrder } = req.body;

    if (!id) {
        return res.status(400).json(errorResponse('ID шага обязателен'));
    }

    const { rows, rowCount } = await query(
        `UPDATE roadmap_steps SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      sort_order = COALESCE($3, sort_order)
    WHERE id = $4 AND deleted_at IS NULL
    RETURNING *`,
        [title, description, sortOrder, id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Шаг не найден'));
    }

    const step = {
        id: rows[0].id,
        roadmapId: rows[0].roadmap_id,
        title: rows[0].title,
        description: rows[0].description,
        sortOrder: rows[0].sort_order,
    };

    return res.status(200).json(successResponse(step));
}

async function deleteStep(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json(errorResponse('ID шага обязателен'));
    }

    const { rowCount } = await query(
        `UPDATE roadmap_steps
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );

    if (rowCount === 0) {
        return res.status(404).json(errorResponse('Шаг не найден'));
    }

    return res.status(200).json(successResponse({ deleted: true }));
}
