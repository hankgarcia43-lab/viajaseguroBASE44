/**
 * Generación de código de abordaje seguro.
 * 6 caracteres alfanuméricos, mayúsculas, sin ambiguos (0/O, 1/I/L).
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Genera un código de abordaje de 6 caracteres aleatorio y no predecible.
 * Usa crypto.getRandomValues si está disponible (navegadores modernos y Deno).
 */
export function generateBoardingCode() {
  const length = 6;
  let result = '';
  const arr = new Uint8Array(length * 2); // extra bytes para distribución uniforme
  crypto.getRandomValues(arr);
  let i = 0;
  while (result.length < length) {
    const byte = arr[i++ % arr.length];
    const idx = byte % ALPHABET.length;
    // Rechazar si fuera de rango uniforme (evita sesgo modular con alfabeto < 256)
    if (byte < Math.floor(256 / ALPHABET.length) * ALPHABET.length) {
      result += ALPHABET[idx];
    }
    if (i >= arr.length) {
      // Regenerar si necesitamos más bytes (caso muy raro)
      crypto.getRandomValues(arr);
      i = 0;
    }
  }
  return result;
}

/**
 * Fallback para bookings existentes sin boarding_code.
 * Devuelve el código persistido si existe, o genera uno temporal
 * derivado del ID (menos seguro pero consistente para registros legacy).
 */
export function getBoardingCode(booking) {
  if (booking?.boarding_code) return booking.boarding_code;
  // Fallback legacy: usar últimos 6 del ID (mantenido para compatibilidad)
  return (booking?.id || '------').slice(-6).toUpperCase();
}