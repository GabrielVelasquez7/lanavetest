import { useEffect, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

// Simple persistence helper for react-hook-form using localStorage
// - Restores values when the key (user+agency+date) is the same
// - Saves on every change
// - Exposes clearDraft to manually clear after submit
export function useFormPersist<T extends Record<string, any>>(key: string | null, form: UseFormReturn<T>) {
  const storageKey = useMemo(() => key ?? null, [key]);

  // Restore on mount or when key changes
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only reset if parsed is an object
        if (parsed && typeof parsed === 'object') {
          form.reset(parsed);
        }
      }
    } catch (_) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Subscribe to changes and persist
  useEffect(() => {
    if (!storageKey) return;
    const sub = form.watch((values) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values));
      } catch (_) {
        // ignore quota errors
      }
    });
    return () => sub.unsubscribe();
  }, [form, storageKey]);

  const clearDraft = () => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {
      // ignore
    }
  };

  return { clearDraft };
}
