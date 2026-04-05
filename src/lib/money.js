/**
 * Librería de aritmética monetaria de precisión fija
 * Evita errores de punto flotante en cálculos de divisas
 *
 * Estrategia: trabajar en centavos (enteros) y convertir solo al mostrar
 */

const DECIMALS = 2;
const FACTOR   = Math.pow(10, DECIMALS); // 100

/** Convierte un número a centavos enteros (elimina imprecisión de float) */
export function toCents(amount) {
  return Math.round(parseFloat(amount) * FACTOR);
}

/** Convierte centavos a pesos con 2 decimales */
export function fromCents(cents) {
  return cents / FACTOR;
}

/**
 * Multiplica un monto por una tasa de cambio con precisión exacta
 * Ej: multiply(100, 58.50) → 5850.00 (no 5849.9999...)
 */
export function multiply(amount, rate) {
  const amountCents = toCents(amount);
  const rateCents   = toCents(rate);
  // (amountCents * rateCents) / FACTOR²  → resultado en pesos
  return Math.round((amountCents * rateCents) / FACTOR) / FACTOR;
}

/** Suma dos montos con precisión */
export function add(a, b) {
  return fromCents(toCents(a) + toCents(b));
}

/** Resta dos montos con precisión */
export function subtract(a, b) {
  return fromCents(toCents(a) - toCents(b));
}

/** Divide con precisión */
export function divide(amount, divisor) {
  return fromCents(Math.round((toCents(amount) * FACTOR) / toCents(divisor)));
}

/** Suma un array de montos con precisión */
export function sum(amounts) {
  return fromCents(amounts.reduce((s, a) => s + toCents(a), 0));
}

/**
 * Formatea un número como moneda
 * fmt(5850)     → "5,850.00"
 * fmt(5850, 'DOP') → "RD$ 5,850.00"
 * fmt(100, 'USD')  → "$ 100.00"
 */
export function fmt(amount, currency = null) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const formatted = num.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === 'DOP') return `RD$ ${formatted}`;
  if (currency === 'USD') return `$ ${formatted}`;
  if (currency === 'EUR') return `€ ${formatted}`;
  return formatted;
}

/**
 * Calcula ganancia de una transacción de cambio
 * ganancia = (tasaVenta - tasaCompra) × montoExtranjero
 */
export function calcProfit(foreignAmount, buyRate, sellRate) {
  const margin = subtract(sellRate, buyRate);
  return multiply(foreignAmount, margin);
}

/**
 * Suma billetes (denom × cantidad) con precisión
 * bills = { '100': 3, '50': 2 } → 400
 */
export function sumBills(bills) {
  return fromCents(
    Object.entries(bills).reduce((s, [denom, qty]) => {
      return s + toCents(parseInt(denom)) * (parseInt(qty) || 0);
    }, 0)
  );
}
