//AuthForm:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHandoffTarget } from '@/lib/handoff';
import { palette, radius, space } from '@/theme';
import { Logo } from './Logo';
import { PressableScale, SoftHalo } from './ui';

const HALO = 300;

export function AuthLayout({ subtitle, children, footer }) {
  const insets = useSafeAreaInsets();
  const [logoRef, logoVisible] = useHandoffTarget('login');
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.xl,
          paddingTop: insets.top + space.xxl,
          paddingBottom: insets.bottom + space.xl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <View style={styles.main}>
            <View style={styles.hero}>
              <View style={styles.halo} pointerEvents="none">
                <SoftHalo size={HALO} />
              </View>
              <View ref={logoRef} collapsable={false} style={{ opacity: logoVisible ? 1 : 0 }}>
                <Logo size={96} />
              </View>
              <Text style={styles.word}>mango</Text>
              {subtitle ? (
                <Text variant="bodyMedium" style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: space.md }}>{children}</View>
          </View>

          <View style={{ alignItems: 'center', marginTop: space.xl }}>{footer}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthLink({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      style={({ pressed }) => [{ alignSelf: 'flex-end', marginTop: -2 }, pressed && { opacity: 0.5 }]}
    >
      <Text variant="labelMedium" style={{ color: palette.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function GoogleButton({ onPress, loading }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={loading}
      scaleTo={0.97}
      accessibilityRole="button"
      style={styles.google}
    >
      {loading ? (
        <ActivityIndicator size={18} color={palette.background} />
      ) : (
        <MaterialCommunityIcons name="google" size={18} color={palette.background} />
      )}
      <Text
        variant="labelLarge"
        style={{ fontSize: 15, color: palette.background, fontFamily: 'Inter_600SemiBold' }}
      >
        Continuar con Google
      </Text>
    </PressableScale>
  );
}

export function OrDivider() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.xs }}>
      <View style={styles.line} />
      <Text variant="bodySmall" style={{ color: palette.textDisabled }}>
        o con tu email
      </Text>
      <View style={styles.line} />
    </View>
  );
}

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={palette.expense} />
      <Text variant="bodySmall" style={{ color: palette.text, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: 420, alignSelf: 'center', flexGrow: 1 },
  main: { flexGrow: 1, justifyContent: 'center', paddingTop: space.xl, paddingBottom: space.lg },
  hero: { alignItems: 'center', marginBottom: space.xxl, paddingTop: space.lg },
  halo: { position: 'absolute', top: 48 - HALO / 2 + space.lg, width: HALO, height: HALO },
  word: {
    marginTop: space.md,
    fontFamily: 'Inter_500Medium',
    fontSize: 30,
    letterSpacing: -1,
    color: palette.text,
  },
  subtitle: { color: palette.textSecondary, marginTop: space.xs, textAlign: 'center' },
  google: {
    height: 52,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm + 2,
    backgroundColor: palette.text,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.sm + 2,
    backgroundColor: palette.expenseSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.expense + '40',
  },
});