//CompromisosScreen:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MonthSwitcher, Segmented } from '@/components/fields';
import { CommitmentRow, PayDialog, dueInfo } from '@/components/finance';
import {
  Bar,
  Card,
  Divider,
  Empty,
  FadeIn,
  IconBubble,
  Label,
  Pill,
  Row,
  Screen,
  Skeleton,
  SkeletonRows,
  SmallButton,
} from '@/components/ui';
import { useFinance } from '@/hooks/useFinance';
import { addMonths, currentPeriod, periodLabel, today } from '@/lib/dates';
import { purchaseProgress, recurringApplies } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { navigate } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

const DATA_KEYS = ['recurring', 'purchases', 'cards'];

export default function Commitments() {
  const { ready, isLoaded } = useFinance();
  const [tab, setTab] = useState('mes');
  const loaded = ready && (isLoaded ? isLoaded(...DATA_KEYS) : true);

  return (
    <Screen
      title="Fijos y cuotas"
      right={
        <SmallButton
          icon="plus"
          label={tab === 'cuotas' ? 'Cuotas' : 'Fijo'}
          onPress={() => navigate(tab === 'cuotas' ? 'Compra' : 'Fijo')}
        />
      }
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'mes', label: 'Este mes', color: palette.primary },
          { value: 'fijos', label: 'Fijos', color: palette.primary },
          { value: 'cuotas', label: 'Cuotas', color: palette.primary },
        ]}
        style={{ marginBottom: space.lg }}
      />
      {!loaded ? (
        <TabSkeleton tab={tab} />
      ) : tab === 'mes' ? (
        <MonthView />
      ) : tab === 'fijos' ? (
        <FixedList />
      ) : (
        <PurchaseList />
      )}
    </Screen>
  );
}

