import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { handoff } from '@/lib/handoff';
import { SoftHalo } from './ui';
import { palette } from '@/theme';

/** Duración total visible de la splash si no hay destino al que viajar (incluye la del sistema) */
const DURATION = 2100;
const FADE_OUT = 320;
const INTRO = 880; // brillo + hojita, antes de decidir hacia dónde va el mango
const TRAVEL = 600; // viaje hasta el logo del login o el botón de Inicio
const startedAt = Date.now();

// Mismo dibujo y mismo encuadre que assets/splash-icon.png (y que <Logo />):
// el primer cuadro de esta splash es idéntico a la nativa, así el paso no se nota.
const SIZE = 160;
const VB = 115; // lado del viewBox
const VIEWBOX = '-6.5 -13.5 115 115';
const BODY =
  'M52 12 C74 12 88 32 86 55 C84 78 66 92 47 90 C27 88 14 73 16 56 C18 42 28 35 36 29 C43 24 44 12 52 12 Z';
const CHEEK = 'M30 62 C32 73 39 80 49 83';
const LEAF = 'M55 8 C61 -1 74 -3 84 1 C80 11 68 15 55 8 Z';
const VEIN = 'M61 7 C67 4 74 2 79 2';
const SHADE = 'M86 55 C84 78 66 92 47 90 C63 84 76 72 79 50 Z';
const BODY_LEN = 231; // largo del contorno, para el brillo que lo recorre
const SHINE = 34; // largo del brillo
// El botón de Inicio dibuja la parte del viewBox que va de y = -5 a y = 92 (97 de alto)
const FAB_SPAN = 97;

// La hoja gira desde el tallo: (55, 8) dentro del viewBox
const LEAF_ORIGIN = `${((55 + 6.5) / 115) * 100}% ${((8 + 13.5) / 115) * 100}%`;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const ease = Easing.bezier(0.65, 0, 0.25, 1);

/**
 * Splash animada, continuación de la nativa (mismo fondo, mismo logo, mismo tamaño):
 * 1. un brillo recorre el contorno del mango y la hojita se mece, con un halo suave detrás;
 * 2. el mango viaja a la primera pantalla:
 *    - al login: se achica hasta el lugar del logo mientras aparece el formulario;
 *    - a Inicio: se rellena, se achica y baja hasta la esquina del botón mango;
 *    - si no hay destino a tiempo: se achica, aparece "mango" debajo y todo se desvanece.
 */
