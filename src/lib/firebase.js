//firebase:
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

const isFirstInit = getApps().length === 0;
export const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

let _auth;
if (Platform.OS === 'web' || !isFirstInit) {
  _auth = getAuth(app);
} else {
  _auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
export const auth = _auth;

let _db;
try {
  _db = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  _db = getFirestore(app);
}
export const db = _db;
