/**
 * Утилита для выполнения авторизованных fetch запросов
 * Автоматически добавляет JWT токен из localStorage
 */

interface FetchWithAuthOptions extends RequestInit {
  skipAuth?: boolean; // Для редких случаев публичных запросов
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Выполняет fetch запрос с автоматическим добавлением JWT токена
 * @param url - URL для запроса
 * @param options - Опции fetch (headers, method, body и т.д.)
 * @returns Promise с типизированным ответом
 * @throws Error если токен отсутствует или запрос провалился
 */
export async function fetchWithAuth<T = any>(
  url: string,
  options: FetchWithAuthOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth, ...fetchOptions } = options;

  // Получаем токен из localStorage
  const token = localStorage.getItem('vibes_token');

  // Проверяем наличие токена (кроме случаев skipAuth)
  if (!skipAuth && !token) {
    console.error('fetchWithAuth: токен отсутствует');
    throw new Error('Токен отсутствует. Пожалуйста, войдите в систему.');
  }

  // Подготавливаем заголовки
  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Выполняем запрос
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Обработка ошибок HTTP
    if (!response.ok) {
      // Специальная обработка 401 (Unauthorized)
      if (response.status === 401) {
        console.error('fetchWithAuth: токен невалиден или истёк (401)');

        // Удаляем невалидный токен
        localStorage.removeItem('vibes_token');

        // Отправляем событие для редиректа на логин
        window.dispatchEvent(new CustomEvent('auth:expired'));

        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
      }

      // Другие HTTP ошибки
      const errorText = await response.text();
      console.error(`fetchWithAuth: HTTP ${response.status}`, errorText);
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    // Парсим JSON
    const data: ApiResponse<T> = await response.json();

    // Проверяем структуру ответа API
    if (!data.success) {
      console.error('fetchWithAuth: API вернул ошибку', data.error);
      throw new Error(data.error || 'Неизвестная ошибка API');
    }

    return data;
  } catch (error) {
    // Логируем и пробрасываем ошибку дальше
    console.error('fetchWithAuth: исключение при запросе', error);
    throw error;
  }
}

/**
 * Вспомогательная функция для GET запросов
 */
export async function fetchWithAuthGet<T = any>(url: string): Promise<T> {
  const response = await fetchWithAuth<T>(url, { method: 'GET' });
  return response.data as T;
}

/**
 * Вспомогательная функция для POST запросов
 */
export async function fetchWithAuthPost<T = any>(
  url: string,
  body: any
): Promise<T> {
  const response = await fetchWithAuth<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.data as T;
}

/**
 * Вспомогательная функция для PUT запросов
 */
export async function fetchWithAuthPut<T = any>(
  url: string,
  body: any
): Promise<T> {
  const response = await fetchWithAuth<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.data as T;
}

/**
 * Вспомогательная функция для PATCH запросов
 */
export async function fetchWithAuthPatch<T = any>(
  url: string,
  body: any
): Promise<T> {
  const response = await fetchWithAuth<T>(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.data as T;
}

/**
 * Вспомогательная функция для DELETE запросов
 */
export async function fetchWithAuthDelete<T = any>(url: string): Promise<T> {
  const response = await fetchWithAuth<T>(url, { method: 'DELETE' });
  return response.data as T;
}
