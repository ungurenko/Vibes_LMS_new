/**
 * API для управления контентом (Admin) - Роутер
 *
 * Используйте query параметр type для указания типа контента:
 * - /api/admin-content?type=styles
 * - /api/admin-content?type=glossary
 * - /api/admin-content?type=prompts
 * - /api/admin-content?type=categories
 * - /api/admin-content?type=roadmaps
 *
 * Поддерживаемые методы: GET, POST, PUT, DELETE
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    getUserFromRequest,
    errorResponse,
} from './_lib/auth.js';
import { handleStyles } from './_lib/admin-content/styles.js';
import { handleGlossary } from './_lib/admin-content/glossary.js';
import { handlePrompts, handlePromptCategories } from './_lib/admin-content/prompts.js';
import { handleRoadmaps } from './_lib/admin-content/roadmaps.js';

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
                return await handleStyles(req, res, tokenData);
            case 'glossary':
                return await handleGlossary(req, res, tokenData);
            case 'prompts':
                return await handlePrompts(req, res, tokenData);
            case 'categories':
                return await handlePromptCategories(req, res, tokenData);
            case 'roadmaps':
                return await handleRoadmaps(req, res, tokenData);
            default:
                return res.status(400).json(errorResponse('Неверный тип контента'));
        }
    } catch (error) {
        console.error('Admin content API error:', error);
        return res.status(500).json(errorResponse('Ошибка сервера'));
    }
}