function Hero({ children, style }) {
  return (
    <Card style={[styles.hero, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={[palette.primary + '26', palette.primary + '00']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.25, y: 0.85 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </Card>
  );
}

function Block({ label, right, children }) {
  return (
    <FadeIn delay={70} style={styles.section}>
      <View style={styles.labelRow}>
        <Label>{label}</Label>
        {right}
      </View>
      {children}
    </FadeIn>
  );
}

function CurrencyPills({ ars, usd }) {
  if (!ars || !usd) return null;
  return (
    <View style={styles.pills}>
      <Pill label={`${formatMoney(ars, 'ARS')} en pesos`} color={palette.textSecondary} />
      <Pill label={`${formatMoney(usd, 'USD')} en dólares`} color={palette.income} />
    </View>
  );
}

const shortDue = (d) => dueInfo(d).text.replace(/^(Venció|Vence) /, '');

const sumBy = (items, cur, get = (x) => x.amount) =>
  items.filter((x) => x.currency === cur).reduce((s, x) => s + get(x), 0);

function MonthView() {
  const { commitments, cards, conv, fmt, display } = useFinance();
  const [period, setPeriod] = useState(currentPeriod());
  const [paying, setPaying] = useState(null);
  const [showPaid, setShowPaid] = useState(null);
  const items = commitments(period);
  const monthName = periodLabel(period, false).toLowerCase();

  const expenses = items.filter((c) => c.type === 'expense');
  const totalOut = expenses.reduce((s, c) => s + conv(c.amount, c.currency), 0);
  const paidOut = expenses.filter((c) => c.paid).reduce((s, c) => s + conv(c.amount, c.currency), 0);
  const pendingOut = expenses.filter((c) => !c.paid);
  const allPaid = expenses.length > 0 && pendingOut.length === 0;
  const next = pendingOut[0];

  const cardGroups = cards
    .map((card) => ({ card, items: items.filter((c) => c.cardId === card.id) }))
    .filter((g) => g.items.length > 0);
  const openCards = cardGroups.filter((g) => g.items.some((c) => !c.paid));
  const paidCards = cardGroups.filter((g) => g.items.every((c) => c.paid));

  const pendingIncomes = items.filter((c) => c.type === 'income' && !c.paid);
  const pendingFixed = items.filter((c) => c.type === 'expense' && c.kind === 'recurring' && !c.paid);
  const pendingOther = items.filter((c) => c.kind === 'installment' && !c.cardId && !c.paid);
  const paid = [...items.filter((c) => c.paid && !c.cardId), ...paidCards.flatMap((g) => g.items)].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate),
  );

  const hasPending = pendingIncomes.length + pendingFixed.length + pendingOther.length + openCards.length > 0;
  const paidOpen = showPaid ?? !hasPending;

  const list = (cs) => (
    <Card style={{ paddingVertical: space.xs }}>
      {cs.map((c, i) => (
        <View key={c.key}>
          {i > 0 ? <Divider /> : null}
          <CommitmentRow c={c} onPress={() => setPaying({ items: [c] })} />
        </View>
      ))}
    </Card>
  );

  return (
    <>
      <MonthSwitcher value={period} onChange={setPeriod} />

      <Hero style={{ marginTop: space.lg }}>
        {allPaid ? (
          <View style={styles.allPaid}>
            <IconBubble icon="check-decagram" color={palette.income} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="titleLarge">Todo pagado</Text>
              <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                Pagaste {fmt(totalOut, display)} entre fijos y cuotas de {monthName}.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
              Comprometido en {monthName}
            </Text>
            <Text variant="displaySmall" style={[styles.num, { marginTop: -space.xs }]}>
              {fmt(totalOut, display)}
            </Text>
            <Bar value={totalOut ? paidOut / totalOut : 0} color={palette.income} warnAt={null} />
            <View style={styles.between}>
              <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                Pagado{' '}
                <Text variant="labelMedium" style={{ color: palette.income }}>
                  {fmt(paidOut, display, { compact: true })}
                </Text>
              </Text>
              <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                Falta{' '}
                <Text variant="labelMedium" style={{ color: palette.text }}>
                  {fmt(Math.max(0, totalOut - paidOut), display, { compact: true })}
                </Text>
              </Text>
            </View>
          </>
        )}
        <CurrencyPills ars={sumBy(expenses, 'ARS')} usd={sumBy(expenses, 'USD')} />
        {next ? (
          <View style={styles.heroFoot}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color={dueInfo(next.dueDate).color} />
            <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary, flex: 1 }}>
              {next.dueDate < today() ? 'Atrasado' : 'Próximo'}:{' '}
              <Text style={{ color: palette.text }}>{next.label}</Text> · {shortDue(next.dueDate)}
            </Text>
          </View>
        ) : null}
      </Hero>

      {items.length === 0 ? (
        <Card style={{ marginTop: space.lg }}>
          <Empty
            icon="calendar-blank-outline"
            title={`Nada para ${monthName}`}
            text="Cargá tus gastos fijos (alquiler, servicios, suscripciones) y tus compras en cuotas para verlos acá."
            action="Agregar fijo"
            onAction={() => navigate('Fijo')}
          />
        </Card>
      ) : null}

      {pendingIncomes.length ? <Block label="Ingresos por cobrar">{list(pendingIncomes)}</Block> : null}
      {pendingFixed.length ? <Block label="Gastos fijos">{list(pendingFixed)}</Block> : null}

      {openCards.map(({ card, items: cs }) => {
        const groups = ['ARS', 'USD']
          .map((cur) => ({ cur, items: cs.filter((c) => c.currency === cur) }))
          .filter((g) => g.items.length);
        const due = dueInfo(cs[0].dueDate);
        return (
          <Block key={card.id} label={card.name}>
            <Card style={{ paddingVertical: space.xs }}>
              <View style={styles.cardHead}>
                <IconBubble icon="credit-card-outline" color={card.color ?? palette.primary} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodySmall" style={{ color: due.color }}>
                    Resumen · {due.text.toLowerCase()}
                  </Text>
                  <Text variant="titleLarge" style={styles.num} numberOfLines={1} adjustsFontSizeToFit>
                    {groups.map((g) => formatMoney(sumBy(g.items, g.cur), g.cur)).join(' + ')}
                  </Text>
                </View>
                {groups.map((g) => (
                  <SmallButton
                    key={g.cur}
                    variant="solid"
                    label={`Pagar${groups.length > 1 ? ` ${g.cur}` : ''}`}
                    onPress={() =>
                      setPaying({
                        items: g.items,
                        title: `Resumen ${card.name}${groups.length > 1 ? ` (${g.cur})` : ''}`,
                      })
                    }
                  />
                ))}
              </View>
              {cs.map((c) => (
                <View key={c.key}>
                  <Divider />
                  <CommitmentRow c={c} onPress={() => setPaying({ items: [c] })} />
                </View>
              ))}
            </Card>
          </Block>
        );
      })}

      {pendingOther.length ? <Block label="Otras cuotas">{list(pendingOther)}</Block> : null}

      {paid.length ? (
        <Block
          label={`Pagados · ${paid.length}`}
          right={
            hasPending ? (
              <Pressable
                onPress={() => setShowPaid(!paidOpen)}
                hitSlop={10}
                style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.5 }]}
              >
                <Text variant="labelMedium" style={{ color: palette.textSecondary }}>
                  {paidOpen ? 'Ocultar' : 'Ver'}
                </Text>
                <MaterialCommunityIcons
                  name={paidOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={palette.textSecondary}
                />
              </Pressable>
            ) : null
          }
        >
          {paidOpen ? (
            <Card style={{ paddingVertical: space.xs }}>
              {paid.map((c, i) => (
                <View key={c.key}>
                  {i > 0 ? <View style={styles.thinDivider} /> : null}
                  <PaidRow c={c} cards={cards} onPress={() => setPaying({ items: [c] })} />
                </View>
              ))}
            </Card>
          ) : null}
        </Block>
      ) : null}

      <PayDialog items={paying?.items ?? null} title={paying?.title} onDismiss={() => setPaying(null)} />
    </>
  );
}

