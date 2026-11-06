import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, space } from '@/theme';

const Ctx = createContext({ show: () => {} });

const TONES = {
  default: { icon: 'check', color: palette.income },
  warn: { icon: 'exclamation', color: palette.warning },
  error: { icon: 'close', color: palette.expense },
};

/**
 * Avisos cortos de la app.
 *   toast.show(mensaje, { tone: 'warn' | 'error', action: { label: 'Deshacer', onPress } })
 * Tarjeta flotante con el ícono en una burbuja de color, que entra con un rebote suave desde abajo,
 * se va sola (3 s, o 6 s si tiene acción) y se puede cerrar tocándola o deslizándola.
 * Con acción, una línea fina abajo muestra el tiempo que queda para usarla.
 */
export function ToastProvider({ children }) {
  const [state, setState] = useState(null);
  const insets = useSafeAreaInsets();

  // Todo lo animado y el cierre viven en un objeto estable (se crea una sola vez)
  const [ctl] = useState(() => {
    const anim = new Animated.Value(0);
    const drag = new Animated.ValueXY();
    const progress = new Animated.Value(1);
    const timer = { id: null };
    const hide = () => {
      clearTimeout(timer.id);
      progress.stopAnimation();
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setState(null);
      });
    };
    // Deslizar hacia abajo o a los costados lo cierra; si no llega, vuelve a su lugar
    const pan = PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || g.dy > 8,
      onPanResponderMove: (_, g) => drag.setValue({ x: g.dx, y: Math.max(0, g.dy) }),
      onPanResponderRelease: (_, g) => {
        const out = Math.abs(g.dx) > 90 || g.dy > 40 || Math.abs(g.vx) > 0.8 || g.vy > 0.8;
        if (out) {
          const side = Math.abs(g.dx) > g.dy;
          Animated.timing(drag, {
            toValue: { x: side ? Math.sign(g.dx || 1) * 420 : 0, y: side ? 0 : 120 },
            duration: 160,
            useNativeDriver: true,
          }).start();
          hide();
        } else {
          Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      },
    });
    const schedule = (ms) => {
      clearTimeout(timer.id);
      timer.id = setTimeout(hide, ms);
    };
    const cancel = () => clearTimeout(timer.id);
    return { anim, drag, progress, hide, pan, schedule, cancel };
  });
  const { anim, drag, progress, hide, pan } = ctl;

  const show = useCallback((msg, opts) => {
    setState({ msg, tone: opts?.tone ?? 'default', action: opts?.action, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    const ms = state.action ? 6000 : 3000;
    ctl.anim.setValue(0);
    ctl.drag.setValue({ x: 0, y: 0 });
    ctl.progress.setValue(1);
    Animated.spring(ctl.anim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }).start();
    if (state.action) {
      Animated.timing(ctl.progress, { toValue: 0, duration: ms, useNativeDriver: true }).start();
    }
    ctl.schedule(ms);
    return ctl.cancel;
  }, [state, ctl]);

  const tone = TONES[state?.tone] ?? TONES.default;
  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {state ? (
        <View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: 'flex-end', paddingBottom: insets.bottom + 96, paddingHorizontal: space.lg },
          ]}
        >
          <Animated.View
            {...pan.panHandlers}
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              {
                opacity: anim,
                transform: [
                  { translateX: drag.x },
                  {
                    translateY: Animated.add(
                      drag.y,
                      anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
                    ),
                  },
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                ],
              },
            ]}
          >
            <Pressable onPress={hide} style={styles.body}>
              <View style={[styles.bubble, { backgroundColor: tone.color + '24' }]}>
                <MaterialCommunityIcons name={tone.icon} size={16} color={tone.color} />
              </View>
              <Text variant="bodyMedium" style={styles.msg}>
                {state.msg}
              </Text>
              {state.action ? (
                <Pressable
                  onPress={() => {
                    state.action.onPress?.();
                    hide();
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
                >
                  <Text variant="labelLarge" style={{ color: palette.text, fontFamily: 'Inter_600SemiBold' }}>
                    {state.action.label}
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
            {state.action ? (
              <View style={styles.track}>
                <Animated.View
                  style={[styles.fill, { backgroundColor: tone.color, transform: [{ scaleX: progress }] }]}
                />
              </View>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const styles = StyleSheet.create({
  toast: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    borderRadius: radius.md,
    // Un gris más claro que las tarjetas y un borde fino: se despega de lo que tiene atrás
    backgroundColor: '#26262C',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingLeft: space.md,
    paddingRight: space.md,
  },
  bubble: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  msg: { flex: 1, color: palette.text, fontFamily: 'Inter_500Medium' },
  action: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  track: { height: 2, backgroundColor: 'transparent' },
  fill: { height: 2, width: '100%', transformOrigin: 'left', opacity: 0.7 },
});