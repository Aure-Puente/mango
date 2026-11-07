//finance:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';
import { useData } from '@/context/DataContext';
import { useMarket } from '@/context/MarketContext';
import { useToast } from '@/context/ToastContext';
import { dateLabel, daysUntil, today } from '@/lib/dates';
import { accountBalances } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { navigate } from '@/navigation/RootNavigation';
import { palette, radius, space } from '@/theme';
import { ChipSelect, DateField, SwitchRow } from './fields';
import { MangoFab } from './MangoFab';
import { ActionButton, IconBubble, Row } from './ui';

export const dialogStyle = {
  backgroundColor: palette.surface,
  borderRadius: radius.lg,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: palette.border,
  width: '92%',
  maxWidth: 480,
  alignSelf: 'center',
};

export const ACCOUNT_ICON = {
  cash: 'cash',
  mp: 'cellphone',
  bank: 'bank-outline',
  wallet: 'wallet-outline',
  other: 'wallet-outline',
};

export function TxRow({ tx, onPress, hideDate, compact }) {
  const { categories, accounts, settings } = useData();
  const { rate } = useMarket();
  const cat = categories.find((c) => c.id === tx.categoryId);
  const acc = accounts.find((a) => a.id === tx.accountId);
  const to = accounts.find((a) => a.id === tx.toAccountId);
  const when = hideDate ? null : dateLabel(tx.date);

  let icon = cat?.icon ?? 'tag-off-outline';
  let color = cat?.color ?? palette.textSecondary;
  let title = tx.note || cat?.name || 'Sin categoría';
  let subtitle = [
    tx.note && cat ? cat.name : null,
    compact && tx.note && cat ? null : (acc?.name ?? 'Cuenta borrada'),
    when,
  ]
    .filter(Boolean)
    .join(' · ');
  let amount = formatMoney(tx.amount, tx.currency);
  let amountColor = palette.text;
  let rightSub;

  if (tx.type === 'income') {
    amount = '+' + amount;
    amountColor = palette.income;
  } else if (tx.type === 'expense') {
    amount = '−' + amount;
  } else if (tx.source?.kind === 'debt') {
    const inbound = !tx.accountId;
    const own = inbound ? to : acc;
    icon = inbound ? 'hand-coin-outline' : 'account-arrow-right-outline';
    color = palette.info;
    title = tx.note || (inbound ? 'Entrada de préstamo' : 'Préstamo');
    subtitle = [own?.name ?? 'Cuenta borrada', when].filter(Boolean).join(' · ');
    amount = (inbound ? '+' : '−') + formatMoney(tx.amount, tx.currency);
    amountColor = inbound ? palette.income : palette.text;
  } else {
    const isExchange = tx.toAccountId && tx.toAmount != null && to && acc && to.currency !== acc.currency;
    icon = isExchange ? 'swap-horizontal-circle-outline' : 'bank-transfer';
    color = palette.info;
    title =
      tx.note ||
      (isExchange ? (acc?.currency === 'ARS' ? 'Compra de dólares' : 'Venta de dólares') : 'Transferencia');
    subtitle = [`${acc?.name ?? '—'} → ${to?.name ?? 'fuera de Mango'}`, when].filter(Boolean).join(' · ');
    if (isExchange && tx.toAmount != null && to) {
      amount = formatMoney(tx.amount, tx.currency);
      rightSub = `→ ${formatMoney(tx.toAmount, to.currency)}`;
    }
    amountColor = palette.textSecondary;
  }

  const r = tx.rate || rate;
  if (tx.noBalance && tx.type !== 'transfer') rightSub = 'fuera del saldo';
  if (!rightSub && tx.currency === 'USD' && r && settings?.displayCurrency !== 'USD') {
    rightSub = `≈ ${formatMoney(Math.round(tx.amount * r), 'ARS')}`;
  }

  return (
    <Row
      icon={icon}
      iconColor={color}
      title={title}
      subtitle={subtitle}
      right={amount}
      rightSub={rightSub}
      rightColor={amountColor}
      onPress={
        onPress ??
        (() =>
          tx.source?.kind === 'debt'
            ? navigate('DeudaDetalle', { id: tx.source.id })
            : navigate('Movimiento', { id: tx.id }))
      }
    />
  );
}

