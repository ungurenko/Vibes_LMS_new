/**
 * POST /api/chat
 *
 * Обработка чата с OpenRouter API (стриминг)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenRouter } from '@openrouter/sdk';
import { getUserFromRequest, errorResponse, successResponse } from './_lib/auth.js';
import { query } from './_lib/db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET /api/chat - Получение истории
  if (req.method === 'GET') {
    try {
      const tokenData = getUserFromRequest(req);
      if (!tokenData) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const { rows } = await query(
        `SELECT id, role, content as text, created_at as timestamp, model_used 
         FROM chat_messages 
         WHERE user_id = $1 
         ORDER BY created_at ASC 
         LIMIT 50`,
        [tokenData.userId]
      );

      return res.status(200).json(successResponse(rows));
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return res.status(500).json(errorResponse('Database error'));
    }
  }

  // 1.5 DELETE /api/chat - Очистка истории
  if (req.method === 'DELETE') {
    try {
      const tokenData = getUserFromRequest(req);
      if (!tokenData) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      await query(
        `DELETE FROM chat_messages WHERE user_id = $1`,
        [tokenData.userId]
      );

      return res.status(200).json(successResponse({ message: 'History cleared' }));
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return res.status(500).json(errorResponse('Database error'));
    }
  }

  // 2. POST /api/chat - Отправка сообщения
  if (req.method === 'POST') {
    console.log('[CHAT API] Request received:', req.method);

    try {
      // Проверяем авторизацию
      const tokenData = getUserFromRequest(req);
      if (!tokenData) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      // Получаем данные из запроса
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

      // 1. Сохраняем сообщение пользователя в БД
      await query(
        `INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)`,
        [tokenData.userId, 'user', newUserMessage]
      );

      // 2. Загружаем контекст (историю) из БД для отправки в AI
      // Берём последние 20 сообщений (включая только что добавленное)
      const { rows: historyRows } = await query(
        `SELECT role, content 
         FROM chat_messages 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [tokenData.userId]
      );
      
      // Разворачиваем историю (она была DESC)
      const dbHistory = historyRows.reverse().map(row => ({
        role: row.role as 'user' | 'assistant',
        content: row.content
      }));

      // Получаем активную системную инструкцию из БД
      let systemInstruction = '';
      try {
        const { rows } = await query(
          `SELECT content FROM ai_system_instructions WHERE is_active = true LIMIT 1`
        );
        if (rows.length > 0) {
          systemInstruction = rows[0].content;
        } else {
          systemInstruction = `Ты — опытный ментор по веб-разработке (вайб-кодингу). 
Твоя цель — помогать студентам создавать красивые и функциональные веб-приложения, объяснять сложные концепции простым языком и поддерживать их мотивацию.
Отвечай кратко, по делу, используй примеры кода.`;
        }
      } catch (dbError) {
        console.error('[CHAT API] Failed to fetch system instruction:', dbError);
        systemInstruction = 'Ты полезный помощник по программированию.';
      }

      // Проверяем наличие API ключа
      if (!process.env.OPENROUTER_API_KEY) {
        console.error('[CHAT API] OPENROUTER_API_KEY not found in environment');
        return res.status(500).json(errorResponse('API ключ не настроен'));
      }

      // Инициализируем OpenRouter
      const openRouter = new OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      // Формируем массив сообщений для API
      const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

      // Добавляем системную инструкцию
      if (systemInstruction) {
        apiMessages.push({
          role: 'system',
          content: systemInstruction,
        });
      }

      // Добавляем историю из БД
      apiMessages.push(...dbHistory);

      console.log('[CHAT API] Sending request to OpenRouter');

      // Настраиваем SSE стриминг
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const modelName = 'google/gemini-2.5-flash-lite';

      // Отправляем запрос с стримингом
      const stream = await openRouter.chat.send({
        model: modelName,
        messages: apiMessages,
        stream: true,
      });

      console.log('[CHAT API] Stream started successfully');

      let fullResponse = '';

      // Обрабатываем стрим
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          // Отправляем данные в формате SSE
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // 3. Сохраняем ответ AI в БД
      if (fullResponse) {
        try {
          await query(
            `INSERT INTO chat_messages (user_id, role, content, model_used) VALUES ($1, $2, $3, $4)`,
            [tokenData.userId, 'assistant', fullResponse, modelName]
          );
        } catch (e) {
          console.error('[CHAT API] Failed to save AI response:', e);
        }
      }

      // Завершаем стрим
      console.log('[CHAT API] Stream completed successfully');
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('[CHAT API] Error occurred:', error);
      
      // Если стрим уже начался
      if (!res.headersSent) {
        const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';
        return res.status(500).json(errorResponse('Ошибка сервера: ' + errorMessage));
      }

      // Если стрим уже идёт
      res.write(`data: ${JSON.stringify({ error: 'Ошибка сервера' })}\n\n`);
      res.end();
    }
    return;
  }

  return res.status(405).json(errorResponse('Method not allowed'));
}
