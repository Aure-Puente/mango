import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Path } from 'react-native-svg';
import { palette, radius, space } from '@/theme';

// Silueta del logo (la misma de los títulos), rellena. viewBox ajustado al dibujo con la hoja.
const VIEWBOX = '14 -5 74 97';
const H = 70; // alto del mango
const W = Math.round((H * 74) / 97); // ≈ 53
const BODY =
  'M52 12 C74 12 88 32 86 55 C84 78 66 92 47 90 C27 88 14 73 16 56 C18 42 28 35 36 29 C43 24 44 12 52 12 Z';
const LEAF = 'M55 8 C61 -1 74 -3 84 1 C80 11 68 15 55 8 Z';
const PLUS = 17; // largo de cada barra del +
const PLUS_W = 2.4; // grosor: fino, como grabado en la fruta
const PLUS_COLOR = '#A3580A'; // naranja tostado (opaco: si fuera transparente, el cruce se vería más oscuro)
const SHADE = 'M86 55 C84 78 66 92 47 90 C63 84 76 72 79 50 Z'; // sombra suave abajo a la derecha
// La hoja gira desde el tallo (55, 8)
const LEAF_ORIGIN = `${((55 - 14) / 74) * 100}% ${((8 + 5) / 97) * 100}%`;

/**
 * Estado compartido del menú abierto, para que la barra de pestañas (que está por encima de la
 * pantalla) se oscurezca junto con el resto y cierre el menú si la tocan. Ver <FabDim /> en TabBar.
 */
const BACKDROP = 'rgba(11,11,13,0.9)';
export const fabOverlay = {
  progress: new Animated.Value(0), // 0 cerrado → 1 abierto
  close: () => {},
  open: false,
  listeners: new Set(),
};
function setOverlayOpen(open, close) {
  fabOverlay.open = open;
  fabOverlay.close = close;
  fabOverlay.listeners.forEach((fn) => fn(open));
}

/** Capa oscura para poner sobre la barra de pestañas mientras el menú del mango está abierto */
export function FabDim() {
  const [open, setOpen] = useState(fabOverlay.open);
  useEffect(() => {
    fabOverlay.listeners.add(setOpen);
    return () => fabOverlay.listeners.delete(setOpen);
  }, []);
  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { backgroundColor: BACKDROP, opacity: fabOverlay.progress }]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => fabOverlay.close()}
        accessibilityLabel="Cerrar menú"
      />
    </Animated.View>
  );
}

/**
 * Botón flotante con forma de mango (la silueta del logo, rellena), sin +.
 * Al tocarlo se inclina, la hoja se mece y aparece una × adentro; se abre el menú con las acciones.
 * Un borde del color del fondo lo recorta del contenido, en vez de una sombra rectangular.
 *
 * @param {{ actions: { icon: string, label: string, color: string, onPress: () => void }[] }} props
 */
