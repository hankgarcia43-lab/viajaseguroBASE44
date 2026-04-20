/**
 * VIAJA SEGURO — Tests de comisiones
 * Ejecutar en consola del navegador: import('/src/lib/commissionCalc.test.js')
 * o revisar en la sección de logs del preview.
 *
 * No depende de ningún framework: corre en cualquier entorno JS.
 */
import { calcCommission, getCommissionPct, COMMISSION_FALLBACK_RECURRING, COMMISSION_FALLBACK_QUICK_RIDE } from './commissionCalc.js';

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FALLO: ${description}`);
    failed++;
  }
}

function assertEqual(description, actual, expected) {
  assert(`${description} (esperado ${expected}, obtenido ${actual})`, actual === expected);
}

console.group('🧪 Tests calcCommission — Viaja Seguro');

// --- Comisión recurrente (10%) ---
console.group('Comisión recurrente 10%');
const r1 = calcCommission(200, 10);
assertEqual('gross correcto', r1.gross, 200);
assertEqual('platformFee = 20', r1.platformFee, 20);
assertEqual('driverNet = 180', r1.driverNet, 180);
assertEqual('commissionPct = 10', r1.commissionPct, 10);
console.groupEnd();

// --- Comisión quick ride (20%) ---
console.group('Comisión quick ride 20%');
const r2 = calcCommission(250, 20);
assertEqual('gross correcto', r2.gross, 250);
assertEqual('platformFee = 50', r2.platformFee, 50);
assertEqual('driverNet = 200', r2.driverNet, 200);
console.groupEnd();

// --- Caso límite: comisión 0% ---
console.group('Comisión 0%');
const r3 = calcCommission(300, 0);
assertEqual('platformFee = 0', r3.platformFee, 0);
assertEqual('driverNet = gross', r3.driverNet, 300);
console.groupEnd();

// --- Caso límite: comisión alta válida 35% ---
console.group('Comisión alta 35%');
const r4 = calcCommission(100, 35);
assertEqual('platformFee = 35', r4.platformFee, 35);
assertEqual('driverNet = 65', r4.driverNet, 65);
console.groupEnd();

// --- Precios con decimales ---
console.group('Precios con decimales');
const r5 = calcCommission(150.50, 10);
assertEqual('platformFee = 15.05', r5.platformFee, 15.05);
assertEqual('driverNet = 135.45', r5.driverNet, 135.45);
console.groupEnd();

// --- Múltiples asientos (gross ya calculado fuera) ---
console.group('Múltiples asientos (3 asientos × $80 = $240)');
const gross6 = 3 * 80; // el caller calcula el gross antes
const r6 = calcCommission(gross6, 10);
assertEqual('gross = 240', r6.gross, 240);
assertEqual('platformFee = 24', r6.platformFee, 24);
assertEqual('driverNet = 216', r6.driverNet, 216);
console.groupEnd();

// --- getCommissionPct con config válida ---
console.group('getCommissionPct con config DB');
const fakeConfig = { commission_recurring: 12, commission_quick_ride: 18, _loadedFromDB: true };
assertEqual('recurring desde config', getCommissionPct(fakeConfig, 'recurring'), 12);
assertEqual('quick_ride desde config', getCommissionPct(fakeConfig, 'quick_ride'), 18);
console.groupEnd();

// --- getCommissionPct sin config (fallback) ---
console.group('getCommissionPct fallback (sin config)');
assertEqual('fallback recurring', getCommissionPct(null, 'recurring'), COMMISSION_FALLBACK_RECURRING);
assertEqual('fallback quick_ride', getCommissionPct(null, 'quick_ride'), COMMISSION_FALLBACK_QUICK_RIDE);
console.groupEnd();

// --- Consistencia: gross === platformFee + driverNet ---
console.group('Consistencia interna (gross = fee + net)');
[
  [100, 10], [250, 20], [0, 15], [500, 35], [33.33, 7]
].forEach(([gross, pct]) => {
  const res = calcCommission(gross, pct);
  const sum = Math.round((res.platformFee + res.driverNet) * 100) / 100;
  assert(`gross ${gross} @ ${pct}%: fee+net = ${sum}`, Math.abs(sum - res.gross) < 0.01);
});
console.groupEnd();

// --- Resumen ---
console.groupEnd();
console.log(`\n📊 Resultado: ${passed} pasaron, ${failed} fallaron`);
if (failed === 0) {
  console.log('🎉 Todos los tests pasaron correctamente.');
} else {
  console.error(`⚠️ ${failed} test(s) fallaron. Revisar antes de operar.`);
}

export const testResults = { passed, failed };