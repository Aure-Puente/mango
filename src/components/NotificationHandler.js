//NotificationHandler:
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { openUrl, whenReady } from '@/navigation/RootNavigation';

export function NotificationHandler() {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const open = (response) => {
      const url = response?.notification?.request?.content?.data?.url;
      if (typeof url === 'string') whenReady(() => openUrl(url));
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      open(last);
      Notifications.clearLastNotificationResponse();
    }
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

  return null;
}
