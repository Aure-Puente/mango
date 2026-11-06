//CategoriasScreen:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Segmented } from '@/components/fields';
import { Bar, Card, Divider, HeaderButton, Label, Row, Screen } from '@/components/ui';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { currentPeriod, periodLabel } from '@/lib/dates';
import { formatMoney, percent } from '@/lib/money';
import { navigate } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

export default function Categories() {
  const { categories, transactions, conv, display, market, fmt } = useFinance();
  const [kind, setKind] = useState('expense');
  const period = currentPeriod();
  const isExpense = kind === 'expense';

  const amounts = useMemo(() => {
    const m = new Map();
    for (const t of transactions) {
      if (t.type !== kind || !t.date.startsWith(period)) continue;
      const k = t.categoryId ?? '_none';
      m.set(k, (m.get(k) ?? 0) + conv(t.amount, t.currency, t.rate));
    }
    return m;
  }, [transactions, kind, period, conv]);

  const list = categories
    .filter((c) => c.kind === kind)
    .map((c) => ({ c, amount: amounts.get(c.id) ?? 0 }))
    .sort((a, b) => b.amount - a.amount || a.c.name.localeCompare(b.c.name));
  const total = [...amounts.values()].reduce((s, v) => s + v, 0);

  const toArs = (v) => (display === 'USD' ? Math.round(v * (market.rate || 0)) : v);
  const withBudget = isExpense ? list.filter((x) => x.c.budget) : [];
  const withoutBudget = isExpense ? list.filter((x) => !x.c.budget) : list;
  const totalBudget = withBudget.reduce((s, x) => s + x.c.budget, 0);
  const totalUsed = withBudget.reduce((s, x) => s + toArs(x.amount), 0);

  const parts = list.filter((x) => x.amount > 0);

  const rows = (items, budgeted) => (
    <Card style={{ paddingVertical: space.xs }}>
      {items.map(({ c, amount }, i) => {
        const ratio = budgeted ? toArs(amount) / c.budget : null;
        return (
          <View key={c.id}>
            {i > 0 ? <Divider /> : null}
            <Row
              icon={c.icon}
              iconColor={c.color}
              title={c.name}
              subtitle={
                budgeted
                  ? `${formatMoney(toArs(amount), 'ARS', { compact: true })} de ${formatMoney(c.budget, 'ARS', { compact: true })}`
                  : undefined
              }
              right={amount ? fmt(amount, display, { compact: true }) : '—'}
              rightColor={amount ? palette.text : palette.textDisabled}
              onPress={() => navigate('Categoria', { id: c.id })}
            />
            {budgeted ? (
              <View style={styles.budgetBar}>
                <View style={{ flex: 1 }}>
                  <Bar value={ratio} height={4} />
                </View>
                <Text
                  variant="labelSmall"
                  style={[
                    styles.budgetPct,
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
            <HeaderButton
              icon="plus"
              accessibilityLabel="Agregar"
              onPress={() => navigate('Categoria', { kind })}
            />
          ),
        }}
      />
      <Screen>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'Gastos', color: palette.primary },
            { value: 'income', label: 'Ingresos', color: palette.primary },
          ]}
        />

        <Card style={styles.hero}>
          <LinearGradient
            pointerEvents="none"
            colors={[palette.primary + '26', palette.primary + '00']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.25, y: 0.85 }}
            style={StyleSheet.absoluteFill}
          />
          <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
            {isExpense ? 'Gastaste' : 'Cobraste'} en {periodLabel(period, false).toLowerCase()}
          </Text>
          <Text variant="displaySmall" style={[styles.num, { marginTop: -space.xs }]}>
            {fmt(total, display)}
          </Text>

          {parts.length > 1 ? (
            <View style={{ gap: space.md }}>
              <View style={styles.distBar}>
                {parts.map((x) => (
                  <View key={x.c.id} style={{ flex: x.amount, backgroundColor: x.c.color, minWidth: 4 }} />
                ))}
              </View>
              <View style={styles.legend}>
                {parts.slice(0, 4).map((x) => (
                  <View key={x.c.id} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: x.c.color }]} />
                    <Text variant="labelMedium" numberOfLines={1} style={{ color: palette.textSecondary }}>
                      {x.c.name} <Text style={{ color: palette.text }}>{percent(x.amount / total)}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {totalBudget > 0 ? (
            <View style={styles.heroFoot}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                  Presupuestos del mes
                </Text>
                <Text variant="labelLarge" style={styles.num}>
                  {formatMoney(totalUsed, 'ARS', { compact: true })}{' '}
                  <Text style={{ color: palette.textSecondary }}>
                    de {formatMoney(totalBudget, 'ARS', { compact: true })}
                  </Text>
                </Text>
              </View>
              <Bar value={totalUsed / totalBudget} height={6} />
            </View>
          ) : null}
        </Card>

        {withBudget.length ? (
          <View style={styles.section}>
            <Label>Con presupuesto</Label>
            {rows(withBudget, true)}
          </View>
        ) : null}

        <View style={styles.section}>
          <Label>
            {isExpense
              ? withBudget.length
                ? 'Sin presupuesto'
                : 'Categorías de gasto'
              : 'Categorías de ingreso'}
          </Label>
          {rows(withoutBudget, false)}
          {isExpense ? (
            <View style={styles.hint}>
              <MaterialCommunityIcons name="gesture-tap" size={16} color={palette.textDisabled} />
              <Text variant="bodySmall" style={{ color: palette.textDisabled, flex: 1 }}>
                Tocá una categoría para ponerle un presupuesto mensual. Te avisamos al llegar al 80%.
              </Text>
            </View>
          ) : null}
        </View>

        {!amounts.size ? null : amounts.has('_none') ? (
          <Text variant="bodySmall" style={[styles.hint, { color: palette.textDisabled }]}>
            {fmt(amounts.get('_none'), display, { compact: true })} de este mes no tienen categoría.
          </Text>
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
  distBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '48%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  heroFoot: {
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  section: { marginTop: space.xl },
  budgetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginLeft: 52,
    marginTop: -6,
    paddingBottom: space.md,
  },
  budgetPct: { minWidth: 34, textAlign: 'right', fontVariant: ['tabular-nums'] },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    paddingHorizontal: space.xs,
  },
});