function PaidRow({ c, cards, onPress }) {
  const card = c.cardId ? cards.find((k) => k.id === c.cardId) : null;
  const detail = [card?.name, c.detail].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.paidRow, pressed && { opacity: 0.55 }]}>
      <MaterialCommunityIcons name="check-circle" size={18} color={palette.income + 'B3'} />
      <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1, color: palette.textSecondary }}>
        {c.label}
        {detail ? <Text style={{ color: palette.textDisabled }}> · {detail}</Text> : null}
      </Text>
      <Text variant="bodyMedium" style={[styles.num, { color: palette.textSecondary }]}>
        {formatMoney(c.amount, c.currency)}
      </Text>
    </Pressable>
  );
}

function FixedList() {
  const { recurring, categories, accounts, commitments, conv, fmt, display } = useFinance();
  const now = currentPeriod();
  const active = recurring.filter((r) => !r.endPeriod || r.endPeriod >= now);
  const ended = recurring.filter((r) => r.endPeriod && r.endPeriod < now);

  if (recurring.length === 0) {
    return (
      <Card>
        <Empty
          icon="repeat"
          title="Sin fijos"
          text="Ej: sueldo, alquiler, internet, gimnasio, Netflix. Se generan solos cada mes y los marcás como pagados."
          action="Agregar fijo"
          onAction={() => navigate('Fijo')}
        />
      </Card>
    );
  }

  const perMonth = (r) => Math.round((r.amount * (r.months?.length ? r.months.length : 12)) / 12);
  const outs = active.filter((r) => r.type === 'expense');
  const ins = active.filter((r) => r.type === 'income');
  const arsOut = sumBy(outs, 'ARS', perMonth);
  const usdOut = sumBy(outs, 'USD', perMonth);
  const totalOut = conv(arsOut, 'ARS') + conv(usdOut, 'USD');
  const totalIn = ins.reduce((s, r) => s + conv(perMonth(r), r.currency), 0);
  const averaged = outs.some((r) => r.months?.length);

  const pendingFixed = (p) =>
    commitments(p).filter((c) => c.kind === 'recurring' && c.type === 'expense' && !c.paid);
  const next =
    pendingFixed(now).find((c) => c.dueDate >= today()) ??
    pendingFixed(now)[0] ??
    pendingFixed(addMonths(now, 1))[0];

  const render = (rs) => (
    <Card style={{ paddingVertical: space.xs }}>
      {rs.map((r, i) => {
        const cat = categories.find((c) => c.id === r.categoryId);
        const acc = accounts.find((a) => a.id === r.accountId);
        const when = r.months?.length
          ? `Día ${r.dayOfMonth} · ${r.months.length} ${r.months.length === 1 ? 'vez' : 'veces'} al año`
          : `Día ${r.dayOfMonth}`;
        const until = r.endPeriod ? ` · hasta ${periodLabel(r.endPeriod, false).toLowerCase()}` : '';
        const skip =
          r.endPeriod && r.endPeriod < now ? '' : !recurringApplies(r, now) ? ' · no va este mes' : '';
        return (
          <View key={r.id}>
            {i > 0 ? <Divider /> : null}
            <Row
              icon={cat?.icon ?? (r.type === 'income' ? 'cash-plus' : 'repeat')}
              iconColor={r.type === 'income' ? palette.income : (cat?.color ?? palette.primary)}
              title={r.name}
              subtitle={`${when}${until}${acc ? ` · ${acc.name}` : ''}${skip}`}
              right={formatMoney(r.amount, r.currency)}
              rightColor={r.type === 'income' ? palette.income : palette.text}
              onPress={() => navigate('Fijo', { id: r.id })}
            />
          </View>
        );
      })}
    </Card>
  );

  const byDay = (a, b) => a.dayOfMonth - b.dayOfMonth;

  return (
    <>
      {outs.length ? (
        <Hero>
          <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
            Tus fijos suman {averaged ? 'en promedio ' : ''}por mes
          </Text>
          <Text variant="displaySmall" style={[styles.num, { marginTop: -space.xs }]}>
            {fmt(totalOut, display)}
          </Text>
          <CurrencyPills ars={arsOut} usd={usdOut} />
          {totalIn ? (
            <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
              Ingresos fijos{' '}
              <Text variant="labelMedium" style={{ color: palette.income }}>
                {fmt(totalIn, display)}
              </Text>
            </Text>
          ) : null}
          {next ? (
            <View style={styles.heroFoot}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={dueInfo(next.dueDate).color} />
              <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary, flex: 1 }}>
                {next.dueDate < today() ? 'Atrasado' : 'Próximo'}:{' '}
                <Text style={{ color: palette.text }}>{next.label}</Text> · {shortDue(next.dueDate)}
              </Text>
            </View>
          ) : null}
        </Hero>
      ) : null}

      {outs.length ? <Block label="Gastos fijos">{render([...outs].sort(byDay))}</Block> : null}
      {ins.length ? <Block label="Ingresos fijos">{render([...ins].sort(byDay))}</Block> : null}
      {ended.length ? <Block label="Finalizados">{render(ended)}</Block> : null}
    </>
  );
}

