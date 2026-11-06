import { View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { G, Path } from 'react-native-svg';
import { palette } from '@/theme';

// Mismo dibujo y mismo encuadre que assets/splash-icon.png y assets/brand/mark.svg,
// así la splash nativa y la animada coinciden pixel a pixel.
const VIEWBOX = '-6.5 -13.5 115 115';
const BODY =
  'M52 12 C74 12 88 32 86 55 C84 78 66 92 47 90 C27 88 14 73 16 56 C18 42 28 35 36 29 C43 24 44 12 52 12 Z';
const CHEEK = 'M30 62 C32 73 39 80 49 83';
const LEAF = 'M55 8 C61 -1 74 -3 84 1 C80 11 68 15 55 8 Z';
const VEIN = 'M61 7 C67 4 74 2 79 2';

/** Isotipo de Mango: el contorno de un mango con su hojita, en un solo trazo */
export function Logo({ size = 48, withName = false, color = palette.primary }) {
  // En tamaños chicos el trazo se engrosa y se omiten los detalles finos
  const small = size < 40;
  const sw = small ? 7 : 5;
  const mark = (
    <Svg width={size} height={size} viewBox={VIEWBOX}>
      <G fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <Path d={BODY} />
        {small ? null : <Path d={CHEEK} strokeOpacity={0.5} />}
        <Path d={LEAF} />
        {small ? null : <Path d={VEIN} strokeWidth={3} strokeOpacity={0.6} />}
      </G>
    </Svg>
  );
  if (!withName) return mark;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.14 }}>
      {mark}
      <Text
        style={{
          fontFamily: 'Inter_500Medium',
          fontSize: size * 0.62,
          letterSpacing: -1.2,
          color: palette.text,
        }}
      >
        mango
      </Text>
    </View>
  );
}