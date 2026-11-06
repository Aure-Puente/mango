import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { Text } from 'react-native-paper';
import { Group, MonthSwitcher, Segmented, SwitchRow } from '@/components/fields';
import { Bar, Card, Columns, Empty, FadeIn, IconBubble, Label, Pill, Screen } from '@/components/ui';
import { useFinance } from '@/hooks/useFinance';
import { useLayout } from '@/hooks/useLayout';
import { addMonths, currentPeriod, periodLabel, periodRange, periodShort } from '@/lib/dates';
import { netWorthSeries, projection, purchaseProgress, spendingByCategory } from '@/lib/finance';
import { formatMoney, percent } from '@/lib/money';
import { navigate } from '@/navigation/RootNavigation';
import { chartColors, palette, space } from '@/theme';

/** Padding de <Card> (ver ui.jsx): se descuenta del ancho de los gráficos */
const CARD_PAD = space.lg + 4;

// Función (no objeto compartido): gifted-charts clona y muta los estilos, y React Native
// congela en desarrollo los estilos que ya usó, así que cada uso necesita un objeto nuevo.
const axisText = () => ({ color: palette.textSecondary, fontSize: 10, fontFamily: 'Inter_400Regular' });

/** Paso "redondo" para el eje Y (1, 1.5, 2, 2.5, 3, 5… × 10ⁿ): así las marcas son 0 · 1k · 2k · 3k */
function niceStep(raw) {
  if (!raw || raw <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  const nice = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => n <= x) ?? 10;
  return nice * p;
}
/** Escala del eje Y con `sections` marcas redondas que cubren `max` */
function niceScale(max, sections) {
  const step = niceStep(max / sections);
  return { maxValue: step * sections, stepValue: step, noOfSections: sections };
}

