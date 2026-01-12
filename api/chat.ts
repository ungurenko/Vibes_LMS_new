/**
 * POST /api/chat
 *
 * DEPRECATED: Используйте /api/tools вместо этого эндпоинта.
 * Этот файл оставлен для обратной совместимости и перенаправляет на tool_type='assistant'.
 *
 * Обработка чата с OpenRouter API (стриминг)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenRouter } from '@openrouter/sdk';
import { getUserFromRequest, errorResponse, successResponse } from './_lib/auth.js';
import { query } from './_lib/db.js';

// Получить или создать чат для assistant
async function getOrCreateAssistantChat(userId: string): Promise<string> {
  const { rows: existing } = await query(
    'SELECT id FROM tool_chats WHERE user_id = $1 AND tool_type = $2',
    [userId, 'assistant']
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const { rows: newChat } = await query(
    'INSERT INTO tool_chats (user_id, tool_type) VALUES ($1, $2) RETURNING id',
    [userId, 'assistant']
  );

  return newChat[0].id;
}

// Получить конфигурацию ассистента
async function getAssistantConfig(): Promise<{ systemPrompt: string; modelId: string }> {
  const defaultPrompt = `Ты — опытный ментор по веб-разработке (вайб-кодингу).
Твоя цель — помогать студентам создавать красивые и функциональные веб-приложения, объяснять сложные концепции простым языком и поддерживать их мотивацию.
Отвечай кратко, по делу, используй примеры кода.`;

  const defaultModel = 'google/gemini-2.5-flash-lite';

  try {
    const { rows } = await query(
      `SELECT content, model_id FROM ai_system_instructions
       WHERE tool_type = 'assistant' AND is_active = true
       LIMIT 1`
    );

    if (rows.length > 0) {
      return {
        systemPrompt: rows[0].content || defaultPrompt,
        modelId: rows[0].model_id || defaultModel
      };
    }

    return { systemPrompt: defaultPrompt, modelId: defaultModel };
  } catch (error) {
    console.error('[CHAT API] Failed to fetch assistant config:', error);
    return { systemPrompt: defaultPrompt, modelId: defaultModel };
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

  // Проверяем авторизацию
  const tokenData = getUserFromRequest(req);
  if (!tokenData) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const userId = tokenData.userId;

  // GET /api/chat - Получение истории (из tool_messages)
  if (req.method === 'GET') {
    try {
      const chatId = await getOrCreateAssistantChat(userId);

      const { rows } = await query(
        `SELECT id, role, content as text, created_at as timestamp
         FROM tool_messages
         WHERE chat_id = $1
         ORDER BY created_at ASC
         LIMIT 50`,
        [chatId]
      );

      return res.status(200).json(successResponse(rows));
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return res.status(500).json(errorResponse('Database error'));
    }
  }

  // DELETE /api/chat - Очистка истории
  if (req.method === 'DELETE') {
    try {
      await query(
        `DELETE FROM tool_messages
         WHERE chat_id IN (SELECT id FROM tool_chats WHERE user_id = $1 AND tool_type = 'assistant')`,
        [userId]
      );

      return res.status(200).json(successResponse({ message: 'History cleared' }));
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return res.status(500).json(errorResponse('Database error'));
    }
  }

  // POST /api/chat - Отправка сообщения
  if (req.method === 'POST') {
    console.log('[CHAT API] Request received (deprecated, use /api/tools)');

    try {
      const { messages, message } = req.body;

      // Определяем новое сообщение пользователя
      let newUserMessage = '';
      if (message) {
        newUserMessage = message;
      } else if (Array.isArray(messages) && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        newUserMessage = lastMsg.text || lastMsg.content;
      }

      if (!newUserMessage) {
        return res.status(400).json(errorResponse('Message is required'));
      }

      // Получаем или создаём чат
      const chatId = await getOrCreateAssistantChat(userId);

      // Сохраняем сообщение пользователя
      await query(
        `INSERT INTO tool_messages (chat_id, role, content) VALUES ($1, $2, $3)`,
        [chatId, 'user', newUserMessage]
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

      // Получаем конфигурацию
      const config = await getAssistantConfig();

      // Проверяем API ключ
      if (!process.env.OPENROUTER_API_KEY) {
        console.error('[CHAT API] OPENROUTER_API_KEY not found');
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

      console.log(`[CHAT API] Sending to ${config.modelId}`);

      // Настраиваем SSE стриминг
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Отправляем запрос
      const stream = await openRouter.chat.send({
        model: config.modelId,
        messages: apiMessages,
        stream: true,
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

      // Сохраняем ответ AI
      if (fullResponse) {
        try {
          await query(
            `INSERT INTO tool_messages (chat_id, role, content) VALUES ($1, $2, $3)`,
            [chatId, 'assistant', fullResponse]
          );
        } catch (e) {
          console.error('[CHAT API] Failed to save AI response:', e);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('[CHAT API] Error occurred:', error);

      if (!res.headersSent) {
        const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';
        return res.status(500).json(errorResponse('Ошибка сервера: ' + errorMessage));
      }

      res.write(`data: ${JSON.stringify({ error: 'Ошибка сервера' })}\n\n`);
      res.end();
    }
    return;
  }

  return res.status(405).json(errorResponse('Method not allowed'));
}
