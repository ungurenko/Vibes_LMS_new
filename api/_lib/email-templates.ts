const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 560px;
  margin: 0 auto;
  padding: 40px 24px;
  background: #fafafa;
  color: #18181b;
`;

const cardStyle = `
  background: white;
  border-radius: 16px;
  padding: 32px;
  border: 1px solid #e4e4e7;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background: #8b5cf6;
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: bold;
  font-size: 14px;
`;

const footerStyle = `
  margin-top: 24px;
  text-align: center;
  color: #a1a1aa;
  font-size: 12px;
`;

function wrap(content: string): string {
  return `
    <div style="${baseStyle}">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: 800; color: #8b5cf6; margin: 0;">VIBES</h1>
      </div>
      <div style="${cardStyle}">
        ${content}
      </div>
      <div style="${footerStyle}">
        VIBES — платформа для изучения вайб-кодинга
      </div>
    </div>
  `;
}

export function welcomeTemplate(name: string, password: string): string {
  return wrap(`
    <h2 style="margin: 0 0 16px; font-size: 20px;">Добро пожаловать, ${name}!</h2>
    <p style="color: #52525b; line-height: 1.6;">
      Ваш аккаунт на платформе VIBES создан. Используйте данные ниже для входа:
    </p>
    <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin: 16px 0; font-family: monospace;">
      <strong>Пароль:</strong> ${password}
    </div>
    <p style="color: #71717a; font-size: 13px;">
      Рекомендуем сменить пароль после первого входа.
    </p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://vibes-navy.vercel.app" style="${buttonStyle}">Войти на платформу</a>
    </div>
  `);
}

export function passwordResetTemplate(name: string, password: string): string {
  return wrap(`
    <h2 style="margin: 0 0 16px; font-size: 20px;">Пароль сброшен</h2>
    <p style="color: #52525b; line-height: 1.6;">
      ${name}, ваш пароль был сброшен администратором. Новый пароль:
    </p>
    <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 18px; text-align: center;">
      ${password}
    </div>
    <p style="color: #71717a; font-size: 13px;">
      Если вы не запрашивали сброс пароля, обратитесь к администратору.
    </p>
  `);
}

export function reminderTemplate(name: string, daysSinceActive: number): string {
  return wrap(`
    <h2 style="margin: 0 0 16px; font-size: 20px;">Мы скучаем по вам!</h2>
    <p style="color: #52525b; line-height: 1.6;">
      ${name}, вас не было на платформе уже <strong>${daysSinceActive} дней</strong>.
      Ваш прогресс ждёт вас — продолжите обучение прямо сейчас!
    </p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://vibes-navy.vercel.app" style="${buttonStyle}">Вернуться к обучению</a>
    </div>
  `);
}

export function announcementTemplate(title: string, message: string): string {
  return wrap(`
    <h2 style="margin: 0 0 16px; font-size: 20px;">${title}</h2>
    <p style="color: #52525b; line-height: 1.6;">
      ${message}
    </p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://vibes-navy.vercel.app" style="${buttonStyle}">Открыть платформу</a>
    </div>
  `);
}
