# 🥭 Mango

App de finanzas personales pensada para Argentina: ingresos y gastos en pesos y dólares, gastos fijos, compras en cuotas con tarjeta, presupuestos y metas de ahorro. Te muestra en todo momento cuánto te queda este mes y qué tenés que pagar.

## Funciones

- **Inicio:** cuánto te queda este mes (contando lo que falta pagar), tus cuentas, próximos vencimientos, metas y últimos movimientos.
- **Movimientos:** gastos, ingresos, transferencias y compra/venta de dólares. Tiene búsqueda, filtros y exportación a CSV.
- **Fijos y cuotas:** gastos e ingresos recurrentes, compras en cuotas con tarjeta o préstamo, y resumen mensual por tarjeta. Los marcás como pagados y la app crea el movimiento sola.
- **Análisis:** ingresos vs gastos, gastos por categoría, lo comprometido de los próximos meses, evolución del patrimonio y ajuste por inflación.
- **Más:** cuentas, tarjetas, categorías con presupuesto, metas de ahorro, cotizaciones del dólar en vivo y ajustes.
- **Además:** recordatorios de vencimientos, sincronización en la nube, login con email o Google y actualizaciones automáticas.

## Stack

Expo SDK 58 · React Native · React Navigation 7 · React Native Paper · Firebase (Auth + Firestore) · EAS Update · react-native-gifted-charts

Cotizaciones de [dolarapi.com](https://dolarapi.com), y dólar histórico e inflación de [argentinadatos.com](https://argentinadatos.com).

## Desarrollo

```bash
npm install
cp .env.example .env      # completar con las credenciales de Firebase y Google
npx expo start --dev-client
```

```bash
npm run lint              # ESLint
npm run update            # publicar una actualización OTA (EAS Update)
```

## Estructura

```
src/
  navigation/   Stack principal y pestañas
  screens/      Una pantalla por archivo
  components/   UI reutilizable
  context/      Sesión, datos de Firestore, cotizaciones y toasts
  hooks/        useFinance, useAppUpdates, useLayout
  lib/          Cálculos, fechas, montos, Firebase y notificaciones
  theme.js      Paleta y tema
```