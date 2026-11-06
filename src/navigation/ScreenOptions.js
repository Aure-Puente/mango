import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';

/**
 * Configura el header de la pantalla actual desde adentro de la pantalla
 * (título, botones a la derecha). Equivale a llamar navigation.setOptions(...).
 *
 *   <ScreenOptions options={{ title: 'Editar cuenta', headerRight: () => <HeaderButton ... /> }} />
 */
export function ScreenOptions({ options }) {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions(options);
  });
  return null;
}
