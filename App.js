//App:
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { NavigationContainer } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { SetupNeeded } from '@/components/SetupNeeded';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { MarketProvider } from '@/context/MarketContext';
import { ToastProvider } from '@/context/ToastContext';
import { UpdatesProvider } from '@/hooks/useAppUpdates';
import { firebaseConfigured } from '@/lib/firebase';
import RootNavigator from '@/navigation/RootNavigator';
import { navigationRef } from '@/navigation/RootNavigation';
import { navTheme, palette, theme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync(palette.background).catch(() => {});

const { width: w, height: h } = Dimensions.get('screen');
if (Math.min(w, h) < 600) {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [splashDone, setSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style="light" />
          {!fontsLoaded ? null : !firebaseConfigured ? (
            <SetupNeeded />
          ) : (
            <UpdatesProvider>
              <AuthProvider>
                <ToastProvider>
                  <DataProvider>
                    <MarketProvider>
                      <NavigationContainer ref={navigationRef} theme={navTheme}>
                        <RootNavigator />
                      </NavigationContainer>
                    </MarketProvider>
                  </DataProvider>
                </ToastProvider>
              </AuthProvider>
            </UpdatesProvider>
          )}
          {fontsLoaded && !splashDone ? <AnimatedSplash onDone={() => setSplashDone(true)} /> : null}
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}