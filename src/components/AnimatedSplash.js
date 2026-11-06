import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { palette } from '@/theme';

/** Duración total visible de la splash (incluye la del sistema) */
const DURATION = 2100;
const FADE_OUT = 320;
const startedAt = Date.now();

// Mismo dibujo y mismo encuadre que assets/splash-icon.png (y que <Logo />):
// el primer cuadro de esta splash es idéntico a la nativa, así el paso no se nota.
const SIZE = 160;
const VIEWBOX = '-6.5 -13.5 115 115';
const BODY =
  'M52 12 C74 12 88 32 86 55 C84 78 66 92 47 90 C27 88 14 73 16 56 C18 42 28 35 36 29 C43 24 44 12 52 12 Z';
const CHEEK = 'M30 62 C32 73 39 80 49 83';
const LEAF = 'M55 8 C61 -1 74 -3 84 1 C80 11 68 15 55 8 Z';
const VEIN = 'M61 7 C67 4 74 2 79 2';
const BODY_LEN = 231; // largo del contorno, para el brillo que lo recorre
const SHINE = 34; // largo del brillo

// La hoja gira desde el tallo: (55, 8) dentro del viewBox
const LEAF_ORIGIN = `${((55 + 6.5) / 115) * 100}% ${((8 + 13.5) / 115) * 100}%`;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Splash animada, continuación de la nativa (mismo fondo, mismo logo, mismo tamaño):
 * 1. un brillo recorre el contorno del mango y la hojita se mece,
 * 2. aparece un halo cálido muy suave detrás,
 * 3. el mango se achica y sube, y aparece "mango" debajo,
 * 4. todo se desvanece mientras la app ya cargó por debajo.
 */
export function AnimatedSplash({ onDone }) {
  const [hidden, setHidden] = useState(false);
  const [v] = useState(() => ({
    shine: new Animated.Value(0), // recorrido del brillo (JS: anima strokeDashoffset)
    leaf: new Animated.Value(0),
    glow: new Animated.Value(0),
    settle: new Animated.Value(0), // logo chico + nombre
    out: new Animated.Value(1),
  }));

  const start = () => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.parallel([
      Animated.timing(v.shine, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(v.leaf, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(v.leaf, { toValue: 0, friction: 4, tension: 90, useNativeDriver: true }),
      ]),
      Animated.timing(v.glow, { toValue: 1, duration: 700, delay: 250, useNativeDriver: true }),
      Animated.timing(v.settle, {
        toValue: 1,
        duration: 520,
        delay: 780,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const remaining = Math.max(0, DURATION - (Date.now() - startedAt) - FADE_OUT);
    setTimeout(() => {
      Animated.timing(v.out, { toValue: 0, duration: FADE_OUT, useNativeDriver: true }).start(() => {
        setHidden(true);
        onDone();
      });
    }, remaining);
  };

  useEffect(() => {
    // Por si onLayout no llega (web), igual arrancamos
    const t = setTimeout(start, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hidden) return null;

  const scale = v.settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] });
  const lift = v.settle.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const nameY = v.settle.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const leafRotate = v.leaf.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-14deg'] });
  // El brillo da una vuelta completa al contorno y se apaga al final
  const dashOffset = v.shine.interpolate({ inputRange: [0, 1], outputRange: [0, -BODY_LEN] });
  const shineOpacity = v.shine.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, { opacity: v.out }]}>
      <View style={styles.center}>
        <Animated.View style={{ alignItems: 'center', transform: [{ translateY: lift }] }}>
          {/* Halo cálido detrás del mango */}
          <Animated.View style={[styles.glow, { opacity: v.glow, transform: [{ scale }] }]}>
            <Svg width={360} height={360} viewBox="0 0 100 100">
              <Defs>
                <RadialGradient id="halo" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor={palette.primary} stopOpacity={0.16} />
                  <Stop offset="1" stopColor={palette.primary} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx="50" cy="50" r="50" fill="url(#halo)" />
            </Svg>
          </Animated.View>

          <Animated.View style={{ width: SIZE, height: SIZE, transform: [{ scale }] }}>
            {/* Cuerpo del mango + brillo que lo recorre */}
            <Svg width={SIZE} height={SIZE} viewBox={VIEWBOX} style={StyleSheet.absoluteFill}>
              <G fill="none" strokeLinecap="round" strokeLinejoin="round">
                <Path d={BODY} stroke={palette.primary} strokeWidth={5} />
                <Path d={CHEEK} stroke={palette.primary} strokeWidth={5} strokeOpacity={0.5} />
                <AnimatedPath
                  d={BODY}
                  stroke="#FFE2B8"
                  strokeWidth={5}
                  strokeDasharray={`${SHINE} ${BODY_LEN - SHINE}`}
                  strokeDashoffset={dashOffset}
                  strokeOpacity={shineOpacity}
                />
              </G>
            </Svg>
            {/* La hoja va aparte para poder mecerla desde el tallo */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transformOrigin: LEAF_ORIGIN, transform: [{ rotate: leafRotate }] },
              ]}
            >
              <Svg width={SIZE} height={SIZE} viewBox={VIEWBOX}>
                <G fill="none" stroke={palette.primary} strokeLinecap="round" strokeLinejoin="round">
                  <Path d={LEAF} strokeWidth={5} />
                  <Path d={VEIN} strokeWidth={3} strokeOpacity={0.6} />
                </G>
              </Svg>
            </Animated.View>
          </Animated.View>

          <Animated.Text style={[styles.name, { opacity: v.settle, transform: [{ translateY: nameY }] }]}>
            mango
          </Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: palette.background, zIndex: 100, elevation: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', top: SIZE / 2 - 180, width: 360, height: 360 },
  // Debajo del mango ya achicado (160 × 0.72 ≈ 115 px): queda pegado al logo
  name: {
    position: 'absolute',
    top: SIZE / 2 + (SIZE * 0.72) / 2 + 2,
    fontFamily: 'Inter_500Medium',
    fontSize: 30,
    letterSpacing: -1,
    color: palette.text,
  },
});