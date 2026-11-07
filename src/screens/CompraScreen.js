//CompraScreen:
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  AmountInput,
  ChipSelect,
  DateField,
  Field,
  Group,
  MonthStepper,
  Segmented,
  Stepper,
} from '@/components/fields';
import { Card, FormScreen, IconBubble, Label, SmallButton } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { addMonths, currentPeriod, periodLabel, periodOf, today } from '@/lib/dates';
import { cardFirstPeriod } from '@/lib/finance';
import { centsToInput, formatMoney, parseAmount } from '@/lib/money';
import { goBack, navigate } from '@/navigation/RootNavigation';
import { palette, radius, space } from '@/theme';

export default function PurchaseForm() {
  const { id } = useRoute().params ?? {};
  const { purchases, cards, accounts, categories, save } = useFinance();
  const toast = useToast();
  const existing = purchases.find((p) => p.id === id);

  const [description, setDescription] = useState(existing?.description ?? '');
  const [mode, setMode] = useState('total');
  const [amount, setAmount] = useState(centsToInput(existing?.total));
  const [currency, setCurrency] = useState(existing?.currency ?? 'ARS');
  const [installments, setInstallments] = useState(existing?.installments ?? 3);
  const [kind, setKind] = useState(existing?.kind ?? (cards.length ? 'card' : 'other'));
  const [cardId, setCardId] = useState(existing?.cardId ?? cards[0]?.id ?? null);
  const [accountId, setAccountId] = useState(existing?.accountId ?? null);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? null);
  const [date, setDate] = useState(existing?.date ?? today());
  const [firstPeriod, setFirstPeriod] = useState(existing?.firstPeriod ?? currentPeriod());
  const [alreadyPaid, setAlreadyPaid] = useState(0);
  const [saving, setSaving] = useState(false);

  const card = cards.find((c) => c.id === cardId);
  const cat = categories.find((c) => c.id === categoryId);

  const accountOptions = accounts.filter((a) => !a.archived && a.currency === currency);
  const validAccount = accountOptions.some((a) => a.id === accountId) ? accountId : null;

  useEffect(() => {
    if (kind === 'card' && card) setFirstPeriod(cardFirstPeriod(card, date));
  }, [kind, card, date]);

  useEffect(() => {
    if (existing) return;
    const passed = Math.max(0, Math.min(installments, monthsDiff(firstPeriod, currentPeriod())));
    setAlreadyPaid(passed);
  }, [firstPeriod, installments, existing]);

  const value = parseAmount(amount) ?? 0;
  const total = mode === 'total' ? value : value * installments;
  const perCuota = installments ? Math.round(total / installments) : 0;

  const submit = async () => {
    if (!description.trim()) return toast.show('Poné una descripción', { tone: 'warn' });
    if (!total) return toast.show('Ingresá el monto', { tone: 'warn' });
    if (kind === 'card' && !cardId) return toast.show('Elegí la tarjeta o creá una', { tone: 'warn' });

    setSaving(true);
    try {
      let paid = existing?.paid ?? {};
      if (!existing && alreadyPaid > 0) {
        paid = {};
        for (let n = 1; n <= alreadyPaid; n++) paid[String(n)] = 'previo';
      }
      const data = {
        id: existing?.id,
        description: description.trim(),
        total,
        currency,
        installments,
        date,
        firstPeriod,
        kind,
        cardId: kind === 'card' ? cardId : null,
        accountId: kind === 'card' ? null : validAccount,
        categoryId,
        paid,
      };
      if (!existing) data.prepaidAt = null;
      await save('purchases', data);
      goBack();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const last = addMonths(firstPeriod, installments - 1);
  const acc = accounts.find((a) => a.id === validAccount);
  const source =
    kind === 'card'
      ? { label: card?.name ?? 'Tarjeta', icon: 'credit-card-outline', color: card?.color ?? palette.primary }
      : kind === 'loan'
        ? { label: acc ? `Préstamo · ${acc.name}` : 'Préstamo', icon: 'bank-outline', color: palette.info }
        : { label: acc?.name ?? 'Plan de cuotas', icon: 'calendar-sync-outline', color: palette.primary };
  const color = kind === 'card' ? source.color : (cat?.color ?? source.color);
  const lateDate = periodOf(date) > firstPeriod;

  return (
    <>
      <ScreenOptions options={{ title: existing ? 'Editar compra' : 'Compra en cuotas' }} />
      <FormScreen onSave={submit} saving={saving}>
        <Card style={styles.preview}>
          <View style={styles.previewRow}>
            <IconBubble icon={source.icon} color={color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                variant="titleMedium"
                numberOfLines={1}
                style={{ color: description.trim() ? palette.text : palette.textDisabled }}
              >
                {description.trim() || 'Tu compra'}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary }}>
                {source.label} · {installments} {installments === 1 ? 'cuota' : 'cuotas'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                variant="titleMedium"
                style={[styles.num, { color: total ? palette.text : palette.textDisabled }]}
              >
                {formatMoney(perCuota, currency)}
              </Text>
              <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                por mes
              </Text>
            </View>
          </View>
          <View style={styles.previewFoot}>
            <MaterialCommunityIcons name="calendar-range" size={15} color={palette.textSecondary} />
            <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }} numberOfLines={1}>
              {installments === 1 ? (
                <>
                  Se paga en <Text style={{ color: palette.text }}>{lower(periodLabel(firstPeriod))}</Text>
                </>
              ) : (
                <>
                  De <Text style={{ color: palette.text }}>{lower(periodLabel(firstPeriod))}</Text> a{' '}
                  <Text style={{ color: palette.text }}>{lower(periodLabel(last))}</Text>
                </>
              )}
            </Text>
            {total ? (
              <Text variant="bodySmall" style={[styles.num, { color: palette.textSecondary }]}>
                Total <Text style={{ color: palette.text }}>{formatMoney(total, currency)}</Text>
              </Text>
            ) : null}
          </View>
        </Card>

        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'total', label: 'Monto total' },
            { value: 'cuota', label: 'Valor de cada cuota' },
          ]}
        />
        <AmountInput
          value={amount}
          onChange={setAmount}
          currency={currency}
          onCurrency={setCurrency}
          size={48}
          shrinkEmpty
        />
        <View style={{ gap: space.sm }}>
          <Group>
            <Stepper label="Cuotas" value={installments} onChange={setInstallments} min={1} max={72} />
          </Group>
          {total && installments > 1 ? (
            <Hint icon="calculator-variant-outline">
              {mode === 'total' ? (
                <>
                  Son {installments} cuotas de{' '}
                  <Text style={[styles.num, { color: palette.text }]}>{formatMoney(perCuota, currency)}</Text>
                </>
              ) : (
                <>
                  En total pagás{' '}
                  <Text style={[styles.num, { color: palette.text }]}>{formatMoney(total, currency)}</Text>
                </>
              )}
            </Hint>
          ) : null}
        </View>

        <Field
          label="¿Qué compraste?"
          value={description}
          onChangeText={setDescription}
          placeholder="Ej: Heladera, notebook, zapatillas"
        />

        <View style={{ gap: space.sm }}>
          <Label>¿Cómo se paga?</Label>
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'card', label: 'Tarjeta', icon: 'credit-card-outline' },
              { value: 'loan', label: 'Préstamo', icon: 'bank-outline' },
              { value: 'other', label: 'Otro', icon: 'calendar-sync-outline' },
            ]}
          />
          {kind === 'card' ? (
            cards.length === 0 ? (
              <View style={styles.info}>
                <Text variant="bodyMedium" style={{ color: palette.textSecondary, flex: 1 }}>
                  Todavía no tenés tarjetas.
                </Text>
                <SmallButton icon="plus" label="Agregar tarjeta" onPress={() => navigate('Tarjeta')} />
              </View>
            ) : (
              <ChipSelect
                wrap
                value={cardId}
                onChange={(v) => v && setCardId(v)}
                options={cards.map((c) => ({
                  value: c.id,
                  label: c.name,
                  color: c.color,
                  icon: 'credit-card-outline',
                }))}
                tintIcons
              />
            )
          ) : accountOptions.length ? (
            <>
              <Text variant="bodySmall" style={{ color: palette.textSecondary, marginLeft: 2 }}>
                Se paga desde (opcional)
              </Text>
              <ChipSelect
                wrap
                allowNone
                value={validAccount}
                onChange={setAccountId}
                options={accountOptions.map((a) => ({ value: a.id, label: a.name, color: a.color }))}
              />
            </>
          ) : null}
        </View>

        <View>
          <Label>Categoría</Label>
          <ChipSelect
            wrap
            allowNone
            tintIcons
            value={categoryId}
            onChange={setCategoryId}
            options={categories
              .filter((c) => c.kind === 'expense')
              .map((c) => ({ value: c.id, label: c.name, color: c.color, icon: c.icon }))}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Label>Cuándo</Label>
          <Group>
            <DateField label="Fecha de compra" value={date} onChange={setDate} />
            {kind === 'card' && card ? null : (
              <MonthStepper label="Primera cuota" value={firstPeriod} onChange={setFirstPeriod} />
            )}
            {!existing ? (
              <Stepper
                label="Cuotas ya pagadas"
                value={alreadyPaid}
                onChange={setAlreadyPaid}
                min={0}
                max={installments}
              />
            ) : null}
          </Group>
          {kind === 'card' && card ? (
            <Hint icon="calendar-check-outline">
              {card.name} cierra el {card.closingDay} y vence el {card.dueDay}: la primera cuota cae en el
              resumen de{' '}
              <Text style={{ color: palette.text, fontFamily: 'Inter_600SemiBold' }}>
                {lower(periodLabel(firstPeriod))}
              </Text>
              .
            </Hint>
          ) : null}
          {lateDate ? (
            <Hint icon="alert-circle-outline" color={palette.warning}>
              La fecha de compra es posterior a la primera cuota.
            </Hint>
          ) : null}
          {!existing && alreadyPaid > 0 ? (
            <Hint icon="history">
              {alreadyPaid === 1 ? 'La primera cuota queda' : `Las primeras ${alreadyPaid} cuotas quedan`} como
              ya {alreadyPaid === 1 ? 'pagada' : 'pagadas'}: no se crean movimientos ni cambia tu saldo.
            </Hint>
          ) : null}
        </View>
      </FormScreen>
    </>
  );
}

const lower = (s) => s.toLowerCase();

function Hint({ icon, color = palette.textSecondary, children }) {
  return (
    <View style={styles.hint}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

function monthsDiff(from, to) {
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

const styles = StyleSheet.create({
  preview: { gap: space.md },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  previewFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  num: { fontVariant: ['tabular-nums'] },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
});