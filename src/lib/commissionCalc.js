/**
 * VIAJA SEGURO — Cálculo central de comisiones
 * ÚNICA fuente de verdad para todos los cálculos financieros.
 * Usar esta función en toda pantalla o servicio que necesite calcular pagos.
 */

// Fallback seguro (10%) — solo aplica si la DB no tiene configuración.
// Si se usa este fallback, el admin debe ver una advertencia.
export const COMMISSION_FALLBACK_RECURRING = 10;
export const COMMISSION_FALLBACK_QUICK_RIDE = 20;

/**
 * Calcula la distribución financiera de un viaje.
 *
 * @param {number} grossAmount  - Monto bruto cobrado al pasajero (MXN)
 * @param {number} commissionPct - Porcentaje de comisión (0-100), ej: 10 para 10%
 * @returns {{ gross: number, platformFee: number, driverNet: number, commissionPct: number }}
 */
export function calcCommission(grossAmount, commissionPct) {
  const gross = Math.round((grossAmount || 0) * 100) / 100;
  const pct = typeof commissionPct === 'number' && commissionPct >= 0 ? commissionPct : COMMISSION_FALLBACK_RECURRING;
  const platformFee = Math.round(gross * (pct / 100) * 100) / 100;
  const driverNet = Math.round((gross - platformFee) * 100) / 100;
  return { gross, platformFee, driverNet, commissionPct: pct };
}

/**
 * Extrae la comisión correcta desde el objeto de configuración cargado.
 * @param {object} appConfig - Objeto cargado desde loadAppConfig()
 * @param {'recurring'|'quick_ride'} type
 * @returns {number} porcentaje (ej: 10)
 */
export function getCommissionPct(appConfig, type = 'recurring') {
  if (!appConfig) {
    return type === 'quick_ride' ? COMMISSION_FALLBACK_QUICK_RIDE : COMMISSION_FALLBACK_RECURRING;
  }
  const key = type === 'quick_ride' ? 'commission_quick_ride' : 'commission_recurring';
  const val = appConfig[key];
  if (typeof val === 'number' && val >= 0) return val;
  return type === 'quick_ride' ? COMMISSION_FALLBACK_QUICK_RIDE : COMMISSION_FALLBACK_RECURRING;
}

/**
 * Devuelve true si la config fue cargada desde DB (no es solo defaults).
 * Útil para mostrar advertencia al admin si la DB no respondió.
 */
export function isConfigFromDB(appConfig) {
  return appConfig && appConfig._loadedFromDB === true;
}