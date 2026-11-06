import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Children, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { Switch, Text, TextInput } from 'react-native-paper';
import { addMonths, dateLabel, periodLabel } from '@/lib/dates';
import { currencySymbol } from '@/lib/money';
import { DatePickerDialog } from './DatePicker';
import { palette, radius, space, swatches } from '@/theme';

const tap = () => Haptics.selectionAsync().catch(() => {});

/** Campo de texto: superficie suave, borde casi invisible y acento mango al enfocar */
export function Field({ style, contentStyle, outlineStyle, ...props }) {
  return (
    <TextInput
      mode="outlined"
      outlineStyle={[{ borderRadius: radius.sm + 2, borderWidth: 1 }, outlineStyle]}
      style={[{ backgroundColor: palette.surface, fontSize: 15 }, style]}
      contentStyle={[{ fontFamily: 'Inter_400Regular' }, contentStyle]}
      outlineColor={palette.border}
      activeOutlineColor={palette.primary}
      textColor={palette.text}
      placeholderTextColor={palette.textDisabled}
      selectionColor={palette.primary}
      cursorColor={palette.primary}
      {...props}
    />
  );
}
Field.Icon = TextInput.Icon;
Field.Affix = TextInput.Affix;

/** Monto grande centrado, protagonista del formulario */
/**
 * `size`: tamaño del número (56 por defecto). Con `shrinkEmpty`, vacío se ve más chico
 * para que un campo opcional no se robe la atención.
 */
export function AmountInput({
  value,
  onChange,
  currency,
  onCurrency,
  color = palette.text,
  autoFocus,
  size = 56,
  shrinkEmpty,
}) {
  const fs = shrinkEmpty && !value ? Math.round(size * 0.65) : size;
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[styles.amountSymbol, fs < 44 && { fontSize: 20 }]}>{currencySymbol(currency)}</Text>
        <RNTextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^\d.,]/g, ''))}
          placeholder="0"
          placeholderTextColor={palette.textDisabled}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          selectionColor={palette.primary}
          cursorColor={palette.primary}
          style={[styles.amountInput, { color, fontSize: fs, letterSpacing: fs > 40 ? -2 : -1 }]}
        />
      </View>
      {onCurrency ? (
        <View style={styles.segment}>
          {['ARS', 'USD'].map((c) => {
            const on = currency === c;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  if (on) return;
                  tap();
                  onCurrency(c);
                }}
                style={[styles.segmentItem, on && styles.segmentItemOn]}
              >
                <Text
                  variant="labelLarge"
                  style={{ color: on ? palette.text : palette.textSecondary, fontSize: 13 }}
                >
                  {c === 'ARS' ? 'Pesos' : 'Dólares'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Control segmentado propio (reemplaza a SegmentedButtons de Paper):
 * una píldora se desliza bajo la opción elegida, igual que en la barra de pestañas.
 * `compact`: ancho justo para las opciones en vez de ocupar todo el renglón.
 * Cada opción acepta `icon` y `color`. Con el naranja de la marca (o sin color) la píldora es neutra:
 * un gris un poco más claro, con borde fino, que "flota" sobre el fondo. Otros colores
 * (ej: rojo de gasto, verde de ingreso) tiñen la píldora porque ahí el color dice algo.
 */
export function Segmented({ value, onChange, options, compact, style }) {
  const [w, setW] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  const placed = useRef(false);
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const itemW = w ? (w - 6) / options.length : 0;
  const tintOf = (c) => (c && c !== palette.primary ? c : null);
  const activeColor = tintOf(options[idx]?.color);

  useEffect(() => {
    if (!itemW) return;
    const to = idx * itemW;
    if (!placed.current) {
      x.setValue(to);
      placed.current = true;
      return;
    }
    Animated.spring(x, { toValue: to, useNativeDriver: true, damping: 20, stiffness: 260 }).start();
  }, [idx, itemW, x]);

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[styles.segmented, compact && { alignSelf: 'flex-start' }, style]}
    >
      {itemW ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentedPill,
            { width: itemW, transform: [{ translateX: x }] },
            activeColor && { backgroundColor: activeColor + '24', borderColor: activeColor + '33' },
          ]}
        />
      ) : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (on) return;
              tap();
              onChange(o.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.segmentedItem, compact ? { minWidth: 56, paddingHorizontal: 12 } : { flex: 1 }]}
          >
            {o.icon ? (
              <MaterialCommunityIcons
                name={o.icon}
                size={16}
                color={on ? (tintOf(o.color) ?? palette.text) : palette.textSecondary}
              />
            ) : null}
            <Text
              variant="labelLarge"
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontFamily: on ? 'Inter_600SemiBold' : 'Inter_500Medium',
                color: on ? (tintOf(o.color) ?? palette.text) : palette.textSecondary,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Buscador minimalista (reemplaza al Searchbar de Paper) */
export function SearchField({ value, onChangeText, placeholder = 'Buscar' }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && { borderColor: palette.primary + '99' }]}>
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color={focused ? palette.primary : palette.textSecondary}
      />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textDisabled}
        selectionColor={palette.primary}
        cursorColor={palette.primary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        style={styles.searchInput}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
          <MaterialCommunityIcons name="close-circle" size={18} color={palette.textDisabled} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Selector horizontal de chips (cuentas, categorías, tarjetas) */
/** `tintIcons`: los íconos de las opciones no elegidas también llevan su color (más suave) */
export function ChipSelect({ options, value, onChange, wrap, allowNone, tintIcons }) {
  const chips = options.map((o) => {
    const on = o.value === value;
    const c = o.color ?? palette.primary;
    return (
      <Pressable
        key={o.value}
        onPress={() => {
          tap();
          onChange(on && allowNone ? null : o.value);
        }}
        style={({ pressed }) => [
          styles.chip,
          on && { backgroundColor: c + '1F', borderColor: c + '99' },
          pressed && { opacity: 0.7 },
        ]}
      >
        {o.icon ? (
          <MaterialCommunityIcons
            name={o.icon}
            size={16}
            color={on ? c : tintIcons && o.color ? o.color + 'B3' : palette.textSecondary}
          />
        ) : o.color ? (
          <View style={[styles.dot, { backgroundColor: c }]} />
        ) : null}
        <Text variant="labelLarge" style={{ color: on ? palette.text : palette.textSecondary, fontSize: 13 }}>
          {o.label}
        </Text>
      </Pressable>
    );
  });
  if (wrap) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{chips}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}
      style={{ marginHorizontal: -space.lg, paddingLeft: space.lg }}
    >
      {chips}
    </ScrollView>
  );
}

