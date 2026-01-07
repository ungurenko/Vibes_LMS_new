/**
 * Подключение к PostgreSQL базе данных
 *
 * Использует пул соединений для эффективной работы
 * в serverless окружении Vercel
 */

import { Pool } from 'pg';

// Создаём пул соединений
// В serverless функциях пул переиспользуется между вызовами
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false } // Для Timeweb Cloud и других облачных БД
    : false,
  max: 1, // Максимум соединений в пуле
  idleTimeoutMillis: 30000, // Закрывать неактивные соединения через 30 сек
  connectionTimeoutMillis: 10000, // Таймаут подключения 10 сек
});

// Тестируем подключение при старте
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Выполняет SQL запрос
 * @param text SQL запрос
 * @param params Параметры запроса (для защиты от SQL injection)
 * @returns Результат запроса
 *
 * @example
 * const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Логируем медленные запросы (>100ms) в development
    if (process.env.NODE_ENV !== 'production' && duration > 100) {
      console.log('Slow query:', { text, duration, rows: result.rowCount });
    }

    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

/**
 * Получает клиента из пула для транзакций
 * Не забудьте вызвать client.release() после использования!
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('INSERT INTO ...');
 *   await client.query('COMMIT');
 * } catch (e) {
 *   await client.query('ROLLBACK');
 *   throw e;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient() {
  return pool.connect();
}

export default pool;
