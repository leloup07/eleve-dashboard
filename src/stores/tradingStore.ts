/**
 * ELEVE v5.0 - Trading Store con Sincronización
 * 
 * CAMBIO CLAVE: Cuando actualizas una estrategia en la UI,
 * automáticamente se sincroniza con el backend (Redis).
 * El bot Python lee estos cambios en tiempo real.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  StrategyConfig,
  Position,
  Trade,
  MarketRegime,
  TradingMode,
  DashboardStats,
  StrategyPerformance,
  IntradayConfig,
  Intraday1PctConfig,
  IRGConfig,
  IRGState,
  SyncStatus,
  ExperimentState,
  ConfigUpdatePayload
} from '@/types'
import { STRATEGY_DESCRIPTIONS, TRAILING_LABEL } from '@/config/version'

// =====================================================
// CONFIGURACIÓN INICIAL IRG (v5.0)
// =====================================================

// ⚠️ NO IMPLEMENTADO: ver el aviso en types/index.ts. Este estado no lo actualiza
// nadie; se conserva como plano de un guardia de riesgo intradía que está por hacer.
const INITIAL_IRG_CONFIG: IRGConfig = {
  enabled: true,
  evaluationIntervalMinutes: 15,
  btcAtrPeriod: 14,
  btcAtrTimeframe: '15m',
  btcAtrLookbackDays: 30,
  btcAtrMinPercentile: 40,
  breadthVolumeSMAPeriod: 20,
  breadthMinAtrPriceRatio: 0.0012,
  breadthMinPercentage: 30,
  intradayUniverse: ['BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'LINK', 'DOT', 'MATIC', 'ATOM', 'ADA']
}

const INITIAL_IRG_STATE: IRGState = {
  enabled: true,
  lastEvaluation: null,
  btcAtrCurrent: 0,
  btcAtrPercentile: 0,
  conditionAMet: false,
  conditionAReason: '',
  breadthActiveCount: 0,
  breadthTotalCount: 0,
  breadthPercentage: 0,
  conditionBMet: false,
  conditionBReason: '',
  intradayAllowed: false,
  blockReason: 'No evaluado'
}

// =====================================================
// CONFIGURACIÓN INICIAL INTRADAY
// =====================================================

// Ningún parámetro de trading escrito a mano (v5.1 · P0-7). Todos salen de la
// clave de Redis que su worker LEE y valen null hasta que se hidratan.
//
// El caso que lo motiva: aquí figuraba minAdx: 20 mientras el worker filtra con
// 18. Un fallo de hidratación no se veía como un fallo — se veía como un umbral
// perfectamente plausible y equivocado, que es la peor forma de fallar.
const INITIAL_INTRADAY_CONFIG: IntradayConfig = {
  enabled: true,
  mode: 'paper',
  capital: null,
  riskPerTrade: null,
  maxPositions: null,
  maxDailyLoss: null,
  maxDailyProfit: null,
  assets: [],
  slAtrMult: null,
  tpAtrMult: null,
  asiaStartHour: null,
  asiaEndHour: null,
  tradingEndHour: null,
  scanInterval: null,
  useIRG: true // v5.0: Usa IRG
}

const INITIAL_INTRADAY_1PCT_CONFIG: Intraday1PctConfig = {
  enabled: true,
  mode: 'paper',
  capital: null,
  riskPerTrade: null,
  maxPositions: null,
  maxDailyLoss: null,
  maxDailyProfit: null,
  tpPercent: null,
  slPercent: null,
  bePercent: null,
  minMarketCap: null,
  minVolume24h: null,
  minVolMcRatio: null,
  minAdx: null,
  btcMinAdx: null,
  rsiMin: null,
  rsiMax: null,
  scanInterval: null,
  useIRG: true // v5.0: Usa IRG
}

// =====================================================
// ESTRATEGIAS INICIALES
//
// Sin etiqueta de versión: la identidad de una estrategia es su spec_id, que se
// hidrata desde Redis. Las etiquetas sueltas (v5.0, v5.3, v2.1, v1.0...) no
// significaban nada compartido y llegaron a contradecirse entre páginas.
// =====================================================

const INITIAL_STRATEGIES: StrategyConfig[] = [
  {
    key: 'crypto_swing',
    name: 'Crypto Swing',
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.crypto_swing,
    capital: null,
    riskPerTrade: null,
    maxPositions: null,
    mode: 'paper',
    enabled: true,
    assets: ['BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'LINK'],
    assetDescription: 'BTC, ETH y altcoins líquidas',
    horizon: 'SWING',
    gatekeeper: 'BTC_REGIME',
    // Los timeframes reales del motor: régimen y momentum en diario, entrada en 1H.
    timeframes: { context: '1D', trend: '1D', entry: '1H' },
    stops: { slAtrMult: null, tpAtrMult: null, trailing: TRAILING_LABEL, atrTimeframe: undefined },
    entryFilters: {
      adxMin: null,
      rsiMin: null,
      rsiMax: null,
      emaFast: null,
      emaMedium: null,
      emaSlow: null,
      pullbackAtr: null
    },
    expectedPerformance: {
      // Sin evidencia todavía: se rellenarán con backtest OOS, paper y live.
      tradesPerMonth: '?',
      winRate: '?',
      riskReward: '?',
      annualReturn: '?',
      maxDrawdown: '?'
    }
  },
  {
    key: 'crypto_breakout',
    name: 'Crypto Breakout',
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.crypto_breakout,
    capital: null,
    riskPerTrade: null,
    maxPositions: null,
    mode: 'paper',
    enabled: true,
    assets: ['BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'LINK'],
    assetDescription: 'Mismo universo que Crypto Swing',
    horizon: 'SWING',
    gatekeeper: 'BTC_REGIME',
    timeframes: { context: '1D', trend: '1D', entry: '1D' },
    stops: { slAtrMult: null, tpAtrMult: null, trailing: TRAILING_LABEL, atrTimeframe: undefined },
    entryFilters: {
      adxMin: null,
      rsiMin: null,
      rsiMax: null,
      emaFast: null,
      emaMedium: null,
      emaSlow: null,
      pullbackAtr: null,
      donchianPeriod: null,
      volumeMult: null
    },
    expectedPerformance: {
      // Sin evidencia todavía: se rellenarán con backtest OOS, paper y live.
      tradesPerMonth: '?',
      winRate: '?',
      riskReward: '?',
      annualReturn: '?',
      maxDrawdown: '?'
    }
  },
  {
    key: 'large_caps',
    name: 'Large Caps',
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.large_caps,
    capital: null,
    riskPerTrade: null,
    maxPositions: null,
    mode: 'paper',
    enabled: true,
    assets: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA'],
    assetDescription: 'Magnificent 7 + Top S&P 500',
    horizon: 'SWING',
    gatekeeper: 'SPY_REGIME',
    // Los que ejecuta worker.py: no hay análisis semanal ni de 4H en ninguna parte.
    timeframes: { context: '1D', trend: '1D', entry: '1H' },
    stops: { slAtrMult: null, tpAtrMult: null, trailing: TRAILING_LABEL },
    entryFilters: {
      adxMin: null,
      rsiMin: null,
      rsiMax: null,
      emaFast: null,
      emaMedium: null,
      emaSlow: null,
      pullbackAtr: null
    },
    expectedPerformance: {
      // Sin evidencia todavía: se rellenarán con backtest OOS, paper y live.
      tradesPerMonth: '?',
      winRate: '?',
      riskReward: '?',
      annualReturn: '?',
      maxDrawdown: '?'
    }
  },
  {
    key: 'small_caps',
    name: 'Small Caps',
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.small_caps,
    capital: null,
    riskPerTrade: null,
    maxPositions: null,
    mode: 'paper',
    enabled: true,
    assets: ['BROS', 'HIMS', 'OSCR', 'DOCS', 'FIVE', 'WING', 'ANF', 'PGNY'],
    assetDescription: 'Small caps momentum ($1B-$10B cap)',
    horizon: 'SWING',
    gatekeeper: 'SPY_REGIME',
    // Los que ejecuta worker.py: no hay análisis semanal en ninguna parte.
    timeframes: { context: '1D', trend: '1D', entry: '1H' },
    stops: { slAtrMult: null, tpAtrMult: null, trailing: TRAILING_LABEL },
    entryFilters: {
      adxMin: null,
      rsiMin: null,
      rsiMax: null,
      emaFast: null,
      emaMedium: null,
      emaSlow: null,
      pullbackAtr: null
    },
    expectedPerformance: {
      // Sin evidencia todavía: se rellenarán con backtest OOS, paper y live.
      tradesPerMonth: '?',
      winRate: '?',
      riskReward: '?',
      annualReturn: '?',
      maxDrawdown: '?'
    }
  },
  {
    key: 'vwap_reversion',
    name: 'VWAP Reversion',
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.vwap_reversion,
    capital: null,
    riskPerTrade: null,
    maxPositions: null,
    mode: 'paper',
    enabled: true,
    assets: ['BTC-USD', 'ETH-USD'],
    assetDescription: 'BTC y ETH (sesión asiática)',
    horizon: 'INTRADAY',
    // El IRG nunca llegó a implementarse: VWAP no tiene puerta de régimen.
    gatekeeper: 'NONE',
    timeframes: { context: '15m', trend: '5m', entry: '5m' },
    stops: { slAtrMult: null, tpAtrMult: null },
    entryFilters: {
      adxMin: null,
      rsiMin: null,
      rsiMax: null,
      emaFast: null,
      emaMedium: null,
      emaSlow: null,
      pullbackAtr: null
    },
    expectedPerformance: {
      // Sin evidencia todavía: se rellenarán con backtest OOS, paper y live.
      tradesPerMonth: '?',
      winRate: '?',
      riskReward: '?',
      annualReturn: '?',
      maxDrawdown: '?'
    }
  },
  {
    key: 'one_percent_spot',
    name: '1% Spot',
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.intraday_1pct,
    capital: null,
    riskPerTrade: null,
    maxPositions: null,
    mode: 'paper',
    enabled: true,
    assets: ['SOL-USD', 'XRP-USD', 'AVAX-USD', 'LINK-USD', 'DOT-USD'],
    assetDescription: 'Altcoins >$300M market cap',
    horizon: 'INTRADAY',
    // El IRG nunca llegó a implementarse: su puerta real es el ADX de BTC.
    gatekeeper: 'BTC_REGIME',
    timeframes: { context: '1H', trend: '15m', entry: '5m' },
    stops: { slAtrMult: null, tpAtrMult: null },
    entryFilters: {
      adxMin: null,
      rsiMin: null,
      rsiMax: null,
      emaFast: null,
      emaMedium: null,
      emaSlow: null,
      pullbackAtr: null
    },
    expectedPerformance: {
      // Sin evidencia todavía: se rellenarán con backtest OOS, paper y live.
      tradesPerMonth: '?',
      winRate: '?',
      riskReward: '?',
      annualReturn: '?',
      maxDrawdown: '?'
    }
  }
]

// =====================================================
// FUNCIÓN DE SINCRONIZACIÓN
// =====================================================

async function syncConfigToBackend(payload: ConfigUpdatePayload): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Sync failed')
    }
    
    const data = await response.json()
    console.log('[SYNC] ✅ Config synced:', data.message)
    return { success: true }
    
  } catch (error) {
    console.error('[SYNC] ❌ Failed to sync:', error)
    return { success: false, error: String(error) }
  }
}

// =====================================================
// TRADING STORE
// =====================================================

interface TradingStore {
  // Estado
  strategies: StrategyConfig[]
  intradayConfig: IntradayConfig
  intraday1PctConfig: Intraday1PctConfig
  irgConfig: IRGConfig
  irgState: IRGState
  positions: Position[]
  trades: Trade[]
  experiment: ExperimentState | null
  btcRegime: MarketRegime
  spyRegime: MarketRegime
  botActive: boolean
  redisConnected: boolean
  lastUpdate: string
  
  // Sincronización
  syncStatus: SyncStatus
  
  // Getters computados
  getDashboardStats: () => DashboardStats
  getStrategyPerformance: (strategyKey: string) => StrategyPerformance
  getPositionsByStrategy: (strategyKey: string) => Position[]
  getTradesByStrategy: (strategyKey: string) => Trade[]
  getGlobalTradingMode: () => TradingMode
  getSwingStrategies: () => StrategyConfig[]
  getIntradayStrategies: () => StrategyConfig[]
  
  // Acciones CON SINCRONIZACIÓN
  updateStrategy: (key: string, updates: Partial<StrategyConfig>) => Promise<void>
  updateIntradayConfig: (updates: Partial<IntradayConfig>) => Promise<void>
  updateIntraday1PctConfig: (updates: Partial<Intraday1PctConfig>) => Promise<void>
  updateIRGConfig: (updates: Partial<IRGConfig>) => Promise<void>
  
  // Acciones sin sincronización (datos en tiempo real)
  addPosition: (position: Position) => void
  removePosition: (id: string) => void
  addTrade: (trade: Trade) => void
  setRegime: (market: 'btc' | 'spy', regime: MarketRegime) => void
  setIRGState: (state: Partial<IRGState>) => void
  setBotActive: (active: boolean) => void
  setRedisConnected: (connected: boolean) => void
  setIntraday1PctConfig: (config: Intraday1PctConfig) => void
  setIntradayConfig: (config: IntradayConfig) => void
  setExperiment: (e: ExperimentState | null) => void
  setPositions: (positions: Position[]) => void
  setTrades: (trades: Trade[]) => void
  refreshData: () => void
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      strategies: INITIAL_STRATEGIES,
      intradayConfig: INITIAL_INTRADAY_CONFIG,
      intraday1PctConfig: INITIAL_INTRADAY_1PCT_CONFIG,
      irgConfig: INITIAL_IRG_CONFIG,
      irgState: INITIAL_IRG_STATE,
      positions: [],
      trades: [],
      experiment: null,
      btcRegime: 'RANGE',
      spyRegime: 'BULL',
      botActive: true,
      redisConnected: false,
      lastUpdate: new Date().toISOString(),
      
      // Sincronización
      syncStatus: {
        lastSync: null,
        syncError: null,
        isSyncing: false,
        pendingChanges: 0
      },
      
      // =====================================================
      // GETTERS COMPUTADOS
      // =====================================================
      
      getDashboardStats: () => {
        const state = get()
        
        const initialCapital = state.strategies.filter(s => !s.key.includes("vwap") && !s.key.includes("one_percent")).reduce((sum, s) => sum + (s.capital || 0), 0) + (state.intradayConfig?.capital || 0) + (state.intraday1PctConfig?.capital || 0)
        const cryptoInitial = (state.intradayConfig?.capital || 0) + (state.intraday1PctConfig?.capital || 0) + state.strategies
          .filter(s => s.key.includes('crypto'))
          .reduce((sum, s) => sum + (s.capital || 0), 0)
        const stocksInitial = state.strategies
          .filter(s => s.key.includes('caps'))
          .reduce((sum, s) => sum + (s.capital || 0), 0)
        
        const totalRealizedPnL = state.trades.reduce((sum, t) => sum + t.pnl, 0)
        const totalUnrealizedPnL = state.positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0)
        
        const totalCapital = initialCapital + totalRealizedPnL
        const cryptoCapital = cryptoInitial + state.trades
          .filter(t => t.strategy.includes('crypto'))
          .reduce((sum, t) => sum + t.pnl, 0)
        const stocksCapital = stocksInitial + state.trades
          .filter(t => !t.strategy.includes('crypto'))
          .reduce((sum, t) => sum + t.pnl, 0)
        
        const totalPnL = totalRealizedPnL + totalUnrealizedPnL
        
        const winners = state.trades.filter(t => t.pnl > 0)
        const winRate = state.trades.length > 0 
          ? (winners.length / state.trades.length) * 100 
          : 0
        
        const grossProfit = state.trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0)
        const grossLoss = Math.abs(state.trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0))
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
        
        return {
          totalCapital,
          cryptoCapital,
          stocksCapital,
          totalPnL,
          totalTrades: state.trades.length,
          winRate,
          profitFactor,
          openPositions: state.positions.length,
          btcRegime: state.btcRegime,
          spyRegime: state.spyRegime,
          irgState: state.irgState
        }
      },
      
      getStrategyPerformance: (strategyKey: string) => {
        const state = get()
        const strategy = state.strategies.find(s => s.key === strategyKey)
        const strategyTrades = state.trades.filter(t => t.strategy === strategyKey)
        const winners = strategyTrades.filter(t => t.pnl > 0)
        const positions = state.positions.filter(p => p.strategy === strategyKey)
        
        const realizedPnL = strategyTrades.reduce((sum, t) => sum + t.pnl, 0)
        const unrealizedPnL = positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0)
        const initialCapital = strategyKey === 'one_percent_spot' ? (state.intraday1PctConfig?.capital || strategy?.capital || 0) : strategyKey === 'vwap_reversion' ? (state.intradayConfig?.capital || strategy?.capital || 0) : (strategy?.capital || 0)
        const currentEquity = initialCapital + realizedPnL + unrealizedPnL
        
        return {
          key: strategyKey,
          name: strategy?.name || strategyKey,
          trades: strategyTrades.length,
          pnl: realizedPnL,
          winRate: strategyTrades.length > 0 ? (winners.length / strategyTrades.length) * 100 : 0,
          avgR: strategyTrades.length > 0 
            ? strategyTrades.reduce((sum, t) => sum + t.rMultiple, 0) / strategyTrades.length 
            : 0,
          openPositions: positions.length,
          initialCapital,
          currentEquity,
          unrealizedPnL
        }
      },
      
      getPositionsByStrategy: (strategyKey: string) => {
        return get().positions.filter(p => p.strategy === strategyKey)
      },
      
      getTradesByStrategy: (strategyKey: string) => {
        return get().trades.filter(t => t.strategy === strategyKey)
      },
      
      getGlobalTradingMode: () => {
        const state = get()
        return state.strategies.some(s => s.mode === 'live') ? 'live' : 'paper'
      },
      
      // v5.0: Filtrar estrategias por horizonte
      getSwingStrategies: () => {
        return get().strategies.filter(s => s.horizon === 'SWING')
      },
      
      getIntradayStrategies: () => {
        return get().strategies.filter(s => s.horizon === 'INTRADAY')
      },
      
      // =====================================================
      // ACCIONES CON SINCRONIZACIÓN AUTOMÁTICA
      // =====================================================
      
      updateStrategy: async (key, updates) => {
        // 1. Actualizar estado local inmediatamente
        set(state => ({
          strategies: state.strategies.map(s => 
            s.key === key ? { ...s, ...updates, lastUpdated: new Date().toISOString() } : s
          ),
          lastUpdate: new Date().toISOString(),
          syncStatus: { ...state.syncStatus, isSyncing: true }
        }))
        
        // 2. Sincronizar con backend
        const result = await syncConfigToBackend({
          type: 'strategy',
          key,
          config: updates
        })
        
        // 3. Actualizar estado de sync
        set(state => ({
          syncStatus: {
            ...state.syncStatus,
            isSyncing: false,
            lastSync: result.success ? new Date().toISOString() : state.syncStatus.lastSync,
            syncError: result.error || null
          }
        }))
      },
      
      updateIntradayConfig: async (updates) => {
        set(state => ({
          intradayConfig: { ...state.intradayConfig, ...updates },
          lastUpdate: new Date().toISOString(),
          syncStatus: { ...state.syncStatus, isSyncing: true }
        }))
        
        const result = await syncConfigToBackend({
          type: 'intraday',
          config: { ...get().intradayConfig, ...updates }
        })
        
        set(state => ({
          syncStatus: {
            ...state.syncStatus,
            isSyncing: false,
            lastSync: result.success ? new Date().toISOString() : state.syncStatus.lastSync,
            syncError: result.error || null
          }
        }))
      },
      
      updateIntraday1PctConfig: async (updates) => {
        set(state => ({
          intraday1PctConfig: { ...state.intraday1PctConfig, ...updates },
          strategies: updates.capital !== undefined 
            ? state.strategies.map(s => s.key === 'one_percent_spot' ? { ...s, capital: updates.capital! } : s) 
            : state.strategies,
          lastUpdate: new Date().toISOString(),
          syncStatus: { ...state.syncStatus, isSyncing: true }
        }))
        
        const result = await syncConfigToBackend({
          type: 'intraday1pct',
          config: { ...get().intraday1PctConfig, ...updates }
        })
        
        set(state => ({
          syncStatus: {
            ...state.syncStatus,
            isSyncing: false,
            lastSync: result.success ? new Date().toISOString() : state.syncStatus.lastSync,
            syncError: result.error || null
          }
        }))
      },
      
      updateIRGConfig: async (updates) => {
        set(state => ({
          irgConfig: { ...state.irgConfig, ...updates },
          lastUpdate: new Date().toISOString(),
          syncStatus: { ...state.syncStatus, isSyncing: true }
        }))
        
        const result = await syncConfigToBackend({
          type: 'irg',
          config: { ...get().irgConfig, ...updates }
        })
        
        set(state => ({
          syncStatus: {
            ...state.syncStatus,
            isSyncing: false,
            lastSync: result.success ? new Date().toISOString() : state.syncStatus.lastSync,
            syncError: result.error || null
          }
        }))
      },
      
      // =====================================================
      // ACCIONES SIN SINCRONIZACIÓN (datos en tiempo real)
      // =====================================================
      
      addPosition: (position) => set(state => ({
        positions: [...state.positions, position],
        lastUpdate: new Date().toISOString()
      })),
      
      removePosition: (id) => set(state => ({
        positions: state.positions.filter(p => p.id !== id),
        lastUpdate: new Date().toISOString()
      })),
      
      addTrade: (trade) => set(state => ({
        trades: [...state.trades, trade],
        lastUpdate: new Date().toISOString()
      })),
      
      setRegime: (market, regime) => set(state => ({
        [market === 'btc' ? 'btcRegime' : 'spyRegime']: regime,
        lastUpdate: new Date().toISOString()
      })),
      
      setIRGState: (updates) => set(state => ({
        irgState: { ...state.irgState, ...updates },
        lastUpdate: new Date().toISOString()
      })),
      
      setBotActive: (active) => set({ botActive: active, lastUpdate: new Date().toISOString() }),
      
      setRedisConnected: (connected) => set({ redisConnected: connected }),
      setIntraday1PctConfig: (config) => set({ intraday1PctConfig: config }),
      setIntradayConfig: (config) => set({ intradayConfig: config }),
      
      setExperiment: (experiment) => set({ experiment }),

      setPositions: (positions) => set({ positions, lastUpdate: new Date().toISOString() }),
      
      setTrades: (trades) => set({ trades, lastUpdate: new Date().toISOString() }),
      
      refreshData: () => set({ lastUpdate: new Date().toISOString() })
    }),
    {
      name: 'eleve-trading-store-v43',
      version: 3,
      // v2: positions/trades dejan de persistirse (son datos de mercado en vivo: cachearlos
      // hacía que el dashboard siguiera mostrando posiciones ya cerradas o borradas de Redis,
      // con su precio y su fecha congelados, cuando fallaba el fetch a /api/trading).
      // Además se limpian capital/riskPerTrade/maxPositions guardados antes de que pasaran
      // a venir exclusivamente de Redis.
      // v3: la LISTA de estrategias deja de persistirse. Al fusionar Crypto Core y
      // Crypto Aggressive en Crypto Swing, los navegadores con la lista antigua
      // cacheada seguían mostrando dos estrategias que ya no existen, con datos
      // congelados, mientras el menú y las posiciones sí mostraban las nuevas.
      // Qué estrategias hay es cosa del código y de Redis, nunca del navegador.
      migrate: (persisted: any, version: number) => {
        if (!persisted) return persisted
        const migrated = { ...persisted }
        delete migrated.positions
        delete migrated.trades
        if (version < 3) delete migrated.strategies
        return migrated
      },
      partialize: (state) => ({
        intradayConfig: state.intradayConfig,
        intraday1PctConfig: state.intraday1PctConfig,
        irgConfig: state.irgConfig
      })
    }
  )
)
