// ELEVE v4.3 - Tipos actualizados con IRG y sincronización

export type StrategyStatus = 'ACTIVE' | 'OBSOLETE' | 'PENDING' | 'TESTING'
export type TradingMode = 'live' | 'paper'
export type MarketRegime = 'BULL' | 'BEAR' | 'RANGE' | 'UNKNOWN'
export type TradeResult = 'TP' | 'TP1' | 'TP2' | 'SL' | 'BE' | 'TRAIL'
export type StrategyHorizon = 'SWING' | 'INTRADAY'
export type GatekeeperType = 'BTC_REGIME' | 'IRG' | 'NONE'

// =====================================================
// INTRADAY RISK GUARD (IRG) - NUEVO v4.3
// =====================================================

export interface IRGConfig {
  enabled: boolean
  
  // Evaluación
  evaluationIntervalMinutes: number  // 15
  
  // Condición A: Volatilidad BTC
  btcAtrPeriod: number              // 14
  btcAtrTimeframe: string           // "15m"
  btcAtrLookbackDays: number        // 30
  btcAtrMinPercentile: number       // 40
  
  // Condición B: Breadth
  breadthVolumeSMAPeriod: number    // 20
  breadthMinAtrPriceRatio: number   // 0.0012 (0.12%)
  breadthMinPercentage: number      // 30
  
  // Universo de activos para breadth
  intradayUniverse: string[]
}

export interface IRGState {
  enabled: boolean
  lastEvaluation: string | null
  
  // Condición A
  btcAtrCurrent: number
  btcAtrPercentile: number
  conditionAMet: boolean
  conditionAReason: string
  
  // Condición B
  breadthActiveCount: number
  breadthTotalCount: number
  breadthPercentage: number
  conditionBMet: boolean
  conditionBReason: string
  
  // Resultado
  intradayAllowed: boolean
  blockReason: string
}

// =====================================================
// ESTRATEGIAS
// =====================================================

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
  
  // v4.3: Horizonte y gatekeeper
  horizon: StrategyHorizon
  gatekeeper: GatekeeperType
  
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
  
  // Metadatos de sincronización
  lastUpdated?: string
  updatedFrom?: 'dashboard' | 'backend' | 'manual'
}

// =====================================================
// POSICIONES Y TRADES
// =====================================================

export interface Position {
  id: string
  ticker: string
  strategy: string
  entry: number
  sl: number
  tp: number
  size: number
  investedAmount: number
  mode: TradingMode
  openDate: string
  currentPrice?: number
  unrealizedPnL?: number
  unrealizedPnLPercent?: number
  maxPrice?: number
  partialTpTaken?: boolean
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
  // v4.3: Qué gatekeeper permitió la entrada
  gatekeeperUsed?: GatekeeperType
  gatekeeperReason?: string
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
  investedAmount: number
  pnl: number
  pnlPercent: number
  result: TradeResult
  mode: TradingMode
  openDate: string
  closeDate: string
  holdingDays: number
  rMultiple: number
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
  exitReason: string
  exitIndicators: {
    rsi: number
    macd: number
    price: number
  }
  strategyExplanation: string
  lessons: string[]
  regime?: 'RANGE' | 'TRANSITION' | 'TREND' | null
  // v4.3
  gatekeeperUsed?: GatekeeperType
}

// =====================================================
// DASHBOARD STATS
// =====================================================

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
  // v4.3: Estado IRG
  irgState?: IRGState
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

// =====================================================
// CONFIGURACIÓN INTRADAY
// =====================================================

export interface IntradayConfig {
  enabled: boolean
  mode: 'paper' | 'live'
  capital: number
  riskPerTrade: number
  maxPositions: number
  maxDailyLoss: number
  maxDailyProfit: number
  assets: string[]
  slAtrMult: number
  tpAtrMult: number
  asiaStartHour: number
  asiaEndHour: number
  tradingEndHour: number
  scanInterval: number
  // v4.3: Usa IRG en lugar de BTC regime
  useIRG: boolean
}

export interface Intraday1PctConfig {
  enabled: boolean
  mode: 'paper' | 'live'
  capital: number
  riskPerTrade: number
  maxPositions: number
  maxDailyLoss: number
  maxDailyProfit: number
  tpPercent: number
  slPercent: number
  bePercent: number
  minMarketCap: number
  minVolume24h: number
  minVolMcRatio: number
  minAdx: number
  btcMinAdx: number
  rsiMin: number
  rsiMax: number
  scanInterval: number
  // v4.3: Usa IRG en lugar de BTC regime
  useIRG: boolean
}

// =====================================================
// SINCRONIZACIÓN
// =====================================================

export interface SyncStatus {
  lastSync: string | null
  syncError: string | null
  isSyncing: boolean
  pendingChanges: number
}

export interface ConfigUpdatePayload {
  type: 'strategy' | 'intraday' | 'irg' | 'full'
  key?: string
  config?: Partial<StrategyConfig | IntradayConfig | Intraday1PctConfig | IRGConfig>
  fullConfig?: {
    strategies?: Record<string, StrategyConfig>
    intraday?: IntradayConfig
    irg?: IRGConfig
  }
}
