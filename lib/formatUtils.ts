/**
 * Форматирование времени в HH:MM (ru-RU)
 */
export const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
