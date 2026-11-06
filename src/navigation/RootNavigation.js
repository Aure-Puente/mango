import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

/**
 * Referencia global al NavigationContainer, para navegar desde cualquier lado
 * (componentes, notificaciones, toasts) sin tener que pasar `navigation` por props.
 * Es el patrón "Navigating without the navigation prop" de React Navigation.
 */
export const navigationRef = createNavigationContainerRef();

/** Pantallas que viven dentro de la barra de pestañas (TabNavigator) */
export const TAB_SCREENS = ['Inicio', 'Movimientos', 'Compromisos', 'Analisis', 'Mas'];

/**
 * Abre una pantalla. Si es una pestaña, cambia de pestaña; si no, la apila encima.
 * Ej: navigate('Cuenta', { id }), navigate('Movimientos', { account: id })
 */
export function navigate(name, params) {
  if (!navigationRef.isReady()) return;
  if (TAB_SCREENS.includes(name)) navigationRef.navigate('Tabs', { screen: name, params });
  else navigationRef.dispatch(StackActions.push(name, params));
}

/** Reemplaza la pantalla actual por otra (no queda en el historial) */
export function replace(name, params) {
  if (navigationRef.isReady()) navigationRef.dispatch(StackActions.replace(name, params));
}

/** Vuelve a la pantalla anterior */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
}

/** Vuelve hasta una pantalla que ya está en el historial */
export function popTo(name, params) {
  if (navigationRef.isReady()) navigationRef.dispatch(StackActions.popTo(name, params));
}

/**
 * Las notificaciones traen una ruta tipo "/compromisos" (así se guardaron siempre).
 * La traducimos al nombre de pantalla.
 */
const PATHS = {
  '/': 'Inicio',
  '/movimientos': 'Movimientos',
  '/compromisos': 'Compromisos',
  '/analisis': 'Analisis',
  '/mas': 'Mas',
  '/cuentas': 'Cuentas',
  '/categorias': 'Categorias',
  '/tarjetas': 'Tarjetas',
  '/metas': 'Metas',
  '/cotizaciones': 'Cotizaciones',
  '/ajustes': 'Ajustes',
  '/deudas': 'Deudas',
  '/deuda': 'DeudaDetalle',
};

export function openUrl(url) {
  const [path, query = ''] = String(url).split('?');
  const name = PATHS[path];
  if (!name) return false;
  const params = {};
  for (const pair of query.split('&').filter(Boolean)) {
    const [k, v = ''] = pair.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  navigate(name, Object.keys(params).length ? params : undefined);
  return true;
}

/** Ejecuta fn cuando el navegador esté listo (reintenta unos segundos) */
export function whenReady(fn, tries = 20) {
  if (navigationRef.isReady()) return fn();
  if (tries > 0) setTimeout(() => whenReady(fn, tries - 1), 150);
}
