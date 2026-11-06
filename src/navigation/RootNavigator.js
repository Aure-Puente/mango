import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View } from 'react-native';
import { NotificationHandler } from '@/components/NotificationHandler';
import { ReminderSync } from '@/components/ReminderSync';
import { UpdateBanner } from '@/components/UpdateBanner';
import { useAuth } from '@/context/AuthContext';
import AjustesScreen from '@/screens/AjustesScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import CategoriaScreen from '@/screens/CategoriaScreen';
import CategoriasScreen from '@/screens/CategoriasScreen';
import CompraDetalleScreen from '@/screens/CompraDetalleScreen';
import CompraScreen from '@/screens/CompraScreen';
import CotizacionesScreen from '@/screens/CotizacionesScreen';
import CuentaScreen from '@/screens/CuentaScreen';
import CuentasScreen from '@/screens/CuentasScreen';
import DeudaDetalleScreen from '@/screens/DeudaDetalleScreen';
import DeudaScreen from '@/screens/DeudaScreen';
import DeudasScreen from '@/screens/DeudasScreen';
import FijoScreen from '@/screens/FijoScreen';
import MetaScreen from '@/screens/MetaScreen';
import MetasScreen from '@/screens/MetasScreen';
import MovimientoScreen from '@/screens/MovimientoScreen';
import TarjetaScreen from '@/screens/TarjetaScreen';
import TarjetasScreen from '@/screens/TarjetasScreen';
import { palette } from '@/theme';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

/** Formularios: hoja que sube desde abajo (en iOS, la hoja nativa con gesto para cerrar) */
const modal = {
  presentation: 'modal',
  headerShown: true,
  animation: Platform.OS === 'ios' ? 'default' : 'slide_from_bottom',
};

/** Pantallas de detalle y listados: entran desde la derecha, con el deslizamiento de iOS también en Android */
const push = {
  headerShown: true,
  animation: Platform.OS === 'android' ? 'ios_from_right' : 'slide_from_right',
};

/**
 * Navegador principal. Sin sesión: Login y Registro. Con sesión: las pestañas
 * y, encima, los formularios y pantallas de detalle.
 */
export default function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: palette.background },
          headerShadowVisible: false,
          headerTintColor: palette.text,
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
          headerTitleAlign: 'center',
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: palette.background },
          animation: 'fade',
          animationDuration: 220,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen
              name="Movimiento"
              component={MovimientoScreen}
              options={{ ...modal, title: 'Nuevo movimiento' }}
            />
            <Stack.Screen
              name="Compra"
              component={CompraScreen}
              options={{ ...modal, title: 'Compra en cuotas' }}
            />
            <Stack.Screen
              name="CompraDetalle"
              component={CompraDetalleScreen}
              options={{ ...push, title: 'Detalle' }}
            />
            <Stack.Screen name="Fijo" component={FijoScreen} options={{ ...modal, title: 'Fijo' }} />
            <Stack.Screen name="Cuentas" component={CuentasScreen} options={{ ...push, title: 'Cuentas' }} />
            <Stack.Screen name="Cuenta" component={CuentaScreen} options={{ ...modal, title: 'Cuenta' }} />
            <Stack.Screen
              name="Categorias"
              component={CategoriasScreen}
              options={{ ...push, title: 'Categorías y presupuestos' }}
            />
            <Stack.Screen
              name="Categoria"
              component={CategoriaScreen}
              options={{ ...modal, title: 'Categoría' }}
            />
            <Stack.Screen
              name="Tarjetas"
              component={TarjetasScreen}
              options={{ ...push, title: 'Tarjetas' }}
            />
            <Stack.Screen name="Tarjeta" component={TarjetaScreen} options={{ ...modal, title: 'Tarjeta' }} />
            <Stack.Screen
              name="Metas"
              component={MetasScreen}
              options={{ ...push, title: 'Metas de ahorro' }}
            />
            <Stack.Screen name="Meta" component={MetaScreen} options={{ ...modal, title: 'Meta' }} />
            <Stack.Screen
              name="Cotizaciones"
              component={CotizacionesScreen}
              options={{ ...push, title: 'Dólar hoy' }}
            />
            <Stack.Screen
              name="Deudas"
              component={DeudasScreen}
              options={{ ...push, title: 'Deudas y préstamos' }}
            />
            <Stack.Screen name="Deuda" component={DeudaScreen} options={{ ...modal, title: 'Deuda' }} />
            <Stack.Screen
              name="DeudaDetalle"
              component={DeudaDetalleScreen}
              options={{ ...push, title: 'Detalle' }}
            />
            <Stack.Screen name="Ajustes" component={AjustesScreen} options={{ ...push, title: 'Ajustes' }} />
          </>
        )}
      </Stack.Navigator>
      {user ? <ReminderSync /> : null}
      {user ? <NotificationHandler /> : null}
      <UpdateBanner />
    </>
  );
}
