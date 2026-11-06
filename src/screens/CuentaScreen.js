import { useRoute } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AmountInput, ChipSelect, ColorPicker, Field, Group, SwitchRow } from '@/components/fields';
import { ACCOUNT_ICON } from '@/components/finance';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Card, FormScreen, HeaderButton, IconBubble, Label } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { accountBalances } from '@/lib/finance';
import { centsToInput, formatMoney, parseAmount } from '@/lib/money';
import { goBack } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

const TYPES = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'mp', label: 'Mercado Pago' },
  { value: 'bank', label: 'Banco' },
  { value: 'wallet', label: 'Billetera virtual' },
  { value: 'other', label: 'Otra' },
];

export default function AccountForm() {
  const { id } = useRoute().params ?? {};
  const { accounts, transactions, save, remove } = useFinance();
  const toast = useToast();
  const existing = accounts.find((a) => a.id === id);
  const txCount = existing
    ? transactions.filter((t) => t.accountId === existing.id || t.toAccountId === existing.id).length
    : 0;
  const hasTx = txCount > 0;
  const balances = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState(existing?.type ?? 'bank');
  const [currency, setCurrency] = useState(existing?.currency ?? 'ARS');
  const [initial, setInitial] = useState(centsToInput(existing?.initialBalance ?? 0) || '');
  const [remunerated, setRemunerated] = useState(existing?.remunerated ?? false);
  const [color, setColor] = useState(existing?.color ?? palette.primary);
  const [archived, setArchived] = useState(existing?.archived ?? false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.show('Poné un nombre', { tone: 'warn' });
    setSaving(true);
    try {
      const data = {
        id: existing?.id,
        name: name.trim(),
        type,
        currency,
        initialBalance: parseAmount(initial) ?? 0,
        remunerated,
        color,
        archived,
      };
      await save('accounts', data);
      goBack();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Saldo actual con el saldo inicial que estás editando (para la vista previa)
  const initialCents = parseAmount(initial) ?? 0;
  const current = existing
    ? (balances[existing.id] ?? 0) - (existing.initialBalance ?? 0) + initialCents
    : initialCents;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = () => existing && setConfirmDelete(true);
  const doDelete = async () => {
    await remove('accounts', existing.id);
    goBack();
  };
  // Si tiene movimientos no se puede borrar: el diálogo ofrece archivarla
  const doArchive = async () => {
    await save('accounts', { ...existing, archived: true });
    toast.show('Cuenta archivada');
    goBack();
  };

  return (
    <>
      <ScreenOptions
        options={{
          title: existing ? 'Editar cuenta' : 'Nueva cuenta',
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
        {/* Vista previa: así se ve en Cuentas */}
        <Card style={styles.preview}>
          <IconBubble icon={ACCOUNT_ICON[type]} color={color} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              variant="titleMedium"
              numberOfLines={1}
              style={{ color: name.trim() ? palette.text : palette.textDisabled }}
            >
              {name.trim() || 'Tu cuenta'}
            </Text>
            <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
              {currency === 'USD' ? 'Dólares' : 'Pesos'}
              {remunerated ? ' · remunerada' : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="labelSmall" style={styles.caps}>
              Saldo actual
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.num, { color: current < 0 ? palette.expense : palette.text }]}
            >
              {formatMoney(current, currency)}
            </Text>
          </View>
        </Card>

        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Ej: Banco Nación, Ualá, Caja fuerte"
        />
        <View>
          <Label>Tipo</Label>
          <ChipSelect
            wrap
            value={type}
            onChange={(v) => v && setType(v)}
            options={TYPES.map((t) => ({ ...t, icon: ACCOUNT_ICON[t.value], color }))}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <Label>Saldo inicial</Label>
          <AmountInput
            value={initial}
            onChange={setInitial}
            currency={currency}
            onCurrency={hasTx ? undefined : setCurrency}
          />
          {current < 0 ? (
            <Hint icon="alert-circle-outline" color={palette.warning}>
              El saldo actual da negativo. Si es un error, subí el saldo inicial a lo que tenías cuando
              empezaste a usar Mango.
            </Hint>
          ) : (
            <Hint icon="information-outline" color={palette.textSecondary}>
              Es lo que tenías en la cuenta al empezar a usar Mango. El saldo actual suma tus movimientos.
            </Hint>
          )}
          {hasTx ? (
            <Hint icon="lock-outline" color={palette.textDisabled}>
              La moneda queda fija porque la cuenta ya tiene movimientos.
            </Hint>
          ) : null}
        </View>
        <Group>
          <SwitchRow
            icon="chart-line"
            label="Cuenta remunerada"
            description="Genera rendimientos diarios (ej: Mercado Pago)"
            value={remunerated}
            onChange={setRemunerated}
          />
          {existing ? (
            <SwitchRow
              icon="archive-outline"
              label="Archivada"
              description="Se oculta de las listas y del total"
              value={archived}
              onChange={setArchived}
            />
          ) : null}
        </Group>
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
        hasTx ? (
          <ConfirmDialog
            visible={confirmDelete}
            icon="archive-outline"
            title="No se puede borrar"
            message={`"${existing.name}" tiene ${txCount} ${txCount === 1 ? 'movimiento' : 'movimientos'}. Podés archivarla: deja de aparecer en las listas y en el total, y tus movimientos quedan intactos.`}
            confirmLabel="Archivar cuenta"
            tone="primary"
            onConfirm={doArchive}
            onDismiss={() => setConfirmDelete(false)}
          />
        ) : (
          <ConfirmDialog
            visible={confirmDelete}
            icon="trash-can-outline"
            title="¿Borrar esta cuenta?"
            message={`Se borra "${existing.name}". No tiene movimientos, así que no se pierde nada más.`}
            confirmLabel="Borrar cuenta"
            tone="danger"
            onConfirm={doDelete}
            onDismiss={() => setConfirmDelete(false)}
          />
        )
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
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.md },
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