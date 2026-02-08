import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { successResponse, errorResponse } from '../auth.js';

const toolTypeLabelsRu: Record<string, string> = {
  assistant: 'Ассистент',
  tz_helper: 'Помощник по ТЗ',
  ideas: 'Идеи для проектов',
};

/**
 * Генерирует Markdown для экспорта чатов
 */
function generateChatsMarkdown(
  chats: Array<{
    user: { name: string; email: string };
    messages: Array<{ role: string; content: string; createdAt: string }>;
    lastMessageAt: string | null;
  }>,
  toolType: string
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const toolLabel = toolTypeLabelsRu[toolType] || toolType;
  const totalMessages = chats.reduce((sum, c) => sum + c.messages.length, 0);

  let md = `# Экспорт чатов: ${toolLabel}\n`;
  md += `Дата экспорта: ${dateStr}\n`;
  md += `Всего диалогов: ${chats.length} | Всего сообщений: ${totalMessages}\n\n`;
  md += `---\n\n`;

  for (const chat of chats) {
    const lastActive = chat.lastMessageAt
      ? new Date(chat.lastMessageAt).toLocaleDateString('ru-RU')
      : 'Нет сообщений';

    md += `## Студент: ${chat.user.name || 'Без имени'} (${chat.user.email})\n`;
    md += `Сообщений: ${chat.messages.length} | Последняя активность: ${lastActive}\n\n`;

    for (const msg of chat.messages) {
      const msgDate = new Date(msg.createdAt);
      const msgDateStr = msgDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const msgTimeStr = msgDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });

      md += `### ${msgDateStr} ${msgTimeStr}\n`;
      md += `**${msg.role === 'user' ? 'Студент' : 'AI'}:** ${msg.content}\n\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

export async function handleAiChats(
  req: VercelRequest,
  res: VercelResponse,
  tokenData: { userId: string; role: string }
) {
  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse('Method not allowed'));
  }

  try {
    const { chat_id, tool_type, stats: getStats, export: doExport } = req.query;

    // Если запрошена только статистика
    if (getStats === 'true') {
      const { rows } = await query(`
        SELECT
          COUNT(DISTINCT tc.id) as total_chats,
          COUNT(tm.id) as total_messages,
          COUNT(DISTINCT tc.user_id) as unique_users,
          COUNT(DISTINCT CASE WHEN tc.tool_type = 'assistant' THEN tc.id END) as assistant_chats,
          COUNT(DISTINCT CASE WHEN tc.tool_type = 'tz_helper' THEN tc.id END) as tz_helper_chats,
          COUNT(DISTINCT CASE WHEN tc.tool_type = 'ideas' THEN tc.id END) as ideas_chats,
          COUNT(CASE WHEN tm.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as messages_this_week
        FROM tool_chats tc
        LEFT JOIN tool_messages tm ON tm.chat_id = tc.id
      `);

      return res.status(200).json(successResponse({
        totalChats: parseInt(rows[0].total_chats) || 0,
        totalMessages: parseInt(rows[0].total_messages) || 0,
        uniqueUsers: parseInt(rows[0].unique_users) || 0,
        assistantChats: parseInt(rows[0].assistant_chats) || 0,
        tzHelperChats: parseInt(rows[0].tz_helper_chats) || 0,
        ideasChats: parseInt(rows[0].ideas_chats) || 0,
        messagesThisWeek: parseInt(rows[0].messages_this_week) || 0,
      }));
    }

    // Экспорт чатов в Markdown
    if (doExport === 'true') {
      if (!tool_type || !['assistant', 'tz_helper', 'ideas'].includes(tool_type as string)) {
        return res.status(400).json(errorResponse('Укажите tool_type для экспорта (assistant, tz_helper, ideas)'));
      }

      // Получаем все чаты с сообщениями для выбранного инструмента
      const { rows: chatRows } = await query(`
        SELECT
          tc.id,
          tc.tool_type,
          u.first_name,
          u.last_name,
          u.email,
          MAX(tm.created_at) as last_message_at
        FROM tool_chats tc
        JOIN users u ON u.id = tc.user_id
        LEFT JOIN tool_messages tm ON tm.chat_id = tc.id
        WHERE tc.tool_type = $1 AND u.deleted_at IS NULL
        GROUP BY tc.id, u.id
        ORDER BY MAX(tm.created_at) DESC NULLS LAST
      `, [tool_type]);

      // Получаем сообщения для каждого чата
      const chatsWithMessages = await Promise.all(
        chatRows.map(async (chat: any) => {
          const { rows: messageRows } = await query(`
            SELECT role, content, created_at
            FROM tool_messages
            WHERE chat_id = $1
            ORDER BY created_at ASC
          `, [chat.id]);

          return {
            user: {
              name: [chat.first_name, chat.last_name].filter(Boolean).join(' '),
              email: chat.email,
            },
            lastMessageAt: chat.last_message_at,
            messages: messageRows.map((m: any) => ({
              role: m.role,
              content: m.content,
              createdAt: m.created_at,
            })),
          };
        })
      );

      // Фильтруем чаты без сообщений
      const nonEmptyChats = chatsWithMessages.filter(c => c.messages.length > 0);

      const markdown = generateChatsMarkdown(nonEmptyChats, tool_type as string);

      return res.status(200).json(successResponse({ markdown }));
    }

    // Если запрошен конкретный чат -- возвращаем его сообщения
    if (chat_id) {
      // Проверяем что чат существует и получаем инфу о нём
      const { rows: chatRows } = await query(`
        SELECT tc.id, tc.tool_type, tc.created_at, tc.updated_at,
               u.id as user_id, u.first_name, u.last_name, u.email, u.avatar_url
        FROM tool_chats tc
        JOIN users u ON u.id = tc.user_id
        WHERE tc.id = $1
      `, [chat_id]);

      if (chatRows.length === 0) {
        return res.status(404).json(errorResponse('Чат не найден'));
      }

      const chat = chatRows[0];

      // Получаем сообщения чата
      const { rows: messageRows } = await query(`
        SELECT id, role, content, has_copyable_content, created_at
        FROM tool_messages
        WHERE chat_id = $1
        ORDER BY created_at ASC
      `, [chat_id]);

      const messages = messageRows.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        hasCopyableContent: m.has_copyable_content,
        createdAt: m.created_at,
      }));

      return res.status(200).json(successResponse({
        chat: {
          id: chat.id,
          toolType: chat.tool_type,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
          user: {
            id: chat.user_id,
            name: [chat.first_name, chat.last_name].filter(Boolean).join(' '),
            email: chat.email,
            avatar: chat.avatar_url,
          },
        },
        messages,
      }));
    }

    // Иначе возвращаем список чатов
    let sql = `
      SELECT
        tc.id,
        tc.tool_type,
        tc.created_at,
        tc.updated_at,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        COUNT(tm.id) as message_count,
        MAX(tm.created_at) as last_message_at
      FROM tool_chats tc
      JOIN users u ON u.id = tc.user_id
      LEFT JOIN tool_messages tm ON tm.chat_id = tc.id
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Фильтр по типу инструмента
    if (tool_type && ['assistant', 'tz_helper', 'ideas'].includes(tool_type as string)) {
      sql += ` AND tc.tool_type = $${paramIndex}`;
      params.push(tool_type);
      paramIndex++;
    }

    sql += ` GROUP BY tc.id, u.id
             ORDER BY MAX(tm.created_at) DESC NULLS LAST
             LIMIT 100`;

    const { rows } = await query(sql, params);

    const chats = rows.map((row: any) => ({
      id: row.id,
      toolType: row.tool_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
      messageCount: parseInt(row.message_count) || 0,
      user: {
        id: row.user_id,
        name: [row.first_name, row.last_name].filter(Boolean).join(' '),
        email: row.email,
        avatar: row.avatar_url,
      },
    }));

    return res.status(200).json(successResponse(chats));
  } catch (error) {
    console.error('AI chats error:', error);
    return res.status(500).json(errorResponse('Ошибка получения чатов'));
  }
}
