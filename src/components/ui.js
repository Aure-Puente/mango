import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Children, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { MAX_FORM, useLayout } from '@/hooks/useLayout';
import { goBack } from '@/navigation/RootNavigation';
import { motion, palette, radius, space } from '@/theme';

/* ---------- Interacción ---------- */

/**
 * Pressable que se achica apenas al tocarlo. Es el feedback táctil de toda la app:
 * tarjetas, botones propios, chips. Usa el driver nativo, así que no cuesta rendimiento.
 */
export function PressableScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.97,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v, d) => Animated.timing(scale, { toValue: v, duration: d, useNativeDriver: true }).start();
  const flat = typeof style === 'function' ? undefined : style;
  return (
    <Pressable
      disabled={disabled}
      style={containerStyle}
      onPressIn={(e) => {
        to(scaleTo, motion.fast);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1, motion.base);
        onPressOut?.(e);
      }}
      {...rest}
    >
      {(state) => (
        <Animated.View
          style={[typeof style === 'function' ? style(state) : flat, { transform: [{ scale }] }]}
        >
          {typeof children === 'function' ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}

/**
 * Fondo detrás de la status bar (hora, batería): una franja del color del fondo que se funde
 * hacia abajo, para que el contenido que scrollea no se vea a través de los íconos del sistema.
 * Va una sola vez por encima de las pestañas (ver app/(tabs)/_layout.jsx).
 */
export function StatusBarScrim({ fade = 18 }) {
  const insets = useSafeAreaInsets();
  if (!insets.top) return null;
  return (
    <View pointerEvents="none" style={styles.scrim}>
      <View style={{ height: insets.top, backgroundColor: palette.background }} />
      <LinearGradient colors={[palette.background, palette.background + '00']} style={{ height: fade }} />
    </View>
  );
}

/**
 * Entrada suave: el contenido aparece subiendo unos pocos píxeles mientras se hace visible.
 * Se usa en <Screen> y <Section>, así cada pantalla "respira" al abrirse.
 */
export function FadeIn({ children, delay = 0, distance = 10, style }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: motion.slow,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Bloque gris que late suave mientras cargan los datos (en vez de un spinner) */
export function Skeleton({ width = '100%', height = 14, radius: r = 8, style }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: r, backgroundColor: palette.surfaceHigh },
        { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }) },
        style,
      ]}
    />
  );
}

/** Filas de lista "fantasma" para estados de carga */
export function SkeletonRows({ count = 4 }) {
  return (
    <Card style={{ paddingVertical: space.xs }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          {i > 0 ? <Divider /> : null}
          <View style={[styles.row, { paddingVertical: 14 }]}>
            <Skeleton width={40} height={40} radius={13} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={`${55 + ((i * 17) % 30)}%`} height={13} />
              <Skeleton width="35%" height={11} />
            </View>
            <Skeleton width={64} height={14} />
          </View>
        </View>
      ))}
    </Card>
  );
}

/* ---------- Pantallas ---------- */

/** Pantalla principal de pestaña: título grande, scroll y padding consistentes */
export function Screen({ title, subtitle, right, children, refreshing, onRefresh, bottomInset = 0, wide }) {
  const insets = useSafeAreaInsets();
  const { max } = useLayout(wide);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{
        paddingTop: title ? insets.top + space.lg : space.lg,
        paddingHorizontal: space.lg,
        paddingBottom: space.xxl + bottomInset,
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
            progressBackgroundColor={palette.surface}
          />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <FadeIn style={{ width: '100%', maxWidth: max, alignSelf: 'center' }}>
        {title ? <ScreenTitle title={title} subtitle={subtitle} right={right} /> : null}
        {children}
      </FadeIn>
    </ScrollView>
  );
}

/**
 * Manguito: el punto naranja con su hojita que marca cada sección (mismo dibujo que el logo, en miniatura).
 */
/**
 * Manguito relleno que acompaña los títulos: la misma silueta del logo (cuello, panza y hoja),
 * pero rellena, porque en tamaños chicos el contorno se ve flojo. `size` = ancho en px.
 */
const MANGO_BODY =
  'M52 12 C74 12 88 32 86 55 C84 78 66 92 47 90 C27 88 14 73 16 56 C18 42 28 35 36 29 C43 24 44 12 52 12 Z';
const MANGO_LEAF = 'M55 8 C61 -1 74 -3 84 1 C80 11 68 15 55 8 Z';

export function MangoDot({ size = 14 }) {
  return (
    <Svg width={size} height={size * (97 / 74)} viewBox="14 -5 74 97">
      <Path d={MANGO_BODY} fill={palette.primary} />
      <Path d={MANGO_LEAF} fill={palette.income} />
    </Svg>
  );
}

