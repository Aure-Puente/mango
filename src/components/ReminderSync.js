//ReminderSync:
import { useEffect, useRef } from 'react';
import { useData } from '@/context/DataContext';
import { ensureNotificationPermission, rescheduleReminders } from '@/lib/notifications';

export function ReminderSync() {
  const { ready, settings, recurring, purchases, cards, debts } = useData();
  const asked = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!ready || !settings.notifications) return;
    if (!asked.current) {
      asked.current = true;
      ensureNotificationPermission().catch(() => {});
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      rescheduleReminders(recurring, purchases, cards, debts).catch((e) => console.warn('Recordatorios', e));
    }, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ready, settings.notifications, recurring, purchases, cards, debts]);

  return null;
}
