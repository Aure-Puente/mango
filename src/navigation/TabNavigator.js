import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { TabBar } from '@/components/TabBar';
import { StatusBarScrim } from '@/components/ui';
import AnalisisScreen from '@/screens/AnalisisScreen';
import CompromisosScreen from '@/screens/CompromisosScreen';
import InicioScreen from '@/screens/InicioScreen';
import MasScreen from '@/screens/MasScreen';
import MovimientosScreen from '@/screens/MovimientosScreen';
import { palette } from '@/theme';

const Tab = createBottomTabNavigator();

function icon(name, active) {
  return function TabIcon({ color, focused, size }) {
    return <MaterialCommunityIcons name={focused ? active : name} size={size ?? 22} color={color} />;
  };
}

/** Las 5 pestañas de abajo, con la barra propia de Mango */
export default function TabNavigator() {
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: palette.background },
          animation: 'fade',
        }}
      >
        <Tab.Screen
          name="Inicio"
          component={InicioScreen}
          options={{ title: 'Inicio', tabBarIcon: icon('home-variant-outline', 'home-variant') }}
        />
        <Tab.Screen
          name="Movimientos"
          component={MovimientosScreen}
          options={{ title: 'Movimientos', tabBarIcon: icon('swap-vertical', 'swap-vertical-bold') }}
        />
        <Tab.Screen
          name="Compromisos"
          component={CompromisosScreen}
          options={{
            title: 'Fijos y cuotas',
            tabBarLabel: 'Fijos',
            tabBarIcon: icon('calendar-month-outline', 'calendar-month'),
          }}
        />
        <Tab.Screen
          name="Analisis"
          component={AnalisisScreen}
          options={{ title: 'Análisis', tabBarIcon: icon('chart-donut', 'chart-donut') }}
        />
        <Tab.Screen
          name="Mas"
          component={MasScreen}
          options={{
            title: 'Más',
            tabBarIcon: icon('dots-horizontal-circle-outline', 'dots-horizontal-circle'),
          }}
        />
      </Tab.Navigator>
      {/* Fondo detrás de la hora y la batería, encima de todas las pestañas */}
      <StatusBarScrim />
    </View>
  );
}
