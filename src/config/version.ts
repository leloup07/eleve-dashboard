/**
 * ELEVE - Configuración centralizada de versión y descripciones
 *
 * ÚNICO LUGAR donde cambiar versión y descripciones de estrategias.
 * Todos los componentes importan de aquí.
 */

export const APP_VERSION = 'v5.0'

export const STRATEGY_DESCRIPTIONS = {
  crypto_core: `Estrategia swing conservadora para BTC y ETH. Captura tendencias largas en los activos más líquidos del mercado crypto usando análisis multi-timeframe: contexto semanal (1W) define régimen macro, diario (1D) confirma tendencia, y 4H determina entrada. Opera pullbacks a EMA20 en tendencia alcista confirmada. RSI 40-70 para evitar extremos. Stop loss a 2x ATR, trailing SL activado a +2R usando fórmula (n-1)R. Usa BTC regime como gatekeeper.`,

  crypto_aggressive: `Estrategia swing oportunista para altcoins de alta liquidez (SOL, AVAX, LINK, XRP). Caza rotaciones y movimientos intermedios con mayor frecuencia que Core. Contexto lo marca BTC en diario; si BTC alcista, altcoins siguen con beta amplificado. Análisis en 4H con EMAs rápidas (12/26), entrada en 1H en pullback a EMA12. Stops amplios por volatilidad de altcoins. Trailing SL activado a +2R usando fórmula (n-1)R. Usa BTC regime como gatekeeper.`,

  large_caps: `Estrategia swing para acciones blue chip del S&P 500 (top 50 por market cap >100B). Filtro macro: SPY debe estar en tendencia alcista semanal. Análisis individual en diario buscando estructura HH-HL con precio sobre EMA20. Entrada en 4H cuando precio retrocede a zona de valor con RSI 40-65. Stops más ajustados por menor volatilidad que crypto. Trailing SL activado a +2R usando fórmula (n-1)R. Usa BTC regime como gatekeeper.`,

  small_caps: `Estrategia swing momentum para small caps del Russell 2000 (market cap 1B-10B). Busca impulsos parabólicos con filtros exigentes: ADX >25, RSI 40-65, pullback corto (0.5x ATR). Filtro macro: IWM en tendencia alcista. Stops a 2x ATR. Trailing SL activado a +2R usando fórmula (n-1)R para capturar movimientos largos. Usa BTC regime como gatekeeper.`
} as const

// Para TypeScript
export type StrategyKey = keyof typeof STRATEGY_DESCRIPTIONS
