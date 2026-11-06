//Theme:
import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import { DarkTheme as NavDark } from '@react-navigation/native';

export const palette = {
  background: '#0B0B0D',
  surface: '#151518',
  surfaceHigh: '#1E1E22',
  border: '#26262B',
  hairline: 'rgba(255,255,255,0.06)',
  text: '#F5F5F7',
  textSecondary: '#8E8E96',
  textDisabled: '#6E6E76',

  primary: '#FF9F1C',
  primaryDeep: '#E8860A',
  primarySoft: 'rgba(255,159,28,0.12)',
  onPrimary: '#0B0B0D',

  income: '#34D1BF',
  incomeSoft: 'rgba(52,209,191,0.12)',
  expense: '#FF646A',
  expenseSoft: 'rgba(255,100,106,0.12)',
  warning: '#FFC85C',
  warningSoft: 'rgba(255,200,92,0.12)',
  info: '#8EA8FF',
};

/** Colores para elegir en cuentas, categorías, tarjetas y metas */
export const swatches = [
  '#FF9F1C',
  '#34D1BF',
  '#FF646A',
  '#FFC85C',
  '#8EA8FF',
  '#C792EA',
  '#4ADE80',
  '#F472B6',
  '#60A5FA',
  '#FB923C',
  '#A1A1AA',
  '#14B8A6',
];

/** Colores para series de gráficos (validados sobre fondo oscuro) */
export const chartColors = [
  '#FF9F1C',
  '#34D1BF',
  '#8EA8FF',
  '#F472B6',
  '#FFC85C',
  '#C792EA',
  '#4ADE80',
  '#FB923C',
  '#60A5FA',
  '#A1A1AA',
];

const fonts = configureFonts({
  config: {
    default: { fontFamily: 'Inter_400Regular' },
    displayLarge: { fontFamily: 'Inter_600SemiBold', fontSize: 56, lineHeight: 64, letterSpacing: -2 },
    displayMedium: { fontFamily: 'Inter_600SemiBold', fontSize: 44, lineHeight: 52, letterSpacing: -1.6 },
    displaySmall: { fontFamily: 'Inter_600SemiBold', fontSize: 34, lineHeight: 42, letterSpacing: -1.1 },
    headlineLarge: { fontFamily: 'Inter_700Bold', fontSize: 32, lineHeight: 40, letterSpacing: -0.9 },
    headlineMedium: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 36, letterSpacing: -0.7 },
    headlineSmall: { fontFamily: 'Inter_600SemiBold', fontSize: 22, lineHeight: 30, letterSpacing: -0.4 },
    titleLarge: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 28, letterSpacing: -0.3 },
    titleMedium: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 22, letterSpacing: -0.15 },
    titleSmall: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20, letterSpacing: -0.05 },
    labelLarge: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20, letterSpacing: 0 },
    labelMedium: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
    labelSmall: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
    bodyLarge: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
    bodyMedium: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, letterSpacing: -0.05 },
    bodySmall: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  },
});

export const theme = {
  ...MD3DarkTheme,
  roundness: 5,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: palette.primary,
    onPrimary: palette.onPrimary,
    primaryContainer: palette.primarySoft,
    onPrimaryContainer: palette.primary,
    secondary: palette.income,
    onSecondary: palette.background,
    secondaryContainer: palette.surfaceHigh,
    onSecondaryContainer: palette.text,
    tertiary: palette.info,
    background: palette.background,
    surface: palette.surface,
    surfaceVariant: palette.surfaceHigh,
    onSurface: palette.text,
    onSurfaceVariant: palette.textSecondary,
    onBackground: palette.text,
    outline: palette.border,
    outlineVariant: palette.border,
    error: palette.expense,
    elevation: {
      level0: 'transparent',
      level1: palette.surface,
      level2: palette.surfaceHigh,
      level3: palette.surfaceHigh,
      level4: palette.surfaceHigh,
      level5: palette.surfaceHigh,
    },
    surfaceDisabled: 'rgba(245,245,247,0.06)',
    onSurfaceDisabled: palette.textDisabled,
    backdrop: 'rgba(0,0,0,0.72)',
    inverseSurface: palette.text,
    inverseOnSurface: palette.background,
    inversePrimary: palette.primaryDeep,
  },
};

export const navTheme = {
  ...NavDark,
  colors: {
    ...NavDark.colors,
    primary: palette.primary,
    background: palette.background,
    card: palette.background,
    text: palette.text,
    border: palette.border,
    notification: palette.primary,
  },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 12, md: 20, lg: 28, pill: 999 };

/** Duraciones de animación (ms) para que todo se mueva con el mismo ritmo */
export const motion = { fast: 120, base: 200, slow: 320 };
