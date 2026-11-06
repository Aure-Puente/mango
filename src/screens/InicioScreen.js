import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ACCOUNT_ICON, CommitmentRow, PayDialog, QuickAddFab, TxRow } from '@/components/finance';
import {
  Bar,
  Card,
  Columns,
  Divider,
  Empty,
  HeaderButton,
  FadeIn,
  IconBubble,
  Label,
  PressableScale,
  Screen,
  Skeleton,
} from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/hooks/useFinance';
import { useLayout } from '@/hooks/useLayout';
import { addMonths, currentPeriod, periodLabel } from '@/lib/dates';
import { accountBalances, spendingByCategory, spendingInsight } from '@/lib/finance';
import { formatMoney, percent } from '@/lib/money';
import { RATE_LABEL } from '@/lib/rates';
import { navigate } from '@/navigation/RootNavigation';
import { palette, radius, space } from '@/theme';

// Texto secundario dentro de la tarjeta principal: blanco translúcido en vez del gris frío,
// así toma el tono cálido del fondo y no se ve "sucio" sobre el naranja
const HERO_MUTED = 'rgba(255,255,255,0.62)';

export default function Home() {
  const { user } = useAuth();
  const f = useFinance();
  const { ready, accounts, transactions, categories, goals, settings, market, display, conv, fmt } = f;
  const [paying, setPaying] = useState(null);
  const period = currentPeriod();
  const { twoCol } = useLayout(true);

  const summary = f.summary(period);
  const commitments = f.commitments(period);
  const upcoming = commitments.filter((c) => !c.paid).slice(0, 4);

  const balances = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const visibleAccounts = accounts.filter((a) => !a.archived);
  const total = visibleAccounts.reduce((s, a) => s + conv(balances[a.id] ?? 0, a.currency), 0);

  const insight = useMemo(() => {
    const prev = [1, 2, 3].map((i) => {
      const p = addMonths(period, -i);
      return Math.round(
        f.summary(p).expense *
          (settings.inflationAdjust ? market.realFactor(p) / market.realFactor(period) : 1),
      );
    });
    return spendingInsight(summary.expense + summary.pendingExpense, prev);
  }, [f, period, summary.expense, summary.pendingExpense, settings.inflationAdjust, market]);

  const budgetAlerts = useMemo(
    () =>
      spendingByCategory(period, transactions, categories, conv, display, market.rate).filter(
        (r) => r.ratio != null && r.ratio >= 0.8,
      ),
    [period, transactions, categories, conv, display, market.rate],
  );

  const name = (user?.displayName ?? '').split(' ')[0];
  if (!ready) return <HomeSkeleton name={name} period={period} twoCol={twoCol} />;
  const positive = summary.projected >= 0;

  return (
    <View style={{ flex: 1 }}>
      <Screen
        title={name ? `Hola, ${name}` : 'Hola'}
        subtitle={periodLabel(period)}
        right={
          <HeaderButton
            icon="cog-outline"
            filled
            accessibilityLabel="Ajustes"
            onPress={() => navigate('Ajustes')}
          />
        }
        refreshing={market.loading}
        onRefresh={market.refresh}
        bottomInset={128}
        wide
      >
        <Columns
          left={
            <>
              {/* Lo que queda */}
              <Card style={styles.hero}>
                <LinearGradient
                  pointerEvents="none"
                  colors={[palette.primary + '1F', palette.primary + '00']}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0.35, y: 0.7 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="labelLarge" style={{ color: HERO_MUTED }}>
                    Te queda este mes
                  </Text>
                  <PressableScale
                    onPress={() => f.updateSettings({ displayCurrency: display === 'ARS' ? 'USD' : 'ARS' })}
                    hitSlop={8}
                    scaleTo={0.92}
                  >
                    <View style={styles.curChip}>
                      <MaterialCommunityIcons name="swap-horizontal" size={12} color={palette.text} />
                      <Text
                        variant="labelSmall"
                        style={{ color: palette.text, fontFamily: 'Inter_600SemiBold' }}
                      >
                        {display === 'ARS' ? 'ARS' : 'USD'}
                      </Text>
                    </View>
                  </PressableScale>
                </View>
                <Text
                  variant="displayMedium"
                  style={{
                    color: positive ? palette.text : palette.expense,
                    fontVariant: ['tabular-nums'],
                    marginTop: -space.xs,
                  }}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {fmt(summary.projected)}
                </Text>
                <View style={styles.stats}>
                  <Stat
                    label="Ingresos"
                    value={fmt(summary.income + summary.pendingIncome, display, { compact: true })}
                    color={palette.income}
                    icon="arrow-down-left"
                  />
                  <View style={styles.statDivider} />
                  <Stat
                    label="Gastos"
                    value={fmt(summary.expense + summary.pendingExpense, display, { compact: true })}
                    color={palette.expense}
                    icon="arrow-up-right"
                  />
                </View>
                {summary.pendingExpense > 0 || summary.pendingIncome > 0 ? (
                  <Text variant="bodySmall" style={{ color: HERO_MUTED }}>
                    Incluye {fmt(summary.pendingExpense)} de fijos y cuotas por pagar
                    {summary.pendingIncome > 0 ? ` y ${fmt(summary.pendingIncome)} por cobrar` : ''}.
                  </Text>
                ) : null}
                {summary.savingsRate != null ? (
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="bodySmall" style={{ color: HERO_MUTED }}>
                        Tasa de ahorro
                      </Text>
                      <Text
                        variant="labelMedium"
                        style={{ color: summary.savingsRate >= 0 ? palette.income : palette.expense }}
                      >
                        {percent(summary.savingsRate)}
                      </Text>
                    </View>
                    <Bar value={Math.max(0, summary.savingsRate)} color={palette.income} warnAt={null} />
                  </View>
                ) : null}
              </Card>

              {/* Alertas */}
              {insight && insight.level !== 'ok' ? (
                <Alert
                  tone={insight.level === 'high' ? 'error' : 'warn'}
                  icon="trending-up"
                  title={
                    insight.level === 'high'
                      ? 'Estás gastando bastante más que de costumbre'
                      : 'Venís gastando un poco más'
                  }
                  text={`Este mes llevás ${percent(insight.ratio - 1)} más que tu promedio de los últimos 3 meses (${fmt(insight.average)}).`}
                  onPress={() => navigate('Analisis')}
                />
              ) : null}
              {budgetAlerts.map((b) => (
                <Alert
                  key={b.category?.id ?? 'x'}
                  tone={b.ratio >= 1 ? 'error' : 'warn'}
                  icon="alert-circle-outline"
                  title={`${b.category?.name}: ${b.ratio >= 1 ? 'te pasaste del presupuesto' : `usaste el ${percent(b.ratio)}`}`}
                  text={`${fmt(b.amount)} de ${fmt(b.budget)}`}
                  onPress={() => navigate('Categorias')}
                />
              ))}

              {/* Cuentas */}
              <Block label="Tus cuentas" action="Ver todas" onAction={() => navigate('Cuentas')}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -space.lg }}
                  contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingRight: space.xl,
                    gap: space.md,
                  }}
                >
                  <View style={[styles.account, styles.accountTotal]}>
                    <IconBubble icon="sigma" color={palette.primary} size={32} />
                    <Text variant="bodySmall" style={[styles.accountName, { color: palette.primary }]}>
                      Total
                    </Text>
                    <Text variant="titleMedium" numberOfLines={1} style={styles.accountAmount}>
                      {fmt(total, display, { compact: true })}
                    </Text>
                  </View>
                  {visibleAccounts.map((a) => (
                    <PressableScale
                      key={a.id}
                      style={styles.account}
                      scaleTo={0.96}
                      onPress={() => navigate('Movimientos', { account: a.id })}
                    >
                      <IconBubble icon={ACCOUNT_ICON[a.type]} color={a.color} size={32} />
                      <Text variant="bodySmall" numberOfLines={1} style={styles.accountName}>
                        {a.name}
                      </Text>
                      <Text variant="titleMedium" numberOfLines={1} style={styles.accountAmount}>
                        {formatMoney(balances[a.id] ?? 0, a.currency, { compact: true })}
                      </Text>
                    </PressableScale>
                  ))}
                </ScrollView>
                {market.quote ? (
                  <Pressable
                    onPress={() => navigate('Cotizaciones')}
                    style={({ pressed }) => [styles.quote, pressed && { opacity: 0.6 }]}
                  >
                    <View style={styles.quoteDot}>
                      <MaterialCommunityIcons name="currency-usd" size={14} color={palette.income} />
                    </View>
                    <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
                      Dólar {RATE_LABEL[settings.rateType]}
                    </Text>
                    <Text variant="labelLarge" style={{ fontVariant: ['tabular-nums'] }}>
                      {formatMoney(market.quote.venta * 100, 'ARS')}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textDisabled} />
                  </Pressable>
                ) : null}
              </Block>
            </>
          }
          right={
            <>
              {/* Vencimientos */}
              <Block
                label="Próximos vencimientos"
                action="Ver mes"
                onAction={() => navigate('Compromisos')}
                style={twoCol ? { marginTop: 0 } : undefined}
              >
                <Card style={{ paddingVertical: space.xs }}>
                  {upcoming.length === 0 ? (
                    <Text
                      variant="bodyMedium"
                      style={{ color: palette.textSecondary, paddingVertical: space.lg, textAlign: 'center' }}
                    >
                      {commitments.length ? 'Todo pagado este mes 🎉' : 'No tenés fijos ni cuotas cargados.'}
                    </Text>
                  ) : (
                    upcoming.map((c, i) => (
                      <View key={c.key}>
                        {i > 0 ? <Divider /> : null}
                        <CommitmentRow c={c} compact onPress={() => setPaying([c])} />
                      </View>
                    ))
                  )}
                </Card>
              </Block>

              {/* Metas */}
              {goals.length > 0 ? (
                <Block label="Metas" action="Ver" onAction={() => navigate('Metas')}>
                  <Card style={{ gap: space.lg }}>
                    {goals.slice(0, 3).map((g) => {
                      const ratio = g.target ? Math.min(1, g.saved / g.target) : 0;
                      return (
                        <Pressable
                          key={g.id}
                          onPress={() => navigate('Metas')}
                          style={({ pressed }) => [{ gap: space.sm }, pressed && { opacity: 0.6 }]}
                        >
                          <View style={styles.goalHead}>
                            <View style={[styles.goalDot, { backgroundColor: g.color }]} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                variant="bodyMedium"
                                numberOfLines={1}
                                style={{ fontFamily: 'Inter_500Medium' }}
                              >
                                {g.name}
                              </Text>
                              <Text
                                variant="bodySmall"
                                numberOfLines={1}
                                style={{ color: g.saved ? palette.textSecondary : palette.textDisabled }}
                              >
                                {g.saved
                                  ? `${formatMoney(g.saved, g.currency, { compact: true })} de ${formatMoney(g.target, g.currency, { compact: true })}`
                                  : 'Empezá con tu primer aporte'}
                              </Text>
                            </View>
                            <Text
                              variant="labelMedium"
                              style={{ color: ratio >= 1 ? palette.income : palette.textSecondary }}
                            >
                              {ratio >= 1 ? '¡Lista!' : percent(ratio)}
                            </Text>
                          </View>
                          {g.saved ? <Bar value={ratio} color={g.color} warnAt={null} /> : null}
                        </Pressable>
                      );
                    })}
                  </Card>
                </Block>
              ) : null}

              {/* Últimos movimientos */}
              <Block label="Últimos movimientos" action="Ver todos" onAction={() => navigate('Movimientos')}>
                <Card style={{ paddingVertical: space.xs }}>
                  {transactions.length === 0 ? (
                    <Empty
                      icon="tray-arrow-down"
                      title="Todavía no cargaste nada"
                      text="Tocá el + para cargar tu primer ingreso o gasto."
                    />
                  ) : (
                    transactions.slice(0, 6).map((t, i) => (
                      <View key={t.id}>
                        {i > 0 ? <Divider /> : null}
                        <TxRow tx={t} compact />
                      </View>
                    ))
                  )}
                </Card>
              </Block>
            </>
          }
        />
      </Screen>
      <QuickAddFab />
      <PayDialog items={paying} onDismiss={() => setPaying(null)} />
    </View>
  );
}

