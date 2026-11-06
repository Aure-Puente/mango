//MovimientosScreen:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChipSelect, MonthSwitcher, SearchField, Segmented } from '@/components/fields';
import { TxRow } from '@/components/finance';
import {
  Card,
  Divider,
  Empty,
  FadeIn,
  HeaderButton,
  Label,
  ScreenTitle,
  Skeleton,
  SkeletonRows,
} from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { useFinance } from '@/hooks/useFinance';
import { MAX_CONTENT } from '@/hooks/useLayout';
import { currentPeriod, dateLabel, fromDateStr, MONTHS_SHORT } from '@/lib/dates';
import { exportTransactionsCsv } from '@/lib/export';
import { palette, radius, space } from '@/theme';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function dayTitle(d) {
  const date = fromDateStr(d);
  const short = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()].toLowerCase()}`;
  const rel = dateLabel(d);
  if (rel === 'Hoy' || rel === 'Ayer') return `${rel} · ${short}`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `${WEEKDAYS[date.getDay()]} ${short}${sameYear ? '' : ` ${date.getFullYear()}`}`;
}

export default function Movements() {
  const insets = useSafeAreaInsets();
  const params = useRoute().params ?? {};
  const { ready, transactions, accounts, categories, conv, fmt, display } = useFinance();
  const toast = useToast();

  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [period, setPeriod] = useState(currentPeriod());
  const [accountId, setAccountId] = useState(params.account ?? null);
  const [categoryId, setCategoryId] = useState(params.category ?? null);
  const [showFilters, setShowFilters] = useState(!!params.account);

  useEffect(() => {
    if (params.account) {
      setAccountId(params.account);
      setShowFilters(true);
    }
    if (params.category) {
      setCategoryId(params.category);
      setShowFilters(false);
    }
    if (params.period) setPeriod(params.period);
  }, [params.account, params.category, params.period]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    const catName = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));
    return transactions.filter((t) => {
      if (period && !t.date.startsWith(period)) return false;
      if (type !== 'all' && t.type !== type) return false;
      if (accountId && t.accountId !== accountId && t.toAccountId !== accountId) return false;
      if (categoryId && t.categoryId !== categoryId) return false;
      if (text) {
        const hay =
          `${t.note ?? ''} ${catName.get(t.categoryId ?? '') ?? ''} ${(t.amount / 100).toFixed(0)}`.toLowerCase();
        if (!hay.includes(text)) return false;
      }
      return true;
    });
  }, [transactions, categories, q, type, period, accountId, categoryId]);

  const sections = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return [...map.entries()].map(([date, data]) => {
      let net = 0;
      for (const t of data) {
        if (t.type === 'income') net += conv(t.amount, t.currency, t.rate);
        if (t.type === 'expense') net -= conv(t.amount, t.currency, t.rate);
      }
      return { title: date, data, net };
    });
  }, [filtered, conv]);

  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of filtered) {
      if (t.type === 'income') inc += conv(t.amount, t.currency, t.rate);
      if (t.type === 'expense') exp += conv(t.amount, t.currency, t.rate);
    }
    return { inc, exp };
  }, [filtered, conv]);

  const doExport = async () => {
    try {
      await exportTransactionsCsv(
        filtered,
        accounts,
        categories,
        period ? `mango-${period}` : 'mango-movimientos',
      );
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo exportar', { tone: 'error' });
    }
  };

  const activeFilters = (accountId ? 1 : 0) + (categoryId ? 1 : 0);
  const anyFilter = activeFilters > 0 || type !== 'all' || !!q.trim() || !period;
  const clearFilters = () => {
    setAccountId(null);
    setCategoryId(null);
    setType('all');
    setQ('');
    if (!period) setPeriod(currentPeriod());
  };
  const filterAcc = accounts.find((a) => a.id === accountId);
  const filterCat = categories.find((c) => c.id === categoryId);
  const net = totals.inc - totals.exp;

  return (
    <FadeIn style={{ flex: 1, backgroundColor: palette.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + space.lg,
          paddingHorizontal: space.lg,
          paddingBottom: 40,
          width: '100%',
          maxWidth: MAX_CONTENT,
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            <ScreenTitle
              title="Movimientos"
              style={{ marginBottom: space.sm }}
              right={
                <>
                  <HeaderButton
                    icon={showFilters ? 'tune-variant' : 'tune'}
                    color={showFilters || activeFilters ? palette.primary : palette.text}
                    filled={showFilters}
                    badge={activeFilters > 0 && !showFilters}
                    accessibilityLabel="Filtros"
                    onPress={() => setShowFilters((v) => !v)}
                  />
                  <HeaderButton icon="tray-arrow-up" onPress={doExport} accessibilityLabel="Exportar" />
                </>
              }
            />
            <SearchField placeholder="Buscar por nota, categoría o monto" value={q} onChangeText={setQ} />
            {period ? <MonthSwitcher value={period} onChange={setPeriod} /> : null}
            <Segmented
              value={type}
              onChange={setType}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'expense', label: 'Gastos' },
                { value: 'income', label: 'Ingresos' },
                { value: 'transfer', label: 'Mover' },
              ]}
            />

            {showFilters ? (
              <Card style={styles.filters}>
                <View style={{ gap: space.sm }}>
                  <Label>Período</Label>
                  <Segmented
                    value={period ? 'month' : 'all'}
                    onChange={(v) => setPeriod(v === 'all' ? null : currentPeriod())}
                    options={[
                      { value: 'month', label: 'Por mes' },
                      { value: 'all', label: 'Todo el historial' },
                    ]}
                  />
                </View>
                <View>
                  <Label>Cuenta</Label>
                  <ChipSelect
                    wrap
                    allowNone
                    value={accountId}
                    onChange={setAccountId}
                    options={accounts.map((a) => ({ value: a.id, label: a.name, color: a.color }))}
                  />
                </View>
                <View>
                  <Label>Categoría</Label>
                  <ChipSelect
                    wrap
                    allowNone
                    tintIcons
                    value={categoryId}
                    onChange={setCategoryId}
                    options={categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                      color: c.color,
                      icon: c.icon,
                    }))}
                  />
                </View>
              </Card>
            ) : activeFilters ? (
              <View style={styles.activeRow}>
                {filterAcc ? (
                  <FilterChip
                    label={filterAcc.name}
                    color={filterAcc.color}
                    onClear={() => setAccountId(null)}
                  />
                ) : null}
                {filterCat ? (
                  <FilterChip
                    label={filterCat.name}
                    color={filterCat.color}
                    icon={filterCat.icon}
                    onClear={() => setCategoryId(null)}
                  />
                ) : null}
              </View>
            ) : null}

            {!ready ? (
              <TotalsSkeleton />
            ) : filtered.length > 0 ? (
              <View style={styles.totals}>
                <View style={styles.totalsRow}>
                  <Total
                    label="Entró"
                    value={fmt(totals.inc, display, { compact: true })}
                    color={palette.income}
                    icon="arrow-down-left"
                  />
                  <View style={styles.totalsDivider} />
                  <Total
                    label="Salió"
                    value={fmt(totals.exp, display, { compact: true })}
                    color={palette.expense}
                    icon="arrow-up-right"
                  />
                  <View style={styles.totalsDivider} />
                  <Total
                    label="Neto"
                    value={`${net < 0 ? '−' : net > 0 ? '+' : ''}${fmt(Math.abs(net), display, { compact: true })}`}
                    valueColor={net < 0 ? palette.expense : net > 0 ? palette.income : palette.text}
                    color={palette.textSecondary}
                    icon="scale-balance"
                  />
                </View>
                <Text variant="bodySmall" style={styles.count}>
                  {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}
                  {anyFilter ? ' con estos filtros' : ''}
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHead}>
            <Text variant="labelMedium" style={styles.dayLabel}>
              {dayTitle(section.title)}
            </Text>
            {section.net ? (
              <Text
                variant="labelMedium"
                style={[styles.dayNet, section.net > 0 && { color: palette.income }]}
              >
                {section.net > 0 ? '+' : '−'}
                {fmt(Math.abs(section.net), display)}
              </Text>
            ) : null}
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <View style={[styles.item, first && styles.itemFirst, last && styles.itemLast]}>
              {first ? null : <Divider />}
              <TxRow tx={item} hideDate />
            </View>
          );
        }}
        ListEmptyComponent={
          ready ? (
            <Card style={{ marginTop: space.sm }}>
              <Empty
                icon={anyFilter ? 'filter-off-outline' : 'magnify'}
                title="No hay movimientos"
                text={
                  anyFilter
                    ? 'Nada coincide con la búsqueda o los filtros.'
                    : 'Todavía no cargaste nada este mes. Tocá el + para empezar.'
                }
                action={anyFilter ? 'Limpiar filtros' : undefined}
                onAction={anyFilter ? clearFilters : undefined}
              />
            </Card>
          ) : (
            <ListSkeleton />
          )
        }
      />
    </FadeIn>
  );
}

function Total({ label, value, color, icon, valueColor }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialCommunityIcons name={icon} size={14} color={color} />
        <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
          {label}
        </Text>
      </View>
      <Text
        variant="titleMedium"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontVariant: ['tabular-nums'], color: valueColor ?? palette.text }}
      >
        {value}
      </Text>
    </View>
  );
}

function FilterChip({ label, color, icon, onClear }) {
  return (
    <Pressable
      onPress={onClear}
      accessibilityRole="button"
      accessibilityLabel={`Sacar filtro ${label}`}
      style={({ pressed }) => [styles.filterChip, pressed && { opacity: 0.6 }]}
    >
      {icon ? (
        <MaterialCommunityIcons name={icon} size={14} color={color} />
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text variant="labelLarge" style={{ fontSize: 13 }}>
        {label}
      </Text>
      <MaterialCommunityIcons name="close" size={14} color={palette.textSecondary} />
    </Pressable>
  );
}

function TotalsSkeleton() {
  return (
    <View style={styles.totals}>
      <View style={styles.totalsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, gap: 6 }}>
            <Skeleton width={46} height={11} />
            <Skeleton width="75%" height={16} />
          </View>
        ))}
      </View>
      <Skeleton width={110} height={10} />
    </View>
  );
}

function ListSkeleton() {
  return (
    <View>
      {[3, 2].map((n, i) => (
        <View key={i}>
          <View style={styles.dayHead}>
            <Skeleton width={100} height={11} />
            <Skeleton width={60} height={11} />
          </View>
          <SkeletonRows count={n} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { paddingVertical: space.lg, overflow: 'hidden', gap: space.lg },
  activeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  totalsRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  count: { color: palette.textDisabled },
  totals: {
    gap: space.md,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg + 4,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  totalsDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.border },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.sm,
    paddingHorizontal: 2,
  },
  dayLabel: {
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
  },
  dayNet: { color: palette.textSecondary, fontVariant: ['tabular-nums'] },
  item: {
    backgroundColor: palette.surface,
    paddingHorizontal: space.lg,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  itemFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingTop: space.xs,
  },
  itemLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    paddingBottom: space.xs,
  },
});