function PurchaseList() {
  const { purchases, cards, categories, commitments, conv, fmt, display } = useFinance();
  const now = currentPeriod();
  const rows = purchases.map((p) => ({ p, prog: purchaseProgress(p) }));
  const active = rows.filter((r) => !r.prog.done);
  const done = rows.filter((r) => r.prog.done);

  if (purchases.length === 0) {
    return (
      <Card>
        <Empty
          icon="credit-card-clock-outline"
          title="Sin compras en cuotas"
          text="Cargá el total y la cantidad de cuotas: Mango las descuenta sola cada mes."
          action="Agregar compra"
          onAction={() => navigate('Compra')}
        />
      </Card>
    );
  }

  const remaining = active.reduce((s, r) => s + conv(r.prog.remaining, r.p.currency), 0);
  const thisMonth = commitments(now)
    .filter((c) => c.kind === 'installment')
    .reduce((s, c) => s + conv(c.amount, c.currency), 0);
  const lastPeriod = active.reduce((m, r) => (r.prog.lastPeriod > m ? r.prog.lastPeriod : m), '');

  const render = (rs) => (
    <Card style={{ paddingVertical: space.xs }}>
      {rs.map(({ p, prog }, i) => {
        const card = cards.find((c) => c.id === p.cardId);
        const cat = categories.find((c) => c.id === p.categoryId);
        const color = card?.color ?? cat?.color ?? (p.kind === 'loan' ? palette.info : palette.primary);
        const quota = Math.round(p.total / p.installments);
        const source = card?.name ?? (p.kind === 'loan' ? 'Préstamo' : null);
        return (
          <View key={p.id}>
            {i > 0 ? <Divider /> : null}
            <Row
              icon={
                card
                  ? 'credit-card-outline'
                  : p.kind === 'loan'
                    ? 'bank-outline'
                    : 'credit-card-clock-outline'
              }
              iconColor={color}
              title={p.description}
              subtitle={`${source ? `${source} · ` : ''}${prog.paidCount} de ${prog.total} cuotas pagas`}
              right={formatMoney(prog.done ? p.total : quota, p.currency)}
              rightSub={prog.done ? 'total' : 'por mes'}
              onPress={() => navigate('CompraDetalle', { id: p.id })}
            />
            <View style={styles.progress}>
              <Bar value={prog.paidCount / prog.total} color={color} warnAt={null} height={4} />
              {!prog.done ? (
                <View style={styles.between}>
                  <Text variant="labelSmall" style={[styles.num, { color: palette.textSecondary }]}>
                    Faltan {formatMoney(prog.remaining, p.currency)}
                  </Text>
                  <Text variant="labelSmall" style={{ color: palette.textDisabled }}>
                    Termina en {periodLabel(prog.lastPeriod).toLowerCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );

  return (
    <>
      {active.length ? (
        <Hero>
          <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
            Te queda por pagar
          </Text>
          <Text variant="displaySmall" style={[styles.num, { marginTop: -space.xs }]}>
            {fmt(remaining, display)}
          </Text>
          <View style={styles.stats}>
            <Stat label="Este mes" value={fmt(thisMonth, display, { compact: true })} />
            <View style={styles.vline} />
            <Stat label="Activas" value={String(active.length)} />
            <View style={styles.vline} />
            <Stat
              label="Terminás"
              value={lastPeriod ? periodLabel(lastPeriod).replace(/^(\w{3})\w*/, '$1') : '—'}
            />
          </View>
        </Hero>
      ) : (
        <Hero>
          <View style={styles.allPaid}>
            <IconBubble icon="party-popper" color={palette.income} size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge">Sin cuotas activas</Text>
              <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                Terminaste de pagar todo lo que compraste en cuotas.
              </Text>
            </View>
          </View>
        </Hero>
      )}
      {active.length ? <Block label="Activas">{render(active)}</Block> : null}
      {done.length ? <Block label="Terminadas">{render(done)}</Block> : null}
    </>
  );
}

function Stat({ label, value }) {
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

function HeroSkeleton({ stats, bar }) {
  return (
    <Card style={[styles.hero, { gap: space.md }]}>
      <Skeleton width={150} height={14} />
      <Skeleton width="62%" height={36} radius={10} />
      {bar ? <Skeleton height={6} radius={3} /> : null}
      {stats ? (
        <View style={[styles.stats, { borderTopColor: 'transparent' }]}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, gap: 6 }}>
              <Skeleton width={50} height={11} />
              <Skeleton width="70%" height={16} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.between}>
          <Skeleton width={90} height={11} />
          <Skeleton width={70} height={11} />
        </View>
      )}
    </Card>
  );
}

function ProgressRowsSkeleton({ count = 3 }) {
  return (
    <Card style={{ paddingVertical: space.xs }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          {i > 0 ? <Divider /> : null}
          <View style={styles.skRow}>
            <Skeleton width={40} height={40} radius={13} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={`${50 + ((i * 17) % 30)}%`} height={13} />
              <Skeleton width="40%" height={11} />
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Skeleton width={64} height={14} />
              <Skeleton width={40} height={10} />
            </View>
          </View>
          <View style={styles.progress}>
            <Skeleton height={4} radius={2} />
            <View style={styles.between}>
              <Skeleton width={90} height={10} />
              <Skeleton width={110} height={10} />
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

function LabelSkeleton() {
  return <Skeleton width={110} height={11} style={{ marginBottom: space.sm, marginLeft: 2 }} />;
}

function TabSkeleton({ tab }) {
  if (tab === 'mes') {
    return (
      <>
        <Skeleton height={48} radius={24} />
        <View style={{ marginTop: space.lg }}>
          <HeroSkeleton bar />
        </View>
        <View style={styles.section}>
          <LabelSkeleton />
          <SkeletonRows count={3} />
        </View>
      </>
    );
  }
  if (tab === 'fijos') {
    return (
      <>
        <HeroSkeleton />
        <View style={styles.section}>
          <LabelSkeleton />
          <SkeletonRows count={4} />
        </View>
      </>
    );
  }
  return (
    <>
      <HeroSkeleton stats />
      <View style={styles.section}>
        <LabelSkeleton />
        <ProgressRowsSkeleton />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.xl, gap: space.md, overflow: 'hidden', borderColor: palette.primary + '26' },
  num: { fontVariant: ['tabular-nums'] },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pills: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  allPaid: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.border },
  section: { marginTop: space.xl },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.md },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  thinDivider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: 30 },
  progress: { marginLeft: 52, marginTop: -6, paddingBottom: space.md, gap: 6 },
  skRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
});