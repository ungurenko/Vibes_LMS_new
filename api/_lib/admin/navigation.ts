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
          tools: true,
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

      // Миграция: старый ключ "assistant" → "tools"
      const config = rows[0].setting_value;
      if ('assistant' in config && !('tools' in config)) {
        config.tools = config.assistant;
        delete config.assistant;
        // Сохраняем исправленный конфиг в БД
        await query(
          `UPDATE platform_settings SET setting_value = $1 WHERE setting_key = 'navigation_config'`,
          [JSON.stringify(config)]
        );
      }

      return res.status(200).json(successResponse(config));
    }

    // POST - обновить настройки навигации
    if (req.method === 'POST') {
      const config = req.body;

      // Валидация: проверяем что все ключи присутствуют и являются boolean
      const requiredKeys = ['dashboard', 'lessons', 'roadmaps', 'styles', 'prompts', 'glossary', 'tools'];
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
