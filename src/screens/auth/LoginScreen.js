import { useState } from 'react';
import { Text } from 'react-native-paper';
import { AuthError, AuthLayout, GoogleButton, OrDivider } from '@/components/AuthForm';
import { Field } from '@/components/fields';
import { ActionButton } from '@/components/ui';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { replace } from '@/navigation/RootNavigation';
import { palette } from '@/theme';

export default function Login() {
  const { signIn, google, resetPassword } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email || !password) return setError('Completá email y contraseña.');
    setError('');
    setLoading('email');
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const withGoogle = async () => {
    setError('');
    setLoading('google');
    try {
      await google();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const forgot = async () => {
    if (!email) return setError('Escribí tu email y tocá de nuevo "Olvidé mi contraseña".');
    try {
      await resetPassword(email);
      toast.show('Te enviamos un email para restablecer la contraseña');
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <AuthLayout
      title="Hola de nuevo"
      subtitle="Tus cuentas claras, mes a mes."
      footer={
        <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
          ¿No tenés cuenta?{' '}
          <Text
            onPress={() => replace('Register')}
            style={{ color: palette.primary, fontFamily: 'Inter_600SemiBold' }}
            suppressHighlighting
          >
            Creala acá
          </Text>
        </Text>
      }
    >
      <GoogleButton onPress={withGoogle} loading={loading === 'google'} />
      <OrDivider />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        left={<Field.Icon icon="email-outline" />}
      />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPass}
        autoComplete="password"
        left={<Field.Icon icon="lock-outline" />}
        right={
          <Field.Icon
            icon={showPass ? 'eye-off-outline' : 'eye-outline'}
            onPress={() => setShowPass((v) => !v)}
          />
        }
        onSubmitEditing={submit}
      />
      <AuthError>{error}</AuthError>
      <ActionButton
        label="Ingresar"
        onPress={submit}
        loading={loading === 'email'}
        disabled={!!loading && loading !== 'email'}
        style={{ marginTop: 4 }}
      />
      <ActionButton
        variant="ghost"
        label="Olvidé mi contraseña"
        color={palette.textSecondary}
        onPress={forgot}
      />
    </AuthLayout>
  );
}
