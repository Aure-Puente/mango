//ScreenOptions:
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';

export function ScreenOptions({ options }) {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions(options);
  });
  return null;
}
