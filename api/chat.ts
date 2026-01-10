/**
 * POST /api/chat
 *
 * Обработка чата с OpenRouter API (стриминг)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenRouter } from '@openrouter/sdk';
import { getUserFromRequest, errorResponse } from './_lib/auth.js';
import { query } from './_lib/db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log('[CHAT API] Request received:', req.method);

  try {
    // Проверяем метод
    if (req.method !== 'POST') {
      console.log('[CHAT API] Invalid method:', req.method);
      return res.status(405).json(errorResponse('Method not allowed'));
    }

    // Проверяем авторизацию (опционально - токен может отсутствовать в dev режиме)
    const tokenData = getUserFromRequest(req);
    if (tokenData) {
      console.log('[CHAT API] User authenticated:', tokenData.userId);
    } else {
      console.log('[CHAT API] No auth token, proceeding anyway (dev mode)');
    }

    // Получаем данные из запроса
    const { messages } = req.body;
    console.log('[CHAT API] Messages count:', messages?.length);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json(errorResponse('Некорректный формат сообщений'));
    }

    // Получаем активную системную инструкцию из БД
    let systemInstruction = '';
    try {
      const { rows } = await query(
        `SELECT content FROM ai_system_instructions WHERE is_active = true LIMIT 1`
      );
      if (rows.length > 0) {
        systemInstruction = rows[0].content;
        console.log('[CHAT API] Using active system instruction from DB');
      } else {
        console.log('[CHAT API] No active instruction in DB, using default');
        // Default instruction fallback
        systemInstruction = `Ты — опытный ментор по веб-разработке (вайб-кодингу). 
Твоя цель — помогать студентам создавать красивые и функциональные веб-приложения, объяснять сложные концепции простым языком и поддерживать их мотивацию.
Отвечай кратко, по делу, используй примеры кода.`;
      }
    } catch (dbError) {
      console.error('[CHAT API] Failed to fetch system instruction:', dbError);
      // Fallback on error
      systemInstruction = 'Ты полезный помощник по программированию.';
    }

    // Проверяем наличие API ключа
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('[CHAT API] OPENROUTER_API_KEY not found in environment');
      return res.status(500).json(errorResponse('API ключ не настроен'));
    }

    console.log('[CHAT API] API key found, length:', process.env.OPENROUTER_API_KEY.length);

    // Инициализируем OpenRouter
    const openRouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // Формируем массив сообщений для API
    const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Добавляем системную инструкцию если есть
    if (systemInstruction) {
      apiMessages.push({
        role: 'system',
        content: systemInstruction,
      });
    }

    // Добавляем историю сообщений
    messages.forEach((msg: any) => {
      apiMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    });

    console.log('[CHAT API] Sending request to OpenRouter, messages:', apiMessages.length);

    // Настраиваем SSE стриминг
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const modelName = 'google/gemini-2.5-flash-lite';
    console.log('[CHAT API] Using model:', modelName);

    // Отправляем запрос с стримингом
    const stream = await openRouter.chat.send({
      model: modelName,
      messages: apiMessages,
      stream: true,
    });

    console.log('[CHAT API] Stream started successfully');

    // Обрабатываем стрим
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        // Отправляем данные в формате SSE
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Завершаем стрим
    console.log('[CHAT API] Stream completed successfully');
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('[CHAT API] Error occurred:', error);
    console.error('[CHAT API] Error message:', error?.message);
    console.error('[CHAT API] Error stack:', error?.stack);
    console.error('[CHAT API] Error response:', error?.response?.data || error?.response);

    // Если стрим уже начался, не можем отправить JSON
    if (!res.headersSent) {
      console.log('[CHAT API] Sending error response as JSON');
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';
      return res.status(500).json(errorResponse('Ошибка сервера: ' + errorMessage));
    }

    // Если стрим уже идёт, отправляем ошибку через SSE
    console.log('[CHAT API] Sending error response via SSE');
    res.write(`data: ${JSON.stringify({ error: 'Ошибка сервера' })}\n\n`);
    res.end();
  }
}
