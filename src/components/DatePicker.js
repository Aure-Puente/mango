//DatePicker:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';
import Svg, { Path } from 'react-native-svg';
import { addMonths, daysInMonth, fromDateStr, parsePeriod, periodLabel, periodOf, today } from '@/lib/dates';
import { palette, radius, space } from '@/theme';
import { ActionButton } from './ui';

const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const pad = (n) => String(n).padStart(2, '0');

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

function longDate(s) {
  const d = fromDateStr(s);
  const { year } = parsePeriod(periodOf(s));
  const txt = `${DAYS[d.getDay()]} ${d.getDate()} de ${periodLabel(periodOf(s), false).toLowerCase()}`;
  return txt[0].toUpperCase() + txt.slice(1) + (year !== new Date().getFullYear() ? ` de ${year}` : '');
}

export function DatePickerDialog({ visible, value, onConfirm, onDismiss, title = 'Elegí la fecha' }) {
  const [sel, setSel] = useState(value);
  const [month, setMonth] = useState(periodOf(value));
  const [pop] = useState(() => new Animated.Value(1));
  const hoy = today();

  const go = (n) => {
    tap();
    setMonth((m) => addMonths(m, n));
  };
  const [swipe] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 40) go(g.dx < 0 ? 1 : -1);
      },
    }),
  );

  const pick = (d) => {
    tap();
    setSel(d);
    if (periodOf(d) !== month) setMonth(periodOf(d));
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, damping: 11, stiffness: 260 }).start();
  };

  const first = fromDateStr(`${month}-01`).getDay();
  const total = daysInMonth(month);
  const cells = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: total }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <Portal>
      <Dialog visible={!!visible} onDismiss={onDismiss} style={styles.dialog}>
        <View style={styles.body}>
          <View style={{ gap: 2 }}>
            <Text variant="labelMedium" style={styles.caps}>
              {title}
            </Text>
            <Text variant="titleLarge" numberOfLines={1} adjustsFontSizeToFit>
              {longDate(sel)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.monthRow}>
            <Text variant="titleMedium" style={{ flex: 1 }}>
              {periodLabel(month)}
            </Text>
            {[
              { icon: 'chevron-left', n: -1, label: 'Mes anterior' },
              { icon: 'chevron-right', n: 1, label: 'Mes siguiente' },
            ].map((b) => (
              <Pressable
                key={b.icon}
                onPress={() => go(b.n)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={b.label}
                style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.5 }]}
              >
                <MaterialCommunityIcons name={b.icon} size={20} color={palette.text} />
              </Pressable>
            ))}
          </View>

          <View {...swipe.panHandlers}>
            <View style={styles.week}>
              {WEEKDAYS.map((w, i) => (
                <Text key={i} variant="labelSmall" style={styles.weekday}>
                  {w}
                </Text>
              ))}
            </View>
            {weeks.map((wk, r) => (
              <View key={r} style={styles.week}>
                {wk.map((d, c) => {
                  if (!d) return <View key={c} style={styles.cell} />;
                  const on = d === sel;
                  const isToday = d === hoy;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => pick(d)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={longDate(d)}
                      style={styles.cell}
                    >
                      {on ? (
                        <Animated.View style={[styles.mango, { transform: [{ scale: pop }] }]}>
                          <Leaf />
                          <Text variant="titleSmall" style={styles.mangoText}>
                            {Number(d.slice(8))}
                          </Text>
                        </Animated.View>
                      ) : (
                        <View style={[styles.day, isToday && styles.today]}>
                          <Text
                            variant="bodyMedium"
                            style={[
                              styles.num,
                              {
                                color: isToday
                                  ? palette.primary
                                  : d > hoy
                                    ? palette.textSecondary
                                    : palette.text,
                              },
                              isToday && { fontFamily: 'Inter_600SemiBold' },
                            ]}
                          >
                            {Number(d.slice(8))}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <ActionButton label="Listo" onPress={() => onConfirm(sel)} style={{ alignSelf: 'stretch' }} />
          <ActionButton
            variant="ghost"
            label="Cancelar"
            color={palette.textSecondary}
            onPress={onDismiss}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      </Dialog>
    </Portal>
  );
}

function Leaf() {
  return (
    <View pointerEvents="none" style={styles.leaf}>
      <Svg width={18} height={10} viewBox="54 -4 31 17">
        <Path d="M55 8 C61 -1 74 -3 84 1 C80 11 68 15 55 8 Z" fill={palette.income} />
      </Svg>
    </View>
  );
}

const SIZE = 38;

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    width: '92%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  body: { paddingHorizontal: space.xl, paddingTop: space.xs, gap: space.lg },
  caps: {
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginVertical: -space.xs },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: -space.xs },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceHigh,
  },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: palette.textDisabled,
    fontFamily: 'Inter_600SemiBold',
    paddingBottom: space.sm,
  },
  cell: { flex: 1, height: SIZE + 6, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { borderWidth: 1, borderColor: palette.primary + '66' },
  num: { fontVariant: ['tabular-nums'] },
  mango: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  mangoText: { color: palette.onPrimary, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  leaf: { position: 'absolute', top: -6, left: SIZE / 2 - 2 },
  actions: { padding: space.xl, paddingTop: space.lg, gap: space.xs },
});