//DeudaScreen:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { onDate, PersonAvatar } from '@/components/debts';
import { AmountInput, ChipSelect, DateField, Field, Group, Segmented, SwitchRow } from '@/components/fields';
import { Card, FormScreen, Label } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { today } from '@/lib/dates';
import { debtStatus } from '@/lib/finance';
import { centsToInput, formatMoney, parseAmount } from '@/lib/money';
import { goBack, replace } from '@/navigation/RootNavigation';
import { palette, radius, space } from '@/theme';

function inAMonth() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DebtForm() {
  const { id, direction: dirParam } = useRoute().params ?? {};
  const { debts, accounts, createDebt, editDebt } = useFinance();
  const toast = useToast();
  const existing = debts.find((d) => d.id === id);

  const [direction, setDirection] = useState(existing?.direction ?? dirParam ?? 'owed');
  const [person, setPerson] = useState(existing?.person ?? '');
  const [amount, setAmount] = useState(centsToInput(existing?.amount));
  const [currency, setCurrency] = useState(existing?.currency ?? 'ARS');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(existing?.date ?? today());
  const [hasDue, setHasDue] = useState(!!existing?.dueDate);
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? inAMonth());
  const [pickedAccount, setAccountId] = useState(existing ? existing.accountId : undefined);
  const [saving, setSaving] = useState(false);

  const owed = direction === 'owed';
  const value = parseAmount(amount) || 0;
  const paid = existing ? debtStatus(existing).paid : 0;

  const accountOptions = accounts.filter((a) => !a.archived && a.currency === currency);
  const accountId =
    pickedAccount === undefined
      ? (accountOptions[0]?.id ?? null)
      : accountOptions.some((a) => a.id === pickedAccount)
        ? pickedAccount
        : null;
  const acc = accounts.find((a) => a.id === accountId);

  const names = [...new Set(debts.map((d) => d.person.trim()))]
    .filter((n) => n && n.toLowerCase() !== person.trim().toLowerCase())
    .filter((n) => !person.trim() || n.toLowerCase().startsWith(person.trim().toLowerCase()))
    .slice(0, 6);

  const submit = async () => {
    if (!value) return toast.show('Ingresá el monto', { tone: 'warn' });
    if (!person.trim()) return toast.show(owed ? '¿Quién te debe?' : '¿A quién le debés?', { tone: 'warn' });
    if (value < paid)
      return toast.show(`Ya se devolvieron ${formatMoney(paid, currency)}: el total no puede ser menor`, {
        tone: 'warn',
      });
    setSaving(true);
    try {
      const data = {
        direction,
        person: person.trim(),
        amount: value,
        currency,
        note: note.trim(),
        date,
        dueDate: hasDue ? dueDate : null,
        accountId,
      };
      if (existing) {
        await editDebt(existing, data);
        goBack();
      } else {
        const newId = await createDebt(data);
        toast.show(owed ? 'Préstamo anotado' : 'Deuda anotada');
        replace('DeudaDetalle', { id: newId });
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const name = person.trim();

  return (
    <>
      <ScreenOptions options={{ title: existing ? 'Editar' : owed ? 'Me deben' : 'Debo' }} />
      <FormScreen onSave={submit} saving={saving}>
        <Card style={styles.preview}>
          <View style={styles.previewRow}>
            <PersonAvatar name={name || '?'} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                variant="titleMedium"
                numberOfLines={1}
                style={{ color: name ? palette.text : palette.textDisabled }}
              >
                {name || (owed ? '¿Quién te debe?' : '¿A quién le debés?')}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary }}>
                {note.trim() || (owed ? 'Le prestaste' : 'Te prestó')}
                {hasDue ? ` · para ${onDate(dueDate)}` : ''}
              </Text>
            </View>
            <Text
              variant="titleMedium"
              style={[
                styles.num,
                { color: !value ? palette.textDisabled : owed ? palette.income : palette.text },
              ]}
            >
              {formatMoney(value, currency)}
            </Text>
          </View>
          <View style={styles.previewFoot}>
            <MaterialCommunityIcons
              name={acc ? (owed ? 'arrow-up-right' : 'arrow-down-left') : 'notebook-outline'}
              size={15}
              color={palette.textSecondary}
            />
            <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
              {acc ? (
                <>
                  {owed ? 'Sale de ' : 'Entra en '}
                  <Text style={{ color: palette.text }}>{acc.name}</Text> · no cuenta como gasto ni ingreso
                </>
              ) : (
                'Solo anotado: no cambia ningún saldo'
              )}
            </Text>
          </View>
        </Card>

        {!existing ? (
          <Segmented
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'owed', label: 'Me deben', icon: 'arrow-down-left' },
              { value: 'owe', label: 'Debo', icon: 'arrow-up-right' },
            ]}
          />
        ) : null}

        <AmountInput
          value={amount}
          onChange={setAmount}
          currency={currency}
          onCurrency={existing?.payments?.length ? undefined : setCurrency}
          color={owed ? palette.income : palette.text}
          size={48}
          shrinkEmpty
        />

        <View style={{ gap: space.sm }}>
          <Field
            label={owed ? '¿Quién te debe?' : '¿A quién le debés?'}
            value={person}
            onChangeText={setPerson}
            placeholder="Ej: Juan, mamá, Vale"
          />
          {names.length ? (
            <View style={styles.names}>
              {names.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setPerson(n)}
                  style={({ pressed }) => [styles.nameChip, pressed && { opacity: 0.6 }]}
                >
                  <PersonAvatar name={n} size={22} />
                  <Text variant="labelLarge" style={{ fontSize: 13 }}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Field
          label="Nota (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder={owed ? 'Ej: Entradas del recital' : 'Ej: Me cubrió la cena'}
        />

        <View style={{ gap: space.sm }}>
          <Label>Cuándo</Label>
          <Group>
            <DateField label={owed ? 'Le prestaste el' : 'Te prestó el'} value={date} onChange={setDate} />
            <SwitchRow
              icon="calendar-clock"
              label="Fecha para devolver"
              description="Te avisamos cuando se acerque"
              value={hasDue}
              onChange={setHasDue}
            />
            {hasDue ? <DateField label="Para el" value={dueDate} onChange={setDueDate} /> : null}
          </Group>
        </View>

        <View style={{ gap: space.sm }}>
          <Label>{owed ? '¿De qué cuenta salió?' : '¿A qué cuenta entró?'}</Label>
          <ChipSelect
            wrap
            allowNone
            value={accountId}
            onChange={(v) => setAccountId(v ?? null)}
            options={accountOptions.map((a) => ({ value: a.id, label: a.name, color: a.color }))}
          />
          <View style={styles.hint}>
            <MaterialCommunityIcons name="information-outline" size={16} color={palette.textSecondary} />
            <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
              {accountId
                ? 'Se registra como movimiento entre tu cuenta y la otra persona: el saldo cambia, pero no cuenta como gasto ni ingreso.'
                : 'Sin cuenta queda solo anotado. Tocá una cuenta si la plata salió o entró de verdad.'}
            </Text>
          </View>
        </View>
      </FormScreen>
    </>
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
  names: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  nameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingLeft: 5,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
});