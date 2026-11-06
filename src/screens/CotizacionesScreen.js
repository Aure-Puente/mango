import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Segmented } from '@/components/fields';
import { Card, Divider, Empty, IconBubble, Label, Pill, Screen } from '@/components/ui';
import { useFinance } from '@/hooks/useFinance';
import { formatMoney, percent } from '@/lib/money';
import { RATE_LABEL } from '@/lib/rates';
import { palette, radius, space } from '@/theme';

/** Nombre, ícono y color de cada tipo de dólar (dolarapi.com → campo "casa") */
const TYPES = {
  oficial: { name: 'Oficial', icon: 'bank-outline', color: palette.info },
  blue: { name: 'Blue', icon: 'cash', color: palette.income },
  bolsa: { name: 'MEP', icon: 'chart-line', color: '#C792EA' },
  contadoconliqui: { name: 'CCL', icon: 'swap-horizontal', color: '#60A5FA' },
  mayorista: { name: 'Mayorista', icon: 'domain', color: '#A1A1AA' },
  cripto: { name: 'Cripto', icon: 'bitcoin', color: palette.warning },
  tarjeta: { name: 'Tarjeta', icon: 'credit-card-outline', color: '#F472B6' },
};
const typeOf = (q) => TYPES[q.casa] ?? { name: q.nombre, icon: 'currency-usd', color: palette.textSecondary };

const ars = (v) => (v ? formatMoney(Math.round(v * 100), 'ARS') : '—');
const when = (iso) =>
  iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : null;

/** Brecha contra el oficial: "+30%", "−1%", "≈ 0%" */
function gapLabel(q, oficial) {
  if (!oficial?.venta || q.casa === 'oficial' || !q.venta) return null;
  const g = q.venta / oficial.venta - 1;
  if (Math.abs(g) < 0.005) return '≈ 0%';
  return `${g > 0 ? '+' : '−'}${percent(Math.abs(g))}`;
}

export default function Quotes() {
  const { market, settings, updateSettings } = useFinance();
  const quotes = market.quotes;
  const oficial = quotes.find((q) => q.casa === 'oficial');
  const selected = quotes.find((q) => q.casa === settings.rateType) ?? oficial ?? quotes[0];
  const others = quotes.filter((q) => q !== selected);
  const selectable = (q) => Object.keys(RATE_LABEL).includes(q.casa);

  if (quotes.length === 0) {
    return (
      <Screen refreshing={market.loading} onRefresh={market.refresh}>
        <Card>
          <Empty
            icon="wifi-off"
            title="Sin cotizaciones"
            text={market.error ?? 'Deslizá hacia abajo para reintentar.'}
          />
        </Card>
      </Screen>
    );
  }

  const t = typeOf(selected);
  const gap = gapLabel(selected, oficial);

  return (
    <Screen refreshing={market.loading} onRefresh={market.refresh}>
      {/* El dólar que usa la app para convertir */}
      <Card style={styles.hero}>
        <LinearGradient
          pointerEvents="none"
          colors={[palette.primary + '26', palette.primary + '00']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.25, y: 0.85 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <IconBubble icon={t.icon} color={palette.primary} size={32} />
          <Text variant="labelLarge" style={{ color: palette.textSecondary, flex: 1 }}>
            Dólar {t.name}
          </Text>
          <Pill label="El que usás" color={palette.primary} icon="check" />
        </View>
        <Text variant="displayMedium" style={styles.heroValue} adjustsFontSizeToFit numberOfLines={1}>
          {ars(selected.venta)}
        </Text>
        <View style={styles.heroStats}>
          <HeroStat label="Compra" value={ars(selected.compra)} />
          <View style={styles.vline} />
          <HeroStat label="Venta" value={ars(selected.venta)} />
          {gap ? (
            <>
              <View style={styles.vline} />
              <HeroStat label="Brecha" value={gap} />
            </>
          ) : null}
        </View>
      </Card>

      {/* El resto, en columnas Compra | Venta para comparar de un vistazo */}
      <View style={styles.section}>
        <Label>Otras cotizaciones</Label>
        <Card style={{ paddingVertical: space.xs }}>
          <View style={styles.headRow}>
            <Text variant="labelSmall" style={[styles.head, { flex: 1 }]}>
              Tipo · brecha
            </Text>
            <Text variant="labelSmall" style={[styles.head, styles.col]}>
              Compra
            </Text>
            <Text variant="labelSmall" style={[styles.head, styles.col]}>
              Venta
            </Text>
          </View>
          {others.map((q, i) => {
            const ty = typeOf(q);
            const g = gapLabel(q, oficial);
            const canUse = selectable(q);
            return (
              <View key={q.casa}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={canUse ? () => updateSettings({ rateType: q.casa }) : undefined}
                  disabled={!canUse}
                  accessibilityRole={canUse ? 'button' : undefined}
                  accessibilityHint={canUse ? 'Usar este dólar para convertir' : undefined}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.55 }]}
                >
                  <IconBubble icon={ty.icon} color={ty.color} size={36} />
                  <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    <Text variant="bodyLarge" numberOfLines={1} style={{ fontFamily: 'Inter_500Medium' }}>
                      {ty.name}
                    </Text>
                    <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary }}>
                      {g ?? 'Base'}
                      {canUse ? (
                        <Text style={{ color: palette.primary, fontFamily: 'Inter_600SemiBold' }}>
                          {' '}
                          · Usar
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                  <Text
                    variant="bodyMedium"
                    style={[styles.col, styles.num, { color: palette.textSecondary }]}
                  >
                    {ars(q.compra)}
                  </Text>
                  <Text variant="titleSmall" style={[styles.col, styles.num]}>
                    {ars(q.venta)}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
        {when(quotes[0]?.fechaActualizacion) ? (
          <Text variant="bodySmall" style={styles.footnote}>
            Actualizado {when(quotes[0].fechaActualizacion)} · fuente dolarapi.com
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Label>Dólar para tus cálculos</Label>
        <Card style={{ gap: space.md }}>
          <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
            Se usa para convertir tus dólares a pesos (y al revés) en totales y gráficos.
          </Text>
          <Segmented
            value={settings.rateType}
            onChange={(r) => updateSettings({ rateType: r })}
            options={Object.keys(RATE_LABEL).map((r) => ({
              value: r,
              label: RATE_LABEL[r],
              color: palette.primary,
            }))}
          />
        </Card>
      </View>
    </Screen>
  );
}

function HeroStat({ label, value }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
        {label}
      </Text>
      <Text variant="titleMedium" numberOfLines={1} adjustsFontSizeToFit style={styles.num}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.xl, gap: space.lg, overflow: 'hidden', borderColor: palette.primary + '26' },
  heroValue: { fontVariant: ['tabular-nums'], marginTop: -space.xs },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.border },
  section: { marginTop: space.xl },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: space.md,
    paddingBottom: space.xs,
    paddingLeft: 48,
  },
  head: {
    color: palette.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
  },
  col: { width: 74, textAlign: 'right' },
  num: { fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  footnote: {
    color: palette.textDisabled,
    marginTop: space.md,
    textAlign: 'center',
    borderRadius: radius.sm,
  },
});