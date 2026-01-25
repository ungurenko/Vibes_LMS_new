/**
 * Хелперы для аутентификации
 *
 * JWT токены для авторизации API запросов
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IncomingMessage } from 'http';

// Секретный ключ для JWT (должен быть в .env)
const JWT_SECRET = process.env.JWT_SECRET || 'vibes-secret-key-change-in-production';

// Время жизни токена (7 дней)
const TOKEN_EXPIRY = '7d';

/**
 * Данные пользователя в JWT токене
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: 'student' | 'admin' | 'mentor';
}

/**
 * Создаёт JWT токен для пользователя
 */
export function createToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Проверяет и декодирует JWT токен
 * @returns Данные пользователя или null если токен невалидный
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Извлекает токен из заголовка Authorization
 * Поддерживает формат: "Bearer <token>"
 */
export function getTokenFromHeader(req: IncomingMessage): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7); // Убираем "Bearer "
}

/**
 * Получает данные пользователя из запроса
 * Комбинирует getTokenFromHeader + verifyToken
 */
export function getUserFromRequest(req: IncomingMessage): JwtPayload | null {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Хеширует пароль с помощью bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Сравнивает пароль с хешем
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Тип ответа API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Создаёт успешный ответ API
 */
export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

/**
 * Создаёт ответ с ошибкой
 */
export function errorResponse(message: string): ApiResponse {
  return { success: false, error: message };
}
