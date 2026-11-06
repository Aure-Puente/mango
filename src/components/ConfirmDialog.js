import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';
import { palette, space } from '@/theme';
import { dialogStyle } from './finance';
import { ActionButton, IconBubble } from './ui';

/**
 * Confirmación con el estilo de Mango (reemplaza al Alert nativo).
 *
 *   <ConfirmDialog
 *     visible={open}
 *     icon="logout"
 *     title="¿Cerrar sesión?"
 *     message="Vas a tener que volver a ingresar."
 *     confirmLabel="Cerrar sesión"
 *     tone="danger"
 *     onConfirm={signOut}
 *     onDismiss={() => setOpen(false)}
 *   />
 *
 * tone: 'danger' (rojo, para borrar o salir) · 'primary' (naranja)
 * onConfirm puede ser async: mientras corre, el botón muestra que está cargando.
 */
export function ConfirmDialog({
  visible,
  icon = 'help-circle-outline',
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  onConfirm,
  onDismiss,
}) {
  const [busy, setBusy] = useState(false);
  const color = tone === 'danger' ? palette.expense : palette.primary;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm?.();
      onDismiss?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <Dialog
        visible={!!visible}
        onDismiss={busy ? undefined : onDismiss}
        style={[dialogStyle, styles.dialog]}
      >
        <View style={styles.body}>
          <View style={[styles.halo, { backgroundColor: color + '14' }]}>
            <IconBubble icon={icon} color={color} size={52} />
          </View>
          <Text variant="titleLarge" style={styles.title}>
            {title}
          </Text>
          {message ? (
            <Text variant="bodyMedium" style={styles.message}>
              {message}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <ActionButton
            label={confirmLabel}
            color={color}
            onPress={confirm}
            loading={busy}
            style={{ alignSelf: 'stretch' }}
          />
          <ActionButton
            variant="ghost"
            label={cancelLabel}
            color={palette.textSecondary}
            onPress={onDismiss}
            disabled={busy}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { maxWidth: 400, paddingTop: space.xl },
  body: { alignItems: 'center', paddingHorizontal: space.xl, gap: space.sm },
  halo: { padding: 10, borderRadius: 999, marginBottom: space.sm },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', color: palette.textSecondary },
  actions: { padding: space.xl, paddingTop: space.xl, gap: space.xs },
});