export default function Analysis() {
  const f = useFinance();
  const { colWidth } = useLayout(true);
  const { settings, market, display, conv, fmt } = f;
  // Ancho útil del gráfico: columna - padding de la tarjeta - etiquetas del eje Y
  const chartW = colWidth - CARD_PAD * 2 - 44;

  // 'mes' (predeterminado) = solo el mes actual; '6' / '12' = últimos meses
  const [months, setMonths] = useState('mes');
  const isMonth = months === 'mes';
  const span = isMonth ? 1 : Number(months);
  const [catPeriod, setCatPeriod] = useState(currentPeriod());
  const [nwCur, setNwCur] = useState('USD');
  const [projSel, setProjSel] = useState(null);

  const now = currentPeriod();
  const periods = useMemo(() => periodRange(addMonths(now, -(span - 1)), now), [now, span]);
  // El patrimonio siempre muestra una evolución: con 'Este mes' usamos los últimos 6
  const nwSpan = isMonth ? 6 : span;
  const nwPeriods = useMemo(() => periodRange(addMonths(now, -(nwSpan - 1)), now), [now, nwSpan]);
  // La inflación solo tiene sentido al comparar meses
  const adjust = settings.inflationAdjust && display === 'ARS' && !isMonth;
  const k = (p) => (adjust ? market.realFactor(p) : 1);

  /* Ingresos vs gastos */
  const monthly = useMemo(
    () =>
      periods.map((p) => {
        const s = f.summary(p);
        // Meses pasados: solo lo real. Mes actual: real + pendiente.
        const isNow = p === now;
        const inc = Math.round((s.income + (isNow ? s.pendingIncome : 0)) * k(p));
        const exp = Math.round((s.expense + (isNow ? s.pendingExpense : 0)) * k(p));
        return { p, inc, exp, save: inc - exp };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periods, f.summary, adjust, market.realFactor],
  );

  const withData = monthly.filter((m) => m.inc || m.exp);
  const avgSave = withData.length
    ? Math.round(withData.reduce((s, m) => s + m.save, 0) / withData.length)
    : 0;
  const totInc = withData.reduce((s, m) => s + m.inc, 0);
  const avgRate = totInc ? withData.reduce((s, m) => s + m.save, 0) / totInc : null;
  const best = withData.reduce((b, m) => (!b || m.save > b.save ? m : b), null);

  /* Este mes: lo cargado + lo pendiente, y comparación con el promedio de los 3 meses anteriores */
  const cur = monthly[monthly.length - 1] ?? { inc: 0, exp: 0, save: 0 };
  const curSummary = f.summary(now);
  const curRate = cur.inc ? cur.save / cur.inc : null;
  const prevExp = [1, 2, 3]
    .map((i) => {
      const p = addMonths(now, -i);
      return Math.round(f.summary(p).expense * k(p));
    })
    .filter((v) => v > 0);
  const prevAvg = prevExp.length ? Math.round(prevExp.reduce((a, b) => a + b, 0) / prevExp.length) : 0;
  const vsAvg = prevAvg && cur.exp ? cur.exp / prevAvg - 1 : null;
  // Gasto real (sin lo pendiente) dividido por los días que van del mes
  const daily = Math.round((curSummary.expense * k(now)) / new Date().getDate());

  // Los gráficos arrancan en el primer mes con datos (sin meses vacíos adelante)
  const firstIdx = monthly.findIndex((m) => m.inc || m.exp);
  const chartMonths = firstIdx >= 0 ? monthly.slice(firstIdx) : [];
  const fewMonths = !isMonth && chartMonths.length > 0 && chartMonths.length < 3;

  // Con 12 meses, una etiqueta cada dos para que no se pisen
  const showLabel = (i) => chartMonths.length <= 6 || i % 2 === (chartMonths.length - 1) % 2;
  const barData = chartMonths.flatMap((m, i) => [
    {
      value: m.inc / 100,
      frontColor: palette.income,
      spacing: 3,
      label: showLabel(i) ? periodShort(m.p) : '',
      labelWidth: 40,
      labelTextStyle: axisText(),
    },
    { value: m.exp / 100, frontColor: palette.expense },
  ]);
  const saveData = chartMonths.map((m, i) => ({
    value: m.save / 100,
    frontColor: m.save >= 0 ? palette.income : palette.expense,
    label: showLabel(i) ? periodShort(m.p) : '',
    labelWidth: 44,
    labelTextStyle: axisText(),
  }));
  // Ancho de barra para que entren todos los meses (par de barras + separación) sin cortarse
  const barW = Math.max(
    3.5,
    Math.min(
      16,
      (chartW - 48 - 3 * Math.max(1, chartMonths.length)) / (Math.max(1, chartMonths.length) * 3.4),
    ),
  );
  // Espacio entre grupos para que las barras ocupen todo el ancho (en tablets la tarjeta es más ancha)
  const n = Math.max(1, chartMonths.length);
  // Se descuenta el espacio inicial (8) y un margen final para que la última barra no se corte
  const pairSpacing = Math.max(barW * 1.4, (chartW - 48 - n * (barW * 2 + 3)) / n);
  const saveSpacing = Math.max(barW * 1.6, (chartW - 48 - n * barW * 1.6) / n);

  /* Categorías */
  const cats = useMemo(
    () => spendingByCategory(catPeriod, f.transactions, f.categories, conv, display, market.rate),
    [catPeriod, f.transactions, f.categories, conv, display, market.rate],
  );
  const catTotal = cats.reduce((s, c) => s + c.amount, 0);
  // Mes anterior, para comparar cada categoría (▲ 12% / ▼ 5%)
  const prevCats = useMemo(() => {
    const rows = spendingByCategory(
      addMonths(catPeriod, -1),
      f.transactions,
      f.categories,
      conv,
      display,
      market.rate,
    );
    return new Map(rows.filter((r) => r.category).map((r) => [r.category.id, r.amount]));
  }, [catPeriod, f.transactions, f.categories, conv, display, market.rate]);
  const pie = cats
    .filter((c) => c.amount > 0)
    .map((c, i) => ({
      value: c.amount,
      color: c.category?.color ?? chartColors[i % chartColors.length],
    }));

  /* Patrimonio */
  const nw = useMemo(
    () => netWorthSeries(nwPeriods, f.accounts, f.transactions, (p) => market.rateFor(p)),
    [nwPeriods, f.accounts, f.transactions, market],
  );
  const nwData = nw.map((n) => ({
    value: (nwCur === 'USD' ? n.usd : n.ars) / 100,
    label: periodShort(n.period),
    labelWidth: 44,
    labelTextStyle: { ...axisText(), textAlign: 'center' },
  }));
  const nwMin = Math.min(0, ...nwData.map((d) => d.value));
  const nwScale = nwMin < 0 ? {} : niceScale(Math.max(1, ...nwData.map((d) => d.value)), 3);
  // Margen a los costados para que las fechas de las puntas no se corten
  const NW_EDGE = 22;
  const nwLast = nw[nw.length - 1];
  const nwFirst = nw.find((n) => n.ars !== 0) ?? nw[0];
  const nwDelta =
    nwLast && nwFirst ? (nwCur === 'USD' ? nwLast.usd - nwFirst.usd : nwLast.ars - nwFirst.ars) : 0;

  /* Proyección */
  const proj = useMemo(
    () => projection(addMonths(now, 1), 6, f.recurring, f.purchases, f.cards, conv),
    [now, f.recurring, f.purchases, f.cards, conv],
  );
  const projMax = Math.max(1, ...proj.map((r) => r.committedExpense));
  const projTotal = proj.reduce((s, r) => s + r.committedExpense, 0);
  const projData = proj.map((r, i) => {
    const dim = projSel != null && projSel !== i;
    const pick = () => setProjSel(projSel === i ? null : i);
    return {
      stacks: [
        { value: r.fixed / 100, color: palette.info + (dim ? '55' : ''), onPress: pick },
        {
          value: r.installments / 100,
          color: palette.primary + (dim ? '55' : ''),
          marginBottom: 2,
          onPress: pick,
        },
      ],
      label: periodShort(r.period),
      labelWidth: 44,
      labelTextStyle: {
        ...axisText(),
        textAlign: 'center',
        color: projSel === i ? palette.text : palette.textSecondary,
      },
      onPress: pick,
    };
  });
  const projScale = niceScale(projMax / 100, 4);

  // Qué cuotas terminan en cada mes (para explicar las bajas del gráfico)
  const endsBy = new Map();
  for (const p of f.purchases) {
    const pr = purchaseProgress(p);
    if (pr.done) continue;
    const arr = endsBy.get(pr.lastPeriod) ?? [];
    arr.push(p.description);
    endsBy.set(pr.lastPeriod, arr);
  }
  const listNames = (arr) =>
    arr.length <= 2 ? arr.join(' y ') : `${arr.slice(0, 2).join(', ')} y ${arr.length - 2} más`;
  // Meses en que lo comprometido baja porque termina alguna cuota
  const drops = proj
    .map((r, i) => {
      const prev = i === 0 ? null : proj[i - 1];
      const ended = endsBy.get(addMonths(r.period, -1));
      if (!prev || !ended || r.committedExpense >= prev.committedExpense * 0.97) return null;
      return { r, ended };
    })
    .filter(Boolean)
    .slice(0, 2);
  const sel = projSel != null ? proj[projSel] : null;

  const yLabel = (v) => {
    const n = Number(v);
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
    return String(Math.round(n));
  };

  const common = {
    width: chartW,
    noOfSections: 4,
    yAxisThickness: 0,
    xAxisThickness: 0,
    rulesColor: palette.border,
    rulesLength: chartW,
    rulesType: 'dashed',
    dashWidth: 3,
    dashGap: 5,
    yAxisTextStyle: axisText(),
    yAxisLabelWidth: 36,
    formatYLabel: yLabel,
    isAnimated: true,
  };

  return (
    <Screen
      wide
      title="Análisis"
      subtitle={
        adjust
          ? `Valores ajustados por inflación (pesos de ${market.lastInflationPeriod ? periodLabel(market.lastInflationPeriod) : 'hoy'})`
          : `${isMonth ? `${periodLabel(now)} · ` : ''}En ${display === 'ARS' ? 'pesos' : 'dólares'}`
      }
    >
      <Segmented
        value={months}
        onChange={(v) => {
          setMonths(v);
          setProjSel(null);
        }}
        options={[
          { value: 'mes', label: 'Este mes' },
          { value: '6', label: '6 meses' },
          { value: '12', label: '12 meses' },
        ]}
      />

      {/* Números clave, en una sola tarjeta */}
      <View style={styles.kpis}>
        {isMonth ? (
          <>
            <Kpi label="Por día" value={fmt(daily, display, { compact: true })} />
            <View style={styles.vline} />
            <Kpi
              label="% ahorro"
              value={curRate == null ? '—' : percent(curRate)}
              color={curRate != null && curRate < 0 ? palette.expense : palette.text}
            />
            <View style={styles.vline} />
            {vsAvg == null ? (
              <Kpi label="vs promedio" value="Sin historial" muted />
            ) : (
              <Kpi
                label="vs promedio"
                icon={vsAvg > 0 ? 'trending-up' : 'trending-down'}
                value={`${vsAvg > 0 ? '+' : ''}${percent(vsAvg)}`}
                color={vsAvg > 0.1 ? palette.expense : palette.income}
              />
            )}
          </>
        ) : (
          <>
            <Kpi
              label="Ahorro prom."
              value={fmt(avgSave, display, { compact: true })}
              color={avgSave >= 0 ? palette.income : palette.expense}
            />
            <View style={styles.vline} />
            <Kpi
              label="% ahorro"
              value={avgRate == null ? '—' : percent(avgRate)}
              color={avgRate != null && avgRate < 0 ? palette.expense : palette.text}
            />
            <View style={styles.vline} />
            <Kpi
              label="Mejor mes"
              value={best && withData.length > 1 ? periodShort(best.p) : '—'}
              muted={!(best && withData.length > 1)}
            />
          </>
        )}
      </View>

      <Columns
        left={
          <>
            <Block label="Ingresos vs gastos">
              <Card>
                {withData.length === 0 ? (
                  <Empty
                    icon="chart-bar"
                    title="Todavía no hay datos"
                    text={
                      isMonth
                        ? 'Cuando cargues ingresos y gastos de este mes los vas a ver acá.'
                        : 'Cuando cargues ingresos y gastos vas a ver la evolución acá.'
                    }
                  />
                ) : isMonth ? (
                  <MonthCompare
                    inc={cur.inc}
                    exp={cur.exp}
                    save={cur.save}
                    prevAvg={prevAvg}
                    pendingExp={Math.round(curSummary.pendingExpense * k(now))}
                    pendingInc={Math.round(curSummary.pendingIncome * k(now))}
                    fmt={(v) => fmt(v, display)}
                  />
                ) : (
                  <>
                    <Legend
                      items={[
                        { label: 'Ingresos', color: palette.income },
                        { label: 'Gastos', color: palette.expense },
                      ]}
                    />
                    <BarChart
                      {...common}
                      data={barData}
                      barWidth={barW}
                      spacing={pairSpacing}
                      initialSpacing={8}
                      barBorderRadius={barW / 2.5}
                      height={180}
                    />
                    {fewMonths ? <FewMonths /> : null}
                  </>
                )}
              </Card>
            </Block>

            {withData.length > 0 && !isMonth ? (
              <Block label="Lo que te quedó cada mes">
                <Card>
                  <BarChart
                    {...common}
                    data={saveData}
                    barWidth={barW * 1.6}
                    spacing={saveSpacing}
                    initialSpacing={16}
                    barBorderRadius={barW / 1.6}
                    height={150}
                    noOfSectionsBelowXAxis={chartMonths.some((m) => m.save < 0) ? 1 : 0}
                    xAxisThickness={1}
                    xAxisColor={palette.border}
                  />
                  {fewMonths ? <FewMonths /> : null}
                </Card>
              </Block>
            ) : null}

            {/* Inflación: solo al comparar meses, donde cambia la lectura */}
            {!isMonth ? (
              <View style={{ marginTop: space.md }}>
                <Group>
                  <SwitchRow
                    icon="chart-timeline-variant"
                    label="Ajustar por inflación"
                    description={
                      display === 'USD' ? 'Solo aplica al ver en pesos' : 'Compara meses en términos reales'
                    }
                    value={settings.inflationAdjust}
                    onChange={(v) => f.updateSettings({ inflationAdjust: v })}
                  />
                </Group>
              </View>
            ) : null}

            <Block label="Lo que ya tenés comprometido">
              <Card style={{ gap: space.md }}>
                {projMax <= 1 ? (
                  <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                    No hay fijos ni cuotas para los próximos meses.
                  </Text>
                ) : (
                  <>
                    {/* Total o el mes tocado */}
                    <View style={styles.projHead}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                          {sel ? periodLabel(sel.period) : 'Próximos 6 meses'}
                        </Text>
                        <Text variant="headlineSmall" style={styles.num}>
                          {fmt(sel ? sel.committedExpense : projTotal, display)}
                        </Text>
                      </View>
                      {sel ? (
                        <Pressable onPress={() => setProjSel(null)} hitSlop={10}>
                          <Text variant="labelMedium" style={{ color: palette.textSecondary }}>
                            Ver total
                          </Text>
                        </Pressable>
                      ) : (
                        <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                          ≈ {fmt(Math.round(projTotal / proj.length), display, { compact: true })} por mes
                        </Text>
                      )}
                    </View>
                    <Legend
                      items={[
                        {
                          label: sel ? `Fijos ${fmt(sel.fixed, display, { compact: true })}` : 'Fijos',
                          color: palette.info,
                        },
                        {
                          label: sel
                            ? `Cuotas ${fmt(sel.installments, display, { compact: true })}`
                            : 'Cuotas',
                          color: palette.primary,
                        },
                      ]}
                    />
                    <BarChart
                      {...common}
                      {...projScale}
                      stackData={projData}
                      barWidth={22}
                      spacing={(chartW - 60 - proj.length * 22) / Math.max(1, proj.length - 1)}
                      initialSpacing={16}
                      endSpacing={18}
                      barBorderRadius={6}
                      height={150}
                      onPress={(_, i) => setProjSel(projSel === i ? null : i)}
                    />
                    {sel && endsBy.get(sel.period) ? (
                      <Insight icon="flag-checkered">
                        En {periodLabel(sel.period, false).toLowerCase()} pagás la última cuota de{' '}
                        {listNames(endsBy.get(sel.period))}.
                      </Insight>
                    ) : null}
                    {!sel
                      ? drops.map(({ r, ended }) => (
                          <Insight key={r.period} icon="trending-down" color={palette.income}>
                            En {periodLabel(r.period, false).toLowerCase()} baja a{' '}
                            <Text style={[styles.num, { color: palette.text }]}>
                              {fmt(r.committedExpense, display)}
                            </Text>
                            : termina {listNames(ended)}.
                          </Insight>
                        ))
                      : null}
                    <Text variant="bodySmall" style={{ color: palette.textDisabled }}>
                      Tocá una barra para ver el detalle de ese mes.
                    </Text>
                  </>
                )}
              </Card>
            </Block>
          </>
        }
        right={
          <>
            <Block label="Gastos por categoría">
              <MonthSwitcher value={catPeriod} onChange={setCatPeriod} max={now} />
              <Card style={{ marginTop: space.md, gap: space.lg }}>
                {catTotal === 0 ? (
                  <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                    No hay gastos en {periodLabel(catPeriod, false).toLowerCase()}.
                  </Text>
                ) : (
                  <>
                    <View style={{ alignItems: 'center' }}>
                      <PieChart
                        data={pie}
                        donut
                        radius={92}
                        innerRadius={66}
                        innerCircleColor={palette.surface}
                        strokeWidth={3}
                        strokeColor={palette.surface}
                        centerLabelComponent={() => (
                          <View style={{ alignItems: 'center' }}>
                            <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                              Total
                            </Text>
                            <Text variant="titleLarge" style={styles.num}>
                              {fmt(catTotal, display, { compact: true })}
                            </Text>
                          </View>
                        )}
                      />
                    </View>
                    <View style={{ gap: space.xs }}>
                      {cats
                        .filter((c) => c.amount > 0 || c.budget)
                        .map((c, i) => {
                          const share = catTotal ? c.amount / catTotal : 0;
                          const prev = c.category ? prevCats.get(c.category.id) : null;
                          const diff = prev && c.amount ? c.amount / prev - 1 : null;
                          return (
                            <Pressable
                              key={c.category?.id ?? `none-${i}`}
                              disabled={!c.category}
                              onPress={() =>
                                navigate('Movimientos', { category: c.category.id, period: catPeriod })
                              }
                              style={({ pressed }) => [styles.catRow, pressed && { opacity: 0.55 }]}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                                <IconBubble
                                  icon={c.category?.icon ?? 'tag-off-outline'}
                                  color={c.category?.color ?? palette.textSecondary}
                                  size={32}
                                />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <Text
                                    variant="bodyMedium"
                                    numberOfLines={1}
                                    style={{ fontFamily: 'Inter_500Medium' }}
                                  >
                                    {c.category?.name ?? 'Sin categoría'}
                                  </Text>
                                  <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                                    {share > 0 && share < 0.01 ? '<1%' : percent(share)}
                                    {diff != null && Math.abs(diff) >= 0.01 ? (
                                      <Text style={{ color: diff > 0 ? palette.expense : palette.income }}>
                                        {'  '}
                                        {diff > 0 ? '▲' : '▼'} {percent(Math.min(Math.abs(diff), 9.99))}
                                      </Text>
                                    ) : null}
                                  </Text>
                                </View>
                                <Text variant="labelLarge" style={[styles.num, { textAlign: 'right' }]}>
                                  {fmt(c.amount, display, { compact: true })}
                                </Text>
                              </View>
                              {c.budget ? (
                                <View style={styles.catBudget}>
                                  <View style={{ flex: 1 }}>
                                    <Bar value={c.ratio ?? 0} height={4} />
                                  </View>
                                  <Text variant="labelSmall" style={{ color: palette.textDisabled }}>
                                    de {fmt(c.budget, display, { compact: true })}
                                  </Text>
                                </View>
                              ) : null}
                            </Pressable>
                          );
                        })}
                    </View>
                    <Text variant="bodySmall" style={{ color: palette.textDisabled }}>
                      ▲▼ contra {periodLabel(addMonths(catPeriod, -1), false).toLowerCase()} · tocá una
                      categoría para ver sus movimientos.
                    </Text>
                  </>
                )}
              </Card>
            </Block>

            <Block label="Evolución del patrimonio">
              <Card style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text variant="headlineSmall" style={[styles.num, { marginBottom: 6 }]}>
                      {nwLast
                        ? formatMoney(nwCur === 'USD' ? nwLast.usd : nwLast.ars, nwCur, { compact: true })
                        : '—'}
                    </Text>
                    {nwDelta !== 0 ? (
                      <Pill
                        label={`${formatMoney(nwDelta, nwCur, { compact: true, sign: true })} en ${nwSpan} meses`}
                        color={nwDelta >= 0 ? palette.income : palette.expense}
                      />
                    ) : null}
                  </View>
                  <Segmented
                    compact
                    value={nwCur}
                    onChange={setNwCur}
                    options={[
                      { value: 'USD', label: 'USD' },
                      { value: 'ARS', label: 'ARS' },
                    ]}
                  />
                </View>
                <LineChart
                  {...common}
                  {...nwScale}
                  data={nwData}
                  areaChart
                  curved
                  color={palette.primary}
                  thickness={2.5}
                  startFillColor={palette.primary}
                  endFillColor={palette.primary}
                  startOpacity={0.22}
                  endOpacity={0}
                  hideDataPoints
                  initialSpacing={NW_EDGE}
                  endSpacing={NW_EDGE}
                  spacing={(chartW - NW_EDGE * 2) / Math.max(1, nwData.length - 1)}
                  height={160}
                />
                <Text variant="bodySmall" style={{ color: palette.textDisabled }}>
                  Saldo total de tus cuentas a fin de cada mes, convertido con el dólar de ese mes.
                </Text>
              </Card>
            </Block>
          </>
        }
      />
    </Screen>
  );
}

/** Sección con rótulo en mayúscula (igual que el resto de la app) */
function Block({ label, children }) {
  return (
    <FadeIn delay={70} style={{ marginTop: space.xl }}>
      <Label>{label}</Label>
      {children}
    </FadeIn>
  );
}

function FewMonths() {
  return (
    <View style={[styles.insight, { marginTop: space.md }]}>
      <MaterialCommunityIcons name="information-outline" size={15} color={palette.textDisabled} />
      <Text variant="bodySmall" style={{ color: palette.textDisabled, flex: 1 }}>
        Con más meses cargados vas a ver la tendencia.
      </Text>
    </View>
  );
}

function Insight({ icon, color = palette.textSecondary, children }) {
  return (
    <View style={styles.insight}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

/** Vista de un solo mes: barras horizontales de ingresos y gastos, y lo que queda */
function MonthCompare({ inc, exp, save, prevAvg, pendingExp, pendingInc, fmt }) {
  const max = Math.max(inc, exp, prevAvg, 1);
  const rows = [
    { label: 'Ingresos', value: inc, color: palette.income, icon: 'arrow-down-left' },
    { label: 'Gastos', value: exp, color: palette.expense, icon: 'arrow-up-right' },
  ];
  return (
    <View style={{ gap: space.lg }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <IconBubble icon={r.icon} color={r.color} size={28} />
            <Text variant="bodyMedium" style={{ flex: 1, color: palette.textSecondary }}>
              {r.label}
            </Text>
            <Text variant="titleMedium" style={{ fontVariant: ['tabular-nums'] }}>
              {fmt(r.value)}
            </Text>
          </View>
          <Bar value={r.value / max} color={r.color} warnAt={null} height={10} />
        </View>
      ))}
      {prevAvg ? (
        <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: -space.sm }}>
          Tu gasto promedio de los últimos 3 meses es {fmt(prevAvg)}.
        </Text>
      ) : null}
      <View style={styles.hair} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
            Te queda
          </Text>
          <Text
            variant="headlineSmall"
            style={{ color: save >= 0 ? palette.income : palette.expense, fontVariant: ['tabular-nums'] }}
          >
            {fmt(save)}
          </Text>
        </View>
        {pendingExp > 0 || pendingInc > 0 ? (
          <Text
            variant="bodySmall"
            style={{ color: palette.textSecondary, textAlign: 'right', flexShrink: 1 }}
          >
            Incluye {fmt(pendingExp)} por pagar{pendingInc > 0 ? `\ny ${fmt(pendingInc)} por cobrar` : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Kpi({ label, value, color = palette.text, icon, muted }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="bodySmall" style={{ color: palette.textSecondary }} numberOfLines={1}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon ? <MaterialCommunityIcons name={icon} size={16} color={color} /> : null}
        <Text
          variant={muted ? 'bodyMedium' : 'titleMedium'}
          style={[styles.num, { color: muted ? palette.textDisabled : color, flexShrink: 1 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function Legend({ items }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.lg, marginBottom: space.md }}>
      {items.map((i) => (
        <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i.color }} />
          <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
            {i.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  num: { fontVariant: ['tabular-nums'] },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
  kpis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginTop: space.lg,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg + 4,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.border },
  projHead: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  insight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  catRow: { paddingVertical: space.sm, gap: 6 },
  catBudget: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 44 },
});