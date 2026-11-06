import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  AmountInput,
  ChipSelect,
  Field,
  Group,
  MonthStepper,
  Segmented,
  Stepper,
  SwitchRow,
} from '@/components/fields';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Card, FormScreen, HeaderButton, IconBubble, Label, PressableScale } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import {
  addMonths,
  currentPeriod,
  daysUntil,
  dateInPeriod,
  monthsBetween,
  MONTHS_SHORT,
  periodLabel,
  today,
} from '@/lib/dates';
import { recurringApplies } from '@/lib/finance';
import { centsToInput, formatMoney, parseAmount } from '@/lib/money';
import { goBack } from '@/navigation/RootNavigation';
import { palette, radius, space } from '@/theme';

export default function RecurringForm() {
  const { id, type: typeParam } = useRoute().params ?? {};
  const { recurring, categories, accounts, save, remove } = useFinance();
  const toast = useToast();
  const existing = recurring.find((r) => r.id === id);

  const [type, setType] = useState(existing?.type ?? typeParam ?? 'expense');
  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(centsToInput(existing?.amount));
  const [currency, setCurrency] = useState(existing?.currency ?? 'ARS');
  const [day, setDay] = useState(existing?.dayOfMonth ?? 10);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? null);
  const [pickedAccount, setAccountId] = useState(existing?.accountId ?? null);
  const [freq, setFreq] = useState(existing?.months?.length ? 'some' : 'all');
  const [months, setMonths] = useState(existing?.months ?? []);
  const [start, setStart] = useState(existing?.startPeriod ?? currentPeriod());
  const [limited, setLimited] = useState(!!existing?.endPeriod);
  const [count, setCount] = useState(
    existing?.endPeriod ? monthsBetween(existing.startPeriod, existing.endPeriod) + 1 : 6,
  );
  const [remind, setRemind] = useState(existing?.remind ?? true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isIncome = type === 'income';
  const value = parseAmount(amount) || 0;
  const cat = categories.find((c) => c.id === categoryId);

  // Solo cuentas en la moneda del fijo (el pago se registra en esa moneda)
  const accountOptions = accounts.filter((a) => !a.archived && a.currency === currency);
  const accountId = accountOptions.some((a) => a.id === pickedAccount) ? pickedAccount : null;
  const acc = accounts.find((a) => a.id === accountId);

  // Borrador con lo que estás editando, para calcular el próximo y la cantidad de pagos
  const draft = {
    startPeriod: start,
    endPeriod: limited ? addMonths(start, count - 1) : null,
    months: freq === 'some' ? months : [],
  };
  const noMonths = freq === 'some' && months.length === 0;
  const next = noMonths ? null : nextDue(draft, day);
  const payments = limited
    ? Array.from({ length: count }, (_, i) => addMonths(start, i)).filter((p) => recurringApplies(draft, p))
        .length
    : 0;
  const paidCount = Object.keys(existing?.paid ?? {}).length;

  const submit = async () => {
    if (!value) return toast.show('Ingresá el monto', { tone: 'warn' });
    if (!name.trim()) return toast.show('Poné un nombre', { tone: 'warn' });
    if (freq === 'some' && months.length === 0) return toast.show('Elegí al menos un mes', { tone: 'warn' });
    setSaving(true);
    try {
      const data = {
        id: existing?.id,
        type,
        name: name.trim(),
        amount: value,
        currency,
        dayOfMonth: day,
        categoryId,
        accountId,
        startPeriod: start,
        endPeriod: draft.endPeriod,
        months: freq === 'some' ? [...months].sort((a, b) => a - b) : [],
        incomeKind: null,
        remind: isIncome ? false : remind,
        paid: existing?.paid ?? {},
      };
      await save('recurring', data);
      goBack();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    await remove('recurring', existing.id);
    goBack();
  };

  const toggleMonth = (m) => setMonths((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]));

  const when =
    freq === 'some' && months.length
      ? `Día ${day} · ${months.length} ${months.length === 1 ? 'vez' : 'veces'} al año`
      : `Día ${day}`;

  return (
    <>
      <ScreenOptions
        options={{
          title: existing ? 'Editar fijo' : isIncome ? 'Ingreso fijo' : 'Gasto fijo',
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
      <FormScreen onSave={submit} saving={saving}>
        {/* Vista previa: así se ve en Fijos */}
        <Card style={styles.preview}>
          <View style={styles.previewRow}>
            <IconBubble
              icon={cat?.icon ?? (isIncome ? 'cash-plus' : 'repeat')}
              color={isIncome ? palette.income : (cat?.color ?? palette.primary)}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                variant="titleMedium"
                numberOfLines={1}
                style={{ color: name.trim() ? palette.text : palette.textDisabled }}
              >
                {name.trim() || (isIncome ? 'Tu ingreso fijo' : 'Tu gasto fijo')}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary }}>
                {when}
                {acc ? ` · ${acc.name}` : ''}
              </Text>
            </View>
            <Text
              variant="titleMedium"
              style={[
                styles.num,
                { color: !value ? palette.textDisabled : isIncome ? palette.income : palette.text },
              ]}
            >
              {formatMoney(value, currency)}
            </Text>
          </View>
          {noMonths ? (
            <View style={styles.previewFoot}>
              <MaterialCommunityIcons name="calendar-question" size={15} color={palette.warning} />
              <Text variant="bodySmall" style={{ color: palette.warning, flex: 1 }}>
                Elegí en qué meses se paga
              </Text>
            </View>
          ) : next ? (
            <View style={styles.previewFoot}>
              <MaterialCommunityIcons name="calendar-clock" size={15} color={palette.textSecondary} />
              <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
                Próximo: <Text style={{ color: palette.text }}>{next.label}</Text>
                {next.rel ? ` · ${next.rel}` : ''}
              </Text>
            </View>
          ) : null}
        </Card>

        {!existing ? (
          <Segmented
            value={type}
            onChange={(v) => {
              setType(v);
              setCategoryId(null);
            }}
            options={[
              { value: 'expense', label: 'Gasto fijo', icon: 'minus' },
              { value: 'income', label: 'Ingreso fijo', icon: 'plus' },
            ]}
          />
        ) : null}

        <AmountInput
          value={amount}
          onChange={setAmount}
          currency={currency}
          onCurrency={setCurrency}
          color={isIncome ? palette.income : palette.text}
          size={48}
          shrinkEmpty
        />
        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder={
            isIncome ? 'Ej: Sueldo, Aguinaldo, Alquiler que cobrás' : 'Ej: Alquiler, Netflix, Gimnasio'
          }
        />

        {/* Cuándo */}
        <View style={{ gap: space.sm }}>
          <Label>Cuándo</Label>
          <Group>
            <Stepper
              label={isIncome ? 'Día de cobro' : 'Día de vencimiento'}
              value={day}
              onChange={setDay}
              min={1}
              max={31}
            />
            <View style={styles.block}>
              <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                Frecuencia
              </Text>
              <Segmented
                value={freq}
                onChange={setFreq}
                options={[
                  { value: 'all', label: 'Todos los meses' },
                  { value: 'some', label: 'Algunos meses' },
                ]}
              />
              {freq === 'some' ? (
                <>
                  <View style={styles.months}>
                    {MONTHS_SHORT.map((m, i) => {
                      const on = months.includes(i + 1);
                      return (
                        <PressableScale
                          key={m}
                          onPress={() => toggleMonth(i + 1)}
                          scaleTo={0.94}
                          containerStyle={{ width: '22%' }}
                          style={[styles.monthCell, on && styles.monthOn]}
                        >
                          <Text
                            variant="labelLarge"
                            style={{ color: on ? palette.text : palette.textSecondary }}
                          >
                            {m}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                  <Text variant="bodySmall" style={{ color: palette.textDisabled }}>
                    Ej: aguinaldo en junio y diciembre, seguro anual, patente.
                  </Text>
                </>
              ) : null}
            </View>
            <MonthStepper label="Empieza" value={start} onChange={setStart} />
            <SwitchRow
              label="Tiene fin"
              description="Para planes o fijos por un tiempo (ej: 12 meses)"
              value={limited}
              onChange={setLimited}
            />
            {limited ? (
              <Stepper label="Cantidad de meses" value={count} onChange={setCount} min={1} max={120} />
            ) : null}
          </Group>
          {limited ? (
            <Hint icon="flag-checkered">
              Termina en {periodLabel(draft.endPeriod).toLowerCase()}
              {value ? (
                <>
                  {' · '}
                  {payments} {payments === 1 ? 'pago' : 'pagos'} ·{' '}
                  <Text style={[styles.num, { color: palette.text }]}>
                    {formatMoney(value * payments, currency)}
                  </Text>{' '}
                  en total
                </>
              ) : null}
            </Hint>
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
              .filter((c) => c.kind === type)
              .map((c) => ({ value: c.id, label: c.name, color: c.color, icon: c.icon }))}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Label>{isIncome ? 'Entra en (sugerido)' : 'Se paga con (sugerido)'}</Label>
          {accountOptions.length ? (
            <ChipSelect
              wrap
              allowNone
              value={accountId}
              onChange={setAccountId}
              options={accountOptions.map((a) => ({ value: a.id, label: a.name, color: a.color }))}
            />
          ) : (
            <Hint icon="information-outline">
              No tenés cuentas en {currency === 'USD' ? 'dólares' : 'pesos'}. Lo elegís al marcarlo como{' '}
              {isIncome ? 'cobrado' : 'pagado'}.
            </Hint>
          )}
        </View>

        {!isIncome ? (
          <View>
            <Label>Avisos</Label>
            <Group>
              <SwitchRow
                icon="bell-outline"
                label="Recordarme"
                description="Te avisamos el día anterior al vencimiento"
                value={remind}
                onChange={setRemind}
              />
            </Group>
          </View>
        ) : null}
      </FormScreen>

      {existing ? (
        <ConfirmDialog
          visible={confirmDelete}
          icon="trash-can-outline"
          title="¿Borrar este fijo?"
          message={
            paidCount
              ? `Se borra "${existing.name}" y deja de aparecer en tus meses. Los ${paidCount} ${paidCount === 1 ? 'pago que ya registraste queda' : 'pagos que ya registraste quedan'} en tus movimientos.`
              : `Se borra "${existing.name}" y deja de aparecer en tus meses.`
          }
          confirmLabel="Borrar fijo"
          tone="danger"
          onConfirm={doDelete}
          onDismiss={() => setConfirmDelete(false)}
        />
      ) : null}
    </>
  );
}

/** Próxima fecha en que toca este fijo (desde hoy), con "en N días" si está cerca */
function nextDue(draft, day) {
  const hoy = today();
  const from = draft.startPeriod > currentPeriod() ? draft.startPeriod : currentPeriod();
  for (let i = 0; i < 24; i++) {
    const p = addMonths(from, i);
    if (draft.endPeriod && p > draft.endPeriod) return null;
    if (!recurringApplies(draft, p)) continue;
    const d = dateInPeriod(p, day);
    if (d < hoy) continue;
    const n = daysUntil(d);
    const label = `${Number(d.slice(8))} de ${periodLabel(p, false).toLowerCase()}`;
    const rel = n === 0 ? 'hoy' : n === 1 ? 'mañana' : n <= 31 ? `en ${n} días` : null;
    return { label, rel };
  }
  return null;
}

/** Aclaración chica con ícono debajo de un campo */
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
  block: { padding: space.lg, gap: space.md },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' },
  monthCell: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm + 2,
    backgroundColor: palette.surfaceHigh,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  monthOn: { backgroundColor: '#2A2A30', borderColor: palette.primary + '80' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
});