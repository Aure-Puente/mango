import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { googleAvailable } from '@/lib/google';
import { palette, radius, space } from '@/theme';
import { Logo } from './Logo';
import { PressableScale } from './ui';

const HALO = 300;

/**
 * Pantalla de login / registro. Arriba, el mango con su halo y "mango" debajo: la misma
 * composición con la que termina la splash, así entrar se siente como una continuación.
 * Debajo, el formulario en una columna angosta, sin títulos que asuman si ya tenés cuenta.
 */
export function AuthLayout({ subtitle, children, footer }) {
  const insets = useSafeAreaInsets();
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
          {/* Marca */}
          <View style={styles.hero}>
            <View style={styles.halo} pointerEvents="none">
              <Svg width={HALO} height={HALO} viewBox="0 0 100 100">
                <Defs>
                  <RadialGradient id="authHalo" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor={palette.primary} stopOpacity={0.16} />
                    <Stop offset="1" stopColor={palette.primary} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx="50" cy="50" r="50" fill="url(#authHalo)" />
              </Svg>
            </View>
            <Logo size={96} />
            <Text style={styles.word}>mango</Text>
            {subtitle ? (
              <Text variant="bodyMedium" style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: space.md }}>{children}</View>

          <View style={{ flex: 1, minHeight: space.xl }} />
          <View style={{ alignItems: 'center', marginTop: space.xl }}>{footer}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Enlace chico alineado a la derecha (ej: "¿Olvidaste tu contraseña?") */
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
      style={[styles.google, !googleAvailable && { opacity: 0.5 }]}
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

/** Mensaje de error del formulario (reemplaza al HelperText de Paper) */
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
  // Blanco: el botón de Google estándar, el que más se reconoce
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