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
  ConfigUpdatePayload
} from '@/types'
import { APP_VERSION, STRATEGY_DESCRIPTIONS, TRAILING_LABEL } from '@/config/version'

// =====================================================
// CONFIGURACIÓN INICIAL IRG (v5.0)
// =====================================================

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

const INITIAL_INTRADAY_CONFIG: IntradayConfig = {
  enabled: true,
  mode: 'paper',
  capital: 0,
  riskPerTrade: 0,
  maxPositions: 0,
  maxDailyLoss: 0.01,
  maxDailyProfit: 0.015,
  assets: ['BTC-USD', 'ETH-USD'],
  slAtrMult: 1.2,
  tpAtrMult: 1.5,
  asiaStartHour: 0,
  asiaEndHour: 8,
  tradingEndHour: 20,
  scanInterval: 300,
  useIRG: true // v5.0: Usa IRG
}

const INITIAL_INTRADAY_1PCT_CONFIG: Intraday1PctConfig = {
  enabled: true,
  mode: 'paper',
  capital: 0,
  riskPerTrade: 0,
  maxPositions: 0,
  maxDailyLoss: 0.015,
  maxDailyProfit: 0.03,
  tpPercent: 0.01,
  slPercent: 0.005,
  bePercent: 0.006,
  minMarketCap: 300000000,
  minVolume24h: 50000000,
  minVolMcRatio: 0.15,
  minAdx: 20,
  btcMinAdx: 18,
  rsiMin: 40,
  rsiMax: 55,
  scanInterval: 300,
  useIRG: true // v5.0: Usa IRG
}

// =====================================================
// ESTRATEGIAS INICIALES (v5.0)
// =====================================================

