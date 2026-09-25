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
  //
  // IMPORTANTE: aqui va SOLO la tesis cualitativa. Ningun umbral, stop ni
  // porcentaje: esos los genera buildStrategySpec() a partir de la config real
  // que lee el worker, para que la ficha no pueda desincronizarse del codigo
  // como paso con "SL 1.8x ATR" o los filtros de ADX desactivados.
  // =====================================================

  crypto_swing: `Swing sobre BTC, ETH y altcoins líquidas. Régimen y momentum en gráfico diario (EMA20/EMA50), entrada en 1H sobre pullback a la EMA20. Gatekeeper: régimen de BTC.`,

  crypto_breakout: `Seguimiento de tendencia en cripto (BTC, ETH, SOL, XRP, AVAX, LINK). Una vez al día, tras el cierre de la vela diaria (00:05 UTC), compra si el cierre supera el máximo de los 20 días anteriores con volumen ≥ 1,2× su media y el régimen de BTC lo permite. Stop inicial a 1,5× ATR diario; sin objetivo fijo, trailing desde +2R. Validada fuera de muestra 2017–2021 con datos horarios de Binance y relleno causal.`,

  large_caps: `Swing sobre blue chips del S&P 500. Régimen y momentum en diario, entrada en 1H. Gatekeeper: régimen de SPY.`,

  small_caps: `Swing de momentum sobre small caps del Russell 2000. Régimen y momentum en diario, entrada en 1H. Gatekeeper: régimen de SPY.`,

  // =====================================================
  // ESTRATEGIAS INTRADAY - NO usan trailing por R
  // =====================================================

  vwap_reversion: `Mean-reversion tras fake breaks del rango asiático (00:00-08:00 UTC), operando de 8:00 a 20:00 UTC. Sin trailing: cobrar y fuera. Sin gatekeeper de régimen: sus puertas son el horario, el veto por RSI extremo y los límites diarios.`,

  intraday_1pct: `Spot momentum sobre altcoins con filtros estrictos de liquidez (market cap, volumen 24h y ratio vol/mcap) y TP/SL fijos. Mueve el stop a breakeven, costes incluidos, cuando el trade avanza. Gatekeeper: ADX de BTC en 1H.`
} as const

// Para TypeScript
export type StrategyKey = keyof typeof STRATEGY_DESCRIPTIONS
