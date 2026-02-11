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

// In-memory кеш (L1) — мгновенный доступ без JSON.parse
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Получить данные из кэша
 * L1: in-memory Map (без сериализации)
 * L2: localStorage (с JSON.parse)
 */
export function getCached<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  const now = Date.now();

  // L1: проверяем in-memory кеш
  const memEntry = memoryCache.get(key);
  if (memEntry && now - memEntry.timestamp <= ttl) {
    return memEntry.data as T;
  }
  if (memEntry) memoryCache.delete(key);

  // L2: проверяем localStorage
  try {
    const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!item) return null;

    const entry: CacheEntry<T> = JSON.parse(item);
    const isExpired = now - entry.timestamp > ttl;

    if (isExpired) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    // Промоутим в L1 для быстрого повторного доступа
    memoryCache.set(key, entry);
    return entry.data;
  } catch {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return null;
  }
}

/**
 * Сохранить данные в кэш (оба уровня)
 */
export function setCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };

  // L1: in-memory
  memoryCache.set(key, entry);

  // L2: localStorage
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.warn('Cache write failed, clearing old entries:', error);
    clearExpiredCache();
  }
}

/**
 * Удалить конкретный ключ из кэша
 */
export function removeCache(key: string): void {
  memoryCache.delete(key);
  localStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

/**
 * Очистить весь кэш VIBES
 */
export function clearAllCache(): void {
  memoryCache.clear();
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
  STAGES: 'stages',
  CATEGORIES: 'categories',
} as const;

// TTL для разных типов данных (в миллисекундах)
export const CACHE_TTL = {
  STYLES: 10 * 60 * 1000,    // 10 минут - стили меняются редко
  PROMPTS: 10 * 60 * 1000,   // 10 минут
  GLOSSARY: 15 * 60 * 1000,  // 15 минут - словарь статичен
  FAVORITES: 5 * 60 * 1000,  // 5 минут - избранное
  LESSONS: 5 * 60 * 1000,    // 5 минут - уроки с прогрессом
  STAGES: 5 * 60 * 1000,     // 5 минут - stages с прогрессом
  CATEGORIES: 30 * 60 * 1000, // 30 минут - категории почти статичны
} as const;