export function DateField({ value, onChange, label = 'Fecha' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.inlineField, pressed && { opacity: 0.6 }]}
      >
        <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={palette.textSecondary} />
        <Text variant="bodyLarge" style={{ flex: 1 }}>
          {label}
        </Text>
        <Text variant="bodyLarge" style={{ color: palette.text, fontFamily: 'Inter_600SemiBold' }}>
          {dateLabel(value)}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textDisabled} />
      </Pressable>
      {open ? (
        <DatePickerDialog
          visible
          value={value}
          onDismiss={() => setOpen(false)}
          onConfirm={(d) => {
            setOpen(false);
            if (d) onChange(d);
          }}
        />
      ) : null}
    </>
  );
}

/** Botón redondo chico (flechas del mes, más/menos del stepper) */
function RoundButton({ icon, onPress, disabled, size = 36 }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.round,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && { backgroundColor: palette.border },
        disabled && { opacity: 0.35 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={18} color={palette.text} />
    </Pressable>
  );
}

export function MonthSwitcher({ value, onChange, min, max }) {
  return (
    <View style={styles.month}>
      <RoundButton
        icon="chevron-left"
        onPress={() => {
          tap();
          onChange(addMonths(value, -1));
        }}
        disabled={!!min && value <= min}
      />
      <Text variant="titleMedium" style={{ flex: 1, textAlign: 'center', textTransform: 'capitalize' }}>
        {periodLabel(value)}
      </Text>
      <RoundButton
        icon="chevron-right"
        onPress={() => {
          tap();
          onChange(addMonths(value, 1));
        }}
        disabled={!!max && value >= max}
      />
    </View>
  );
}

