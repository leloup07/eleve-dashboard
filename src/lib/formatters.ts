/**
 * Utilidades de formateo para números en formato español
 * Miles con puntos (.), decimales con coma (,)
 */

/**
 * Formatea un número con separador de miles (.) y decimales (,)
 * @param value - Número a formatear
 * @param decimals - Cantidad de decimales (default: 0)
 * @returns String formateado "1.234,56"
 */
export function formatNumber(value: number | undefined | null, decimals: number = 0): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0'
  }
  
  // Formatear con decimales
  const fixed = value.toFixed(decimals)
  
  // Separar parte entera y decimal
  const [intPart, decPart] = fixed.split('.')
  
  // Agregar puntos como separadores de miles
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  // Unir con coma si hay decimales
  if (decPart) {
    return `${intFormatted},${decPart}`
  }
  
  return intFormatted
}

/**
 * Formatea un valor monetario en euros
 * @param value - Valor a formatear
 * @param decimals - Cantidad de decimales (default: 0)
 * @returns String formateado "$1.234,56"
 */
export function formatCurrency(value: number | undefined | null, decimals: number = 0): string {
  return `$${formatNumber(value, decimals)}`
}

/**
 * Formatea un porcentaje
 * @param value - Valor a formatear (ya en porcentaje, ej: 12.5 para 12.5%)
 * @param decimals - Cantidad de decimales (default: 1)
 * @returns String formateado "12,5%"
 */
export function formatPercent(value: number | undefined | null, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%'
  }
  return `${formatNumber(value, decimals)}%`
}

/**
 * Formatea un cambio porcentual con signo
 * @param value - Valor del cambio
 * @param decimals - Cantidad de decimales
 * @returns String con signo "+12,5%" o "-5,3%"
 */
export function formatPercentChange(value: number | undefined | null, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%'
  }
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatNumber(value, decimals)}%`
}

/**
 * Formatea un ratio R:R
 * @param value - Valor del ratio
 * @returns String "2,5:1"
 */
export function formatRatio(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0:1'
  }
  return `${formatNumber(value, 1)}:1`
}

/**
 * Formatea capital abreviado (K, M)
 * @param value - Valor a formatear
 * @returns String "15K" o "1,5M"
 */
export function formatCapitalShort(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '$0'
  }
  
  if (value >= 1000000) {
    return `$${formatNumber(value / 1000000, 1)}M`
  }
  if (value >= 1000) {
    return `$${formatNumber(value / 1000, 0)}K`
  }
  return formatCurrency(value, 0)
}

/**
 * Parsea un string formateado español a número
 * @param str - String "1.234,56"
 * @returns number 1234.56
 */
export function parseSpanishNumber(str: string): number {
  // Remover símbolo de moneda y espacios
  const cleaned = str.replace(/[€$\s]/g, '')
  // Reemplazar punto de miles por nada, coma decimal por punto
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized) || 0
}

/**
 * Calcula clase CSS según valor positivo/negativo
 */
export function getValueColorClass(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-gray-600'
}

/**
 * Calcula clase CSS de fondo según valor positivo/negativo
 */
export function getValueBgClass(value: number): string {
  if (value > 0) return 'bg-green-100 text-green-800'
  if (value < 0) return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}
