import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PayDialog } from '@/components/finance';
import {
  ActionButton,
  Bar,
  Card,
  Divider,
  Empty,
  HeaderButton,
  IconBubble,
  Label,
  Pill,
  Row,
  Screen,
} from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { currentPeriod, dateLabel, monthsBetween, periodLabel } from '@/lib/dates';
import { installmentSchedule, purchaseProgress } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { goBack, navigate } from '@/navigation/RootNavigation';
import { palette, radius, space } from '@/theme';

const lower = (s) => s.toLowerCase();
/** Monto que no se corta en dos renglones ("$" y el número juntos) */
const nb = (s) => s.replace(/\s/g, '\u00A0');
/** "abr 2027" */
const shortMonth = (p) =>
  periodLabel(p)
    .replace(/^(\S{3})\S*/, '$1')
    .toLowerCase();

export default function PurchaseDetail() {
  const { id } = useRoute().params ?? {};
  const { purchases, cards, categories, commitments, remove, prepayPurchase, undoPrepay } = useFinance();
  const toast = useToast();
  const [paying, setPaying] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'delete' | 'prepay' | 'undo'
  const p = purchases.find((x) => x.id === id);

  if (!p) {
    return (
      <Screen>
        <Empty
          icon="help-circle-outline"
          title="No encontramos la compra"
          action="Volver"
          onAction={() => goBack()}
        />
      </Screen>
    );
  }

  const card = cards.find((c) => c.id === p.cardId);
  const cat = categories.find((c) => c.id === p.categoryId);
  const prog = purchaseProgress(p);
  const schedule = installmentSchedule(p);
  const now = currentPeriod();
  const color = card?.color ?? cat?.color ?? (p.kind === 'loan' ? palette.info : palette.primary);
  const quota = Math.round(p.total / p.installments);
  const left = p.installments - prog.paidCount;

  const isPaid = (e) => e.numbers.every((n) => p.paid?.[String(n)]);
  const nextIdx = schedule.findIndex((e) => !isPaid(e));
  const next = nextIdx >= 0 ? schedule[nextIdx] : null;
  const nextIsDue = next && next.period <= now;

  const source = card
    ? { label: card.name, icon: 'credit-card-outline', color: card.color ?? palette.primary }
    : p.kind === 'loan'
      ? { label: 'Préstamo', icon: 'bank-outline', color: palette.info }
      : { label: 'Plan de cuotas', icon: 'calendar-sync-outline', color: palette.textSecondary };

  const openPay = (period, numbers) => {
    const c = commitments(period).find((x) => x.refId === p.id && x.numbers?.join() === numbers.join());
    if (c) setPaying([c]);
  };

  const whenLabel = (e) => {
    if (e.period === now) return 'Este mes';
    const m = monthsBetween(now, e.period);
    return m > 0 ? `En ${m} ${m === 1 ? 'mes' : 'meses'}` : null;
  };

  return (
    <>
      <ScreenOptions
        options={{
          title: p.description,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <HeaderButton
                icon="pencil-outline"
                accessibilityLabel="Editar"
                onPress={() => navigate('Compra', { id: p.id })}
              />
              <HeaderButton
                icon="trash-can-outline"
                color={palette.expense}
                accessibilityLabel="Borrar"
                onPress={() => setConfirm('delete')}
              />
            </View>
          ),
        }}
      />
      <Screen>
        {/* Resumen de la compra */}
        <Card style={[styles.hero, { borderColor: color + '33' }]}>
          <LinearGradient
            pointerEvents="none"
            colors={[color + '24', color + '00']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.25, y: 0.85 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.tags}>
            <Pill label={source.label} color={source.color} icon={source.icon} />
            {cat ? <Pill label={cat.name} color={cat.color} icon={cat.icon} /> : null}
            {p.prepaidAt ? (
              <Pill label="Cancelación anticipada" color={palette.warning} icon="fast-forward" />
            ) : null}
            {prog.done ? <Pill label="Terminada" color={palette.income} icon="check" /> : null}
          </View>

          <View>
            <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
              {prog.done ? 'Pagaste todo' : 'Te falta pagar'}
            </Text>
            <Text variant="displaySmall" style={styles.num}>
              {formatMoney(prog.done ? p.total : prog.remaining, p.currency)}
            </Text>
          </View>

          <Bar value={prog.paidCount / prog.total} color={color} warnAt={null} />

          <View style={styles.stats}>
            <Stat label="Cuota" value={formatMoney(quota, p.currency)} />
            <View style={styles.vline} />
            <Stat label="Pagas" value={`${prog.paidCount} de ${prog.total}`} />
            <View style={styles.vline} />
            <Stat label={prog.done ? 'Terminó' : 'Termina'} value={shortMonth(prog.lastPeriod)} />
          </View>

          <Text variant="bodySmall" style={{ color: palette.textDisabled }}>
            Comprada {dateLabel(p.date) === 'Hoy' || dateLabel(p.date) === 'Ayer' ? '' : 'el '}
            {lower(dateLabel(p.date))} · total {formatMoney(p.total, p.currency)}
          </Text>
        </Card>

        {/* Acción principal: pagar la cuota que toca */}
        {nextIsDue ? (
          <ActionButton
            icon="check"
            label={`Pagar cuota de ${lower(periodLabel(next.period, false))} · ${formatMoney(next.amount, p.currency)}`}
            style={{ marginTop: space.lg }}
            onPress={() => openPay(next.period, next.numbers)}
          />
        ) : null}

        {/* Adelantar o deshacer: discreto, no compite con lo importante */}
        {!prog.done ? (
          p.prepaidAt ? (
            <OptionRow
              icon="undo-variant"
              title="Deshacer cancelación anticipada"
              text="Las cuotas vuelven a sus meses originales."
              onPress={() => setConfirm('undo')}
            />
          ) : left > 1 ? (
            <OptionRow
              icon="fast-forward-outline"
              title="Cancelar anticipadamente"
              text={`Juntás las ${left} cuotas que faltan en ${lower(periodLabel(now, false))} y pagás ${nb(formatMoney(prog.remaining, p.currency))} de una.`}
              onPress={() => setConfirm('prepay')}
            />
          ) : null
        ) : null}

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Label>Cuotas</Label>
            <Text variant="labelMedium" style={{ color: palette.textDisabled }}>
              Tocá una para marcarla
            </Text>
          </View>
          <Card style={{ paddingVertical: space.xs }}>
            {schedule.map((e, i) => {
              const paid = isPaid(e);
              const previous = e.numbers.every((n) => p.paid?.[String(n)] === 'previo');
              const overdue = !paid && e.period < now;
              const isNext = i === nextIdx;
              const rel = !paid && !overdue ? whenLabel(e) : null;
              return (
                <View key={e.numbers.join('-')}>
                  {i > 0 ? <Divider /> : null}
                  <Row
                    icon={paid ? 'check-circle' : overdue ? 'alert-circle-outline' : 'circle-outline'}
                    iconColor={
                      paid
                        ? palette.income
                        : overdue
                          ? palette.expense
                          : isNext
                            ? color
                            : palette.textSecondary
                    }
                    title={
                      e.prepaid
                        ? `Cuotas ${e.numbers[0]} a ${e.numbers[e.numbers.length - 1]}`
                        : `Cuota ${e.numbers[0]}`
                    }
                    subtitle={
                      <>
                        {periodLabel(e.period)}
                        {paid ? (previous ? ' · pagada antes de cargarla' : ' · pagada') : null}
                        {overdue ? <Text style={{ color: palette.expense }}> · vencida</Text> : null}
                        {rel ? (
                          <Text style={{ color: isNext ? color : palette.textSecondary }}>
                            {' '}
                            · {lower(rel)}
                          </Text>
                        ) : null}
                      </>
                    }
                    right={formatMoney(e.amount, p.currency)}
                    rightColor={overdue ? palette.expense : undefined}
                    dim={paid}
                    onPress={() => openPay(e.period, e.numbers)}
                  />
                </View>
              );
            })}
          </Card>
        </View>
      </Screen>

      <PayDialog items={paying} onDismiss={() => setPaying(null)} />

      <ConfirmDialog
        visible={confirm === 'delete'}
        icon="trash-can-outline"
        title="¿Borrar esta compra?"
        message={
          prog.paidCount
            ? `Se borra "${p.description}" y sus ${left} ${left === 1 ? 'cuota pendiente' : 'cuotas pendientes'}. Las ${prog.paidCount} que ya pagaste quedan en tus movimientos.`
            : `Se borra "${p.description}" con sus ${p.installments} cuotas.`
        }
        confirmLabel="Borrar compra"
        tone="danger"
        onConfirm={async () => {
          await remove('purchases', p.id);
          goBack();
        }}
        onDismiss={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm === 'prepay'}
        icon="fast-forward-outline"
        title="¿Cancelar anticipadamente?"
        message={`Las ${left} cuotas restantes (${nb(formatMoney(prog.remaining, p.currency))}) se juntan en ${lower(periodLabel(now))}, para pagarlas de una.`}
        confirmLabel="Adelantar cuotas"
        onConfirm={async () => {
          await prepayPurchase(p, now);
          toast.show('Listo, quedan todas en este mes', {
            action: { label: 'Deshacer', onPress: () => undoPrepay(p).catch(() => {}) },
          });
        }}
        onDismiss={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm === 'undo'}
        icon="undo-variant"
        title="¿Deshacer la cancelación?"
        message="Las cuotas que adelantaste vuelven a su mes original."
        confirmLabel="Deshacer"
        onConfirm={async () => {
          const was = p.prepaidAt;
          await undoPrepay(p);
          toast.show('Las cuotas volvieron a sus meses', {
            action: { label: 'Deshacer', onPress: () => prepayPurchase(p, was).catch(() => {}) },
          });
        }}
        onDismiss={() => setConfirm(null)}
      />
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

/** Opción secundaria: fila sobria con ícono, título y explicación */
function OptionRow({ icon, title, text, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed && { opacity: 0.6 }]}>
      <IconBubble icon={icon} color={palette.textSecondary} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyLarge" style={{ fontFamily: 'Inter_500Medium' }}>
          {title}
        </Text>
        <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
          {text}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textDisabled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.xl, gap: space.md, overflow: 'hidden' },
  tags: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  num: { fontVariant: ['tabular-nums'] },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.border },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  section: { marginTop: space.xl },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});