/** Fila compacta para elegir un mes: "Empieza   ‹ Noviembre 2026 ›" (va dentro de un Group) */
export function MonthStepper({ label, value, onChange, min, max }) {
  return (
    <View style={styles.inlineField}>
      <Text variant="bodyLarge" style={{ flex: 1 }}>
        {label}
      </Text>
      <RoundButton
        icon="chevron-left"
        size={32}
        onPress={() => {
          tap();
          onChange(addMonths(value, -1));
        }}
        disabled={!!min && value <= min}
      />
      <Text variant="titleSmall" style={{ minWidth: 112, textAlign: 'center' }}>
        {periodLabel(value)}
      </Text>
      <RoundButton
        icon="chevron-right"
        size={32}
        onPress={() => {
          tap();
          onChange(addMonths(value, 1));
        }}
        disabled={!!max && value >= max}
      />
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99, label, suffix }) {
  return (
    <View style={styles.inlineField}>
      <Text variant="bodyLarge" style={{ flex: 1 }}>
        {label}
      </Text>
      <RoundButton
        icon="minus"
        size={32}
        onPress={() => {
          tap();
          onChange(Math.max(min, value - 1));
        }}
        disabled={value <= min}
      />
      <Text
        variant="titleMedium"
        style={{ minWidth: 44, textAlign: 'center', fontVariant: ['tabular-nums'] }}
      >
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
      <RoundButton
        icon="plus"
        size={32}
        onPress={() => {
          tap();
          onChange(Math.min(max, value + 1));
        }}
        disabled={value >= max}
      />
    </View>
  );
}

export function SwitchRow({ label, description, value, onChange, icon }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onChange(!value);
      }}
      style={[styles.inlineField, { paddingVertical: space.md }]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={20} color={palette.textSecondary} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyLarge">{label}</Text>
        {description ? (
          <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: 1 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} color={palette.primary} />
    </Pressable>
  );
}

export function ColorPicker({ value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {swatches.map((c) => {
        const on = value === c;
        return (
          <Pressable
            key={c}
            onPress={() => {
              tap();
              onChange(c);
            }}
            style={[styles.swatchRing, on && { borderColor: c }]}
          >
            <View style={[styles.swatch, { backgroundColor: c }]}>
              {on ? <MaterialCommunityIcons name="check" size={16} color={palette.background} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export const CATEGORY_ICONS = [
  'cart-outline',
  'silverware-fork-knife',
  'coffee-outline',
  'bus',
  'car-outline',
  'gas-station-outline',
  'home-outline',
  'flash-outline',
  'water-outline',
  'wifi',
  'cellphone',
  'play-box-multiple-outline',
  'heart-pulse',
  'pill',
  'dumbbell',
  'tshirt-crew-outline',
  'school-outline',
  'book-open-variant',
  'gamepad-variant-outline',
  'glass-cocktail',
  'airplane',
  'gift-outline',
  'paw',
  'baby-face-outline',
  'hammer-wrench',
  'credit-card-outline',
  'bank-outline',
  'briefcase-outline',
  'cash',
  'cash-plus',
  'star-circle-outline',
  'chart-line',
  'piggy-bank-outline',
  'beer-outline',
  'music',
  'dots-horizontal',
];

/** Íconos para metas de ahorro */
export const GOAL_ICONS = [
  'piggy-bank-outline',
  'airplane',
  'beach',
  'car-outline',
  'bike',
  'motorbike',
  'home-outline',
  'laptop',
  'cellphone',
  'television',
  'gamepad-variant-outline',
  'camera-outline',
  'school-outline',
  'ring',
  'baby-face-outline',
  'paw',
  'gift-outline',
  'shield-check-outline',
  'heart-outline',
  'star-outline',
];

export function IconPicker({ value, onChange, color, icons = CATEGORY_ICONS }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {icons.map((i) => {
        const on = i === value;
        return (
          <Pressable
            key={i}
            onPress={() => {
              tap();
              onChange(i);
            }}
            style={[styles.iconCell, on && { backgroundColor: color + '1F', borderColor: color + '99' }]}
          >
            <MaterialCommunityIcons name={i} size={22} color={on ? color : palette.textSecondary} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bloque agrupado tipo "ajustes": las filas de adentro se separan solas con una línea fina */
export function Group({ children }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {items.map((c, i) => (
        <View key={c.key ?? i}>
          {i > 0 ? <View style={styles.groupDivider} /> : null}
          {c}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  amountSymbol: {
    fontSize: 26,
    fontFamily: 'Inter_500Medium',
    color: palette.textSecondary,
    letterSpacing: -0.5,
  },
  amountInput: {
    fontSize: 56,
    fontFamily: 'Inter_600SemiBold',
    minWidth: 48,
    letterSpacing: -2,
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  segment: {
    flexDirection: 'row',
    marginTop: space.lg,
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  segmentItem: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: radius.pill },
  segmentItemOn: { backgroundColor: palette.surfaceHigh },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  segmentedPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: radius.pill,
    backgroundColor: '#2A2A30',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentedItem: { height: 34, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radius.sm + 2,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    padding: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  inlineField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    minHeight: 56,
  },
  group: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
    marginLeft: space.lg,
  },
  month: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceHigh,
  },
  swatchRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
});