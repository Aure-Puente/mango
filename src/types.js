/**
 * Modelo de datos de Mango (documentación con JSDoc).
 * @typedef {'ARS' | 'USD'} Currency
 *
 * @typedef {Object} Account                      
 * @property {string} id
 * @property {string} name
 * @property {'cash'|'mp'|'bank'|'wallet'|'other'} type
 * @property {Currency} currency
 * @property {number} initialBalance              
 * @property {boolean} [remunerated]              
 * @property {string} color
 * @property {boolean} [archived]
 *
 * @typedef {Object} Transaction                 
 * @property {string} id
 * @property {'income'|'expense'|'transfer'} type
 * @property {number} amount                      
 * @property {Currency} currency
 * @property {string} accountId
 * @property {string|null} [toAccountId]         
 * @property {number|null} [toAmount]            
 * @property {string|null} [categoryId]
 * @property {string} [note]
 * @property {string} date                        
 * @property {number|null} [rate]                
 * @property {'cash'|'transfer'|'mp'|'debit'|'credit'|'other'|null} [method]
 * @property {Object|null} [source]              
 *
 * @typedef {Object} Category                     
 * @property {string} id
 * @property {string} name
 * @property {'expense'|'income'} kind
 * @property {string} icon                        
 * @property {string} color
 * @property {number|null} [budget]               
 *
 * @typedef {Object} Card                        
 * @property {string} id
 * @property {string} name
 * @property {number} closingDay
 * @property {number} dueDay
 * @property {string} color
 * @property {string|null} [accountId]           
 *
 * @typedef {Object} Purchase                     
 * @property {string} id
 * @property {string} description
 * @property {number} total                       
 * @property {Currency} currency
 * @property {number} installments
 * @property {string} date
 * @property {string} firstPeriod                 
 * @property {'card'|'loan'|'other'} kind
 * @property {string|null} [cardId]
 * @property {string|null} [accountId]
 * @property {string|null} [categoryId]
 * @property {string|null} [prepaidAt]            
 * @property {Object<string,string>} paid         
 *
 * @typedef {Object} Recurring                   
 * @property {string} id
 * @property {string} name
 * @property {'income'|'expense'} type
 * @property {number} amount
 * @property {Currency} currency
 * @property {string|null} [accountId]
 * @property {string|null} [categoryId]
 * @property {number} dayOfMonth
 * @property {string} startPeriod
 * @property {string|null} [endPeriod]           
 * @property {number[]} [months]                  
 * @property {boolean} remind
 * @property {Object<string,string>} paid        
 *
 * @typedef {Object} Goal                         
 * @property {string} id
 * @property {string} name
 * @property {number} target
 * @property {number} saved
 * @property {Currency} currency
 * @property {string|null} [deadline]
 * @property {string} color
 * @property {string} [icon]                     
 *
 * @typedef {'oficial'|'blue'|'bolsa'} RateType
 *
 * @typedef {Object} Settings                    
 * @property {Currency} displayCurrency
 * @property {RateType} rateType
 * @property {boolean} inflationAdjust
 * @property {boolean} notifications
 * @property {boolean} [seeded]
 * @property {number} [catVersion]         
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = {
  displayCurrency: 'ARS',
  rateType: 'blue',
  inflationAdjust: false,
  notifications: true,
};