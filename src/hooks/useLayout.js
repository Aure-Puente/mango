//useLayout:
import { useWindowDimensions } from 'react-native';
import { space } from '@/theme';

export const MAX_CONTENT = 760;
export const MAX_WIDE = 1180;
export const MAX_FORM = 620;
const GAP = space.lg;

export function useLayout(wide = false) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const twoCol = wide && width >= 1000;
  const max = twoCol ? MAX_WIDE : MAX_CONTENT;
  const contentWidth = Math.min(width - space.lg * 2, max);
  const colWidth = twoCol ? (contentWidth - GAP) / 2 : contentWidth;
  return { width, isTablet, twoCol, max, contentWidth, colWidth, gap: GAP };
}
