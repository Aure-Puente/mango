import { useWindowDimensions } from 'react-native';
import { space } from '@/theme';

/** Ancho máximo del contenido en pantallas comunes y en pantallas de dos columnas */
export const MAX_CONTENT = 760;
export const MAX_WIDE = 1180;
export const MAX_FORM = 620;
const GAP = space.lg;

/**
 * Medidas para adaptar la UI a teléfonos y tablets (hasta 10").
 * - Teléfono: una columna a todo el ancho.
 * - Tablet vertical: una columna centrada (máx. 760dp).
 * - Tablet horizontal (≥ 1000dp): dos columnas en Inicio y Análisis.
 */
export function useLayout(wide = false) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const twoCol = wide && width >= 1000;
  const max = twoCol ? MAX_WIDE : MAX_CONTENT;
  const contentWidth = Math.min(width - space.lg * 2, max);
  const colWidth = twoCol ? (contentWidth - GAP) / 2 : contentWidth;
  return { width, isTablet, twoCol, max, contentWidth, colWidth, gap: GAP };
}