export function AnimatedSplash({ onDone }) {
  const [hidden, setHidden] = useState(false);
  const markRef = useRef(null);
  const [v] = useState(() => ({
    shine: new Animated.Value(0), // recorrido del brillo (JS: anima strokeDashoffset)
    leaf: new Animated.Value(0),
    glow: new Animated.Value(0),
    bg: new Animated.Value(1), // fondo de la splash (se va para mostrar la pantalla de abajo)
    tx: new Animated.Value(0),
    ty: new Animated.Value(0),
    sc: new Animated.Value(1),
    fill: new Animated.Value(0), // 0 contorno → 1 relleno (como el botón de Inicio)
    name: new Animated.Value(0),
    mark: new Animated.Value(1),
  }));

  const end = () => {
    handoff.finish();
    setHidden(true);
    onDone();
  };

  const timing = (val, toValue, duration, delay = 0) =>
    Animated.timing(val, { toValue, duration, delay, easing: ease, useNativeDriver: true });

  /** Viaje hasta el destino medido */
  const travel = (kind, to, me) => {
    const unit = SIZE / VB;
    const scale = kind === 'fab' ? to.h / (FAB_SPAN * unit) : to.w / SIZE;
    const dx = to.x + to.w / 2 - (me.x + me.w / 2);
    // El botón se centra en su propio recorte del dibujo (medio punto más arriba que el cuadro)
    const dy = to.y + to.h / 2 - (me.y + me.h / 2) + (kind === 'fab' ? 0.5 * unit * scale : 0);
    Animated.parallel([
      timing(v.tx, dx, TRAVEL),
      timing(v.ty, dy, TRAVEL),
      timing(v.sc, scale, TRAVEL),
      timing(v.bg, 0, TRAVEL * 0.75, TRAVEL * 0.2),
      kind === 'fab' ? timing(v.fill, 1, TRAVEL * 0.6, TRAVEL * 0.1) : timing(v.fill, 0, 1),
    ]).start(() => {
      // Llegó: aparece el de verdad y, en el cuadro siguiente, se va el de la splash
      handoff.finish();
      requestAnimationFrame(() => {
        setHidden(true);
        onDone();
      });
    });
  };

  /** Sin destino: la salida de siempre */
  const fallback = () => {
    Animated.parallel([timing(v.sc, 0.72, 520), timing(v.ty, -30, 520), timing(v.name, 1, 520)]).start();
    const remaining = Math.max(520, DURATION - (Date.now() - startedAt) - FADE_OUT);
    setTimeout(() => {
      Animated.parallel([timing(v.bg, 0, FADE_OUT), timing(v.mark, 0, FADE_OUT)]).start(end);
    }, remaining);
  };

  /** Busca el destino (espera un poquito si la pantalla todavía se está armando) */
  const decide = (tries = 0) => {
    const target = handoff.target();
    if (!target) {
      if (tries < 6) return setTimeout(() => decide(tries + 1), 120);
      return fallback();
    }
    target.measure((to) => {
      const node = markRef.current;
      if (!to || !node?.measureInWindow) return fallback();
      node.measureInWindow((x, y, w, h) => {
        if (!w || !h) return fallback();
        travel(target.kind, to, { x, y, w, h });
      });
    });
  };

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
    ]).start();
    setTimeout(() => decide(), INTRO);
  };

  useEffect(() => {
    const t = setTimeout(start, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hidden) return null;

  const outline = v.fill.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const nameY = v.name.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const leafRotate = v.leaf.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-14deg'] });
  // El brillo da una vuelta completa al contorno y se apaga al final
  const dashOffset = v.shine.interpolate({ inputRange: [0, 1], outputRange: [0, -BODY_LEN] });
  const shineOpacity = v.shine.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] });
  const move = [{ translateX: v.tx }, { translateY: v.ty }, { scale: v.sc }];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap]}>
      {/* Fondo: se desvanece para dejar ver la pantalla de abajo */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.bg, { opacity: v.bg }]} />

      <View style={styles.center}>
        {/* Halo cálido detrás del mango */}
        <Animated.View style={[styles.glow, { opacity: Animated.multiply(v.glow, v.bg), transform: move }]}>
          <SoftHalo size={360} />
        </Animated.View>

        <Animated.View
          ref={markRef}
          collapsable={false}
          style={{ width: SIZE, height: SIZE, opacity: v.mark, transform: move }}
        >
          {/* Contorno + brillo que lo recorre */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: outline }]}>
            <Svg width={SIZE} height={SIZE} viewBox={VIEWBOX}>
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
          </Animated.View>
          {/* Relleno (aparece solo camino al botón de Inicio) */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.fill }]}>
            <Svg width={SIZE} height={SIZE} viewBox={VIEWBOX}>
              <Path d={BODY} fill={palette.primary} />
              <Path d={SHADE} fill="#F08A00" />
            </Svg>
          </Animated.View>
          {/* La hoja va aparte para poder mecerla desde el tallo */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transformOrigin: LEAF_ORIGIN, transform: [{ rotate: leafRotate }] },
            ]}
          >
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: outline }]}>
              <Svg width={SIZE} height={SIZE} viewBox={VIEWBOX}>
                <G fill="none" stroke={palette.primary} strokeLinecap="round" strokeLinejoin="round">
                  <Path d={LEAF} strokeWidth={5} />
                  <Path d={VEIN} strokeWidth={3} strokeOpacity={0.6} />
                </G>
              </Svg>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.fill }]}>
              <Svg width={SIZE} height={SIZE} viewBox={VIEWBOX}>
                <Path d={LEAF} fill={palette.income} />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.name,
            { opacity: Animated.multiply(v.name, v.mark), transform: [{ translateY: nameY }] },
          ]}
        >
          mango
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 100, elevation: 100 },
  bg: { backgroundColor: palette.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 360,
    height: 360,
    left: '50%',
    top: '50%',
    marginLeft: -180,
    marginTop: -180,
  },
  // Debajo del mango ya achicado y subido (160 × 0.72 ≈ 115 px, 30 px más arriba)
  name: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    top: '50%',
    marginTop: (SIZE * 0.72) / 2 - 30 + 2,
    fontFamily: 'Inter_500Medium',
    fontSize: 30,
    letterSpacing: -1,
    color: palette.text,
  },
});