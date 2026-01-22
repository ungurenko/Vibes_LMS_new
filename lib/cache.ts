/**
 * Утилита кэширования данных в localStorage с TTL
 *
 * Используется для кэширования статичных данных (стили, промпты, словарь)
 * чтобы не загружать их каждый раз с сервера
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// TTL по умолчанию - 5 минут
const DEFAULT_TTL = 5 * 60 * 1000;

// Префикс для ключей в localStorage
const CACHE_PREFIX = 'vibes_cache_';

/**
 * Получить данные из кэша
 * @param key Ключ кэша
 * @param ttl TTL в миллисекундах (по умолчанию 5 минут)
 * @returns Данные из кэша или null если кэш устарел/отсутствует
 */
export function getCached<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  try {
    const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!item) return null;

    const entry: CacheEntry<T> = JSON.parse(item);
    const isExpired = Date.now() - entry.timestamp > ttl;

    if (isExpired) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch {
    // Если ошибка парсинга - удаляем невалидный кэш
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return null;
  }
}

/**
 * Сохранить данные в кэш
 * @param key Ключ кэша
 * @param data Данные для сохранения
 */
export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    // Если localStorage переполнен - очищаем старые кэши
    console.warn('Cache write failed, clearing old entries:', error);
    clearExpiredCache();
  }
}

/**
 * Удалить конкретный ключ из кэша
 */
export function removeCache(key: string): void {
  localStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

/**
 * Очистить весь кэш VIBES
 */
export function clearAllCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Очистить устаревшие записи кэша
 */
export function clearExpiredCache(ttl: number = DEFAULT_TTL): void {
  const now = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const entry: CacheEntry<unknown> = JSON.parse(item);
          if (now - entry.timestamp > ttl) {
            keysToRemove.push(key);
          }
        }
      } catch {
        // Невалидная запись - удаляем
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

// Ключи кэша для разных типов данных
export const CACHE_KEYS = {
  STYLES: 'styles',
  PROMPTS: 'prompts',
  GLOSSARY: 'glossary',
  FAVORITES: 'favorites',
  LESSONS: 'lessons',
} as const;

// TTL для разных типов данных (в миллисекундах)
export const CACHE_TTL = {
  STYLES: 10 * 60 * 1000,    // 10 минут - стили меняются редко
  PROMPTS: 10 * 60 * 1000,   // 10 минут
  GLOSSARY: 15 * 60 * 1000,  // 15 минут - словарь статичен
  FAVORITES: 5 * 60 * 1000,  // 5 минут - избранное
  LESSONS: 5 * 60 * 1000,    // 5 минут - уроки с прогрессом
} as const;
