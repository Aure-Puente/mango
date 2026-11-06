//TarjetaScreen:
import { useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ChipSelect, ColorPicker, Field, Group, Stepper } from '@/components/fields';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CreditCard } from '@/components/CreditCard';
import { FormScreen, HeaderButton, Label } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { periodLabel, today } from '@/lib/dates';
import { cardFirstPeriod } from '@/lib/finance';
import { goBack } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

const NONE = '__none';

export default function CardForm() {
  const { id } = useRoute().params ?? {};
  const { cards, accounts, purchases, save, remove } = useFinance();
  const toast = useToast();
  const existing = cards.find((c) => c.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [closingDay, setClosingDay] = useState(existing?.closingDay ?? 25);
  const [dueDay, setDueDay] = useState(existing?.dueDay ?? 5);
  const [accountId, setAccountId] = useState(existing?.accountId ?? null);
  const [color, setColor] = useState(existing?.color ?? '#8EA8FF');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.show('Poné un nombre', { tone: 'warn' });
    setSaving(true);
    try {
      const data = { id: existing?.id, name: name.trim(), closingDay, dueDay, accountId, color };
      await save('cards', data);
      goBack();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const cardPurchases = existing ? purchases.filter((p) => p.cardId === existing.id) : [];
  const active = cardPurchases.filter((p) => Object.keys(p.paid ?? {}).length < p.installments).length;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = () => existing && setConfirmDelete(true);
  const doDelete = async () => {
    await remove('cards', existing.id);
    goBack();
  };

  const gap = (dueDay - closingDay + 31) % 31;
  const tightDays = gap < 5;

  const example = cardFirstPeriod({ closingDay, dueDay }, today());

  return (
    <>
      <ScreenOptions
        options={{
          title: existing ? 'Editar tarjeta' : 'Nueva tarjeta',
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
        <CreditCard card={{ name: name.trim(), closingDay, dueDay, color }} active={active} />

        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Ej: Visa Galicia, Mastercard BBVA"
        />
        <View style={{ gap: space.sm }}>
          <Group>
            <Stepper label="Día de cierre" value={closingDay} onChange={setClosingDay} min={1} max={31} />
            <Stepper label="Día de vencimiento" value={dueDay} onChange={setDueDay} min={1} max={31} />
          </Group>
          {tightDays ? (
            <Hint icon="alert-circle-outline" color={palette.warning}>
              El vencimiento suele ser unos 10 días después del cierre. Revisá los días en tu resumen.
            </Hint>
          ) : (
            <Hint icon="calendar-check-outline" color={color}>
              Si comprás hoy, la primera cuota cae en el resumen de{' '}
              <Text style={styles.strong}>{periodLabel(example).toLowerCase()}</Text>.
            </Hint>
          )}
          <Text variant="bodySmall" style={styles.note}>
            Las fechas cambian un poco cada mes: usá las aproximadas.
          </Text>
        </View>
        <View>
          <Label>Pagás el resumen desde (sugerido)</Label>
          <ChipSelect
            wrap
            value={accountId ?? NONE}
            onChange={(v) => setAccountId(v === NONE ? null : v)}
            options={[
              { value: NONE, label: 'Ninguna', icon: 'minus-circle-outline' },
              ...accounts
                .filter((a) => !a.archived)
                .map((a) => ({ value: a.id, label: a.name, color: a.color })),
            ]}
          />
        </View>
        <View>
          <Label>Apariencia</Label>
          <Group>
            <View style={styles.block}>
              <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                Color
              </Text>
              <ColorPicker value={color} onChange={setColor} />
            </View>
          </Group>
        </View>
      </FormScreen>

      {existing ? (
        <ConfirmDialog
          visible={confirmDelete}
          icon="credit-card-remove-outline"
          title="¿Borrar esta tarjeta?"
          message={
            cardPurchases.length
              ? `Tiene ${cardPurchases.length} ${cardPurchases.length === 1 ? 'compra' : 'compras'} en cuotas: van a quedar cargadas pero sin tarjeta.`
              : `Se borra "${existing.name}". No se puede deshacer.`
          }
          confirmLabel="Borrar tarjeta"
          tone="danger"
          onConfirm={doDelete}
          onDismiss={() => setConfirmDelete(false)}
        />
      ) : null}
    </>
  );
}

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
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
  note: { color: palette.textDisabled, paddingHorizontal: space.xs },
  strong: { color: palette.text, fontFamily: 'Inter_600SemiBold' },
  block: { padding: space.lg, gap: space.md },
});