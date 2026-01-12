/**
 * Upload API endpoint
 *
 * Handles:
 * - POST /api/upload - загрузка изображений в Vercel Blob
 *
 * Принимает base64 изображение в JSON и загружает в Blob Storage
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import {
  getUserFromRequest,
  successResponse,
  errorResponse,
} from './_lib/auth.js';

interface UploadRequest {
  base64: string; // data:image/jpeg;base64,/9j/4AAQ...
  filename?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    // Проверяем авторизацию
    const tokenData = getUserFromRequest(req);
    if (!tokenData) {
      return res.status(401).json(errorResponse('Не авторизован'));
    }

    // Разрешаем загрузку всем авторизованным пользователям (для аватаров и др.)
    const { base64, filename } = req.body as UploadRequest;

    if (!base64) {
      return res.status(400).json(errorResponse('base64 изображение обязательно'));
    }

    // Парсим base64 строку: data:image/jpeg;base64,/9j/4AAQ...
    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json(errorResponse('Неверный формат base64'));
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Валидация типа файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json(errorResponse('Неподдерживаемый формат изображения'));
    }

    // Конвертируем base64 в Buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Проверяем размер (макс 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json(errorResponse('Файл слишком большой (макс 10MB)'));
    }

    // Генерируем уникальное имя файла
    const ext = mimeType.split('/')[1];
    const uniqueFilename = filename || `style-${Date.now()}.${ext}`;

    // Загружаем в Vercel Blob
    const blob = await put(uniqueFilename, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    return res.status(200).json(successResponse({
      url: blob.url,
      size: buffer.length,
    }));

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json(errorResponse('Ошибка при загрузке файла'));
  }
}
