import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

// Модели по умолчанию для каждого инструмента
const DEFAULT_TOOL_MODELS: Record<string, string> = {
  assistant: 'google/gemini-2.5-flash-lite',
  tz_helper: 'z-ai/glm-4.7',
  ideas: 'xiaomi/mimo-v2-flash:free'
};

export async function handleAiInstruction(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
  try {
    const { tool_type } = req.query;

    // GET - получить конфигурации инструментов
    if (req.method === 'GET') {
      // Если указан tool_type - возвращаем конфиг для конкретного инструмента
      if (tool_type && ['assistant', 'tz_helper', 'ideas'].includes(tool_type as string)) {
        const { rows } = await query(
          `SELECT id, name, content, model_id, tool_type, is_active, updated_at
           FROM ai_system_instructions
           WHERE tool_type = $1 AND is_active = true
           LIMIT 1`,
          [tool_type]
        );

        if (rows.length === 0) {
          return res.status(200).json(successResponse({
            tool_type,
            content: '',
            model_id: DEFAULT_TOOL_MODELS[tool_type as string] || '',
            updatedAt: null,
          }));
        }

        return res.status(200).json(successResponse({
          id: rows[0].id,
          tool_type: rows[0].tool_type,
          content: rows[0].content,
          model_id: rows[0].model_id || DEFAULT_TOOL_MODELS[tool_type as string],
          updatedAt: rows[0].updated_at,
        }));
      }

      // Без tool_type - возвращаем все конфигурации для всех инструментов
      const { rows } = await query(
        `SELECT id, name, content, model_id, tool_type, is_active, updated_at
         FROM ai_system_instructions
         WHERE is_active = true AND tool_type IS NOT NULL`
      );

      // Формируем объект с конфигурациями для всех инструментов
      const toolTypes = ['assistant', 'tz_helper', 'ideas'];
      const configs: Record<string, any> = {};

      for (const tt of toolTypes) {
        const found = rows.find((r: any) => r.tool_type === tt);
        configs[tt] = found ? {
          id: found.id,
          content: found.content,
          model_id: found.model_id || DEFAULT_TOOL_MODELS[tt],
          updatedAt: found.updated_at,
        } : {
          content: '',
          model_id: DEFAULT_TOOL_MODELS[tt],
          updatedAt: null,
        };
      }

      return res.status(200).json(successResponse(configs));
    }

    // PUT - обновить конфигурацию инструмента
    if (req.method === 'PUT') {
      const { content, model_id, tool_type: bodyToolType } = req.body;
      const toolType = bodyToolType || tool_type;

      if (!toolType || !['assistant', 'tz_helper', 'ideas'].includes(toolType as string)) {
        return res.status(400).json(errorResponse('Укажите корректный tool_type (assistant, tz_helper, ideas)'));
      }

      // Деактивируем предыдущие инструкции для этого tool_type
      await query(
        `UPDATE ai_system_instructions SET is_active = false WHERE tool_type = $1`,
        [toolType]
      );

      // Создаём новую активную инструкцию
      const { rows } = await query(
        `INSERT INTO ai_system_instructions (name, content, model_id, tool_type, is_active, created_by_id)
         VALUES ($1, $2, $3, $4, true, $5)
         RETURNING id, content, model_id, tool_type, updated_at`,
        [
          `${toolType}_custom`,
          content || '',
          model_id || DEFAULT_TOOL_MODELS[toolType as string],
          toolType,
          tokenData.userId
        ]
      );

      return res.status(200).json(successResponse({
        id: rows[0].id,
        tool_type: rows[0].tool_type,
        content: rows[0].content,
        model_id: rows[0].model_id,
        updatedAt: rows[0].updated_at,
      }));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error) {
    console.error('Admin AI instruction error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
