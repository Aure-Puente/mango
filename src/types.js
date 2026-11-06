/**
 * Modelo de datos de Mango (documentación con JSDoc).
 *
 * Convenciones:
 * - Montos siempre en centavos (enteros) para evitar errores de redondeo.
 * - Fechas como 'YYYY-MM-DD' y meses (períodos) como 'YYYY-MM'.
 * - Moneda: 'ARS' | 'USD'.
 *
 * @typedef {'ARS' | 'USD'} Currency
 *
 * @typedef {Object} Account                      users/{uid}/accounts
 * @property {string} id
 * @property {string} name
 * @property {'cash'|'mp'|'bank'|'wallet'|'other'} type
 * @property {Currency} currency
 * @property {number} initialBalance              centavos
 * @property {boolean} [remunerated]              genera rendimientos (ej: Mercado Pago)
 * @property {string} color
 * @property {boolean} [archived]
 *
 * @typedef {Object} Transaction                  users/{uid}/transactions
 * @property {string} id
 * @property {'income'|'expense'|'transfer'} type
 * @property {number} amount                      centavos
 * @property {Currency} currency
 * @property {string} accountId
 * @property {string|null} [toAccountId]          transferencias / cambio de moneda
 * @property {number|null} [toAmount]             monto recibido en la cuenta destino
 * @property {string|null} [categoryId]
 * @property {string} [note]
 * @property {string} date                        'YYYY-MM-DD'
 * @property {number|null} [rate]                 pesos por dólar al momento del movimiento
 * @property {'cash'|'transfer'|'mp'|'debit'|'credit'|'other'|null} [method]
 * @property {Object|null} [source]               fijo o cuota que lo generó
 *
 * @typedef {Object} Category                     users/{uid}/categories
 * @property {string} id
 * @property {string} name
 * @property {'expense'|'income'} kind
 * @property {string} icon                        MaterialCommunityIcons
 * @property {string} color
 * @property {number|null} [budget]               presupuesto mensual en pesos (centavos)
 *
 * @typedef {Object} Card                         users/{uid}/cards
 * @property {string} id
 * @property {string} name
 * @property {number} closingDay
 * @property {number} dueDay
 * @property {string} color
 * @property {string|null} [accountId]            cuenta desde la que se paga el resumen
 *
 * @typedef {Object} Purchase                     users/{uid}/purchases (compras en cuotas)
 * @property {string} id
 * @property {string} description
 * @property {number} total                       centavos
 * @property {Currency} currency
 * @property {number} installments
 * @property {string} date
 * @property {string} firstPeriod                 'YYYY-MM' de la primera cuota
 * @property {'card'|'loan'|'other'} kind
 * @property {string|null} [cardId]
 * @property {string|null} [accountId]
 * @property {string|null} [categoryId]
 * @property {string|null} [prepaidAt]            cancelación anticipada: las cuotas restantes caen en este mes
 * @property {Object<string,string>} paid         nro de cuota -> id de movimiento ('previo' si ya estaba paga)
 *
 * @typedef {Object} Recurring                    users/{uid}/recurring (fijos)
 * @property {string} id
 * @property {string} name
 * @property {'income'|'expense'} type
 * @property {number} amount
 * @property {Currency} currency
 * @property {string|null} [accountId]
 * @property {string|null} [categoryId]
 * @property {number} dayOfMonth
 * @property {string} startPeriod
 * @property {string|null} [endPeriod]            último mes (inclusive); null = sin fin
 * @property {number[]} [months]                  meses en que aplica (1-12); vacío = todos
 * @property {boolean} remind
 * @property {Object<string,string>} paid         'YYYY-MM' -> id de movimiento
 *
 * @typedef {Object} Goal                         users/{uid}/goals
 * @property {string} id
 * @property {string} name
 * @property {number} target
 * @property {number} saved
 * @property {Currency} currency
 * @property {string|null} [deadline]
 * @property {string} color
 * @property {string} [icon]                     ícono de MaterialCommunityIcons (por defecto, chanchito)
 *
 * @typedef {Object} DebtPayment
 * @property {string} id
 * @property {number} amount
 * @property {string} date
 * @property {string|null} accountId             cuenta donde entró/salió (null: solo anotado)
 * @property {string|null} txId                  movimiento creado (transferencia con "fuera de Mango")
 *
 * @typedef {Object} Debt                         users/{uid}/debts
 * @property {string} id
 * @property {'owed'|'owe'} direction            owed: te deben · owe: debés
 * @property {string} person
 * @property {number} amount                      total prestado
 * @property {Currency} currency
 * @property {string} date                        cuándo se prestó
 * @property {string|null} [dueDate]              cuándo se devuelve (opcional)
 * @property {string} [note]
 * @property {string|null} accountId             cuenta del préstamo (null: solo anotado)
 * @property {string|null} txId                  movimiento del préstamo
 * @property {DebtPayment[]} payments            cobros / pagos (parciales o totales)
 *
 * @typedef {'oficial'|'blue'|'bolsa'} RateType
 *
 * @typedef {Object} Settings                     users/{uid}.settings
 * @property {Currency} displayCurrency
 * @property {RateType} rateType
 * @property {boolean} inflationAdjust
 * @property {boolean} notifications
 * @property {boolean} [seeded]
 * @property {number} [catVersion]                versión de las categorías por defecto ya aplicada
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = {
  displayCurrency: 'ARS',
  rateType: 'blue',
  inflationAdjust: false,
  notifications: true,
};