export function QuickAddFab() {
  const focused = useIsFocused();
  if (!focused) return null;
  return (
    <MangoFab
      actions={[
        {
          icon: 'minus',
          label: 'Gasto',
          color: palette.expense,
          onPress: () => navigate('Movimiento', { type: 'expense' }),
        },
        {
          icon: 'plus',
          label: 'Ingreso',
          color: palette.income,
          onPress: () => navigate('Movimiento', { type: 'income' }),
        },
        {
          icon: 'swap-horizontal',
          label: 'Transferencia o cambio',
          color: palette.info,
          onPress: () => navigate('Movimiento', { type: 'transfer' }),
        },
        {
          icon: 'credit-card-clock-outline',
          label: 'Compra en cuotas',
          color: palette.primary,
          onPress: () => navigate('Compra'),
        },
      ]}
    />
  );
}

export function dueInfo(dueDate, income = false) {
  const d = daysUntil(dueDate);
  const day = Number(dueDate.slice(8, 10));
  const [past, future] = income ? ['Se cobraba', 'Se cobra'] : ['Venció', 'Vence'];
  if (d < 0) return { text: `${past} hace ${-d} ${d === -1 ? 'día' : 'días'}`, color: palette.expense };
  if (d === 0) return { text: `${future} hoy`, color: palette.warning };
  if (d === 1) return { text: `${future} mañana`, color: palette.warning };
  if (d <= 7)
    return { text: `${future} en ${d} días`, color: d <= 3 ? palette.warning : palette.textSecondary };
  if (d <= 31) return { text: `${future} el ${day}`, color: palette.textSecondary };
  return { text: `${future} el ${dateLabel(dueDate)}`, color: palette.textSecondary };
}

const shortDue = (t) => {
  const r = t.replace(/^(Venció|Vence|Se cobraba|Se cobra) /, '');
  return r[0].toUpperCase() + r.slice(1);
};

export function CommitmentRow({ c, onPress, compact }) {
  const { categories } = useData();
  const cat = categories.find((x) => x.id === c.categoryId);
  const icon =
    c.kind === 'installment'
      ? 'credit-card-clock-outline'
      : (cat?.icon ?? (c.type === 'income' ? 'cash-plus' : 'repeat'));
  const due = c.paid ? null : dueInfo(c.dueDate, c.type === 'income');
  const overdue = !c.paid && daysUntil(c.dueDate) < 0;
  if (compact && !c.paid) {
    return (
      <Row
        icon={icon}
        iconColor={c.type === 'income' ? palette.income : (cat?.color ?? palette.primary)}
        title={c.label}
        subtitle={
          c.detail ??
          (c.kind === 'installment' ? 'Cuota' : c.type === 'income' ? 'Ingreso fijo' : 'Gasto fijo')
        }
        right={
          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <Text
              variant="bodyLarge"
              style={[
                styles.rowAmount,
                { color: c.type === 'income' ? palette.income : overdue ? palette.expense : palette.text },
              ]}
            >
              {formatMoney(c.amount, c.currency)}
            </Text>
            <Text variant="bodySmall" style={{ color: due.color, marginTop: 1 }}>
              {shortDue(due.text)}
            </Text>
          </View>
        }
        onPress={onPress}
      />
    );
  }

  return (
    <Row
      icon={c.paid ? 'check-circle' : icon}
      iconColor={
        c.paid ? palette.income : c.type === 'income' ? palette.income : (cat?.color ?? palette.primary)
      }
      title={c.label}
      subtitle={
        <>
          {c.detail ? `${c.detail} · ` : ''}
          {c.paid ? (
            c.type === 'income' ? (
              'Cobrado'
            ) : (
              'Pagado'
            )
          ) : (
            <Text style={{ color: due.color }}>{due.text}</Text>
          )}
        </>
      }
      right={formatMoney(c.amount, c.currency)}
      rightColor={c.type === 'income' ? palette.income : overdue ? palette.expense : palette.text}
      onPress={onPress}
      dim={c.paid}
    />
  );
}

const whenPaid = (d) => {
  const l = dateLabel(d);
  return l === 'Hoy' || l === 'Ayer' ? `de ${l.toLowerCase()}` : `del ${l}`;
};

