//Importaciones:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { CreditCard } from '@/components/CreditCard';
import { Card, Divider, Empty, HeaderButton, Label, Pill, PressableScale, Screen } from '@/components/ui';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { addMonths, currentPeriod, dateInPeriod, dateLabel, periodLabel, today } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { navigate } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

//JS:
export default function Cards() {
  const { cards, commitments, purchases } = useFinance();
  const now = currentPeriod();
  const periods = [now, addMonths(now, 1)];
  const hoy = today();

  /** Resumen de una tarjeta en un mes: total por moneda y fecha de vencimiento */
  const statement = (card, p) => {
    const items = commitments(p).filter((c) => c.cardId === card.id);
    const ars = items.filter((i) => i.currency === 'ARS').reduce((s, i) => s + i.amount, 0);
    const usd = items.filter((i) => i.currency === 'USD').reduce((s, i) => s + i.amount, 0);
    const label = [ars ? formatMoney(ars, 'ARS') : null, usd ? formatMoney(usd, 'USD') : null]
      .filter(Boolean)
      .join(' + ');
    const paid = items.length > 0 && items.every((i) => i.paid);
    return { p, label, empty: !ars && !usd, paid, due: dateInPeriod(p, card.dueDay) };
  };

  return (
    <>
      <ScreenOptions
        options={{
          headerRight: () => (
            <HeaderButton icon="plus" accessibilityLabel="Agregar" onPress={() => navigate('Tarjeta')} />
          ),
        }}
      />
      <Screen>
        {cards.length === 0 ? (
          <Card>
            <Empty
              icon="credit-card-plus-outline"
              title="Agregá tus tarjetas"
              text="Con el día de cierre y vencimiento, Mango ubica cada cuota en el resumen correcto."
              action="Agregar tarjeta"
              onAction={() => navigate('Tarjeta')}
            />
          </Card>
        ) : (
          <>
            {/* Las tarjetas, dibujadas como plásticos */}
            <View style={{ gap: space.md }}>
              {cards.map((c) => {
                const active = purchases.filter(
                  (p) => p.cardId === c.id && Object.keys(p.paid ?? {}).length < p.installments,
                ).length;
                return (
                  <CreditCard
                    key={c.id}
                    card={c}
                    active={active}
                    onPress={() => navigate('Tarjeta', { id: c.id })}
                  />
                );
              })}
            </View>

            {/* Próximos resúmenes, agrupados por tarjeta */}
            <View style={styles.section}>
              <Label>Próximos resúmenes</Label>
              <View style={{ gap: space.md }}>
                {cards.map((c) => {
                  const rows = periods.map((p) => statement(c, p));
                  const nextIdx = rows.findIndex((r) => r.due >= hoy && !r.empty && !r.paid);
                  return (
                    <Card key={c.id} style={{ paddingVertical: space.xs }}>
                      {cards.length > 1 ? (
                        <View style={styles.groupHead}>
                          <View style={[styles.dot, { backgroundColor: c.color }]} />
                          <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
                            {c.name}
                          </Text>
                        </View>
                      ) : null}
                      {rows.map((r, i) => (
                        <View key={r.p}>
                          {i > 0 || cards.length > 1 ? <Divider /> : null}
                          <PressableScale
                            onPress={() => navigate('Compromisos')}
                            scaleTo={0.985}
                            style={styles.row}
                          >
                            <View
                              style={[
                                styles.month,
                                i === nextIdx && {
                                  backgroundColor: c.color + '1F',
                                  borderColor: c.color + '66',
                                },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name="receipt-text-outline"
                                size={20}
                                color={i === nextIdx ? c.color : palette.textSecondary}
                              />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                                <Text variant="bodyLarge" style={{ fontFamily: 'Inter_500Medium' }}>
                                  {periodLabel(r.p, false)}
                                </Text>
                                {i === nextIdx ? <Pill label="Próximo" color={c.color} /> : null}
                                {r.paid ? <Pill label="Pagado" color={palette.income} icon="check" /> : null}
                              </View>
                              <Text
                                variant="bodySmall"
                                style={{ color: palette.textSecondary, marginTop: 1 }}
                              >
                                {r.due === hoy
                                  ? 'Vence hoy'
                                  : `${r.due < hoy ? 'Venció' : 'Vence'} el ${dateLabel(r.due).toLowerCase()}`}
                              </Text>
                            </View>
                            <Text
                              variant={r.empty ? 'bodyMedium' : 'titleMedium'}
                              style={[styles.num, { color: r.empty ? palette.textDisabled : palette.text }]}
                            >
                              {r.empty ? 'Sin consumos' : r.label}
                            </Text>
                          </PressableScale>
                        </View>
                      ))}
                    </Card>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  month: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceHigh,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  num: { fontVariant: ['tabular-nums'] },
});