import { query } from './db.js';

/**
 * Получает cohort_id пользователя из БД
 * Когорта определяется через users.cohort_id (не через JWT)
 */
export async function getUserCohortId(userId: string): Promise<string | null> {
  const { rows } = await query(
    'SELECT cohort_id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  return rows[0]?.cohort_id || null;
}
