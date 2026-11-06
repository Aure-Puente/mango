import { useEffect, useRef } from 'react';
import { useData } from '@/context/DataContext';
import { ensureNotificationPermission, rescheduleReminders } from '@/lib/notifications';

/** Mantiene los recordatorios de vencimientos sincronizados con los datos */
export function ReminderSync() {
  const { ready, settings, recurring, purchases, cards } = useData();
  const asked = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!ready || !settings.notifications) return;
    if (!asked.current) {
      asked.current = true;
      ensureNotificationPermission().catch(() => {});
    }
    if (timer.current) clearTimeout(timer.current);
    // Espera un momento para no reprogramar en cada cambio seguido
    timer.current = setTimeout(() => {
      rescheduleReminders(recurring, purchases, cards).catch((e) => console.warn('Recordatorios', e));
    }, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ready, settings.notifications, recurring, purchases, cards]);

  return null;
}
