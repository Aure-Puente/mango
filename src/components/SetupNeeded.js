//SetupNeeded:
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, space } from '@/theme';
import { Logo } from './Logo';

export function SetupNeeded() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: space.xl, paddingTop: insets.top + space.xxl, gap: space.lg }}
    >
      <Logo size={44} withName />
      <Text variant="headlineMedium">Falta configurar Firebase</Text>
      <Text variant="bodyLarge" style={{ color: palette.textSecondary }}>
        Copiá el archivo <Text style={{ color: palette.primary }}>.env.example</Text> como{' '}
        <Text style={{ color: palette.primary }}>.env</Text>, completá los datos de tu proyecto de Firebase y
        reiniciá con:
      </Text>
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: radius.sm + 2,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border,
          padding: space.lg,
          flexDirection: 'row',
          gap: space.sm,
        }}
      >
        <Text style={{ fontFamily: 'Inter_500Medium', color: palette.primary }}>$</Text>
        <Text style={{ fontFamily: 'Inter_500Medium' }}>npx expo start -c</Text>
      </View>
      <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
        Los pasos completos están en el README del proyecto.
      </Text>
    </ScrollView>
  );
}
