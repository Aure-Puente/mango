//RegisterScreen:
import { useState } from 'react';
import { Text } from 'react-native-paper';
import { AuthError, AuthLayout, GoogleButton, OrDivider } from '@/components/AuthForm';
import { Field } from '@/components/fields';
import { ActionButton } from '@/components/ui';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { replace } from '@/navigation/RootNavigation';
import { palette } from '@/theme';

export default function Register() {
  const { register, google } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !email || !password) return setError('Completá todos los campos.');
    if (password.length < 6) return setError('La contraseña tiene que tener al menos 6 caracteres.');
    setError('');
    setLoading('email');
    try {
      await register(name, email, password);
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

  return (
    <AuthLayout
      subtitle="Creá tu cuenta y mirá cuánto te queda cada mes."
      footer={
        <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
          ¿Ya tenés cuenta?{' '}
          <Text
            onPress={() => replace('Login')}
            style={{ color: palette.primary, fontFamily: 'Inter_600SemiBold' }}
            suppressHighlighting
          >
            Ingresá
          </Text>
        </Text>
      }
    >
      <GoogleButton onPress={withGoogle} loading={loading === 'google'} />
      <OrDivider />
      <Field
        label="Nombre"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        left={<Field.Icon icon="account-outline" />}
      />
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
        autoComplete="new-password"
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
        label="Crear cuenta"
        onPress={submit}
        loading={loading === 'email'}
        disabled={!!loading && loading !== 'email'}
        style={{ marginTop: 4 }}
      />
    </AuthLayout>
  );
}