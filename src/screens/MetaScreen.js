import { useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  AmountInput,
  ColorPicker,
  DateField,
  Field,
  GOAL_ICONS,
  Group,
  IconPicker,
  SwitchRow,
} from '@/components/fields';
import { Bar, Card, FormScreen, HeaderButton, IconBubble, Label } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { addMonths, currentPeriod, dateInPeriod, monthsBetween, periodOf } from '@/lib/dates';
import { centsToInput, currencySymbol, formatMoney, parseAmount, percent } from '@/lib/money';
import { goBack } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

export default function GoalForm() {
  const { id } = useRoute().params ?? {};
  const { goals, save, remove } = useFinance();
  const toast = useToast();
  const existing = goals.find((g) => g.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(centsToInput(existing?.target));
  const [saved, setSaved] = useState(existing?.saved ? centsToInput(existing.saved) : '');
  const [currency, setCurrency] = useState(existing?.currency ?? 'ARS');
  const [hasDeadline, setHasDeadline] = useState(!!existing?.deadline);
  const [deadline, setDeadline] = useState(
    existing?.deadline ?? dateInPeriod(addMonths(currentPeriod(), 6), 1),
  );
  const [color, setColor] = useState(existing?.color ?? palette.income);
  const [icon, setIcon] = useState(existing?.icon ?? 'piggy-bank-outline');
  const [saving, setSaving] = useState(false);

  // Valores en vivo para la vista previa y el cálculo por mes
  const tCents = parseAmount(target) ?? 0;
  const sCents = parseAmount(saved) ?? 0;
  const ratio = tCents ? sCents / tCents : 0;
  const overTarget = tCents > 0 && sCents > tCents;
  const monthsLeft = hasDeadline ? monthsBetween(currentPeriod(), periodOf(deadline)) : null;
  const perMonth =
    hasDeadline && tCents > sCents && monthsLeft > 0 ? Math.ceil((tCents - sCents) / monthsLeft) : null;
  const money = (x) => formatMoney(x, currency);

  const submit = async () => {
    const t = parseAmount(target);
    if (!name.trim()) return toast.show('Poné un nombre', { tone: 'warn' });
    if (!t) return toast.show('Ingresá el objetivo', { tone: 'warn' });
    setSaving(true);
    try {
      const data = {
        id: existing?.id,
        name: name.trim(),
        target: t,
        saved: parseAmount(saved) ?? 0,
        currency,
        deadline: hasDeadline ? deadline : null,
        color,
        icon,
      };
      await save('goals', data);
      goBack();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = () => existing && setConfirmDelete(true);
  const doDelete = async () => {
    await remove('goals', existing.id);
    goBack();
  };

  return (
    <>
      <ScreenOptions
        options={{
          title: existing ? 'Editar meta' : 'Nueva meta',
          headerRight: existing
            ? () => (
                <HeaderButton
                  icon="trash-can-outline"
                  color={palette.expense}
                  accessibilityLabel="Borrar"
                  onPress={del}
                />
              )
            : undefined,
        }}
      />
      <FormScreen onSave={submit} saving={saving}>
        {/* Vista previa: así se va a ver en la lista */}
        <Card style={styles.preview}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <IconBubble icon={icon} color={color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                variant="titleMedium"
                numberOfLines={1}
                style={{ color: name.trim() ? palette.text : palette.textDisabled }}
              >
                {name.trim() || 'Tu meta'}
              </Text>
              <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                {money(sCents)} de {money(tCents)}
              </Text>
            </View>
            <Text
              variant="titleMedium"
              style={[styles.num, { color: sCents ? color : palette.textSecondary }]}
            >
              {percent(Math.min(1, ratio))}
            </Text>
          </View>
          <Bar value={ratio} color={color} warnAt={null} height={8} />
        </Card>

        <Field
          label="¿Para qué ahorrás?"
          value={name}
          onChangeText={setName}
          placeholder="Ej: Viaje, fondo de emergencia"
        />
        <View>
          <Label>Objetivo</Label>
          <AmountInput
            value={target}
            onChange={setTarget}
            currency={currency}
            onCurrency={setCurrency}
            color={color}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <Field
            label="Ya tengo ahorrado (opcional)"
            value={saved}
            onChangeText={(t) => setSaved(t.replace(/[^\d.,]/g, ''))}
            keyboardType="decimal-pad"
            left={<Field.Affix text={currencySymbol(currency)} />}
          />
          {overTarget ? (
            <Hint icon="alert-circle-outline" color={palette.warning}>
              Es más que el objetivo: la meta va a quedar cumplida.
            </Hint>
          ) : null}
        </View>
        <View style={{ gap: space.sm }}>
          <Group>
            <SwitchRow
              icon="calendar-outline"
              label="Tiene fecha límite"
              description="Calculamos cuánto apartar por mes"
              value={hasDeadline}
              onChange={setHasDeadline}
            />
            {hasDeadline ? <DateField label="Fecha" value={deadline} onChange={setDeadline} /> : null}
          </Group>
          {hasDeadline && perMonth ? (
            <Hint icon="calendar-check-outline" color={color}>
              Vas a tener que apartar <Text style={styles.strong}>{money(perMonth)} por mes</Text> durante{' '}
              {monthsLeft} {monthsLeft === 1 ? 'mes' : 'meses'}.
            </Hint>
          ) : hasDeadline && tCents > sCents && monthsLeft <= 0 ? (
            <Hint icon="alert-circle-outline" color={palette.warning}>
              Elegí una fecha a partir del mes que viene.
            </Hint>
          ) : null}
        </View>

        {/* Apariencia: color e ícono en un solo bloque */}
        <View>
          <Label>Apariencia</Label>
          <Group>
            <View style={styles.block}>
              <Text variant="bodyMedium" style={styles.blockLabel}>
                Color
              </Text>
              <ColorPicker value={color} onChange={setColor} />
            </View>
            <View style={styles.block}>
              <Text variant="bodyMedium" style={styles.blockLabel}>
                Ícono
              </Text>
              <IconPicker value={icon} onChange={setIcon} color={color} icons={GOAL_ICONS} />
            </View>
          </Group>
        </View>
      </FormScreen>

      {existing ? (
        <ConfirmDialog
          visible={confirmDelete}
          icon="trash-can-outline"
          title="¿Borrar esta meta?"
          message={
            existing.saved > 0
              ? `Se borra "${existing.name}" y lo que tenías apartado (${formatMoney(existing.saved, existing.currency)}). La plata de tus cuentas no cambia.`
              : `Se borra "${existing.name}". No se puede deshacer.`
          }
          confirmLabel="Borrar meta"
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
  num: { fontVariant: ['tabular-nums'] },
  strong: { color: palette.text, fontFamily: 'Inter_600SemiBold' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
  block: { padding: space.lg, gap: space.md },
  blockLabel: { color: palette.textSecondary },
});