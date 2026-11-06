//AjustesScreen:
import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Group, Segmented, SwitchRow } from '@/components/fields';
import { Logo } from '@/components/Logo';
import { ActionButton, Card, Label, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/hooks/useFinance';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { ensureNotificationPermission } from '@/lib/notifications';
import { RATE_LABEL } from '@/lib/rates';
import { palette, radius, space } from '@/theme';

const UPDATE_TEXT = {
  idle: 'Buscar actualizaciones',
  checking: 'Buscando…',
  downloading: 'Descargando…',
  ready: 'Reiniciar para actualizar',
  'up-to-date': 'Estás en la última versión',
  error: 'No se pudo verificar. Reintentar',
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useFinance();
  const updates = useAppUpdates();

  const toggleNotifications = async (v) => {
    if (v) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        Alert.alert(
          'Notificaciones desactivadas',
          'Activalas desde los ajustes del teléfono para recibir recordatorios.',
        );
        return;
      }
    }
    updateSettings({ notifications: v });
  };

  const [confirmLogout, setConfirmLogout] = useState(false);

  const initials = (user?.displayName || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Screen>
      <Label>Visualización</Label>
      <Group>
        <View style={styles.block}>
          <Text variant="bodyMedium" style={styles.blockLabel}>
            Mostrar totales en
          </Text>
          <Segmented
            value={settings.displayCurrency}
            onChange={(v) => updateSettings({ displayCurrency: v })}
            options={[
              { value: 'ARS', label: 'Pesos', color: palette.primary },
              { value: 'USD', label: 'Dólares', color: palette.primary },
            ]}
          />
        </View>
        <View style={styles.block}>
          <Text variant="bodyMedium" style={styles.blockLabel}>
            Dólar para convertir
          </Text>
          <Segmented
            value={settings.rateType}
            onChange={(v) => updateSettings({ rateType: v })}
            options={Object.keys(RATE_LABEL).map((r) => ({
              value: r,
              label: RATE_LABEL[r],
              color: palette.primary,
            }))}
          />
        </View>
        <SwitchRow
          icon="chart-timeline-variant"
          label="Ajustar por inflación"
          description="En análisis y comparaciones"
          value={settings.inflationAdjust}
          onChange={(v) => updateSettings({ inflationAdjust: v })}
        />
      </Group>

      <View style={styles.section}>
        <Label>Notificaciones</Label>
        <Group>
          <SwitchRow
            icon="bell-outline"
            label="Recordatorios"
            description="Vencimientos de fijos, tarjetas y presupuestos"
            value={settings.notifications}
            onChange={toggleNotifications}
          />
        </Group>
      </View>

      <View style={styles.section}>
        <Label>App</Label>
        <Card style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Logo size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium">Mango {Constants.expoConfig?.version}</Text>
              <Text variant="labelSmall" style={{ color: palette.textDisabled, marginTop: 2 }}>
                {updates.channel ? `Canal ${updates.channel}` : 'Modo desarrollo'}
                {updates.createdAt ? ` · actualizado ${updates.createdAt.toLocaleDateString('es-AR')}` : ''}
              </Text>
            </View>
          </View>
          <ActionButton
            variant={updates.status === 'ready' ? 'solid' : 'tonal'}
            icon="update"
            label={UPDATE_TEXT[updates.status]}
            loading={updates.status === 'checking' || updates.status === 'downloading'}
            onPress={updates.status === 'ready' ? updates.apply : updates.check}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Label>Cuenta</Label>
        <Card style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={styles.avatarRing}>
              {user?.photoURL ? (
                <Avatar.Image size={48} source={{ uri: user.photoURL }} />
              ) : (
                <Avatar.Text
                  size={48}
                  label={initials}
                  style={{ backgroundColor: palette.primarySoft }}
                  color={palette.primary}
                  labelStyle={{ fontFamily: 'Inter_600SemiBold', fontSize: 17 }}
                />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="titleMedium" numberOfLines={1}>
                {user?.displayName || 'Sin nombre'}
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={{ color: palette.textSecondary, marginTop: 1 }}
              >
                {user?.email}
              </Text>
            </View>
          </View>
          <ActionButton
            variant="outline"
            icon="logout"
            label="Cerrar sesión"
            color={palette.expense}
            onPress={() => setConfirmLogout(true)}
          />
        </Card>
      </View>

      <ConfirmDialog
        visible={confirmLogout}
        icon="logout"
        title="¿Cerrar sesión?"
        message="Tus datos quedan guardados. Para volver a verlos, ingresá de nuevo con tu cuenta."
        confirmLabel="Cerrar sesión"
        tone="danger"
        onConfirm={() => signOut()}
        onDismiss={() => setConfirmLogout(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl },
  block: { padding: space.lg, gap: space.sm + 2 },
  blockLabel: { color: palette.textSecondary },
  avatarRing: {
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: palette.primary + '55',
  },
});