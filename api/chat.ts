/**
 * POST /api/chat
 *
 * Обработка чата с OpenRouter API (стриминг)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenRouter } from '@openrouter/sdk';
import { getUserFromRequest, errorResponse } from './_lib/auth';

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
    const { messages, systemInstruction } = req.body;
    console.log('[CHAT API] Messages count:', messages?.length);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json(errorResponse('Некорректный формат сообщений'));
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

    const modelName = 'xiaomi/mimo-v2-flash:free';
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

    // Если стрим уже начался, не можем отправить JSON
    if (!res.headersSent) {
      console.log('[CHAT API] Sending error response as JSON');
      return res.status(500).json(errorResponse('Ошибка сервера: ' + (error?.message || 'Unknown error')));
    }

    // Если стрим уже идёт, отправляем ошибку через SSE
    console.log('[CHAT API] Sending error response via SSE');
    res.write(`data: ${JSON.stringify({ error: 'Ошибка сервера' })}\n\n`);
    res.end();
  }
}
