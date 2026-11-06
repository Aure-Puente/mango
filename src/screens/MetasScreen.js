//MetasScreen:
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Dialog, Portal, Text } from 'react-native-paper';
import { AmountInput, Segmented } from '@/components/fields';
import { dialogStyle } from '@/components/finance';
import {
  ActionButton,
  Bar,
  Card,
  Empty,
  HeaderButton,
  IconBubble,
  Pill,
  Screen,
  SmallButton,
} from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { currentPeriod, monthsBetween, periodOf, periodShort } from '@/lib/dates';
import { formatMoney, parseAmount, percent } from '@/lib/money';
import { navigate } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

const shortMonthYear = (p) => `${periodShort(p).split(' ')[0].toLowerCase()} ${p.slice(0, 4)}`;

export default function Goals() {
  const { goals, contributeGoal, conv, fmt, display } = useFinance();

  const now = currentPeriod();
  const rows = goals.map((g) => {
    const ratio = g.target ? g.saved / g.target : 0;
    const left = Math.max(0, g.target - g.saved);
    const monthsLeft = g.deadline ? monthsBetween(now, periodOf(g.deadline)) : null;
    const perMonth = ratio < 1 && monthsLeft && monthsLeft > 0 ? Math.ceil(left / monthsLeft) : null;
    return { g, ratio, left, perMonth };
  });
  const totalSaved = rows.reduce((s, r) => s + conv(r.g.saved, r.g.currency), 0);
  const totalTarget = rows.reduce((s, r) => s + conv(r.g.target, r.g.currency), 0);
  const totalPerMonth = rows.reduce((s, r) => s + (r.perMonth ? conv(r.perMonth, r.g.currency) : 0), 0);
  const done = rows.filter((r) => r.ratio >= 1).length;
  const toast = useToast();
  const [target, setTarget] = useState(null);
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');

  const close = () => {
    setTarget(null);
    setAmount('');
  };

  const confirm = async (v) => {
    await contributeGoal(target, mode === 'add' ? v : -v);
    const after = target.saved + (mode === 'add' ? v : -v);
    toast.show(
      mode === 'add' && after >= target.target ? `¡Llegaste a la meta "${target.name}"! 🎉` : 'Listo',
    );
    close();
  };

  return (
    <>
      <ScreenOptions
        options={{
          headerRight: () => (
            <HeaderButton icon="plus" accessibilityLabel="Agregar" onPress={() => navigate('Meta')} />
          ),
        }}
      />
      <Screen>
        {goals.length === 0 ? (
          <Card>
            <Empty
              icon="piggy-bank-outline"
              title="Sin metas todavía"
              text="Ej: USD 500 para las vacaciones, fondo de emergencia, una compu nueva."
              action="Crear meta"
              onAction={() => navigate('Meta')}
            />
          </Card>
        ) : (
          <View style={{ gap: space.md }}>
            <Card style={styles.hero}>
              <LinearGradient
                pointerEvents="none"
                colors={[palette.primary + '26', palette.primary + '00']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0.25, y: 0.85 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
                  Ahorrado en metas
                </Text>
                {done ? (
                  <Pill
                    label={`${done} cumplida${done === 1 ? '' : 's'}`}
                    color={palette.income}
                    icon="check"
                  />
                ) : null}
              </View>
              <View>
                <Text variant="displaySmall" style={styles.num}>
                  {fmt(totalSaved, display)}
                </Text>
                <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: 2 }}>
                  de {fmt(totalTarget, display)} ·{' '}
                  {percent(totalTarget ? Math.min(1, totalSaved / totalTarget) : 0)}
                </Text>
              </View>
              <Bar
                value={totalTarget ? totalSaved / totalTarget : 0}
                color={palette.primary}
                warnAt={null}
                height={8}
              />
              {totalPerMonth > 0 ? (
                <View style={styles.heroFoot}>
                  <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
                    Para llegar a tiempo, apartá por mes
                  </Text>
                  <Text variant="titleMedium" style={styles.num}>
                    {fmt(totalPerMonth, display)}
                  </Text>
                </View>
              ) : null}
            </Card>

            {rows.map(({ g, ratio, left, perMonth }) => {
              const started = g.saved > 0;
              const tint = started ? g.color : palette.textSecondary;
              return (
                <Card key={g.id} style={{ gap: space.md }} onPress={() => navigate('Meta', { id: g.id })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <IconBubble
                      icon={ratio >= 1 ? 'trophy-outline' : (g.icon ?? 'piggy-bank-outline')}
                      color={g.color}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="titleMedium" numberOfLines={1}>
                        {g.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                        {formatMoney(g.saved, g.currency)} de {formatMoney(g.target, g.currency)}
                      </Text>
                    </View>
                    <Text variant="titleMedium" style={[styles.num, { color: tint }]}>
                      {percent(Math.min(1, ratio))}
                    </Text>
                  </View>
                  <Bar value={ratio} color={g.color} warnAt={null} height={8} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {ratio >= 1 ? (
                        <Pill label="¡Cumplida!" color={palette.income} icon="check" />
                      ) : (
                        <>
                          <Text variant="titleSmall" style={styles.num}>
                            Faltan {formatMoney(left, g.currency)}
                          </Text>
                          <Text
                            variant="bodySmall"
                            numberOfLines={2}
                            style={{ color: palette.textSecondary, marginTop: 1 }}
                          >
                            {[
                              started ? null : 'Sin aportes',
                              perMonth ? `${formatMoney(perMonth, g.currency)}/mes` : null,
                              g.deadline
                                ? `hasta ${shortMonthYear(periodOf(g.deadline))}`
                                : 'sin fecha límite',
                            ]
                              .filter(Boolean)
                              .join(' · ')
                              .replace(/^./, (c) => c.toUpperCase())}
                          </Text>
                        </>
                      )}
                    </View>
                    <SmallButton
                      icon="plus"
                      label="Aportar"
                      color={g.color}
                      onPress={() => {
                        setMode('add');
                        setTarget(g);
                      }}
                    />
                  </View>
                </Card>
              );
            })}
            <Text
              variant="bodySmall"
              style={{ color: palette.textDisabled, textAlign: 'center', marginTop: space.sm }}
            >
              Los aportes son un apartado: la plata sigue en tus cuentas.
            </Text>
          </View>
        )}
      </Screen>

      <ContributeDialog
        goal={target}
        mode={mode}
        onMode={setMode}
        amount={amount}
        onAmount={setAmount}
        onConfirm={confirm}
        onDismiss={close}
      />
    </>
  );
}

function ContributeDialog({ goal, mode, onMode, amount, onAmount, onConfirm, onDismiss }) {
  const [busy, setBusy] = useState(false);
  if (!goal) return null;

  const v = parseAmount(amount) ?? 0;
  const adding = mode === 'add';
  const tooMuch = !adding && v > goal.saved;
  const after = Math.max(0, goal.saved + (adding ? v : -v));
  const ratio = goal.target ? after / goal.target : 0;
  const reaches = adding && v > 0 && goal.saved < goal.target && after >= goal.target;
  const color = adding ? goal.color : palette.expense;
  const money = (x) => formatMoney(x, goal.currency);

  const submit = async () => {
    if (!v || tooMuch) return;
    setBusy(true);
    try {
      await onConfirm(v);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <Dialog visible onDismiss={busy ? undefined : onDismiss} style={[dialogStyle, styles.dialog]}>
        <View style={styles.dHead}>
          <IconBubble icon={goal.icon ?? 'piggy-bank-outline'} color={goal.color} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="titleLarge" numberOfLines={1}>
              {goal.name}
            </Text>
            <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: 1 }}>
              Llevás {money(goal.saved)} de {money(goal.target)}
            </Text>
          </View>
        </View>

        <View style={styles.dBody}>
          <Segmented
            value={mode}
            onChange={onMode}
            options={[
              { value: 'add', label: 'Sumar', icon: 'plus', color: palette.income },
              { value: 'sub', label: 'Retirar', icon: 'minus', color: palette.expense },
            ]}
          />
          <AmountInput value={amount} onChange={onAmount} currency={goal.currency} autoFocus />

          <View style={styles.preview}>
            {tooMuch ? (
              <View style={styles.previewRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={palette.expense} />
                <Text variant="bodySmall" style={{ color: palette.expense, flex: 1 }}>
                  Solo tenés {money(goal.saved)} en esta meta
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.previewRow}>
                  <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
                    {reaches ? '¡Con esto llegás a la meta! 🎉' : v ? 'Quedaría en' : 'Ahora'}
                  </Text>
                  <Text variant="labelLarge" style={styles.num}>
                    {money(after)} · {percent(Math.min(1, ratio))}
                  </Text>
                </View>
                <Bar value={ratio} color={reaches ? palette.income : goal.color} warnAt={null} height={6} />
              </>
            )}
          </View>
        </View>

        <View style={styles.dActions}>
          <ActionButton
            label={v ? `${adding ? 'Sumar' : 'Retirar'} ${money(v)}` : adding ? 'Sumar' : 'Retirar'}
            icon={adding ? 'plus' : 'minus'}
            color={color}
            onPress={submit}
            loading={busy}
            disabled={!v || tooMuch}
          />
          <ActionButton
            variant="ghost"
            label="Cancelar"
            color={palette.textSecondary}
            onPress={onDismiss}
            disabled={busy}
          />
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { maxWidth: 420, paddingTop: space.xl },
  dHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl },
  dBody: { paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.sm },
  preview: {
    gap: space.sm,
    padding: space.md,
    borderRadius: 14,
    backgroundColor: palette.surfaceHigh,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dActions: { padding: space.xl, paddingTop: space.lg, gap: space.xs },
  hero: { padding: space.xl, gap: space.lg, overflow: 'hidden', borderColor: palette.primary + '26' },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  num: { fontVariant: ['tabular-nums'] },
});