/** Título grande de pestaña con el manguito a la izquierda */
export function ScreenTitle({ title, subtitle, right, style }) {
  return (
    <View style={[styles.header, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ marginTop: -3 }}>
            <MangoDot />
          </View>
          <Text variant="headlineMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text variant="bodyMedium" style={{ color: palette.textSecondary, marginTop: 2, marginLeft: 24 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{right}</View> : null}
    </View>
  );
}

/**
 * Dos columnas en tablets horizontales; en teléfono y tablet vertical, una debajo de la otra.
 * Se usa dentro de <Screen wide>.
 */
export function Columns({ left, right }) {
  const { twoCol, gap } = useLayout(true);
  if (!twoCol)
    return (
      <>
        {left}
        {right}
      </>
    );
  return (
    <View style={{ flexDirection: 'row', gap, alignItems: 'flex-start' }}>
      <View style={{ flex: 1, minWidth: 0 }}>{left}</View>
      <View style={{ flex: 1, minWidth: 0 }}>{right}</View>
    </View>
  );
}

/** Pantalla de formulario (se usa dentro de un Stack con header) con botón de guardar fijo abajo */
export function FormScreen({ children, onSave, saveLabel = 'Guardar', saving, disabled, extraAction }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: space.md, paddingBottom: space.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: MAX_FORM, alignSelf: 'center', gap: space.lg + 4 }}>
          {children}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            width: '100%',
            maxWidth: MAX_FORM,
            alignSelf: 'center',
          }}
        >
          {extraAction}
          <Button
            mode="contained"
            onPress={onSave}
            loading={saving}
            disabled={disabled || saving}
            style={{ flex: 1, borderRadius: radius.pill }}
            contentStyle={{ height: 54 }}
            labelStyle={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.1 }}
          >
            {saveLabel}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------- Bloques ---------- */

export function Card({ children, style, onPress }) {
  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.card, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({ title, action, onAction, children, style }) {
  return (
    <FadeIn delay={70} style={[{ marginTop: space.xxl }, style]}>
      <View style={styles.sectionHead}>
        <Text variant="titleMedium">{title}</Text>
        {action ? (
          <Pressable
            onPress={onAction}
            hitSlop={10}
            style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.5 }]}
          >
            <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
              {action}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </FadeIn>
  );
}

/** Ícono sobre un fondo suave del mismo color, en forma de "squircle" */
export function IconBubble({ icon, color = palette.primary, size = 40 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: color + '1C',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={icon} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

export function Row({
  icon,
  iconColor,
  left, // en lugar del ícono, cualquier cosa (ej: un avatar con iniciales)
  title,
  subtitle,
  right,
  rightSub,
  rightColor,
  onPress,
  onLongPress,
  dim,
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.55 }, dim && { opacity: 0.45 }]}
    >
      {left ?? (icon ? <IconBubble icon={icon} color={iconColor} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyLarge" numberOfLines={1} style={{ fontFamily: 'Inter_500Medium' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary, marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof right === 'string' ? (
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Text variant="bodyLarge" style={[styles.amount, { color: rightColor ?? palette.text }]}>
            {right}
          </Text>
          {rightSub ? (
            <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: 1 }}>
              {rightSub}
            </Text>
          ) : null}
        </View>
      ) : (
        right
      )}
    </Pressable>
  );
}

/** Separador fino alineado con el texto de las filas (deja libre el ícono) */
export function Divider() {
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: 52 }} />
  );
}

export function Empty({ icon, title, text, action, onAction }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.lg }}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name={icon} size={26} color={palette.textSecondary} />
      </View>
      <Text variant="titleMedium" style={{ marginTop: space.lg, textAlign: 'center' }}>
        {title}
      </Text>
      {text ? (
        <Text
          variant="bodyMedium"
          style={{ color: palette.textSecondary, textAlign: 'center', maxWidth: 280, marginTop: space.xs }}
        >
          {text}
        </Text>
      ) : null}
      {action ? (
        <Button
          mode="contained-tonal"
          onPress={onAction}
          style={{ marginTop: space.lg, borderRadius: radius.pill }}
          contentStyle={{ height: 42, paddingHorizontal: space.sm }}
          labelStyle={{ fontFamily: 'Inter_600SemiBold' }}
        >
          {action}
        </Button>
      ) : null}
    </View>
  );
}

/** Barra de progreso que cambia de color según el avance (presupuestos) */
export function Bar({ value, color, warnAt = 0.8, height = 6 }) {
  const v = Math.max(0, Math.min(1, value));
  const c =
    color ??
    (warnAt != null
      ? value >= 1
        ? palette.expense
        : value >= warnAt
          ? palette.warning
          : palette.income
      : palette.primary);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: palette.hairline, overflow: 'hidden' }}>
      <View
        style={{
          width: `${v * 100}%`,
          minWidth: v > 0 ? height : 0,
          height,
          borderRadius: height,
          backgroundColor: c,
        }}
      />
    </View>
  );
}

