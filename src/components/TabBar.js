import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MAX_CONTENT } from '@/hooks/useLayout';
import { FabDim } from './MangoFab';
import { motion, palette, radius, space } from '@/theme';

const PILL_W = 52;
const PILL_H = 32;

/**
 * Barra de pestañas propia de Mango.
 * - Flota sobre el fondo como una cápsula, con borde fino (sin sombra ni ripple).
 * - Una "píldora" suave se desliza detrás del ícono activo con un resorte.
 * - Al presionar, el ícono se hunde apenas y vibra suave al cambiar de pestaña.
 * Se renderiza en el flujo (no absoluta), así que no tapa el contenido de las pantallas.
 */
export function TabBar({ state, descriptors, insets, emitter, navigateToTab, navigation }) {
  // Expo Router (SDK 58) pasa `emitter` y `navigateToTab`; versiones anteriores pasaban `navigation`
  const emit = (e) => (emitter ?? navigation).emit(e);
  const goTo = (route) =>
    navigateToTab ? navigateToTab(route.key) : navigation.navigate(route.name, route.params);

  const routes = state.routes.filter((r) => descriptors[r.key].options.href !== null);
  const activeKey = state.routes[state.index]?.key;
  const index = Math.max(
    0,
    routes.findIndex((r) => r.key === activeKey),
  );

  const [width, setWidth] = useState(0);
  const tabW = routes.length ? width / routes.length : 0;
  const [x] = useState(() => new Animated.Value(0));
  const placed = useRef(false);

  useEffect(() => {
    if (!tabW) return;
    const to = index * tabW + (tabW - PILL_W) / 2;
    if (!placed.current) {
      // Primera vez: la ubicamos sin animar para que no "viaje" al abrir la app
      x.setValue(to);
      placed.current = true;
      return;
    }
    Animated.spring(x, {
      toValue: to,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.9,
    }).start();
  }, [index, tabW, x]);

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, space.md) + (Platform.OS === 'android' ? 2 : 0) },
      ]}
    >
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {tabW ? (
          <Animated.View pointerEvents="none" style={[styles.pill, { transform: [{ translateX: x }] }]} />
        ) : null}
        {routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const focused = i === index;
          const label =
            typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);

          const onPress = () => {
            const event = emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              Haptics.selectionAsync().catch(() => {});
              goTo(route);
            }
          };
          const onLongPress = () => emit({ type: 'tabLongPress', target: route.key });

          return (
            <TabItem
              key={route.key}
              label={label}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title ?? label}
              renderIcon={(color) => options.tabBarIcon?.({ focused, color, size: 22 })}
            />
          );
        })}
      </View>
      {/* Se oscurece junto con la pantalla cuando el menú del mango está abierto */}
      <FabDim />
    </View>
  );
}

function TabItem({ label, focused, onPress, onLongPress, accessibilityLabel, renderIcon }) {
  const [scale] = useState(() => new Animated.Value(1));
  const [active] = useState(() => new Animated.Value(focused ? 1 : 0));

  useEffect(() => {
    Animated.timing(active, {
      toValue: focused ? 1 : 0,
      duration: motion.base,
      useNativeDriver: true,
    }).start();
  }, [focused, active]);

  const press = (v) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      damping: 15,
      stiffness: 320,
    }).start();

  const color = focused ? palette.primary : palette.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => press(0.86)}
      onPressOut={() => press(1)}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      android_ripple={null}
      style={styles.item}
    >
      <Animated.View
        style={{
          height: PILL_H,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [
            { scale },
            { translateY: active.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
          ],
        }}
      >
        {renderIcon(color)}
      </Animated.View>
      <Animated.View style={{ opacity: active.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[styles.label, { color, fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_500Medium' }]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.background,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MAX_CONTENT,
    alignSelf: 'center',
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    top: 6,
    left: 0,
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    backgroundColor: palette.primarySoft,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    paddingHorizontal: 2,
  },
  label: { fontSize: 10.5, letterSpacing: 0, lineHeight: 14 },
});