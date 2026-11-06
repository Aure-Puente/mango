import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { daysUntil, dateLabel, today } from '@/lib/dates';
import { debtStatus } from '@/lib/finance';
import { centsToInput, formatMoney, parseAmount } from '@/lib/money';
import { palette, space } from '@/theme';
import { AmountInput, ChipSelect, DateField, Group } from './fields';
import { dialogStyle } from './finance';
import { ActionButton, Bar, Row } from './ui';

// Colores suaves para las iniciales de cada persona (siempre el mismo para el mismo nombre)
const AVATAR_COLORS = [
  '#FF9F1C',
  '#34D1BF',
  '#8EA8FF',
  '#C792EA',
  '#F472B6',
  '#FFC85C',
  '#60A5FA',
  '#4ADE80',
];

export function personColor(name = '') {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** "hoy", "ayer", "el 4 nov" (para armar frases sin que quede "el hoy") */
export function onDate(d) {
  const l = dateLabel(d);
  return l === 'Hoy' || l === 'Ayer' ? l.toLowerCase() : `el ${l.toLowerCase()}`;
}

/** Círculo con las iniciales de la persona, en su color */
export function PersonAvatar({ name, size = 40 }) {
  const c = personColor(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2.6,
        backgroundColor: c + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: c, fontFamily: 'Inter_600SemiBold', fontSize: size * 0.36 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

/** "Vence en 4 días" / "Venció hace 2 días" / "Para el 15 dic" */
export function debtDue(d) {
  if (!d.dueDate) return null;
  const n = daysUntil(d.dueDate);
  if (n < 0) return { text: `Venció hace ${-n} ${n === -1 ? 'día' : 'días'}`, color: palette.expense };
  if (n === 0) return { text: 'Vence hoy', color: palette.warning };
  if (n === 1) return { text: 'Vence mañana', color: palette.warning };
  if (n <= 7) return { text: `Vence en ${n} días`, color: n <= 3 ? palette.warning : palette.textSecondary };
  return { text: `Para el ${dateLabel(d.dueDate).toLowerCase()}`, color: palette.textSecondary };
}

/** Fila de una deuda: persona, nota o vencimiento, lo que falta y cuánto se devolvió */
export function DebtRow({ d, onPress }) {
  const st = debtStatus(d);
  const due = st.done ? null : debtDue(d);
  // Una sola línea abajo: el vencimiento si hay (es lo urgente), si no la nota, si no desde cuándo
  const sub = st.done ? ['Saldada', d.note].filter(Boolean).join(' · ') : d.note || `Desde ${onDate(d.date)}`;
  return (
    <View>
      <Row
        left={<PersonAvatar name={d.person} />}
        title={d.person}
        subtitle={due ? <Text style={{ color: due.color }}>{due.text}</Text> : sub}
        right={formatMoney(st.done ? d.amount : st.pending, d.currency)}
        rightSub={st.done ? 'devuelto' : st.paid ? `de ${formatMoney(d.amount, d.currency)}` : undefined}
        rightColor={st.done ? palette.textSecondary : d.direction === 'owed' ? palette.income : palette.text}
        dim={st.done}
        onPress={onPress}
      />
      {st.paid && !st.done ? (
        <View style={styles.progress}>
          <Bar value={st.ratio} color={personColor(d.person)} warnAt={null} height={4} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Registrar un cobro (te deben) o un pago (debés), total o parcial.
 * Arranca con lo que falta; si elegís cuenta, se crea el movimiento.
 */
export function DebtPaymentDialog({ debt, onDismiss }) {
  const { accounts, addDebtPayment, removeDebtPayment } = useData();
  const toast = useToast();
  const st = debt ? debtStatus(debt) : null;
  const [amount, setAmount] = useState(st ? centsToInput(st.pending) : '');
  const options = accounts.filter((a) => !a.archived && a.currency === debt?.currency);
  const [accountId, setAccountId] = useState(
    options.some((a) => a.id === debt?.accountId) ? debt.accountId : (options[0]?.id ?? null),
  );
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  if (!debt) return null;

  const owed = debt.direction === 'owed';
  const value = parseAmount(amount) || 0;
  const tooMuch = value > st.pending;
  const full = value === st.pending;

  const confirm = async () => {
    if (!value) return toast.show('Ingresá el monto', { tone: 'warn' });
    if (tooMuch) return toast.show(`Falta ${formatMoney(st.pending, debt.currency)}`, { tone: 'warn' });
    setSaving(true);
    try {
      const payment = await addDebtPayment(debt, { amount: value, date, accountId });
      toast.show(
        full
          ? owed
            ? '¡Listo, te devolvió todo!'
            : '¡Listo, deuda saldada!'
          : owed
            ? 'Cobro registrado'
            : 'Pago registrado',
        {
          action: { label: 'Deshacer', onPress: () => removeDebtPayment(debt, payment).catch(() => {}) },
        },
      );
      onDismiss();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Dialog visible onDismiss={saving ? undefined : onDismiss} style={dialogStyle}>
        <View style={styles.body}>
          <View style={styles.head}>
            <PersonAvatar name={debt.person} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="titleMedium" numberOfLines={1}>
                {owed ? `Cobro de ${debt.person}` : `Pago a ${debt.person}`}
              </Text>
              <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                Falta {formatMoney(st.pending, debt.currency)}
                {st.paid ? ` de ${formatMoney(debt.amount, debt.currency)}` : ''}
              </Text>
            </View>
          </View>

          <AmountInput value={amount} onChange={setAmount} currency={debt.currency} size={44} />
          {tooMuch ? (
            <Text
              variant="bodySmall"
              style={{ color: palette.warning, textAlign: 'center', marginTop: -space.sm }}
            >
              Es más de lo que falta
            </Text>
          ) : null}

          <View style={{ gap: space.sm }}>
            <Text variant="labelMedium" style={styles.caps}>
              {owed ? '¿A qué cuenta entró?' : '¿Con qué cuenta pagaste?'}
            </Text>
            <ChipSelect
              wrap
              allowNone
              value={accountId}
              onChange={setAccountId}
              options={options.map((a) => ({ value: a.id, label: a.name, color: a.color }))}
            />
            {!accountId ? (
              <View style={styles.hint}>
                <MaterialCommunityIcons name="information-outline" size={15} color={palette.textDisabled} />
                <Text variant="bodySmall" style={{ color: palette.textDisabled, flex: 1 }}>
                  Sin cuenta: queda anotado, pero no cambia ningún saldo.
                </Text>
              </View>
            ) : null}
          </View>

          <Group>
            <DateField value={date} onChange={setDate} />
          </Group>
        </View>

        <View style={styles.actions}>
          <ActionButton
            icon="check"
            label={
              full ? (owed ? 'Me devolvió todo' : 'Pagué todo') : owed ? 'Registrar cobro' : 'Registrar pago'
            }
            onPress={confirm}
            loading={saving}
            style={{ alignSelf: 'stretch' }}
          />
          <ActionButton
            variant="ghost"
            label="Cancelar"
            color={palette.textSecondary}
            onPress={onDismiss}
            disabled={saving}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  progress: { marginLeft: 52, marginTop: -6, paddingBottom: space.md },
  body: { paddingHorizontal: space.xl, paddingTop: space.xs, gap: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  caps: {
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  actions: { padding: space.xl, paddingTop: space.lg, gap: space.xs },
});