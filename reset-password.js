/**
 * Скрипт для сброса пароля пользователя
 * Использование: node reset-password.js <email> <новый_пароль>
 */

import { Pool } from 'pg';
import bcryptjs from 'bcryptjs';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env.local
const envPath = join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!key.startsWith('#')) {
        process.env[key.trim()] = value;
      }
    }
  });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetPassword(email, newPassword) {
  try {
    // Хешируем новый пароль
    const passwordHash = await bcryptjs.hash(newPassword, 10);

    // Обновляем пароль в БД
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 AND deleted_at IS NULL RETURNING email, role',
      [passwordHash, email]
    );

    if (result.rowCount === 0) {
      console.error('❌ Пользователь с email', email, 'не найден');
      process.exit(1);
    }

    console.log('✅ Пароль успешно изменён!');
    console.log('📧 Email:', result.rows[0].email);
    console.log('👤 Роль:', result.rows[0].role);
    console.log('🔑 Новый пароль:', newPassword);
    console.log('\nТеперь вы можете войти в систему с этими учётными данными.');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Получаем аргументы командной строки
const [,, email, password] = process.argv;

if (!email || !password) {
  console.error('Использование: node reset-password.js <email> <новый_пароль>');
  console.error('Пример: node reset-password.js admin@vibes.com mypassword123');
  process.exit(1);
}

resetPassword(email, password);
