// Tipos para las estrategias de trading

export type StrategyStatus = 'ACTIVE' | 'OBSOLETE' | 'PENDING' | 'TESTING'
export type TradingMode = 'live' | 'paper'
export type MarketRegime = 'BULL' | 'BEAR' | 'RANGE' | 'UNKNOWN'
export type TradeResult = 'TP' | 'TP1' | 'TP2' | 'SL' | 'BE' | 'TRAIL'

export interface StrategyConfig {
  name: string
  key: string
  version: string
  status: StrategyStatus
  description: string
  capital: number
  riskPerTrade: number
  maxPositions: number
  mode: TradingMode
  enabled: boolean
  assets: string[]
  assetDescription: string
  timeframes: {
    context: string
    trend: string
    entry: string
  }
  stops: {
    slAtrMult: number
    tpAtrMult: number
  }
  entryFilters: {
    adxMin: number
    rsiMin: number
    rsiMax: number
    emaFast: number
    emaMedium: number
    emaSlow: number
    pullbackAtr: number
  }
  expectedPerformance: {
    tradesPerMonth: string
    winRate: string
    riskReward: string
    annualReturn: string
    maxDrawdown: string
  }
}

export interface Position {
  id: string
  ticker: string
  strategy: string
  entry: number
  sl: number
  tp: number
  size: number
  investedAmount: number // NUEVO: Importe invertido
  mode: TradingMode
  openDate: string
  currentPrice?: number
  unrealizedPnL?: number
  unrealizedPnLPercent?: number
  maxPrice?: number
  partialTpTaken?: boolean
  // Contexto de entrada
  entryReason: string
  entryGrade: string
  entryIndicators: {
    rsi: number
    macd: number
    adx: number
    ema20: number
    ema50: number
    atr: number
    volume: number
  }
}

export interface Trade {
  id: string
  ticker: string
  strategy: string
  entry: number
  exit: number
  sl: number
  tp: number
  size: number
  investedAmount: number // NUEVO: Importe invertido
  pnl: number
  pnlPercent: number
  result: TradeResult
  mode: TradingMode
  openDate: string
  closeDate: string
  holdingDays: number
  rMultiple: number
  // Contexto detallado de entrada
  entryReason: string
  entryGrade: string
  entryIndicators: {
    rsi: number
    macd: number
    adx: number
    ema20: number
    ema50: number
    atr: number
    volume: number
  }
  // Contexto detallado de salida
  exitReason: string
  exitIndicators: {
    rsi: number
    macd: number
    price: number
  }
  // Análisis y lecciones
  strategyExplanation: string
  lessons: string[]
  // Régimen de salida (v4)
  regime?: 'RANGE' | 'TRANSITION' | 'TREND' | null
}

export interface DashboardStats {
  totalCapital: number
  cryptoCapital: number
  stocksCapital: number
  totalPnL: number
  totalTrades: number
  winRate: number
  profitFactor: number
  openPositions: number
  btcRegime: MarketRegime
  spyRegime: MarketRegime
}

export interface StrategyPerformance {
  key: string
  name: string
  trades: number
  pnl: number
  winRate: number
  avgR: number
  openPositions: number
  initialCapital: number
  currentEquity: number
  unrealizedPnL: number
}

export interface IntradayConfig {
  enabled: boolean
  mode: 'paper' | 'live'
  capital: number
  riskPerTrade: number      // 0.003 = 0.3%
  maxPositions: number
  maxDailyLoss: number      // 0.01 = 1%
  maxDailyProfit: number    // 0.015 = 1.5%
  assets: string[]
  slAtrMult: number
  tpAtrMult: number
  asiaStartHour: number     // UTC
  asiaEndHour: number       // UTC
  tradingEndHour: number    // UTC
  scanInterval: number      // seconds
}

export interface Intraday1PctConfig {
  enabled: boolean
  mode: 'paper' | 'live'
  capital: number
  riskPerTrade: number      // 0.005 = 0.5%
  maxPositions: number
  maxDailyLoss: number
  maxDailyProfit: number
  tpPercent: number         // 0.01 = 1%
  slPercent: number         // 0.005 = 0.5%
  bePercent: number         // 0.006 = 0.6% -> move to BE
  minMarketCap: number
  minVolume24h: number
  minVolMcRatio: number
  minAdx: number
  btcMinAdx: number
  rsiMin: number
  rsiMax: number
  scanInterval: number
}
