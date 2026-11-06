import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AmountInput, ColorPicker, Field, Group, IconPicker, Segmented } from '@/components/fields';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Bar, Card, FormScreen, HeaderButton, IconBubble, Label } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { currentPeriod } from '@/lib/dates';
import { centsToInput, formatMoney, parseAmount, percent } from '@/lib/money';
import { goBack } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

// Ícono por defecto hasta que elijas uno (así siempre hay uno marcado en la grilla)
const DEFAULT_ICON = { expense: 'dots-horizontal', income: 'cash-plus' };
const WEEKS_PER_MONTH = 4.345;

export default function CategoryForm() {
  const { id, kind: kindParam } = useRoute().params ?? {};
  const { categories, transactions, conv, display, market, save, remove } = useFinance();
  const toast = useToast();
  const existing = categories.find((c) => c.id === id);

  const [kind, setKind] = useState(existing?.kind ?? kindParam ?? 'expense');
  const [name, setName] = useState(existing?.name ?? '');
  const [pickedIcon, setIcon] = useState(existing?.icon ?? null);
  const [color, setColor] = useState(existing?.color ?? palette.primary);
  const [budget, setBudget] = useState(centsToInput(existing?.budget ?? null));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const icon = pickedIcon ?? DEFAULT_ICON[kind];
  const isExpense = kind === 'expense';
  const budgetCents = isExpense ? parseAmount(budget) || 0 : 0;

  // Lo movido este mes en esta categoría, en pesos (los presupuestos son en pesos)
  const period = currentPeriod();
  const { spent, txCount } = (() => {
    if (!existing) return { spent: 0, txCount: 0 };
    let sum = 0;
    let count = 0;
    for (const t of transactions) {
      if (t.categoryId !== existing.id) continue;
      count++;
      if (t.date.startsWith(period)) sum += conv(t.amount, t.currency, t.rate);
    }
    const ars = display === 'USD' ? Math.round(sum * (market.rate || 0)) : sum;
    return { spent: ars, txCount: count };
  })();

  const ratio = budgetCents ? spent / budgetCents : 0;

  const submit = async () => {
    if (!name.trim()) return toast.show('Poné un nombre', { tone: 'warn' });
    setSaving(true);
    try {
      const data = {
        id: existing?.id,
        name: name.trim(),
        kind,
        icon,
        color,
        budget: isExpense ? parseAmount(budget) || null : null,
      };
      await save('categories', data);
      goBack();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    await remove('categories', existing.id);
    goBack();
  };

  const previewSub = budgetCents
    ? `${formatMoney(spent, 'ARS', { compact: true })} de ${formatMoney(budgetCents, 'ARS', { compact: true })}`
    : isExpense
      ? 'Gasto · sin presupuesto'
      : 'Ingreso';

  return (
    <>
      <ScreenOptions
        options={{
          title: existing ? 'Editar categoría' : 'Nueva categoría',
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
        {/* Vista previa: así se ve en Categorías y presupuestos */}
        <Card style={styles.preview}>
          <View style={styles.previewRow}>
            <IconBubble icon={icon} color={color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                variant="titleMedium"
                numberOfLines={1}
                style={{ color: name.trim() ? palette.text : palette.textDisabled }}
              >
                {name.trim() || 'Tu categoría'}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary }}>
                {previewSub}
              </Text>
            </View>
            {existing ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="labelSmall" style={styles.caps}>
                  Este mes
                </Text>
                <Text
                  variant="titleMedium"
                  style={[styles.num, { color: spent ? palette.text : palette.textDisabled }]}
                >
                  {spent ? formatMoney(spent, 'ARS', { compact: true }) : '—'}
                </Text>
              </View>
            ) : null}
          </View>
          {budgetCents ? (
            <View style={styles.previewBar}>
              <View style={{ flex: 1 }}>
                <Bar value={ratio} height={4} />
              </View>
              <Text
                variant="labelSmall"
                style={[
                  styles.pct,
                  {
                    color:
                      ratio >= 1 ? palette.expense : ratio >= 0.8 ? palette.warning : palette.textSecondary,
                  },
                ]}
              >
                {percent(Math.min(ratio, 9.99))}
              </Text>
            </View>
          ) : null}
        </Card>

        {!existing ? (
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'expense', label: 'Gasto', icon: 'minus', color: palette.primary },
              { value: 'income', label: 'Ingreso', icon: 'plus', color: palette.primary },
            ]}
          />
        ) : null}

        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder={isExpense ? 'Ej: Supermercado, Salidas, Gym' : 'Ej: Sueldo, Freelance, Ventas'}
        />

        {isExpense ? (
          <View style={{ gap: space.sm }}>
            <Label>Presupuesto mensual (opcional)</Label>
            <AmountInput value={budget} onChange={setBudget} currency="ARS" size={48} shrinkEmpty />
            {budgetCents ? (
              <Hint icon="calendar-week" color={palette.textSecondary}>
                Son ≈ {formatMoney(Math.round(budgetCents / WEEKS_PER_MONTH), 'ARS')} por semana. Te avisamos
                al llegar al 80% y al pasarte.
              </Hint>
            ) : (
              <Hint icon="bell-outline" color={palette.textSecondary}>
                Poné un tope y te avisamos al llegar al 80% y al pasarte.
              </Hint>
            )}
            {existing && spent ? (
              <Hint icon="chart-timeline-variant" color={palette.textSecondary}>
                Este mes llevás {formatMoney(spent, 'ARS')}.
              </Hint>
            ) : null}
          </View>
        ) : null}

        <View>
          <Label>Apariencia</Label>
          <Group>
            <View style={styles.block}>
              <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                Color
              </Text>
              <ColorPicker value={color} onChange={setColor} />
            </View>
            <View style={styles.block}>
              <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                Ícono
              </Text>
              <IconPicker value={icon} onChange={setIcon} color={color} />
            </View>
          </Group>
        </View>
      </FormScreen>

      {existing ? (
        <ConfirmDialog
          visible={confirmDelete}
          icon="trash-can-outline"
          title="¿Borrar esta categoría?"
          message={
            txCount
              ? `Se borra "${existing.name}". ${txCount === 1 ? 'Su movimiento va' : `Sus ${txCount} movimientos van`} a quedar como "Sin categoría", no se pierden.`
              : `Se borra "${existing.name}". No tiene movimientos, así que no se pierde nada más.`
          }
          confirmLabel="Borrar categoría"
          tone="danger"
          onConfirm={doDelete}
          onDismiss={() => setConfirmDelete(false)}
        />
      ) : null}
    </>
  );
}

/** Aclaración chica con ícono debajo de un campo */
function Hint({ icon, color, children }) {
  return (
    <View style={styles.hint}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { gap: space.md },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  previewBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginLeft: 52 },
  pct: { minWidth: 34, textAlign: 'right', fontVariant: ['tabular-nums'] },
  caps: {
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
  },
  num: { fontVariant: ['tabular-nums'], marginTop: 1 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
  block: { padding: space.lg, gap: space.md },
});