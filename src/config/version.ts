/**
 * ELEVE - Configuración centralizada de versión y descripciones
 *
 * ÚNICO LUGAR donde cambiar versión y descripciones de estrategias.
 * Todos los componentes importan de aquí.
 */

export const APP_VERSION = 'v5.0'

// Etiqueta unificada para trailing (usada en UI)
export const TRAILING_LABEL = 'Trailing: activo desde +2R → SL = (n−1)R'

export const STRATEGY_DESCRIPTIONS = {
  // =====================================================
  // ESTRATEGIAS SWING - Usan trailing (n-1)R
  // =====================================================

  crypto_core: `Estrategia swing conservadora para BTC y ETH. Análisis multi-timeframe: contexto semanal (1W), tendencia diaria (1D), entrada en 4H. Opera pullbacks a EMA20 en tendencia alcista. RSI 40-70. SL inicial: 2.0× ATR. Sin TP. Gestión 100% por SL dinámico (n−1)R desde +2R. Gatekeeper: BTC regime.`,

  crypto_aggressive: `Estrategia swing oportunista para altcoins (SOL, AVAX, LINK, XRP). Contexto en 1D, tendencia 4H, entrada 1H. Pullback a EMA12. SL inicial: 1.8× ATR. Sin TP. Gestión 100% por SL dinámico (n−1)R desde +2R. Gatekeeper: BTC regime.`,

  large_caps: `Estrategia swing para blue chips S&P 500 (market cap >100B). Filtro macro: SPY alcista semanal. Entrada en 4H con RSI 40-65. SL inicial: 1.5× ATR. Sin TP. Gestión 100% por SL dinámico (n−1)R desde +2R. Gatekeeper: BTC regime.`,

  small_caps: `Estrategia swing momentum para small caps Russell 2000 (market cap 1B-10B). Filtros: ADX >25, RSI 40-65. Filtro macro: IWM alcista. SL inicial: 2.0× ATR. Sin TP. Gestión 100% por SL dinámico (n−1)R desde +2R. Gatekeeper: BTC regime.`,

  // =====================================================
  // ESTRATEGIAS INTRADAY - NO usan trailing por R
  // =====================================================

  vwap_reversion: `Mean-reversion tras fake breaks del rango asiático. Opera de 8:00 a 20:00 UTC. SL: 1.2× ATR, TP: 1.5× ATR. Esta estrategia NO usa trailing por R (n−1). Cobrar y fuera.`,

  intraday_1pct: `Spot momentum con filtros estrictos de liquidez. Objetivo: +1% diario. SL: -0.5%, TP: +1.0%, Break-even a +0.6%. Esta estrategia NO usa trailing por R (n−1). Max 5 posiciones/día.`
} as const

// Para TypeScript
export type StrategyKey = keyof typeof STRATEGY_DESCRIPTIONS
