//UpdateBanner:
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { palette, radius, space } from '@/theme';
import { IconBubble, SmallButton } from './ui';

export function UpdateBanner() {
  const { status, apply } = useAppUpdates();
  const [hidden, setHidden] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const visible = status === 'ready' && !hidden;

  useEffect(() => {
    if (!visible) return;
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 200 }).start();
  }, [visible, anim]);

  if (!visible) return null;

  const dismiss = () =>
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setHidden(true));

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        { justifyContent: 'flex-start', paddingTop: insets.top + space.sm, paddingHorizontal: space.lg },
      ]}
    >
      <Animated.View
        style={[
          styles.banner,
          {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <IconBubble icon="rocket-launch-outline" color={palette.primary} size={38} />
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall">Hay una versión nueva</Text>
          <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: 1 }}>
            Ya se descargó. Reiniciá para usarla.
          </Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <Text variant="labelLarge" style={{ color: palette.textSecondary, fontSize: 13 }}>
            Luego
          </Text>
        </Pressable>
        <SmallButton variant="solid" label="Reiniciar" onPress={apply} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: palette.surfaceHigh,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.primary + '55',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