export function MangoFab({ actions }) {
  const [open, setOpen] = useState(false);
  const [progress] = useState(() => new Animated.Value(0)); // 0 cerrado → 1 abierto
  const [press] = useState(() => new Animated.Value(0)); // 0 suelto → 1 presionado

  useEffect(() => {
    const cfg = { toValue: open ? 1 : 0, useNativeDriver: true, damping: 18, stiffness: 210 };
    Animated.spring(progress, cfg).start();
    // La barra de pestañas se oscurece con la misma animación
    Animated.spring(fabOverlay.progress, cfg).start();
    setOverlayOpen(open, () => setOpen(false));
  }, [open, progress]);

  // Si la pantalla se va con el menú abierto, la barra no queda oscurecida
  useEffect(
    () => () => {
      fabOverlay.progress.setValue(0);
      setOverlayOpen(false, () => {});
    },
    [],
  );

  // En Android, el botón "atrás" cierra el menú en vez de salir de la pantalla
  useEffect(() => {
    if (!open) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  const pressTo = (v) =>
    Animated.spring(press, { toValue: v, useNativeDriver: true, damping: 14, stiffness: 340 }).start();

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setOpen((o) => !o);
  };

  const run = (fn) => {
    setOpen(false);
    Haptics.selectionAsync().catch(() => {});
    fn();
  };

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
  const tilt = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] });
  const leafRotate = Animated.add(
    press.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }),
    progress.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }),
  ).interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] });
  const closeScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  // El + gira y se desvanece mientras aparece la ×
  const plusOpacity = progress.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const plusRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  return (
    <>
      {/* Fondo oscuro detrás del menú */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
      </Animated.View>

      <View pointerEvents="box-none" style={styles.anchor}>
        {/* Acciones (de abajo hacia arriba, entran escalonadas) */}
        <View pointerEvents={open ? 'box-none' : 'none'} style={styles.actions}>
          {actions.map((a, i) => {
            const n = actions.length;
            const delay = (n - 1 - i) / (n + 1); // la más cercana al botón aparece primero
            const t = progress.interpolate({
              inputRange: [delay * 0.6, Math.min(1, delay * 0.6 + 0.55)],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={a.label}
                style={{
                  opacity: t,
                  transform: [
                    { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                    { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                  ],
                }}
              >
                <Pressable
                  onPress={() => run(a.onPress)}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.actionLabel}>
                    <Text variant="labelLarge" style={{ color: palette.text }}>
                      {a.label}
                    </Text>
                  </View>
                  <View style={[styles.actionIcon, { backgroundColor: a.color + '24' }]}>
                    <MaterialCommunityIcons name={a.icon} size={22} color={a.color} />
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* El mango */}
        <Pressable
          onPress={toggle}
          onPressIn={() => pressTo(1)}
          onPressOut={() => pressTo(0)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Cerrar menú' : 'Agregar'}
          accessibilityState={{ expanded: open }}
          style={styles.hit}
        >
          <Animated.View style={{ width: W, height: H, transform: [{ scale }, { rotate: tilt }] }}>
            <Svg width={W} height={H} viewBox={VIEWBOX} style={StyleSheet.absoluteFill}>
              {/* Borde del color del fondo: lo despega del contenido que pasa por debajo */}
              <Path d={BODY} fill={palette.background} stroke={palette.background} strokeWidth={9} />
              <Path d={BODY} fill={palette.primary} />
              <Path d={SHADE} fill="#F08A00" />
            </Svg>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transformOrigin: LEAF_ORIGIN, transform: [{ rotate: leafRotate }] },
              ]}
            >
              <Svg width={W} height={H} viewBox={VIEWBOX}>
                <Path d={LEAF} fill={palette.background} stroke={palette.background} strokeWidth={8} />
                <Path d={LEAF} fill={palette.income} />
              </Svg>
            </Animated.View>
            {/* Cerrado: un + sutil, naranja tostado, que se funde con la fruta */}
            <Animated.View pointerEvents="none" style={[styles.close, { opacity: plusOpacity }]}>
              <Animated.View style={[styles.plus, { transform: [{ rotate: plusRotate }] }]}>
                <View style={styles.plusH} />
                <View style={styles.plusV} />
              </Animated.View>
            </Animated.View>
            {/* Abierto: una × adentro para cerrar */}
            <Animated.View
              pointerEvents="none"
              style={[styles.close, { opacity: progress, transform: [{ scale: closeScale }] }]}
            >
              <MaterialCommunityIcons name="close" size={24} color={palette.onPrimary} />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: BACKDROP },
  anchor: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    alignItems: 'flex-end',
  },
  actions: { gap: space.md, marginBottom: space.lg, alignItems: 'flex-end', paddingRight: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  actionLabel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  hit: { width: 64, height: 76, alignItems: 'center', justifyContent: 'center' },
  plus: { width: PLUS, height: PLUS, alignItems: 'center', justifyContent: 'center' },
  plusH: {
    position: 'absolute',
    width: PLUS,
    height: PLUS_W,
    borderRadius: PLUS_W / 2,
    backgroundColor: PLUS_COLOR,
  },
  plusV: {
    position: 'absolute',
    width: PLUS_W,
    height: PLUS,
    borderRadius: PLUS_W / 2,
    backgroundColor: PLUS_COLOR,
  },
  // Centrada en la panza del mango (un poco abajo y a la izquierda del centro del dibujo)
  close: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: H * 0.3,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 3,
  },
});