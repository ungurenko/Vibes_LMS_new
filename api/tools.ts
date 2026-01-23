/**
 * /api/tools - API для инструментов (Ассистент, Помощник по ТЗ, Идеи)
 *
 * Эндпоинты:
 * GET  /api/tools/models                        - Получить модели всех инструментов
 * GET  /api/tools/chats?tool_type=assistant     - Получить чат
 * GET  /api/tools/messages?tool_type=assistant  - История сообщений
 * POST /api/tools/messages                      - Отправить сообщение
 * POST /api/tools/transfer                      - Перенести идею в другой инструмент
 * DELETE /api/tools/chats?tool_type=assistant   - Очистить историю
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenRouter } from '@openrouter/sdk';
import { getUserFromRequest, errorResponse, successResponse } from './_lib/auth.js';
import { query, getClient } from './_lib/db.js';

// Типы инструментов
type ToolType = 'assistant' | 'tz_helper' | 'ideas';

// Модели по умолчанию для каждого инструмента
const DEFAULT_MODELS: Record<ToolType, string> = {
  assistant: 'google/gemini-2.5-flash-lite',
  tz_helper: 'z-ai/glm-4.7',
  ideas: 'xiaomi/mimo-v2-flash:free'
};

// Промпты по умолчанию
const DEFAULT_PROMPTS: Record<ToolType, string> = {
  assistant: `Ты — опытный ментор по веб-разработке (вайб-кодингу).
Твоя цель — помогать студентам создавать красивые и функциональные веб-приложения, объяснять сложные концепции простым языком и поддерживать их мотивацию.
Отвечай кратко, по делу, используй примеры кода.`,
  tz_helper: '',  // Будет загружен из БД
  ideas: ''       // Будет загружен из БД
};

// Человекочитаемые названия моделей
const MODEL_LABELS: Record<string, string> = {
  'google/gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  'google/gemini-2.0-flash-001': 'Gemini 2.0 Flash',
  'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
  'anthropic/claude-3-haiku': 'Claude 3 Haiku',
  'openai/gpt-4o-mini': 'GPT-4o Mini',
  'openai/gpt-4o': 'GPT-4o',
  'z-ai/glm-4.7': 'GLM-4.7',
  'xiaomi/mimo-v2-flash:free': 'MiMo V2 Flash',
  'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B',
};

// Получить человекочитаемое название модели
function getModelLabel(modelId: string): string {
  if (MODEL_LABELS[modelId]) return MODEL_LABELS[modelId];
  // Автоформатирование: "google/gemini-2.5-pro" -> "Gemini 2.5 Pro"
  const parts = modelId.split('/');
  return parts[parts.length - 1]
    .replace(/:free$/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Получить или создать чат
async function getOrCreateChat(userId: string, toolType: ToolType): Promise<string> {
  // Проверяем существующий чат
  const { rows: existing } = await query(
    'SELECT id FROM tool_chats WHERE user_id = $1 AND tool_type = $2',
    [userId, toolType]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Создаём новый чат
  const { rows: newChat } = await query(
    'INSERT INTO tool_chats (user_id, tool_type) VALUES ($1, $2) RETURNING id',
    [userId, toolType]
  );

  return newChat[0].id;
}

// Получить справочник промптов для ассистента
async function getPromptsReference(): Promise<string> {
  try {
    const { rows } = await query(`
      SELECT p.title, p.description, pc.name as category
      FROM prompts p
      JOIN prompt_categories pc ON p.category_id = pc.id
      WHERE p.status = 'published' AND p.deleted_at IS NULL AND pc.deleted_at IS NULL
      ORDER BY pc.sort_order, p.sort_order, p.title
    `);

    if (rows.length === 0) {
      return '';
    }

    // Группировка по категориям
    const grouped: Record<string, string[]> = {};
    for (const p of rows) {
      if (!grouped[p.category]) grouped[p.category] = [];
      const desc = p.description ? ` — ${p.description.slice(0, 80)}` : '';
      grouped[p.category].push(`• ${p.title}${desc}`);
    }

    // Форматирование
    let reference = '\n\n---\n## Библиотека промптов\n';
    reference += 'Рекомендуй ученикам промпты из раздела "Промпты" когда они:\n';
    reference += '- Спрашивают как улучшить дизайн/код/структуру\n';
    reference += '- Хотят исправить ошибки или баги\n';
    reference += '- Не знают с чего начать\n\n';

    for (const [category, prompts] of Object.entries(grouped)) {
      reference += `### ${category}\n${prompts.join('\n')}\n\n`;
    }

    reference += 'Направляй учеников в раздел "Промпты" в меню платформы.';

    return reference;
  } catch (error) {
    console.error('[TOOLS API] Failed to fetch prompts reference:', error);
    return '';
  }
}

// Получить конфигурацию инструмента (промпт + модель)
async function getToolConfig(toolType: ToolType): Promise<{ systemPrompt: string; modelId: string }> {
  try {
    const { rows } = await query(
      `SELECT content, model_id FROM ai_system_instructions
       WHERE tool_type = $1 AND is_active = true
       LIMIT 1`,
      [toolType]
    );

    if (rows.length > 0) {
      return {
        systemPrompt: rows[0].content || DEFAULT_PROMPTS[toolType],
        modelId: rows[0].model_id || DEFAULT_MODELS[toolType]
      };
    }

    // Fallback на значения по умолчанию
    return {
      systemPrompt: DEFAULT_PROMPTS[toolType],
      modelId: DEFAULT_MODELS[toolType]
    };
  } catch (error) {
    console.error('[TOOLS API] Failed to fetch tool config:', error);
    return {
      systemPrompt: DEFAULT_PROMPTS[toolType],
      modelId: DEFAULT_MODELS[toolType]
    };
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Парсим URL для определения эндпоинта
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const endpoint = pathParts[pathParts.length - 1]; // chats, messages, transfer

  // Проверяем авторизацию
  const tokenData = getUserFromRequest(req);
  if (!tokenData) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const userId = tokenData.userId;

  try {
    // ========== GET /api/tools/models ==========
    // Возвращает текущие модели для всех инструментов
    if (req.method === 'GET' && endpoint === 'models') {
      const toolTypes: ToolType[] = ['assistant', 'tz_helper', 'ideas'];
      const models: Record<string, { modelId: string; modelName: string }> = {};

      for (const toolType of toolTypes) {
        const config = await getToolConfig(toolType);
        models[toolType] = {
          modelId: config.modelId,
          modelName: getModelLabel(config.modelId),
        };
      }

      return res.status(200).json(successResponse(models));
    }

    // ========== GET /api/tools/chats ==========
    if (req.method === 'GET' && endpoint === 'chats') {
      const toolType = (req.query.tool_type as ToolType) || 'assistant';

      if (!['assistant', 'tz_helper', 'ideas'].includes(toolType)) {
        return res.status(400).json(errorResponse('Invalid tool_type'));
      }

      const chatId = await getOrCreateChat(userId, toolType);

      return res.status(200).json(successResponse({ chatId, toolType }));
    }

    // ========== GET /api/tools/messages ==========
    if (req.method === 'GET' && endpoint === 'messages') {
      const toolType = (req.query.tool_type as ToolType) || 'assistant';

      if (!['assistant', 'tz_helper', 'ideas'].includes(toolType)) {
        return res.status(400).json(errorResponse('Invalid tool_type'));
      }

      const chatId = await getOrCreateChat(userId, toolType);

      const { rows } = await query(
        `SELECT id, role, content as text, has_copyable_content, created_at as timestamp
         FROM tool_messages
         WHERE chat_id = $1
         ORDER BY created_at ASC
         LIMIT 100`,
        [chatId]
      );

      return res.status(200).json(successResponse(rows));
    }

    // ========== DELETE /api/tools/chats ==========
    if (req.method === 'DELETE' && endpoint === 'chats') {
      const toolType = (req.query.tool_type as ToolType) || 'assistant';

      if (!['assistant', 'tz_helper', 'ideas'].includes(toolType)) {
        return res.status(400).json(errorResponse('Invalid tool_type'));
      }

      // Удаляем сообщения чата
      await query(
        `DELETE FROM tool_messages
         WHERE chat_id IN (SELECT id FROM tool_chats WHERE user_id = $1 AND tool_type = $2)`,
        [userId, toolType]
      );

      return res.status(200).json(successResponse({ message: 'History cleared' }));
    }

    // ========== POST /api/tools/messages ==========
    if (req.method === 'POST' && endpoint === 'messages') {
      const { tool_type, message, initial_message } = req.body;
      const toolType = (tool_type as ToolType) || 'assistant';

      if (!['assistant', 'tz_helper', 'ideas'].includes(toolType)) {
        return res.status(400).json(errorResponse('Invalid tool_type'));
      }

      const userMessage = message || initial_message;
      if (!userMessage) {
        return res.status(400).json(errorResponse('Message is required'));
      }

      // Получаем или создаём чат
      const chatId = await getOrCreateChat(userId, toolType);

      // Сохраняем сообщение пользователя
      await query(
        `INSERT INTO tool_messages (chat_id, role, content) VALUES ($1, $2, $3)`,
        [chatId, 'user', userMessage]
      );

      // Загружаем историю
      const { rows: historyRows } = await query(
        `SELECT role, content
         FROM tool_messages
         WHERE chat_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [chatId]
      );

      const dbHistory = historyRows.reverse().map(row => ({
        role: row.role as 'user' | 'assistant',
        content: row.content
      }));

      // Получаем конфигурацию инструмента
      const config = await getToolConfig(toolType);

      // Для ассистента добавляем справочник промптов
      if (toolType === 'assistant') {
        const promptsRef = await getPromptsReference();
        config.systemPrompt += promptsRef;
      }

      // Проверяем API ключ
      if (!process.env.OPENROUTER_API_KEY) {
        console.error('[TOOLS API] OPENROUTER_API_KEY not found');
        return res.status(500).json(errorResponse('API ключ не настроен'));
      }

      // Инициализируем OpenRouter
      const openRouter = new OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      // Формируем сообщения для API
      const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

      if (config.systemPrompt) {
        apiMessages.push({
          role: 'system',
          content: config.systemPrompt,
        });
      }

      apiMessages.push(...dbHistory);

      console.log(`[TOOLS API] Sending to ${config.modelId} for ${toolType}`);

      // Настраиваем SSE стриминг
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Отправляем запрос
      const stream = await openRouter.chat.send({
        model: config.modelId,
        messages: apiMessages,
        stream: true,
        ...(toolType === 'tz_helper' && { max_tokens: 8192 }),
      });

      let fullResponse = '';

      // Обрабатываем стрим
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Определяем, есть ли копируемый контент
      const hasCopyable = fullResponse.includes('[ТЗ_START]') || fullResponse.includes('[IDEA_START]');

      // Сохраняем ответ AI
      if (fullResponse) {
        try {
          await query(
            `INSERT INTO tool_messages (chat_id, role, content, has_copyable_content)
             VALUES ($1, $2, $3, $4)`,
            [chatId, 'assistant', fullResponse, hasCopyable]
          );
        } catch (e) {
          console.error('[TOOLS API] Failed to save AI response:', e);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // ========== POST /api/tools/transfer ==========
    if (req.method === 'POST' && endpoint === 'transfer') {
      const { idea, target_tool } = req.body;
      const targetTool = (target_tool as ToolType) || 'tz_helper';

      if (!idea) {
        return res.status(400).json(errorResponse('Idea is required'));
      }

      if (!['assistant', 'tz_helper', 'ideas'].includes(targetTool)) {
        return res.status(400).json(errorResponse('Invalid target_tool'));
      }

      // Получаем или создаём чат в целевом инструменте
      const chatId = await getOrCreateChat(userId, targetTool);

      // Добавляем идею как первое сообщение пользователя
      await query(
        `INSERT INTO tool_messages (chat_id, role, content) VALUES ($1, $2, $3)`,
        [chatId, 'user', idea]
      );

      return res.status(200).json(successResponse({
        chatId,
        targetTool,
        message: 'Idea transferred successfully'
      }));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error: any) {
    console.error('[TOOLS API] Error:', error);

    if (!res.headersSent) {
      return res.status(500).json(errorResponse('Ошибка сервера: ' + (error?.message || 'Unknown error')));
    }

    res.write(`data: ${JSON.stringify({ error: 'Ошибка сервера' })}\n\n`);
    res.end();
  }
}
