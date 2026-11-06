//google:
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

let configured = false;

export const googleAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  TurboModuleRegistry.get('RNGoogleSignin') != null;

export async function signInWithGoogle() {
  if (!googleAvailable) {
    throw new Error('El acceso con Google necesita un development build. En Expo Go usá email y contraseña.');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-google-signin/google-signin');
  const { GoogleSignin, isSuccessResponse } = mod;

  if (!configured) {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    });
    configured = true;
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res)) return false;

  const idToken = res.data.idToken;
  if (!idToken) throw new Error('Google no devolvió el token. Revisá EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  return true;
}

export async function signOutGoogle() {
  if (!googleAvailable) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
  }
}
