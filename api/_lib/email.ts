import { Resend } from 'resend';
import {
  welcomeTemplate,
  passwordResetTemplate,
  reminderTemplate,
  announcementTemplate,
} from './email-templates.js';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = 'VIBES <onboarding@resend.dev>';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY not set, skipping email to:', to);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Email send error:', err.message);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name: string, password: string) {
  return sendEmail({
    to,
    subject: 'Добро пожаловать в VIBES!',
    html: welcomeTemplate(name, password),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, password: string) {
  return sendEmail({
    to,
    subject: 'Ваш пароль сброшен — VIBES',
    html: passwordResetTemplate(name, password),
  });
}

export async function sendReminderEmail(to: string, name: string, daysSinceActive: number) {
  return sendEmail({
    to,
    subject: 'Мы скучаем по вам — VIBES',
    html: reminderTemplate(name, daysSinceActive),
  });
}

export async function sendAnnouncementEmail(to: string, title: string, message: string) {
  return sendEmail({
    to,
    subject: `${title} — VIBES`,
    html: announcementTemplate(title, message),
  });
}
