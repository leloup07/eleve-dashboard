// ELEVE v4.3 - Tipos actualizados con IRG y sincronización

export type StrategyStatus = 'ACTIVE' | 'OBSOLETE' | 'PENDING' | 'TESTING'
export type TradingMode = 'live' | 'paper'
export type MarketRegime = 'BULL' | 'BEAR' | 'RANGE' | 'UNKNOWN'
export type TradeResult = 'TP' | 'TP1' | 'TP2' | 'SL' | 'BE' | 'TRAIL'
export type StrategyHorizon = 'SWING' | 'INTRADAY'
export type GatekeeperType = 'BTC_REGIME' | 'SPY_REGIME' | 'IRG' | 'NONE'

// =====================================================
// INTRADAY RISK GUARD (IRG) - NUEVO v4.3
// =====================================================

/**
 * ⚠️ NO IMPLEMENTADO. El Intraday Risk Guard se diseñó en la v4.3 y nunca llegó
 * al código: no hay una sola referencia en los workers ni claves eleve:irg:* en
 * Redis, y nadie escribe IRGState. Estos tipos son un plano, no una función que
 * exista. Antes de usarlos para algo, hay que implementarlo o borrarlos.
 */
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
  status: StrategyStatus
  /**
   * v5.1 · P0-4. Solo se rellena en VWAP y 1% Spot: modo sombra mientras se
   * demuestran corregidos el control de capital y la cobertura del motor de
   * riesgo. null = las demás estrategias, para las que este campo no aplica.
   */
  executionEnabled?: boolean | null
  executionDisabledReason?: string | null
  description: string
  capital: number | null
  riskPerTrade: number | null
  maxPositions: number | null
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
  /**
   * Parámetros de stop. TODOS pueden ser null: son valores que vienen de la
   * spec activa en Redis y no existen hasta que se hidratan. Antes tenían
   * valores escritos a mano que además ya no coincidían con la spec (large_caps
   * figuraba con 1,5× ATR y TP 3× ATR cuando opera a 2,0× ATR y sin TP), así
   * que un fallo de hidratación no se veía: se veía un número plausible y falso.
   */
  stops: {
    slAtrMult: number | null
    tpAtrMult: number | null; trailing?: string
    /** Timeframe del ATR con el que se calibra el SL: '1h' | '1d' */
    atrTimeframe?: string
    /** Estrategias con TP/SL fijos en % (1% Spot) en vez de múltiplos de ATR */
    slPercent?: number | null
    tpPercent?: number | null
  }
  /** Costes de operativa por lado, sobre el nocional (0.0026 = 0,26%) */
  costs?: {
    commissionPct?: number
    slippagePct?: number
  }
  /**
   * Filtros de entrada. Todos pueden ser null por el mismo motivo que los
   * stops: salen de la spec activa y no existen hasta hidratarse. Un número
   * escrito a mano aquí se muestra igual que uno real.
   */
  entryFilters: {
    adxMin: number | null
    rsiMin: number | null
    rsiMax: number | null
    emaFast: number | null
    emaMedium: number | null
    emaSlow: number | null
    pullbackAtr: number | null
    /** Estrategias de ruptura: canal de Donchian y confirmación por volumen */
    donchianPeriod?: number | null
    volumeMult?: number | null
  }
  expectedPerformance: {
    tradesPerMonth: string
    winRate: string
    riskReward: string
    annualReturn: string
    maxDrawdown: string
  }
  
  /** Identidad inmutable bajo la que opera hoy (v5.1 P0-1) */
  /**
   * Identidad real de la estrategia: el hash de su spec activa (v5.1 · P0-1).
   *
   * Sustituye a la antigua etiqueta `version`, escrita a mano y atada a nada:
   * llegaron a convivir v5.0, v5.1, v2.1, v1.0, v5.3 y v5.4, con la misma
   * estrategia mostrando una cosa en la home y otra en /config. Cambiar un
   * umbral no movía ninguna; sí cambia el spec_id, por construcción.
   */
  specId?: string | null
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
  atr?: number
  riskPerShare?: number
  sl: number
  tp: number
  size: number
  investedAmount: number
  mode: TradingMode
  openDate: string
  currentPrice?: number
  /** true si el worker aún no ha escrito un precio real para esta posición */
  currentPriceStale?: boolean
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
  atr?: number
  riskPerShare?: number
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
  /**
   * v5.1 · P0-4. Modo sombra: la estrategia genera y REGISTRA sus señales
   * igual, pero no abre posiciones. Distinto de `enabled`: pausar no es lo
   * mismo que estar bloqueada para ejecutar por un defecto de infraestructura
   * que aún no se ha demostrado corregido (control de capital, cobertura del
   * motor de riesgo). null/undefined = no se sabe todavía (aún sin hidratar).
   */
  executionEnabled?: boolean | null
  executionDisabledReason?: string | null
  mode: 'paper' | 'live'
  capital: number | null
  riskPerTrade: number | null
  maxPositions: number | null
  maxDailyLoss: number | null
  maxDailyProfit: number | null
  assets: string[]
  slAtrMult: number | null
  tpAtrMult: number | null; trailing?: string
  asiaStartHour: number | null
  asiaEndHour: number | null
  tradingEndHour: number | null
  scanInterval: number | null
  // v4.3: Usa IRG en lugar de BTC regime
  useIRG: boolean
}

export interface Intraday1PctConfig {
  enabled: boolean
  executionEnabled?: boolean | null
  executionDisabledReason?: string | null
  mode: 'paper' | 'live'
  capital: number | null
  riskPerTrade: number | null
  maxPositions: number | null
  maxDailyLoss: number | null
  maxDailyProfit: number | null
  tpPercent: number | null
  slPercent: number | null
  bePercent: number | null
  minMarketCap: number | null
  minVolume24h: number | null
  minVolMcRatio: number | null
  minAdx: number | null
  btcMinAdx: number | null
  rsiMin: number | null
  rsiMax: number | null
  scanInterval: number | null
  // v4.3: Usa IRG en lugar de BTC regime
  useIRG: boolean
}

// =====================================================
// SINCRONIZACIÓN
// =====================================================

/** Experimento en curso: mientras está activo, los parámetros están congelados */
export interface ExperimentState {
  active: boolean
  name: string
  started_at: string
  note?: string
}

export interface SyncStatus {
  lastSync: string | null
  syncError: string | null
  isSyncing: boolean
  pendingChanges: number
}

export interface ConfigUpdatePayload {
  type: 'strategy' | 'intraday' | 'intraday1pct' | 'irg' | 'full'
  key?: string
  config?: Partial<StrategyConfig | IntradayConfig | Intraday1PctConfig | IRGConfig>
  fullConfig?: {
    strategies?: Record<string, StrategyConfig>
    intraday?: IntradayConfig
    irg?: IRGConfig
  }
}
