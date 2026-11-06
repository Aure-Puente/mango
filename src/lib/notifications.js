//notifications:
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addMonths, currentPeriod, fromDateStr } from './dates';
import { commitmentsFor, debtStatus } from './finance';
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

function reminderDate(due) {
  const d = fromDateStr(due);
  d.setDate(d.getDate() - 1);
  d.setHours(10, 0, 0, 0);
  return d.getTime() > Date.now() ? d : null;
}

export async function rescheduleReminders(recurring, purchases, cards, debts = []) {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const periods = [currentPeriod(), addMonths(currentPeriod(), 1)];
  const remindIds = new Set(recurring.filter((r) => r.remind).map((r) => r.id));

  for (const p of periods) {
    const cs = commitmentsFor(p, recurring, purchases, cards).filter((c) => !c.paid && c.type === 'expense');

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

  for (const d of debts) {
    if (!d.dueDate) continue;
    const { pending } = debtStatus(d);
    if (!pending) continue;
    const date = reminderDate(d.dueDate);
    if (!date) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title:
          d.direction === 'owed'
            ? `Mañana ${d.person} te tiene que devolver`
            : `Mañana tenés que devolverle a ${d.person}`,
        body: formatMoney(pending, d.currency),
        data: { url: `/deuda?id=${d.id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });
  }
}

export async function notifyNow(title, body) {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}