/**
 * Esqueleto de Inicio mientras llegan los datos: el mismo encabezado real (saludo, mes y Ajustes),
 * las mismas columnas en tablet y cada bloque con la forma exacta de lo que va a aparecer.
 */
function HomeSkeleton({ name, period, twoCol }) {
  return (
    <View style={{ flex: 1 }}>
      <Screen
        title={name ? `Hola, ${name}` : 'Hola'}
        subtitle={periodLabel(period)}
        right={
          <HeaderButton
            icon="cog-outline"
            filled
            accessibilityLabel="Ajustes"
            onPress={() => navigate('Ajustes')}
          />
        }
        bottomInset={128}
        wide
      >
        <Columns
          left={
            <>
              {/* Tarjeta principal: título + chip de moneda, monto, ingresos | gastos, aclaración y ahorro */}
              <Card style={styles.hero}>
                <LinearGradient
                  pointerEvents="none"
                  colors={[palette.primary + '1F', palette.primary + '00']}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0.35, y: 0.7 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.between}>
                  <Skeleton width={128} height={14} />
                  <Skeleton width={56} height={24} radius={12} />
                </View>
                <Skeleton width="64%" height={48} radius={12} style={{ marginTop: -space.xs }} />
                <View style={styles.stats}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={74} height={12} />
                    <Skeleton width="55%" height={18} />
                  </View>
                  <View style={styles.statDivider} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={64} height={12} />
                    <Skeleton width="50%" height={18} />
                  </View>
                </View>
                <Skeleton width="88%" height={12} />
                <View style={{ gap: 6 }}>
                  <View style={styles.between}>
                    <Skeleton width={96} height={12} />
                    <Skeleton width={32} height={12} />
                  </View>
                  <Skeleton height={6} radius={3} />
                </View>
              </Card>

              {/* Cuentas: la fila sale del borde igual que la real; la primera es "Total" */}
              <View style={{ marginTop: space.xl }}>
                <SkeletonLabel title={100} action={72} />
                <View style={styles.skAccounts}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.account, i === 0 && styles.accountTotal]}>
                      <Skeleton width={32} height={32} radius={10} />
                      <Skeleton width={i === 0 ? 36 : 84} height={12} style={{ marginTop: space.lg }} />
                      <Skeleton width={i === 0 ? 70 : 62} height={18} style={{ marginTop: 4 }} />
                    </View>
                  ))}
                </View>
                {/* Dólar: punto, nombre, valor y flecha */}
                <View style={styles.quote}>
                  <Skeleton width={22} height={22} radius={11} />
                  <View style={{ flex: 1 }}>
                    <Skeleton width={84} height={12} />
                  </View>
                  <Skeleton width={64} height={14} />
                  <Skeleton width={10} height={10} radius={5} />
                </View>
              </View>
            </>
          }
          right={
            <>
              {/* Vencimientos: monto y "en X días" a la derecha, en dos líneas */}
              <View style={{ marginTop: twoCol ? 0 : space.xl }}>
                <SkeletonLabel title={170} action={64} />
                <Card style={{ paddingVertical: space.xs }}>
                  {[0, 1, 2].map((i) => (
                    <SkRow key={i} i={i} rightSub />
                  ))}
                </Card>
              </View>

              {/* Metas: punto, nombre y "$ X de $ Y", porcentaje y barra */}
              <View style={{ marginTop: space.xl }}>
                <SkeletonLabel title={52} action={30} />
                <Card style={{ gap: space.lg }}>
                  {[0, 1].map((i) => (
                    <View key={i} style={{ gap: space.sm }}>
                      <View style={styles.goalHead}>
                        <Skeleton width={8} height={8} radius={4} />
                        <View style={{ flex: 1, gap: 6 }}>
                          <Skeleton width={i ? 96 : 120} height={13} />
                          <Skeleton width={110} height={11} />
                        </View>
                        <Skeleton width={30} height={12} />
                      </View>
                      <Skeleton height={6} radius={3} />
                    </View>
                  ))}
                </Card>
              </View>

              {/* Últimos movimientos: las mismas 6 filas */}
              <View style={{ marginTop: space.xl }}>
                <SkeletonLabel title={150} action={72} />
                <Card style={{ paddingVertical: space.xs }}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <SkRow key={i} i={i} />
                  ))}
                </Card>
              </View>
            </>
          }
        />
      </Screen>
      <QuickAddFab />
    </View>
  );
}

