//DeudasScreen:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { DebtRow } from '@/components/debts';
import { Segmented } from '@/components/fields';
import { Card, Divider, Empty, HeaderButton, Label, Screen } from '@/components/ui';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { debtStatus, debtTotals } from '@/lib/finance';
import { navigate } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

export default function Debts() {
  const { direction: initial } = useRoute().params ?? {};
  const { debts, conv, fmt, display } = useFinance();
  const [dir, setDir] = useState(initial ?? 'owed');
  const [showDone, setShowDone] = useState(false);
  const owed = dir === 'owed';

  const totals = debtTotals(debts, conv);
  const mine = debts.filter((d) => d.direction === dir);
  const active = mine
    .filter((d) => !debtStatus(d).done)
    .sort((a, b) =>
      a.dueDate && b.dueDate
        ? a.dueDate.localeCompare(b.dueDate)
        : a.dueDate
          ? -1
          : b.dueDate
            ? 1
            : b.date.localeCompare(a.date),
    );
  const done = mine.filter((d) => debtStatus(d).done);
  const total = owed ? totals.owed : totals.owe;
  const count = owed ? totals.owedCount : totals.oweCount;
  const people = new Set(active.map((d) => d.person.trim().toLowerCase())).size;

  const list = (items) => (
    <Card style={{ paddingVertical: space.xs }}>
      {items.map((d, i) => (
        <View key={d.id}>
          {i > 0 ? <Divider /> : null}
          <DebtRow d={d} onPress={() => navigate('DeudaDetalle', { id: d.id })} />
        </View>
      ))}
    </Card>
  );

  return (
    <>
      <ScreenOptions
        options={{
          headerRight: () => (
            <HeaderButton
              icon="plus"
              accessibilityLabel="Agregar"
              onPress={() => navigate('Deuda', { direction: dir })}
            />
          ),
        }}
      />
      <Screen>
        <Segmented
          value={dir}
          onChange={setDir}
          options={[
            { value: 'owed', label: 'Me deben' },
            { value: 'owe', label: 'Debo' },
          ]}
        />

        <Card style={styles.hero}>
          <LinearGradient
            pointerEvents="none"
            colors={[palette.primary + '1F', palette.primary + '00']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.35, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
          <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
            {owed ? 'Te deben' : 'Debés'}
          </Text>
          <Text
            variant="displaySmall"
            style={[
              styles.num,
              { marginTop: -space.xs, color: total && owed ? palette.income : palette.text },
            ]}
          >
            {fmt(total, display)}
          </Text>
          <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
            {count
              ? `${count} ${count === 1 ? 'deuda' : 'deudas'}${people > 1 ? ` · ${people} personas` : ''}`
              : owed
                ? 'Nadie te debe nada'
                : 'No le debés nada a nadie'}
          </Text>
          {(owed ? totals.owe : totals.owed) > 0 ? (
            <Pressable
              onPress={() => setDir(owed ? 'owe' : 'owed')}
              style={({ pressed }) => [styles.other, pressed && { opacity: 0.6 }]}
            >
              <MaterialCommunityIcons
                name={owed ? 'arrow-up-right' : 'arrow-down-left'}
                size={15}
                color={owed ? palette.expense : palette.income}
              />
              <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
                {owed ? 'Vos debés ' : 'A vos te deben '}
                <Text style={[styles.num, { color: palette.text }]}>
                  {fmt(owed ? totals.owe : totals.owed, display)}
                </Text>
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={palette.textDisabled} />
            </Pressable>
          ) : null}
        </Card>

        {mine.length === 0 ? (
          <Card style={{ marginTop: space.lg }}>
            <Empty
              icon={owed ? 'hand-coin-outline' : 'cash-refund'}
              title={owed ? 'Nadie te debe' : 'No debés nada'}
              text={
                owed
                  ? 'Anotá la plata que prestás. Cuando te la devuelvan, la registrás y vuelve a tu cuenta.'
                  : 'Anotá la plata que te prestaron, y registrá lo que vas devolviendo.'
              }
              action={owed ? 'Anotar préstamo' : 'Anotar deuda'}
              onAction={() => navigate('Deuda', { direction: dir })}
            />
          </Card>
        ) : null}

        {active.length ? (
          <View style={styles.section}>
            <Label>{owed ? 'Pendientes de cobro' : 'Pendientes de pago'}</Label>
            {list(active)}
          </View>
        ) : null}

        {done.length ? (
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Label>{`Saldadas · ${done.length}`}</Label>
              <Pressable
                onPress={() => setShowDone((v) => !v)}
                hitSlop={10}
                style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.5 }]}
              >
                <Text variant="labelMedium" style={{ color: palette.textSecondary }}>
                  {showDone || !active.length ? 'Ocultar' : 'Ver'}
                </Text>
                <MaterialCommunityIcons
                  name={showDone || !active.length ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={palette.textSecondary}
                />
              </Pressable>
            </View>
            {showDone || !active.length ? list(done) : null}
          </View>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: space.lg,
    padding: space.xl,
    gap: space.md,
    overflow: 'hidden',
    borderColor: palette.primary + '26',
  },
  num: { fontVariant: ['tabular-nums'] },
  other: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  section: { marginTop: space.xl },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
