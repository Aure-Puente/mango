import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addMonths, currentPeriod, fromDateStr } from './dates';
import { commitmentsFor } from './finance';
import { formatMoney } from './money';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'vencimientos';

export async function ensureNotificationPermission() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Vencimientos y alertas',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#FF9F1C',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Fecha de aviso: el día anterior al vencimiento a las 10 hs */
function reminderDate(due) {
  const d = fromDateStr(due);
  d.setDate(d.getDate() - 1);
  d.setHours(10, 0, 0, 0);
  return d.getTime() > Date.now() ? d : null;
}

/**
 * Reprograma todos los recordatorios de vencimientos de este mes y el siguiente.
 * Se llama cada vez que cambian los fijos, cuotas o tarjetas.
 */
export async function rescheduleReminders(recurring, purchases, cards) {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const periods = [currentPeriod(), addMonths(currentPeriod(), 1)];
  const remindIds = new Set(recurring.filter((r) => r.remind).map((r) => r.id));

  for (const p of periods) {
    const cs = commitmentsFor(p, recurring, purchases, cards).filter((c) => !c.paid && c.type === 'expense');

    // Fijos con recordatorio activado
    for (const c of cs) {
      if (c.kind !== 'recurring' || !remindIds.has(c.refId)) continue;
      const date = reminderDate(c.dueDate);
      if (!date) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Mañana vence ${c.label}`,
          body: formatMoney(c.amount, c.currency),
          data: { url: '/compromisos' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
      });
    }

    // Resumen de cada tarjeta
    for (const card of cards) {
      const items = cs.filter((c) => c.cardId === card.id);
      if (items.length === 0) continue;
      const date = reminderDate(items[0].dueDate);
      if (!date) continue;
      const ars = items.filter((i) => i.currency === 'ARS').reduce((s, i) => s + i.amount, 0);
      const usd = items.filter((i) => i.currency === 'USD').reduce((s, i) => s + i.amount, 0);
      const body = [ars ? formatMoney(ars, 'ARS') : null, usd ? formatMoney(usd, 'USD') : null]
        .filter(Boolean)
        .join(' + ');
      await Notifications.scheduleNotificationAsync({
        content: { title: `Mañana vence la ${card.name}`, body, data: { url: '/compromisos' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
      });
    }
  }
}

/** Aviso inmediato (por ejemplo, al pasar el 80% de un presupuesto) */
export async function notifyNow(title, body) {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}