export function Pill({ label, color = palette.textSecondary, icon }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '1C' }]}>
      {icon ? <MaterialCommunityIcons name={icon} size={12} color={color} /> : null}
      <Text variant="labelMedium" style={{ color, fontFamily: 'Inter_600SemiBold' }}>
        {label}
      </Text>
    </View>
  );
}

/** Rótulo chico en mayúsculas para separar bloques de un formulario */
export function Label({ children }) {
  return (
    <Text variant="labelMedium" style={styles.label}>
      {children}
    </Text>
  );
}

export function BackButton() {
  return (
    <Pressable
      onPress={goBack}
      hitSlop={10}
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
    >
      <MaterialCommunityIcons name="close" size={18} color={palette.text} />
    </Pressable>
  );
}

/**
 * Botón de ícono para headers y barras (reemplaza al IconButton de Paper):
 * sin ripple, se hunde apenas y aparece un fondo suave al presionar.
 */
export function HeaderButton({ icon, onPress, color = palette.text, accessibilityLabel, filled, badge }) {
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={8}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? icon}
      style={({ pressed }) => [
        styles.headerBtn,
        filled && { backgroundColor: palette.surfaceHigh },
        pressed && { backgroundColor: palette.surfaceHigh },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      {badge ? <View style={styles.badge} /> : null}
    </PressableScale>
  );
}

/**
 * Botón ancho en píldora (reemplaza al Button de Paper en pantallas).
 * variant: 'solid' (relleno) · 'tonal' (fondo suave) · 'outline' (borde) · 'ghost' (solo texto)
 */
export function ActionButton({
  label,
  icon,
  onPress,
  variant = 'solid',
  color = palette.primary,
  loading,
  disabled,
  style,
}) {
  const fg = variant === 'solid' ? palette.onPrimary : color;
  const bg = variant === 'solid' ? color : variant === 'tonal' ? color + '1F' : 'transparent';
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.97}
      accessibilityRole="button"
      containerStyle={style}
      style={[
        styles.actionBtn,
        { backgroundColor: bg },
        variant === 'outline' && { borderWidth: 1, borderColor: color + '55' },
        variant === 'ghost' && { height: 44 },
        disabled && { opacity: 0.45 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size={18} color={fg} />
      ) : icon ? (
        <MaterialCommunityIcons name={icon} size={18} color={fg} />
      ) : null}
      <Text variant="labelLarge" style={{ color: fg, fontSize: 15 }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Botón chico en píldora para acciones dentro de pantallas ("+ Fijo", "Pagar") */
/**
 * Botón chico tipo chip.
 * - `solid`: relleno de color (acción principal, ej: "Pagar").
 * - `tonal` con el naranja de la marca: neutro y minimalista, gris con borde fino y solo
 *   el ícono en naranja (ej: "+ Fijo" arriba a la derecha).
 * - `tonal` con otro color: se tiñe apenas con ese color (ej: "Aportar" con el color de la meta).
 */
export function SmallButton({ label, icon, onPress, variant = 'tonal', color = palette.primary, disabled }) {
  const solid = variant === 'solid';
  const neutral = !solid && color === palette.primary;
  const fg = solid ? palette.onPrimary : neutral ? palette.text : color;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      scaleTo={0.94}
      accessibilityRole="button"
      style={[
        styles.smallBtn,
        solid
          ? { backgroundColor: color }
          : neutral
            ? styles.smallBtnNeutral
            : { backgroundColor: color + '1F' },
        disabled && { opacity: 0.4 },
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={neutral ? palette.primary : fg} /> : null}
      <Text variant="labelLarge" style={{ color: fg, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Ayuda para listas dentro de tarjetas: intercala <Divider /> entre los hijos */
export function withDividers(children) {
  const items = Children.toArray(children).filter(Boolean);
  return items.flatMap((c, i) => (i === 0 ? [c] : [<Divider key={`d-${i}`} />, c]));
}

export const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.xl, gap: space.sm },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: space.lg + 4,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
    paddingHorizontal: 2,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  amount: { fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: palette.background,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: space.sm,
    marginLeft: 2,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  badge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
    borderWidth: 1.5,
    borderColor: palette.background,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  smallBtnNeutral: {
    backgroundColor: palette.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingLeft: 11,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Halo cálido y suave hecho con círculos concéntricos muy transparentes.
 * (El degradado radial de SVG se ve con anillos de colores en Android.)
 */
export function SoftHalo({ size, color = palette.primary, steps = 18, strength = 0.16 }) {
  const each = strength / steps;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {Array.from({ length: steps }, (_, i) => (
        <Circle key={i} cx="50" cy="50" r={50 - (i * 44) / steps} fill={color} fillOpacity={each} />
      ))}
    </Svg>
  );
}