const INITIAL_STRATEGIES: StrategyConfig[] = [
  {
    key: 'crypto_core',
    name: 'Crypto Core',
    version: APP_VERSION,
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.crypto_core,
    capital: 7500,
    riskPerTrade: 0.01,
    maxPositions: 2,
    mode: 'paper',
    enabled: true,
    assets: ['BTC', 'ETH'],
    assetDescription: 'BTC (60%) + ETH (40%)',
    horizon: 'SWING',
    gatekeeper: 'BTC_REGIME', // v5.0: Swing usa BTC regime
    timeframes: { context: '1W', trend: '1D', entry: '4H' },
    stops: { slAtrMult: 2.0, tpAtrMult: 4.0, trailing: TRAILING_LABEL },
    entryFilters: {
      adxMin: 20,
      rsiMin: 35,        // Relajado: era 40
      rsiMax: 70,
      emaFast: 20,
      emaMedium: 50,
      emaSlow: 200,
      pullbackAtr: 1.0   // Relajado: era 0.5 (permite pullbacks más profundos)
    },
    expectedPerformance: {
      tradesPerMonth: '4-8',  // Actualizado por filtros relajados
      winRate: '40-45%',
      riskReward: '2.0:1',
      annualReturn: '30-50%',
      maxDrawdown: '-12%'
    }
  },
  {
    key: 'crypto_aggressive',
    name: 'Crypto Aggressive',
    version: APP_VERSION,
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.crypto_aggressive,
    capital: 7500,
    riskPerTrade: 0.01,
    maxPositions: 3,
    mode: 'paper',
    enabled: true,
    assets: ['SOL', 'XRP', 'AVAX', 'LINK'],
    assetDescription: 'SOL, XRP, AVAX, LINK (máx 3 posiciones)',
    horizon: 'SWING',
    gatekeeper: 'BTC_REGIME', // v5.0: Swing usa BTC regime
    timeframes: { context: '1D', trend: '4H', entry: '1H' },
    stops: { slAtrMult: 1.8, tpAtrMult: 3.6, trailing: TRAILING_LABEL },
    entryFilters: {
      adxMin: 15,
      rsiMin: 30,        // Relajado: era 35
      rsiMax: 75,
      emaFast: 20,
      emaMedium: 50,
      emaSlow: 200,
      pullbackAtr: 1.0   // Relajado: era 0.7 (permite pullbacks más profundos)
    },
    expectedPerformance: {
      tradesPerMonth: '20-35',  // Actualizado por filtros relajados
      winRate: '35-40%',
      riskReward: '2.0:1',
      annualReturn: '60-100%',
      maxDrawdown: '-22%'
    }
  },
  {
    key: 'large_caps',
    name: 'Large Caps',
    version: APP_VERSION,
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.large_caps,
    capital: 7500,
    riskPerTrade: 0.01,
    maxPositions: 4,
    mode: 'paper',
    enabled: true,
    assets: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA'],
    assetDescription: 'Magnificent 7 + Top S&P 500',
    horizon: 'SWING',
    gatekeeper: 'BTC_REGIME', // Para stocks sería SPY_REGIME
    timeframes: { context: '1W', trend: '1D', entry: '4H' },
    stops: { slAtrMult: 1.5, tpAtrMult: 3.0, trailing: TRAILING_LABEL },
    entryFilters: {
      adxMin: 20,
      rsiMin: 40,
      rsiMax: 70,
      emaFast: 20,
      emaMedium: 50,
      emaSlow: 200,
      pullbackAtr: 0.5
    },
    expectedPerformance: {
      tradesPerMonth: '6-10',
      winRate: '42-48%',
      riskReward: '1.8:1',
      annualReturn: '25-40%',
      maxDrawdown: '-10%'
    }
  },
  {
    key: 'small_caps',
    name: 'Small Caps',
    version: APP_VERSION,
    status: 'ACTIVE',
    description: STRATEGY_DESCRIPTIONS.small_caps,
    capital: 7500,
    riskPerTrade: 0.015,
    maxPositions: 4,
    mode: 'paper',
    enabled: true,
    assets: ['BROS', 'HIMS', 'OSCR', 'DOCS', 'FIVE', 'WING', 'ANF', 'PGNY'],
    assetDescription: 'Small caps momentum ($1B-$10B cap)',
    horizon: 'SWING',
    gatekeeper: 'BTC_REGIME',
    timeframes: { context: '1W', trend: '1D', entry: '1H' },
    stops: { slAtrMult: 2.0, tpAtrMult: 5.0, trailing: TRAILING_LABEL },
    entryFilters: {
      adxMin: 25,
      rsiMin: 40,
      rsiMax: 65,
      emaFast: 20,
      emaMedium: 50,
      emaSlow: 200,
      pullbackAtr: 0.5
    },
    expectedPerformance: {
      tradesPerMonth: '4-8',
      winRate: '35-40%',
      riskReward: '2.5:1',
      annualReturn: '40-70%',
      maxDrawdown: '-20%'
    }
  },
  {
    key: 'vwap_reversion',
    name: 'VWAP Reversion',
    version: 'v5.0',
    status: 'ACTIVE',
    description: 'Estrategia intraday mean-reversion. Opera fake breaks del rango asiático (00:00-08:00 UTC) que revierten al VWAP. Busca sobre-extensiones de más de 1 ATR respecto al VWAP en BTC y ETH. SL a 1.2x ATR, TP a 1.5x ATR. Límites diarios: -1% pérdida máxima, +1.5% target. Sin trailing, filosofía cobrar y fuera. USA IRG COMO GATEKEEPER.',
    capital: 0,
    riskPerTrade: 0,
    maxPositions: 0,
    mode: 'paper',
    enabled: true,
    assets: ['BTC-USD', 'ETH-USD'],
    assetDescription: 'BTC y ETH (sesión asiática)',
    horizon: 'INTRADAY',
    gatekeeper: 'IRG', // v5.0: Intraday usa IRG
    timeframes: { context: '15m', trend: '5m', entry: '5m' },
    stops: { slAtrMult: 1.2, tpAtrMult: 1.5 },
    entryFilters: {
      adxMin: 15,
      rsiMin: 20,
      rsiMax: 80,
      emaFast: 9,
      emaMedium: 21,
      emaSlow: 50,
      pullbackAtr: 0.3
    },
    expectedPerformance: {
      tradesPerMonth: '40-60',
      winRate: '45-50%',
      riskReward: '1.25:1',
      annualReturn: '20-35%',
      maxDrawdown: '-8%'
    }
  },
  {
    key: 'one_percent_spot',
    name: '1% Spot',
    version: 'v5.0',
    status: 'ACTIVE',
    description: 'Estrategia intraday trend-following. Busca +1% rápidos en altcoins con momentum limpio. Filtros: market cap >$300M, volumen 24h >$50M, ratio vol/mcap >0.15, ADX >20, RSI 40-55. TP fijo +1%, SL -0.5% (R:R 2:1). Mueve a BE en +0.6%. Límites diarios: -1.5% pérdida, +3% target. USA IRG COMO GATEKEEPER.',
    capital: 0,
    riskPerTrade: 0,
    maxPositions: 0,
    mode: 'paper',
    enabled: true,
    assets: ['SOL-USD', 'XRP-USD', 'AVAX-USD', 'LINK-USD', 'DOT-USD'],
    assetDescription: 'Altcoins >$300M market cap',
    horizon: 'INTRADAY',
    gatekeeper: 'IRG', // v5.0: Intraday usa IRG
    timeframes: { context: '1H', trend: '15m', entry: '5m' },
    stops: { slAtrMult: 0.5, tpAtrMult: 1.0 },
    entryFilters: {
      adxMin: 20,
      rsiMin: 40,
      rsiMax: 55,
      emaFast: 9,
      emaMedium: 21,
      emaSlow: 50,
      pullbackAtr: 0.2
    },
    expectedPerformance: {
      tradesPerMonth: '60-100',
      winRate: '40-45%',
      riskReward: '2.0:1',
      annualReturn: '35-60%',
      maxDrawdown: '-10%'
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
        
        const initialCapital = state.strategies.filter(s => !s.key.includes("vwap") && !s.key.includes("one_percent")).reduce((sum, s) => sum + s.capital, 0) + (state.intradayConfig?.capital || 0) + (state.intraday1PctConfig?.capital || 0)
        const cryptoInitial = (state.intradayConfig?.capital || 0) + (state.intraday1PctConfig?.capital || 0) + state.strategies
          .filter(s => s.key.includes('crypto'))
          .reduce((sum, s) => sum + s.capital, 0)
        const stocksInitial = state.strategies
          .filter(s => s.key.includes('caps'))
          .reduce((sum, s) => sum + s.capital, 0)
        
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
      
      setPositions: (positions) => set({ positions, lastUpdate: new Date().toISOString() }),
      
      setTrades: (trades) => set({ trades, lastUpdate: new Date().toISOString() }),
      
      refreshData: () => set({ lastUpdate: new Date().toISOString() })
    }),
    {
      name: 'eleve-trading-store-v43',
      partialize: (state) => ({
        strategies: state.strategies,
        positions: state.positions,
        trades: state.trades,
        intradayConfig: state.intradayConfig,
        intraday1PctConfig: state.intraday1PctConfig,
        irgConfig: state.irgConfig
      })
    }
  )
)
