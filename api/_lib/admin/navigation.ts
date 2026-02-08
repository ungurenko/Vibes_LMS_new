import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

export async function handleNavigation(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
  try {
    // GET - получить настройки навигации
    if (req.method === 'GET') {
      const { rows } = await query(
        `SELECT setting_value FROM platform_settings WHERE setting_key = 'navigation_config'`
      );

      // Если настройки не найдены - вернуть дефолтные значения (все видимы)
      if (rows.length === 0) {
        const defaultConfig = {
          dashboard: true,
          lessons: true,
          roadmaps: true,
          styles: true,
          prompts: true,
          glossary: true,
          assistant: true,
        };

        // Создаём запись с дефолтными настройками
        await query(
          `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
           VALUES ('navigation_config', $1, $2)
           ON CONFLICT (setting_key) DO NOTHING`,
          [JSON.stringify(defaultConfig), tokenData.userId]
        );

        return res.status(200).json(successResponse(defaultConfig));
      }

      return res.status(200).json(successResponse(rows[0].setting_value));
    }

    // POST - обновить настройки навигации
    if (req.method === 'POST') {
      const config = req.body;

      // Валидация: проверяем что все ключи присутствуют и являются boolean
      const requiredKeys = ['dashboard', 'lessons', 'roadmaps', 'styles', 'prompts', 'glossary', 'assistant'];
      const missingKeys = requiredKeys.filter(key => !(key in config));

      if (missingKeys.length > 0) {
        return res.status(400).json(
          errorResponse(`Отсутствуют обязательные ключи: ${missingKeys.join(', ')}`)
        );
      }

      // Проверяем что все значения boolean
      const invalidKeys = requiredKeys.filter(key => typeof config[key] !== 'boolean');
      if (invalidKeys.length > 0) {
        return res.status(400).json(
          errorResponse(`Неверный тип данных для ключей: ${invalidKeys.join(', ')} (ожидается boolean)`)
        );
      }

      // Защита: dashboard всегда должен быть true
      if (config.dashboard !== true) {
        return res.status(400).json(
          errorResponse('Вкладка "Дашборд" не может быть скрыта')
        );
      }

      // Обновляем настройки в БД
      const { rows } = await query(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
         VALUES ('navigation_config', $1, $2)
         ON CONFLICT (setting_key)
         DO UPDATE SET
           setting_value = $1,
           updated_by = $2,
           updated_at = NOW()
         RETURNING setting_value`,
        [JSON.stringify(config), tokenData.userId]
      );

      return res.status(200).json(successResponse(rows[0].setting_value));
    }

    return res.status(405).json(errorResponse('Method not allowed'));
  } catch (error) {
    console.error('Navigation settings error:', error);
    return res.status(500).json(errorResponse('Ошибка сервера'));
  }
}