export function PayDialog({ items, title, onDismiss }) {
  const { accounts, cards, categories, transactions, payCommitments, unpayCommitment, revertPayments } =
    useData();
  const { rate } = useMarket();
  const toast = useToast();
  const active = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);
  const balances = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const first = items?.[0];
  const [accountId, setAccountId] = useState(null);
  const [date, setDate] = useState(today());
  const [noBalance, setNoBalance] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!items || !first) return null;
  const allPaid = items.every((i) => i.paid);
  const pending = items.filter((i) => !i.paid);
  const isIncome = first.type === 'income';
  const currency = first.currency;
  const total = pending.reduce((s, i) => s + i.amount, 0);
  const isSummary = items.length > 1;

  const sameCur = active.filter((a) => a.currency === currency);
  const options = sameCur.length ? sameCur : active;
  const selected =
    accountId ??
    (options.some((a) => a.id === first.accountId) ? first.accountId : null) ??
    options[0]?.id ??
    null;
  const selectedAcc = active.find((a) => a.id === selected);
  const after = selectedAcc ? (balances[selectedAcc.id] ?? 0) + (isIncome ? total : -total) : null;

  const card = first.cardId ? cards.find((c) => c.id === first.cardId) : null;
  const cat = categories.find((c) => c.id === first.categoryId);
  const icon = isSummary
    ? 'credit-card-outline'
    : first.kind === 'installment'
      ? 'credit-card-clock-outline'
      : (cat?.icon ?? (isIncome ? 'cash-plus' : 'repeat'));
  const color = isSummary
    ? (card?.color ?? palette.primary)
    : isIncome
      ? palette.income
      : (card?.color ?? cat?.color ?? palette.primary);
  const what = isSummary
    ? `${items.length} consumos`
    : first.kind === 'installment'
      ? [first.detail, card?.name].filter(Boolean).join(' · ')
      : [isIncome ? 'Ingreso fijo' : 'Gasto fijo', first.detail].filter(Boolean).join(' · ');
  const due = allPaid ? null : dueInfo(first.dueDate, isIncome);

  const txs = items.map((i) => transactions.find((t) => t.id === i.txId)).filter(Boolean);
  const tx = txs[0];
  const txAcc = tx ? accounts.find((a) => a.id === tx.accountId) : null;
  const paidTotal = items.reduce((s, i) => s + i.amount, 0);

  const confirm = async () => {
    setSaving(true);
    try {
      if (allPaid) {
        const prev = txs[0];
        for (const i of items) await unpayCommitment(i);
        toast.show('Se desmarcó el pago', {
          action: prev
            ? {
                label: 'Deshacer',
                onPress: () =>
                  payCommitments(
                    items.map((i) => ({ ...i, paid: false })),
                    {
                      accountId: prev.accountId,
                      date: prev.date,
                      rate: prev.rate ?? rate,
                      noBalance: !!prev.noBalance,
                    },
                  ).catch(() => {}),
              }
            : undefined,
        });
      } else {
        if (!selected) return;
        const created = await payCommitments(pending, { accountId: selected, date, rate, noBalance });
        toast.show(isIncome ? 'Marcado como cobrado' : 'Marcado como pagado', {
          action: created?.length
            ? { label: 'Deshacer', onPress: () => revertPayments(created).catch(() => {}) }
            : undefined,
        });
      }
      setAccountId(null);
      setNoBalance(false);
      onDismiss();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const name = title ?? first.label;

  if (allPaid) {
    const verb = isIncome ? 'cobro' : 'pago';
    const detail = tx
      ? `Se ${txs.length > 1 ? `borran los ${txs.length} movimientos` : 'borra el movimiento'} de ${formatMoney(paidTotal, currency)} ${whenPaid(tx.date)}${txAcc ? ` en ${txAcc.name}` : ''} y "${name}" vuelve a quedar pendiente.${tx.noBalance ? ' No cambia ningún saldo.' : ''}`
      : `"${name}" vuelve a quedar pendiente. No cambia ningún saldo.`;
    return (
      <Portal>
        <Dialog
          visible
          onDismiss={saving ? undefined : onDismiss}
          style={[dialogStyle, styles.dialogCentered]}
        >
          <View style={styles.dialogCenterBody}>
            <View style={[styles.halo, { backgroundColor: palette.expense + '14' }]}>
              <IconBubble icon="undo-variant" color={palette.expense} size={52} />
            </View>
            <Text variant="titleLarge" style={{ textAlign: 'center' }}>
              ¿Desmarcar el {verb}?
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: palette.textSecondary }}>
              {detail}
            </Text>
          </View>
          <View style={styles.dialogActions}>
            <ActionButton
              label={`Desmarcar ${verb}`}
              color={palette.expense}
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

  return (
    <Portal>
      <Dialog visible onDismiss={saving ? undefined : onDismiss} style={dialogStyle}>
        <View style={styles.dialogBody}>
          <View style={styles.dialogHead}>
            <IconBubble icon={icon} color={color} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="titleMedium" numberOfLines={1}>
                {name}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary }}>
                {what ? `${what} · ` : ''}
                <Text style={{ color: due.color }}>{due.text.toLowerCase()}</Text>
              </Text>
            </View>
          </View>

          <Text variant="displaySmall" style={styles.dialogAmount}>
            {formatMoney(total, currency)}
          </Text>

          {isSummary ? (
            <View style={styles.dialogItems}>
              {pending.slice(0, 4).map((i) => (
                <View key={i.key} style={styles.dialogItem}>
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={{ flex: 1, color: palette.textSecondary }}
                  >
                    {i.label}
                    {i.detail ? <Text style={{ color: palette.textDisabled }}> · {i.detail}</Text> : null}
                  </Text>
                  <Text variant="bodySmall" style={styles.num}>
                    {formatMoney(i.amount, i.currency)}
                  </Text>
                </View>
              ))}
              {pending.length > 4 ? (
                <Text variant="bodySmall" style={{ color: palette.textDisabled }}>
                  y {pending.length - 4} más
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: space.sm }}>
            <Text variant="labelMedium" style={styles.dialogLabel}>
              {isIncome ? '¿A qué cuenta entró?' : '¿Con qué cuenta pagaste?'}
            </Text>
            <ChipSelect
              wrap
              value={selected}
              onChange={(v) => v && setAccountId(v)}
              options={options.map((a) => ({
                value: a.id,
                label: `${a.name}${a.currency === 'USD' ? ' (US$)' : ''}`,
                color: a.color,
              }))}
            />
            {selectedAcc && noBalance ? (
              <View style={styles.dialogHint}>
                <MaterialCommunityIcons name="wallet-outline" size={15} color={palette.textDisabled} />
                <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                  No cambia el saldo de <Text style={{ color: palette.text }}>{selectedAcc.name}</Text>
                </Text>
              </View>
            ) : null}
            {selectedAcc && after != null && !noBalance ? (
              <View style={styles.dialogHint}>
                <MaterialCommunityIcons
                  name={after < 0 ? 'alert-circle-outline' : 'wallet-outline'}
                  size={15}
                  color={after < 0 ? palette.expense : palette.textDisabled}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: after < 0 ? palette.expense : palette.textSecondary }}
                >
                  {isIncome ? 'Vas a tener' : after < 0 ? 'Queda en negativo:' : 'Te queda'}{' '}
                  <Text style={[styles.num, { color: after < 0 ? palette.expense : palette.text }]}>
                    {formatMoney(after, selectedAcc.currency)}
                  </Text>{' '}
                  en {selectedAcc.name}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.dialogDate}>
            <DateField value={date} onChange={setDate} />
            <View style={styles.dialogSep} />
            <SwitchRow
              icon="wallet-outline"
              label={isIncome ? 'No sumar a la cuenta' : 'No descontar de la cuenta'}
              description={isIncome ? 'Ya estaba cobrado' : 'Ya estaba pagado'}
              value={noBalance}
              onChange={setNoBalance}
            />
          </View>
        </View>

        <View style={styles.dialogActions}>
          <ActionButton
            label={isSummary ? 'Pagar resumen' : isIncome ? 'Marcar como cobrado' : 'Marcar como pagado'}
            icon="check"
            onPress={confirm}
            loading={saving}
            disabled={!selected}
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
  rowAmount: { fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  dialogLabel: {
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
  },
  dialogBody: { paddingHorizontal: space.xl, paddingTop: space.xs, gap: space.lg },
  dialogHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dialogAmount: { fontVariant: ['tabular-nums'], marginTop: -space.xs },
  dialogItems: {
    gap: 6,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
    marginTop: -space.xs,
  },
  dialogItem: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dialogHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  dialogActions: { padding: space.xl, paddingTop: space.lg, gap: space.xs },
  dialogCentered: { maxWidth: 400, paddingTop: space.xl },
  dialogCenterBody: { alignItems: 'center', paddingHorizontal: space.xl, gap: space.sm },
  halo: { padding: 10, borderRadius: 999, marginBottom: space.sm },
  num: { fontVariant: ['tabular-nums'] },
  dialogSep: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: space.lg },
  dialogDate: {
    backgroundColor: palette.surfaceHigh,
    borderRadius: radius.sm + 2,
    overflow: 'hidden',
  },
});