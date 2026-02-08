import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

// GET - Получить все активные вопросы
async function getQuickQuestions(req: VercelRequest, res: VercelResponse) {
  const { rows } = await query(
    `SELECT id, text, sort_order, is_active
     FROM quick_questions
     WHERE is_active = TRUE
     ORDER BY sort_order`
  );

  const questions = rows.map((row: any) => ({
    id: row.id,
    text: row.text,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));

  return res.status(200).json(successResponse(questions));
}

// POST - Создать новый вопрос
async function createQuickQuestion(req: VercelRequest, res: VercelResponse) {
  const { text, sortOrder = 0 } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json(errorResponse('Текст вопроса обязателен'));
  }

  if (text.length > 255) {
    return res.status(400).json(errorResponse('Текст вопроса не может превышать 255 символов'));
  }

  const { rows } = await query(
    `INSERT INTO quick_questions (text, sort_order, is_active)
     VALUES ($1, $2, TRUE)
     RETURNING id, text, sort_order, is_active`,
    [text.trim(), sortOrder]
  );

  const question = {
    id: rows[0].id,
    text: rows[0].text,
    sortOrder: rows[0].sort_order,
    isActive: rows[0].is_active,
  };

  return res.status(201).json(successResponse(question));
}

// PUT - Обновить вопрос
async function updateQuickQuestion(req: VercelRequest, res: VercelResponse) {
  const { id, text, sortOrder } = req.body;

  if (!id) {
    return res.status(400).json(errorResponse('ID вопроса обязателен'));
  }

  if (text && text.length > 255) {
    return res.status(400).json(errorResponse('Текст вопроса не может превышать 255 символов'));
  }

  const { rows, rowCount } = await query(
    `UPDATE quick_questions SET
      text = COALESCE($1, text),
      sort_order = COALESCE($2, sort_order),
      updated_at = NOW()
     WHERE id = $3 AND is_active = TRUE
     RETURNING id, text, sort_order, is_active`,
    [text?.trim(), sortOrder, id]
  );

  if (rowCount === 0) {
    return res.status(404).json(errorResponse('Вопрос не найден'));
  }

  const question = {
    id: rows[0].id,
    text: rows[0].text,
    sortOrder: rows[0].sort_order,
    isActive: rows[0].is_active,
  };

  return res.status(200).json(successResponse(question));
}

// DELETE - Удалить вопрос (soft delete через is_active = false)
async function deleteQuickQuestion(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json(errorResponse('ID вопроса обязателен'));
  }

  const { rowCount } = await query(
    `UPDATE quick_questions
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1 AND is_active = TRUE`,
    [id]
  );

  if (rowCount === 0) {
    return res.status(404).json(errorResponse('Вопрос не найден'));
  }

  return res.status(200).json(successResponse({ deleted: true }));
}

export async function handleQuickQuestions(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getQuickQuestions(req, res);
      case 'POST':
        return await createQuickQuestion(req, res);
      case 'PUT':
        return await updateQuickQuestion(req, res);
      case 'DELETE':
        return await deleteQuickQuestion(req, res);
      default:
        return res.status(405).json(errorResponse('Method not allowed'));
    }
  } catch (error) {
    console.error('Quick Questions API error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
