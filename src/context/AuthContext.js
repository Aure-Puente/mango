import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithGoogle, signOutGoogle } from '@/lib/google';

const Ctx = createContext(null);

/** Traduce los errores de Firebase a mensajes entendibles */
export function authErrorMessage(e) {
  const code = e?.code ?? '';
  const map = {
    'auth/invalid-email': 'El email no es válido.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/wrong-password': 'Email o contraseña incorrectos.',
    'auth/user-not-found': 'No hay una cuenta con ese email.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
    'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en unos minutos.',
    'auth/network-request-failed': 'Sin conexión. Revisá tu internet.',
    'auth/account-exists-with-different-credential':
      'Ese email ya está registrado con otro método de acceso.',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Ocurrió un error inesperado.');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setInitializing(false);
      }),
    [],
  );

  const value = useMemo(
    () => ({
      user,
      initializing,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      register: async (name, email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
      },
      google: () => signInWithGoogle(),
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email.trim());
      },
      signOut: async () => {
        await signOutGoogle();
        await fbSignOut(auth);
      },
    }),
    [user, initializing],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}