/** Fila con la misma medida que Row: ícono 40, título + subtítulo y monto (con 2ª línea opcional) */
function SkRow({ i, rightSub }) {
  return (
    <View>
      {i > 0 ? <Divider /> : null}
      <View style={styles.skRow}>
        <Skeleton width={40} height={40} radius={13} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width={`${48 + ((i * 17) % 30)}%`} height={14} />
          <Skeleton width={`${30 + ((i * 11) % 20)}%`} height={11} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Skeleton width={68 + ((i * 13) % 20)} height={15} />
          {rightSub ? <Skeleton width={52} height={11} /> : null}
        </View>
      </View>
    </View>
  );
}

function SkeletonLabel({ title = 130, action = 60 }) {
  return (
    <View style={[styles.between, { marginBottom: space.sm }]}>
      <Skeleton width={title} height={11} />
      <Skeleton width={action} height={11} />
    </View>
  );
}

/** Sección con rótulo en mayúscula y acción "Ver ›" a la derecha */
function Block({ label, action, onAction, style, children }) {
  return (
    <FadeIn delay={70} style={[{ marginTop: space.xl }, style]}>
      <View style={styles.blockHead}>
        <Label>{label}</Label>
        {action ? (
          <Pressable
            onPress={onAction}
            hitSlop={10}
            style={({ pressed }) => [styles.blockAction, pressed && { opacity: 0.5 }]}
          >
            <Text variant="labelMedium" style={{ color: palette.textSecondary }}>
              {action}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={palette.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </FadeIn>
  );
}

function Stat({ label, value, color, icon }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialCommunityIcons name={icon} size={14} color={color} />
        <Text variant="bodySmall" style={{ color: HERO_MUTED }}>
          {label}
        </Text>
      </View>
      <Text variant="titleMedium" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

/** Aviso sutil: tarjeta neutra, el tono lo marcan solo el ícono y una línea de color a la izquierda */
function Alert({ tone, icon, title, text, onPress }) {
  const c = tone === 'error' ? palette.expense : palette.warning;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.alert}>
      <View style={[styles.alertAccent, { backgroundColor: c }]} />
      <IconBubble icon={icon} color={c} size={34} />
      <View style={{ flex: 1 }}>
        <Text variant="titleSmall">{title}</Text>
        <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: 2 }}>
          {text}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textDisabled} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.xl, gap: space.lg, overflow: 'hidden', borderColor: palette.primary + '26' },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.border },
  account: {
    width: 148,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: space.lg,
  },
  accountTotal: { borderColor: palette.primary + '55' },
  accountName: { color: palette.textSecondary, marginTop: space.lg },
  accountAmount: { marginTop: 2, fontVariant: ['tabular-nums'] },
  alert: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: space.lg,
    paddingLeft: space.lg + 4,
    marginTop: space.md,
    overflow: 'hidden',
  },
  alertAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  quote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  quoteDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.income + '1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  curChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  skAccounts: {
    flexDirection: 'row',
    gap: space.md,
    overflow: 'hidden',
    marginHorizontal: -space.lg,
    paddingHorizontal: space.lg,
  },
  skRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  blockAction: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: -1 },
});