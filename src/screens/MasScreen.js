import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { Card, Divider, Label, MangoDot, Pill, Row, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useFinance } from '@/hooks/useFinance';
import { exportTransactionsCsv } from '@/lib/export';
import { navigate } from '@/navigation/RootNavigation';
import { palette, radius, space } from '@/theme';

/** "1 tarjeta" / "3 tarjetas" */
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Lista corta de nombres: "Mercado Pago y 3 más" */
function namesSummary(names, max = 2) {
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} y ${names.length - max} más`;
}

export default function More() {
  const { user } = useAuth();
  const { accounts, categories, cards, goals, transactions } = useFinance();
  const toast = useToast();

  const activeAccounts = accounts.filter((a) => !a.archived);

  const items = [
    [
      {
        icon: 'wallet-outline',
        color: palette.primary,
        title: 'Cuentas',
        subtitle: activeAccounts.length
          ? `${plural(activeAccounts.length, 'cuenta', 'cuentas')} · ${namesSummary(activeAccounts.map((a) => a.name), 1)}`
          : 'Efectivo, Mercado Pago, bancos',
        screen: 'Cuentas',
      },
      {
        icon: 'credit-card-outline',
        color: palette.info,
        title: 'Tarjetas',
        subtitle: cards.length
          ? `${plural(cards.length, 'tarjeta', 'tarjetas')} · ${namesSummary(cards.map((c) => c.name), 1)}`
          : 'Cierre y vencimiento',
        screen: 'Tarjetas',
      },
      {
        icon: 'shape-outline',
        color: '#C792EA',
        title: 'Categorías y presupuestos',
        subtitle: `${plural(categories.length, 'categoría', 'categorías')}${
          categories.some((c) => c.budget)
            ? ` · ${plural(categories.filter((c) => c.budget).length, 'con presupuesto', 'con presupuesto')}`
            : ''
        }`,
        screen: 'Categorias',
      },
    ],
    [
      {
        icon: 'piggy-bank-outline',
        color: palette.income,
        title: 'Metas de ahorro',
        subtitle: goals.length ? plural(goals.length, 'meta', 'metas') : 'Ahorrá para algo concreto',
        screen: 'Metas',
      },
      {
        icon: 'currency-usd',
        color: palette.income,
        title: 'Dólar hoy',
        subtitle: 'Oficial, blue, MEP y más',
        screen: 'Cotizaciones',
      },
    ],
    [
      {
        icon: 'tray-arrow-up',
        color: palette.textSecondary,
        title: 'Exportar movimientos',
        subtitle: 'CSV compatible con Excel',
        onPress: () =>
          exportTransactionsCsv(transactions, accounts, categories).catch((e) =>
            toast.show(e instanceof Error ? e.message : 'Error', { tone: 'error' }),
          ),
      },
      {
        icon: 'cog-outline',
        color: palette.textSecondary,
        title: 'Ajustes',
        subtitle: 'Moneda, dólar, notificaciones, cuenta',
        screen: 'Ajustes',
      },
    ],
  ];

  const initials = (user?.displayName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Screen title="Más">
      <Card style={styles.profile} onPress={() => navigate('Ajustes')}>
        <View style={styles.avatarRing}>
          {user?.photoURL ? (
            <Avatar.Image size={52} source={{ uri: user.photoURL }} />
          ) : (
            <Avatar.Text
              size={52}
              label={initials}
              style={{ backgroundColor: palette.primarySoft }}
              color={palette.primary}
              labelStyle={{ fontFamily: 'Inter_600SemiBold', fontSize: 18 }}
            />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="titleMedium" numberOfLines={1}>
            {user?.displayName || 'Sin nombre'}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary, marginTop: 1 }}>
            {user?.email}
          </Text>
          <View style={styles.profileHint}>
            <MaterialCommunityIcons name="cog-outline" size={12} color={palette.primary} />
            <Text variant="labelMedium" style={{ color: palette.primary }}>
              Ver ajustes de la cuenta
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={palette.textDisabled} />
      </Card>

      {items.map((group, gi) => (
        <View key={gi} style={{ marginTop: space.xl }}>
          <Label>{['Organización', 'Planificación', 'Otros'][gi]}</Label>
          <Card style={{ paddingVertical: space.xs }}>
            {group.map((it, i) => (
              <View key={it.title}>
                {i > 0 ? <Divider /> : null}
                <Row
                  icon={it.icon}
                  iconColor={it.color}
                  title={it.title}
                  subtitle={it.subtitle}
                  right={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      {it.badge ? <Pill label={String(it.badge)} color={palette.primary} /> : null}
                      <MaterialCommunityIcons name="chevron-right" size={20} color={palette.textDisabled} />
                    </View>
                  }
                  onPress={it.onPress ?? (() => navigate(it.screen))}
                />
              </View>
            ))}
          </Card>
        </View>
      ))}

      <View style={styles.footer}>
        <MangoDot size={12} />
        <Text variant="bodySmall" style={{ color: palette.textDisabled }}>
          Mango · v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  profileHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.sm },
  avatarRing: {
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: palette.primary + '55',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: space.xxl,
  },
});