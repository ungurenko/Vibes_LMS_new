/**
 * useAnalytics — fire-and-forget трекинг поведения студентов
 * Ошибки молча логируются, не ломают UX
 */

import { useCallback, useRef } from 'react';

interface TrackPayload {
  eventType: string;
  targetType?: string;
  targetId?: string;
  targetTitle?: string;
  metadata?: Record<string, any>;
}

function sendEvent(payload: TrackPayload) {
  const token = localStorage.getItem('vibes_token');
  if (!token) return;

  fetch('/api/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // fire-and-forget — молча игнорируем ошибки
  });
}

export function useAnalytics() {
  const lastPageRef = useRef<string>('');

  const trackPageView = useCallback((page: string) => {
    // Дедупликация: не отправлять одну и ту же страницу подряд
    if (lastPageRef.current === page) return;
    lastPageRef.current = page;
    sendEvent({ eventType: 'page_view', targetType: 'page', targetId: page });
  }, []);

  const trackPromptCopy = useCallback((promptId: string, title: string) => {
    sendEvent({
      eventType: 'prompt_copy',
      targetType: 'prompt',
      targetId: promptId,
      targetTitle: title,
    });
  }, []);

  const trackPromptFavorite = useCallback((promptId: string, title: string, action: 'add' | 'remove') => {
    sendEvent({
      eventType: 'prompt_favorite',
      targetType: 'prompt',
      targetId: promptId,
      targetTitle: title,
      metadata: { action },
    });
  }, []);

  const trackStyleView = useCallback((styleId: string, name: string) => {
    sendEvent({
      eventType: 'style_view',
      targetType: 'style',
      targetId: styleId,
      targetTitle: name,
    });
  }, []);

  const trackStyleCopy = useCallback((styleId: string, name: string) => {
    sendEvent({
      eventType: 'style_copy',
      targetType: 'style',
      targetId: styleId,
      targetTitle: name,
    });
  }, []);

  const trackToolOpen = useCallback((toolType: string) => {
    sendEvent({
      eventType: 'tool_open',
      targetType: 'tool',
      targetId: toolType,
    });
  }, []);

  const trackToolMessage = useCallback((toolType: string) => {
    sendEvent({
      eventType: 'tool_message',
      targetType: 'tool',
      targetId: toolType,
    });
  }, []);

  const trackQuickQuestion = useCallback((question: string, toolType: string) => {
    sendEvent({
      eventType: 'quick_question_click',
      targetType: 'tool',
      targetId: toolType,
      targetTitle: question,
    });
  }, []);

  return {
    trackPageView,
    trackPromptCopy,
    trackPromptFavorite,
    trackStyleView,
    trackStyleCopy,
    trackToolOpen,
    trackToolMessage,
    trackQuickQuestion,
  };
}
