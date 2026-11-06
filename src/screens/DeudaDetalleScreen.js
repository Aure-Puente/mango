//DeudaDetalleScreen:
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DebtPaymentDialog, PersonAvatar, debtDue, personColor } from '@/components/debts';
import {
  ActionButton,
  Bar,
  Card,
  Divider,
  Empty,
  HeaderButton,
  Label,
  Pill,
  Row,
  Screen,
} from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { ScreenOptions } from '@/navigation/ScreenOptions';
import { useFinance } from '@/hooks/useFinance';
import { dateLabel } from '@/lib/dates';
import { debtStatus } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { goBack, navigate } from '@/navigation/RootNavigation';
import { palette, space } from '@/theme';

const ofDate = (d) => {
  const l = dateLabel(d);
  return l === 'Hoy' || l === 'Ayer' ? l.toLowerCase() : `el ${l}`;
};

export default function DebtDetail() {
  const { id } = useRoute().params ?? {};
  const { debts, accounts, deleteDebt, removeDebtPayment, addDebtPayment } = useFinance();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const d = debts.find((x) => x.id === id);

  if (!d) {
    return (
      <Screen>
        <Empty
          icon="help-circle-outline"
          title="No encontramos esta deuda"
          action="Volver"
          onAction={goBack}
        />
      </Screen>
    );
  }

  const owed = d.direction === 'owed';
  const st = debtStatus(d);
  const due = st.done ? null : debtDue(d);
  const color = personColor(d.person);
  const accName = (aid) => accounts.find((a) => a.id === aid)?.name;
  const payments = [...(d.payments ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <ScreenOptions
        options={{
          title: d.person,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <HeaderButton
                icon="pencil-outline"
                accessibilityLabel="Editar"
                onPress={() => navigate('Deuda', { id: d.id })}
              />
              <HeaderButton
                icon="trash-can-outline"
                color={palette.expense}
                accessibilityLabel="Borrar"
                onPress={() => setConfirm('delete')}
              />
            </View>
          ),
        }}
      />
      <Screen>
        <Card style={[styles.hero, { borderColor: color + '33' }]}>
          <LinearGradient
            pointerEvents="none"
            colors={[color + '22', color + '00']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.35, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.head}>
            <PersonAvatar name={d.person} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="titleLarge" numberOfLines={1}>
                {d.person}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={{ color: palette.textSecondary }}>
                {d.note || (owed ? 'Te debe' : 'Le debés')}
              </Text>
            </View>
            {st.done ? <Pill label="Saldada" color={palette.income} icon="check" /> : null}
          </View>

          <View>
            <Text variant="labelLarge" style={{ color: palette.textSecondary }}>
              {st.done ? (owed ? 'Te devolvió todo' : 'Pagaste todo') : owed ? 'Te debe' : 'Le debés'}
            </Text>
            <Text
              variant="displaySmall"
              style={[styles.num, { color: !st.done && owed ? palette.income : palette.text }]}
            >
              {formatMoney(st.done ? d.amount : st.pending, d.currency)}
            </Text>
          </View>

          {st.paid ? <Bar value={st.ratio} color={color} warnAt={null} /> : null}

          <View style={styles.stats}>
            <Stat label={owed ? 'Prestaste' : 'Te prestó'} value={formatMoney(d.amount, d.currency)} />
            <View style={styles.vline} />
            <Stat label={owed ? 'Te devolvió' : 'Devolviste'} value={formatMoney(st.paid, d.currency)} />
          </View>

          <View style={styles.meta}>
            <MaterialCommunityIcons name="calendar-outline" size={15} color={palette.textSecondary} />
            <Text variant="bodySmall" style={{ color: palette.textSecondary, flex: 1 }}>
              {owed ? 'Le prestaste ' : 'Te prestó '}
              {ofDate(d.date)}
              {due ? <Text style={{ color: due.color }}> · {due.text.toLowerCase()}</Text> : null}
            </Text>
          </View>
        </Card>

        {!st.done ? (
          <ActionButton
            icon={owed ? 'arrow-down-left' : 'arrow-up-right'}
            label={owed ? 'Registrar cobro' : 'Registrar pago'}
            style={{ marginTop: space.lg }}
            onPress={() => setPaying(true)}
          />
        ) : null}

        <View style={styles.section}>
          <Label>Historial</Label>
          <Card style={{ paddingVertical: space.xs }}>
            {payments.map((p) => (
              <View key={p.id}>
                <Row
                  icon={owed ? 'arrow-down-left' : 'arrow-up-right'}
                  iconColor={owed ? palette.income : palette.info}
                  title={owed ? 'Te devolvió' : 'Le devolviste'}
                  subtitle={[dateLabel(p.date), accName(p.accountId) ?? 'Solo anotado'].join(' · ')}
                  right={formatMoney(p.amount, d.currency)}
                  rightColor={owed ? palette.income : palette.text}
                  onPress={() => setConfirm(p)}
                />
                <Divider />
              </View>
            ))}
            <Row
              icon={owed ? 'hand-coin-outline' : 'cash-plus'}
              iconColor={color}
              title={owed ? 'Le prestaste' : 'Te prestó'}
              subtitle={[dateLabel(d.date), accName(d.accountId) ?? 'Solo anotado'].join(' · ')}
              right={formatMoney(d.amount, d.currency)}
            />
          </Card>
          {payments.length ? (
            <Text variant="bodySmall" style={styles.footnote}>
              Tocá un {owed ? 'cobro' : 'pago'} para borrarlo.
            </Text>
          ) : null}
        </View>
      </Screen>

      {paying ? <DebtPaymentDialog debt={d} onDismiss={() => setPaying(false)} /> : null}

      <ConfirmDialog
        visible={confirm === 'delete'}
        icon="trash-can-outline"
        title={owed ? '¿Borrar este préstamo?' : '¿Borrar esta deuda?'}
        message={
          d.txId || payments.some((p) => p.txId)
            ? `Se borra la deuda con ${d.person} y sus movimientos, así tus cuentas vuelven a como estaban antes.`
            : `Se borra la deuda con ${d.person}. Estaba solo anotada, así que ningún saldo cambia.`
        }
        confirmLabel="Borrar"
        tone="danger"
        onConfirm={async () => {
          await deleteDebt(d);
          goBack();
        }}
        onDismiss={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={!!confirm && confirm !== 'delete'}
        icon="undo-variant"
        title={owed ? '¿Borrar este cobro?' : '¿Borrar este pago?'}
        message={
          confirm && confirm !== 'delete'
            ? `${formatMoney(confirm.amount, d.currency)} de ${ofDate(confirm.date)}. ${confirm.txId ? 'También se borra su movimiento.' : ''}`
            : ''
        }
        confirmLabel="Borrar"
        tone="danger"
        onConfirm={async () => {
          const p = confirm;
          await removeDebtPayment(d, p);
          toast.show(owed ? 'Cobro borrado' : 'Pago borrado', {
            action: {
              label: 'Deshacer',
              onPress: () =>
                addDebtPayment(d, { amount: p.amount, date: p.date, accountId: p.accountId }).catch(() => {}),
            },
          });
        }}
        onDismiss={() => setConfirm(null)}
      />
    </>
  );
}

function Stat({ label, value }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
        {label}
      </Text>
      <Text variant="titleMedium" numberOfLines={1} adjustsFontSizeToFit style={styles.num}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.xl, gap: space.md, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  num: { fontVariant: ['tabular-nums'] },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.border },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  section: { marginTop: space.xl },
  footnote: { color: palette.textDisabled, marginTop: space.md, textAlign: 'center' },
});
