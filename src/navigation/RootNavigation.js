//RootNavigation:
import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const TAB_SCREENS = ['Inicio', 'Movimientos', 'Compromisos', 'Analisis', 'Mas'];

export function navigate(name, params) {
  if (!navigationRef.isReady()) return;
  if (TAB_SCREENS.includes(name)) navigationRef.navigate('Tabs', { screen: name, params });
  else navigationRef.dispatch(StackActions.push(name, params));
}

export function replace(name, params) {
  if (navigationRef.isReady()) navigationRef.dispatch(StackActions.replace(name, params));
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
}

export function popTo(name, params) {
  if (navigationRef.isReady()) navigationRef.dispatch(StackActions.popTo(name, params));
}

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

export function whenReady(fn, tries = 20) {
  if (navigationRef.isReady()) return fn();
  if (tries > 0) setTimeout(() => whenReady(fn, tries - 1), 150);
}
