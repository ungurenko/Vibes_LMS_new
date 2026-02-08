import { useState, useCallback, useRef } from 'react';

/**
 * Хук для управления feedback при копировании.
 * Поддерживает single-item (copiedId = 'single') и multi-item (copiedId = конкретный id) режимы.
 */
export function useCopyFeedback(duration = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const triggerCopy = useCallback((id: string = 'single') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCopiedId(id);
    timerRef.current = setTimeout(() => setCopiedId(null), duration);
  }, [duration]);

  const isCopied = useCallback((id: string = 'single') => {
    return copiedId === id;
  }, [copiedId]);

  return { copiedId, triggerCopy, isCopied };
}
