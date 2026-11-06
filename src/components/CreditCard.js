//CreditCard:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { palette, radius, space } from '@/theme';
import { Pill, PressableScale } from './ui';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function CreditCard({ card, active, onPress }) {
  const color = card.color ?? palette.primary;
  return (
    <PressableScale onPress={onPress} disabled={!onPress} scaleTo={0.98} style={styles.plastic}>
      <LinearGradient
        colors={[color + '66', color + '22', palette.surface]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="titleMedium" numberOfLines={1} style={{ flex: 1 }}>
          {card.name || 'Tu tarjeta'}
        </Text>
        <MaterialCommunityIcons name="contactless-payment" size={22} color={palette.text + 'B3'} />
      </View>

      <LinearGradient
        colors={['#F3D38A', '#C9A24E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.chip}
      >
        <View style={styles.chipLineH} />
        <View style={styles.chipLineV} />
      </LinearGradient>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="labelSmall" style={styles.caps}>
            Cierre · Vencimiento
          </Text>
          <Text variant="titleSmall" style={{ marginTop: 2 }}>
            Día {card.closingDay} · Día {card.dueDay}
          </Text>
        </View>
        <Pill
          label={active ? plural(active, 'compra en cuotas', 'compras en cuotas') : 'Sin cuotas activas'}
          color={active ? color : palette.textSecondary}
        />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  plastic: {
    minHeight: 168,
    padding: space.lg + 4,
    borderRadius: radius.md + 2,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    overflow: 'hidden',
    justifyContent: 'space-between',
    gap: space.md,
  },
  chip: {
    width: 40,
    height: 30,
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  chipLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  caps: {
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
  },
});