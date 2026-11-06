import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRoute } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AmountInput, ChipSelect, DateField, Field, Group, Segmented } from '@/components/fields';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormScreen, HeaderButton, IconBubble, Label } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { dateLabel, periodOf, today } from '@/lib/dates';
import { spendingByCategory } from '@/lib/finance';
import { centsToInput, formatMoney, parseAmount, percent } from '@/lib/money';
import { notifyNow } from '@/lib/notifications';
import { goBack, replace } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

const METHODS = [
  { value: 'cash', label: 'Efectivo', icon: 'cash' },
  { value: 'transfer', label: 'Transferencia', icon: 'bank-transfer' },
  { value: 'mp', label: 'Mercado Pago', icon: 'qrcode' },
  { value: 'debit', label: 'Débito', icon: 'credit-card-outline' },
  { value: 'credit', label: 'Crédito (1 pago)', icon: 'credit-card' },
];

export default function TransactionForm() {
  const {
    id,
    type: typeParam,
    account: accountParam,
    category: categoryParam,
    note: noteParam,
  } = useRoute().params ?? {};
  const f = useFinance();
  const { accounts, categories, transactions, market, save, deleteTransaction, conv, display } = f;
  const toast = useToast();
  const existing = transactions.find((t) => t.id === id);
  const active = accounts.filter(
    (a) => !a.archived || a.id === existing?.accountId || a.id === existing?.toAccountId,
  );

  const [type, setType] = useState(existing?.type ?? typeParam ?? 'expense');
  const [amount, setAmount] = useState(centsToInput(existing?.amount));
  const [toAmount, setToAmount] = useState(centsToInput(existing?.toAmount));
  const [accountId, setAccountId] = useState(
    existing?.accountId ??
      (accountParam || null) ??
      active.find((a) => a.currency === 'ARS')?.id ??
      active[0]?.id ??
      null,
  );
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? null);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? (categoryParam || null));
  const [method, setMethod] = useState(existing?.method ?? null);
  const [date, setDate] = useState(existing?.date ?? today());
  const [note, setNote] = useState(existing?.note ?? noteParam ?? '');
  const [saving, setSaving] = useState(false);

  const account = accounts.find((a) => a.id === accountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const currency = account?.currency ?? 'ARS';
  const isExchange = type === 'transfer' && !!toAccount && toAccount.currency !== currency;

  const cats = useMemo(
    () => categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense')),
    [categories, type],
  );
  // El monto en blanco para gastos (el rojo grande alarmaba); verde para ingresos
  const color = type === 'income' ? palette.income : palette.text;

  // Cotización implícita de la operación de cambio
  const cents = parseAmount(amount) ?? 0;
  const toCents = parseAmount(toAmount) ?? 0;
  const impliedRate =
    isExchange && cents && toCents ? (currency === 'ARS' ? cents / toCents : toCents / cents) : null;

  const suggestTo = () => {
    if (!isExchange || !market.rate || !cents) return;
    const v = currency === 'ARS' ? Math.round(cents / market.rate) : Math.round(cents * market.rate);
    setToAmount(centsToInput(v));
  };

  const submit = async () => {
    const value = parseAmount(amount);
    if (!value || value <= 0) return toast.show('Ingresá un monto', { tone: 'warn' });
    if (!accountId) return toast.show('Elegí una cuenta', { tone: 'warn' });
    if (type === 'transfer') {
      if (!toAccountId) return toast.show('Elegí la cuenta destino', { tone: 'warn' });
      if (toAccountId === accountId)
        return toast.show('Las cuentas tienen que ser distintas', { tone: 'warn' });
      if (isExchange && !toCents) return toast.show('Indicá cuánto recibiste', { tone: 'warn' });
    }

    setSaving(true);
    try {
      const data = {
        id: existing?.id,
        type,
        amount: value,
        currency,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : null,
        toAmount: type === 'transfer' ? (isExchange ? toCents : value) : null,
        categoryId: type === 'transfer' ? null : categoryId,
        method: type === 'transfer' ? null : method,
        note: note.trim(),
        date,
        rate: impliedRate ?? existing?.rate ?? market.rate ?? null,
      };
      if (!existing) data.createdAt = Date.now();
      await save('transactions', data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Alerta de presupuesto
      if (type === 'expense' && categoryId) {
        const others = transactions.filter((t) => t.id !== existing?.id);
        const row = spendingByCategory(
          periodOf(date),
          [...others, { ...data, id: 'tmp' }],
          categories,
          conv,
          display,
          market.rate,
        ).find((r) => r.category?.id === categoryId);
        const before = spendingByCategory(
          periodOf(date),
          others,
          categories,
          conv,
          display,
          market.rate,
        ).find((r) => r.category?.id === categoryId);
        if (row?.ratio != null) {
          const crossed = (t) => row.ratio >= t && (before?.ratio ?? 0) < t;
          if (crossed(1) || crossed(0.8)) {
            const msg = `${row.category.name}: ${row.ratio >= 1 ? 'superaste el presupuesto' : `llegaste al ${percent(row.ratio)} del presupuesto`}`;
            toast.show(msg, { tone: 'warn' });
            notifyNow('Presupuesto', msg).catch(() => {});
          }
        }
      }
      goBack();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  const linked = existing?.source && existing.source.kind !== 'debt' ? existing.source : null;
  const linkedWhat = linked?.kind === 'installment' ? 'una cuota' : 'un fijo';
  const doDelete = async () => {
    await deleteTransaction(existing);
    goBack();
  };

  return (
    <>
      <ScreenOptions
        options={{
          title: existing ? 'Editar movimiento' : 'Nuevo movimiento',
          headerRight: existing
            ? () => (
                <HeaderButton
                  icon="trash-can-outline"
                  color={palette.expense}
                  accessibilityLabel="Borrar"
                  onPress={() => setConfirmDelete(true)}
                />
              )
            : undefined,
        }}
      />
      <FormScreen onSave={submit} saving={saving} saveLabel={existing ? 'Guardar cambios' : 'Guardar'}>
        <Segmented
          value={type}
          onChange={(v) => {
            setType(v);
            setCategoryId(null);
          }}
          options={[
            { value: 'expense', label: 'Gasto', icon: 'minus' },
            { value: 'income', label: 'Ingreso', icon: 'plus' },
            { value: 'transfer', label: 'Mover', icon: 'swap-horizontal' },
          ]}
        />

        <AmountInput
          value={amount}
          onChange={setAmount}
          currency={currency}
          color={color}
          autoFocus={!existing}
          shrinkEmpty
        />

        {linked ? (
          <Hint icon="link-variant">
            Es el pago de {linkedWhat}. Si lo borrás,{' '}
            {linkedWhat === 'una cuota' ? 'la cuota vuelve' : 'el fijo vuelve'} a quedar pendiente.
          </Hint>
        ) : null}

        <View>
          <Label>{type === 'income' ? 'Entró en' : type === 'expense' ? 'Pagaste con' : 'Desde'}</Label>
          <ChipSelect
            wrap
            value={accountId}
            onChange={(v) => v && setAccountId(v)}
            options={active.map((a) => ({
              value: a.id,
              label: `${a.name}${a.currency === 'USD' ? ' · US$' : ''}`,
              color: a.color,
            }))}
          />
        </View>

        {type === 'transfer' ? (
          <>
            <View>
              <Label>Hacia</Label>
              <ChipSelect
                wrap
                value={toAccountId}
                onChange={(v) => {
                  setToAccountId(v);
                  setToAmount('');
                }}
                options={active
                  .filter((a) => a.id !== accountId)
                  .map((a) => ({
                    value: a.id,
                    label: `${a.name}${a.currency === 'USD' ? ' · US$' : ''}`,
                    color: a.color,
                  }))}
              />
            </View>
            {isExchange ? (
              <Group>
                <View style={{ padding: space.lg, gap: space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <IconBubble icon="swap-horizontal-circle-outline" color={palette.info} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text variant="titleSmall">
                        {currency === 'ARS' ? 'Compra de dólares' : 'Venta de dólares'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: 1 }}>
                        No cuenta como gasto: la plata solo cambia de moneda.
                      </Text>
                    </View>
                  </View>
                  <Field
                    label={`Recibís (${toAccount.currency})`}
                    value={toAmount}
                    onChangeText={setToAmount}
                    keyboardType="decimal-pad"
                    onFocus={() => !toAmount && suggestTo()}
                    right={<Field.Icon icon="auto-fix" onPress={suggestTo} />}
                  />
                  {impliedRate ? (
                    <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                      Cotización de la operación:{' '}
                      {formatMoney(Math.round(impliedRate * 100), 'ARS', { decimals: true })}
                      {market.rate
                        ? ` · referencia ${formatMoney(Math.round(market.rate * 100), 'ARS')}`
                        : ''}
                    </Text>
                  ) : null}
                </View>
              </Group>
            ) : null}
          </>
        ) : (
          <>
            <View>
              <Label>Categoría</Label>
              <ChipSelect
                wrap
                allowNone
                tintIcons
                value={categoryId}
                onChange={setCategoryId}
                options={cats.map((c) => ({ value: c.id, label: c.name, color: c.color, icon: c.icon }))}
              />
            </View>
            <View>
              <Label>Medio (opcional)</Label>
              <ChipSelect
                wrap
                allowNone
                value={method}
                onChange={setMethod}
                options={METHODS.filter(
                  (m) => type === 'expense' || ['cash', 'transfer', 'mp'].includes(m.value),
                ).map((m) => ({ value: m.value, label: m.label, icon: m.icon }))}
              />
              {method === 'credit' ? (
                <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: space.sm }}>
                  ¿Fue en cuotas? Cargalo como{' '}
                  <Text
                    style={{ color: palette.primary, fontFamily: 'Inter_600SemiBold' }}
                    onPress={() => replace('Compra')}
                  >
                    compra en cuotas
                  </Text>
                  .
                </Text>
              ) : null}
            </View>
          </>
        )}

        <View style={{ gap: space.sm }}>
          <Label>Detalles</Label>
          <Group>
            <DateField value={date} onChange={setDate} />
          </Group>
          <Field
            label="Nota (opcional)"
            value={note}
            onChangeText={setNote}
            placeholder={type === 'transfer' ? 'Ej: Ahorro del mes' : 'Ej: Cena con amigos'}
          />
        </View>
      </FormScreen>

      {existing ? (
        <ConfirmDialog
          visible={confirmDelete}
          icon="trash-can-outline"
          title="¿Borrar este movimiento?"
          message={`Se borra ${existing.note ? `"${existing.note}"` : 'el movimiento'} de ${formatMoney(existing.amount, existing.currency)} ${ofDate(existing.date)}.${linked ? ` Como es el pago de ${linkedWhat}, ${linkedWhat === 'una cuota' ? 'la cuota vuelve' : 'el fijo vuelve'} a quedar pendiente.` : ''}`}
          confirmLabel="Borrar movimiento"
          tone="danger"
          onConfirm={doDelete}
          onDismiss={() => setConfirmDelete(false)}
        />
      ) : null}
    </>
  );
}

/** "de hoy", "de ayer", "del 4 nov" */
function ofDate(d) {
  const l = dateLabel(d);
  return l === 'Hoy' || l === 'Ayer' ? `de ${l.toLowerCase()}` : `del ${l}`;
}

/** Aclaración chica con ícono */
function Hint({ icon, children }) {
  return (
    <View style={styles.hint}>
      <MaterialCommunityIcons name={icon} size={16} color={palette.textSecondary} />
      <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
});
