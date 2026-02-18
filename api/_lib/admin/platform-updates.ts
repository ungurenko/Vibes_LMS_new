import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

async function getUpdates(req: VercelRequest, res: VercelResponse) {
  const { rows } = await query(
    `SELECT id, title, description, created_at
     FROM platform_updates
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );
  return res.status(200).json(successResponse(rows));
}

async function createUpdate(req: VercelRequest, res: VercelResponse) {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json(errorResponse('Заголовок обязателен'));
  }

  const { rows } = await query(
    `INSERT INTO platform_updates (title, description)
     VALUES ($1, $2)
     RETURNING id, title, description, created_at`,
    [title, description || null]
  );

  return res.status(201).json(successResponse(rows[0]));
}

async function updateUpdate(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const { title, description } = req.body;

  if (!id) {
    return res.status(400).json(errorResponse('ID обязателен'));
  }

  if (!title) {
    return res.status(400).json(errorResponse('Заголовок обязателен'));
  }

  const { rows, rowCount } = await query(
    `UPDATE platform_updates
     SET title = $1, description = $2
     WHERE id = $3 AND deleted_at IS NULL
     RETURNING id, title, description, created_at`,
    [title, description || null, id]
  );

  if (rowCount === 0) {
    return res.status(404).json(errorResponse('Запись не найдена'));
  }

  return res.status(200).json(successResponse(rows[0]));
}

async function deleteUpdate(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json(errorResponse('ID обязателен'));
  }

  const { rowCount } = await query(
    `UPDATE platform_updates SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  if (rowCount === 0) {
    return res.status(404).json(errorResponse('Запись не найдена'));
  }

  return res.status(200).json(successResponse({ deleted: true }));
}

export async function handlePlatformUpdates(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getUpdates(req, res);
      case 'POST':
        return await createUpdate(req, res);
      case 'PUT':
        return await updateUpdate(req, res);
      case 'DELETE':
        return await deleteUpdate(req, res);
      default:
        return res.status(405).json(errorResponse('Method not allowed'));
    }
  } catch (error: any) {
    console.error('Platform updates API error:', error.message, error.code);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
