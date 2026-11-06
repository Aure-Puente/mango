import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ACCOUNT_ICON } from '@/components/finance';
import { Card, Divider, HeaderButton, Label, Pill, Row, Screen } from '@/components/ui';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { accountBalances } from '@/lib/finance';
import { formatMoney, percent } from '@/lib/money';
import { navigate } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

export default function Accounts() {
  const { accounts, transactions, categories, conv, fmt, display, market } = useFinance();
  const balances = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const yieldCat = categories.find(
    (c) => c.kind === 'income' && c.name.toLowerCase().startsWith('rendimiento'),
  );

  const ars = active.filter((a) => a.currency === 'ARS').reduce((s, a) => s + (balances[a.id] ?? 0), 0);
  const usd = active.filter((a) => a.currency === 'USD').reduce((s, a) => s + (balances[a.id] ?? 0), 0);
  const total = conv(ars, 'ARS') + conv(usd, 'USD');

  // Distribución: cuánto pesa cada cuenta (solo saldos positivos, en la moneda que estás mirando)
  const parts = active
    .map((a) => ({ a, v: conv(balances[a.id] ?? 0, a.currency) }))
    .filter((x) => x.v > 0)
    .sort((x, y) => y.v - x.v);
  const positive = parts.reduce((s, x) => s + x.v, 0);

  const remunerable = (a) => a.remunerated && !a.archived;
  const registerYield = (a) =>
    navigate('Movimiento', {
      type: 'income',
      account: a.id,
      category: yieldCat?.id ?? '',
      note: 'Rendimientos',
    });

  const list = (rows) => (
    <Card style={{ paddingVertical: space.xs }}>
      {rows.map((a, i) => {
        const bal = balances[a.id] ?? 0;
        const negative = bal < 0;
        // Cuentas en dólares: también su equivalente en pesos
        const inArs =
          a.currency === 'USD' && market.rate && bal
            ? ` · ≈ ${formatMoney(Math.round(bal * market.rate), 'ARS')}`
            : '';
        return (
          <View key={a.id}>
            {i > 0 ? <Divider /> : null}
            <Row
              icon={ACCOUNT_ICON[a.type]}
              iconColor={a.color}
              title={a.name}
              subtitle={`${a.currency === 'USD' ? 'Dólares' : 'Pesos'}${a.remunerated ? ' · remunerada' : ''}${inArs}`}
              right={
                remunerable(a) ? (
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text
                      variant="bodyLarge"
                      style={[styles.amount, { color: negative ? palette.expense : palette.text }]}
                    >
                      {formatMoney(bal, a.currency)}
                    </Text>
                    <Pressable
                      onPress={() => registerYield(a)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Registrar rendimientos de ${a.name}`}
                      style={({ pressed }) => [styles.yieldLink, pressed && { opacity: 0.5 }]}
                    >
                      <MaterialCommunityIcons name="plus" size={13} color={palette.income} />
                      <Text variant="labelMedium" style={{ color: palette.income }}>
                        Rendimientos
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  formatMoney(bal, a.currency)
                )
              }
              rightColor={negative ? palette.expense : palette.text}
              onPress={() => navigate('Cuenta', { id: a.id })}
            />
            {negative ? (
              <View style={styles.extras}>
                {negative ? (
                  <Pressable
                    onPress={() => navigate('Cuenta', { id: a.id })}
                    hitSlop={6}
                    style={({ pressed }) => [styles.warn, pressed && { opacity: 0.6 }]}
                  >
                    <MaterialCommunityIcons name="alert-circle-outline" size={14} color={palette.warning} />
                    <Text variant="labelMedium" style={{ color: palette.warning }}>
                      Saldo negativo · revisá el saldo inicial
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );

  return (
    <>
      <ScreenOptions
        options={{
          headerRight: () => (
            <HeaderButton icon="plus" accessibilityLabel="Agregar" onPress={() => navigate('Cuenta')} />
          ),
        }}
      />
      <Screen>
        <Card style={styles.hero}>
          <LinearGradient
            pointerEvents="none"
            colors={[palette.primary + '26', palette.primary + '00']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.25, y: 0.85 }}
            style={StyleSheet.absoluteFill}
          />
          <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
            Patrimonio total
          </Text>
          <Text
            variant="displaySmall"
            style={[styles.num, { color: total < 0 ? palette.expense : palette.text, marginTop: -space.xs }]}
          >
            {fmt(total, display)}
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Pill label={`${formatMoney(ars, 'ARS')} en pesos`} color={palette.textSecondary} />
            <Pill label={`${formatMoney(usd, 'USD')} en dólares`} color={palette.income} />
          </View>

          {/* Dónde está tu plata */}
          {parts.length > 1 ? (
            <View style={styles.dist}>
              <View style={styles.distBar}>
                {parts.map((x) => (
                  <View key={x.a.id} style={{ flex: x.v, backgroundColor: x.a.color, minWidth: 4 }} />
                ))}
              </View>
              <View style={styles.legend}>
                {parts.slice(0, 4).map((x) => (
                  <View key={x.a.id} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: x.a.color }]} />
                    <Text variant="labelMedium" numberOfLines={1} style={{ color: palette.textSecondary }}>
                      {x.a.name} <Text style={{ color: palette.text }}>{percent(x.v / positive)}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </Card>

        <View style={styles.section}>
          <Label>Activas</Label>
          {list(active)}
        </View>
        {archived.length ? (
          <View style={styles.section}>
            <Label>Archivadas</Label>
            {list(archived)}
          </View>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.xl, gap: space.md, overflow: 'hidden', borderColor: palette.primary + '26' },
  num: { fontVariant: ['tabular-nums'] },
  dist: {
    gap: space.md,
    paddingTop: space.lg,
    marginTop: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  distBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '48%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  section: { marginTop: space.xl },
  extras: { marginLeft: 52, marginTop: -6, marginBottom: space.md, gap: space.sm },
  amount: { fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  yieldLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
});