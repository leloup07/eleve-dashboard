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
  Intraday1PctConfig
} from '@/types'

// Configuración inicial de intraday VWAP
const INITIAL_INTRADAY_CONFIG: IntradayConfig = {
  enabled: true,
  mode: 'paper',
  capital: 10000,
  riskPerTrade: 0.003,      // 0.3%
  maxPositions: 2,
  maxDailyLoss: 0.01,       // 1%
  maxDailyProfit: 0.015,    // 1.5%
  assets: ['BTC-USD', 'ETH-USD'],
  slAtrMult: 1.2,
  tpAtrMult: 1.5,
  asiaStartHour: 0,
  asiaEndHour: 8,
  tradingEndHour: 20,
  scanInterval: 300
}

// Configuración inicial de intraday 1%
const INITIAL_INTRADAY_1PCT_CONFIG: Intraday1PctConfig = {
  enabled: true,
  mode: 'paper',
  capital: 10000,
  riskPerTrade: 0.005,      // 0.5%
  maxPositions: 5,
  maxDailyLoss: 0.015,      // 1.5%
  maxDailyProfit: 0.03,     // 3%
  tpPercent: 0.01,          // +1%
  slPercent: 0.005,         // -0.5%
  bePercent: 0.006,         // +0.6% -> BE
  minMarketCap: 300000000,
  minVolume24h: 50000000,
  minVolMcRatio: 0.15,
  minAdx: 20,
  btcMinAdx: 18,
  rsiMin: 40,
  rsiMax: 55,
  scanInterval: 300
}

// Configuraciones iniciales de estrategias
const INITIAL_STRATEGIES: StrategyConfig[] = [
  {
    key: 'crypto_core',
    name: 'Crypto Core',
    version: 'v4.1',
    status: 'ACTIVE',
    description: 'Estrategia swing conservadora para BTC y ETH. Captura tendencias largas en los activos más líquidos del mercado crypto usando análisis multi-timeframe: contexto semanal (1W) define régimen macro, diario (1D) confirma tendencia, y 4H determina entrada. Opera pullbacks a EMA20 en tendencia alcista confirmada. RSI 40-70 para evitar extremos. Stop loss a 2x ATR, take profit escalonado: 50% en 2.5x ATR, resto con trailing. Prioriza seguridad sobre frecuencia.',
    capital: 15000,
    riskPerTrade: 0.01,
    maxPositions: 2,
    mode: 'paper',
    enabled: true,
    assets: ['BTC', 'ETH'],
    assetDescription: 'BTC (60%) + ETH (40%)',
    timeframes: { context: '1W', trend: '1D', entry: '4H' },
    stops: { slAtrMult: 2.0, tpAtrMult: 4.0 },
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
      tradesPerMonth: '2-4',
      winRate: '40-45%',
      riskReward: '2.0:1',
      annualReturn: '30-50%',
      maxDrawdown: '-12%'
    }
  },
  {
    key: 'crypto_aggressive',
    name: 'Crypto Aggressive',
    version: 'v4.1',
    status: 'ACTIVE',
    description: 'Estrategia swing oportunista para altcoins de alta liquidez (SOL, AVAX, LINK, XRP). Caza rotaciones y movimientos intermedios con mayor frecuencia que Core. Contexto lo marca BTC en diario; si BTC alcista, altcoins siguen con beta amplificado. Análisis en 4H con EMAs rápidas (12/26), entrada en 1H en pullback a EMA12. Stops amplios (2.5x ATR) por volatilidad de altcoins. TP agresivo a 5x ATR. Incluye filtro de correlación para evitar exposición concentrada.',
    capital: 15000,
    riskPerTrade: 0.01,
    maxPositions: 3,
    mode: 'paper',
    enabled: true,
    assets: ['SOL', 'XRP', 'AVAX', 'LINK'],
    assetDescription: 'SOL, XRP, AVAX, LINK (máx 3 posiciones)',
    timeframes: { context: '1D', trend: '4H', entry: '1H' },
    stops: { slAtrMult: 1.8, tpAtrMult: 3.6 },
    entryFilters: {
      adxMin: 15,
      rsiMin: 35,
      rsiMax: 75,
      emaFast: 20,
      emaMedium: 50,
      emaSlow: 200,
      pullbackAtr: 0.7
    },
    expectedPerformance: {
      tradesPerMonth: '15-25',
      winRate: '35-40%',
      riskReward: '2.0:1',
      annualReturn: '60-100%',
      maxDrawdown: '-22%'
    }
  },
  {
    key: 'large_caps',
    name: 'Large Caps',
    version: 'v4.1',
    status: 'ACTIVE',
    description: 'Estrategia swing para acciones blue chip del S&P 500 (top 50 por market cap >100B). Filtro macro: SPY debe estar en tendencia alcista semanal. Análisis individual en diario buscando estructura HH-HL con precio sobre EMA20. Entrada en 4H cuando precio retrocede a zona de valor con RSI 40-65. Stops más ajustados (1.8x ATR) por menor volatilidad que crypto. TP a 3.5x ATR. Solo opera en horario de mercado (9:30-16:00 ET). Respeta gaps de apertura.',
    capital: 15000,
    riskPerTrade: 0.01,
    maxPositions: 4,
    mode: 'paper',
    enabled: true,
    assets: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA'],
    assetDescription: 'Magnificent 7 + Top S&P 500',
    timeframes: { context: '1W', trend: '1D', entry: '4H' },
    stops: { slAtrMult: 1.5, tpAtrMult: 3.0 },
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
    version: 'v4.1',
    status: 'ACTIVE',
    description: 'Estrategia swing momentum para small caps del Russell 2000 (market cap 1B-10B). Busca impulsos parabólicos con filtros exigentes: ADX >25, RSI 40-65, pullback corto (0.5x ATR). Filtro macro: IWM en tendencia alcista. Stops a 2x ATR, TP agresivo a 5x ATR. Gestión diferencial por régimen: en TREND mantiene 100% con trailing amplio (2.5x ATR) para capturar movimientos de +8R a +12R. Mayor riesgo, mayor potencial de retorno.',
    capital: 10000,
    riskPerTrade: 0.015,
    maxPositions: 4,
    mode: 'paper',
    enabled: true,
    assets: ['BROS', 'HIMS', 'OSCR', 'DOCS', 'FIVE', 'WING', 'ANF', 'PGNY'],
    assetDescription: 'Small caps momentum ($1B-$10B cap)',
    timeframes: { context: '1W', trend: '1D', entry: '1H' },
    stops: { slAtrMult: 2.0, tpAtrMult: 5.0 },
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
    key: 'intraday',
    name: 'VWAP Reversion',
    version: 'v4.2',
    status: 'ACTIVE',
    description: 'Estrategia intraday mean-reversion. Opera fake breaks del rango asiático (00:00-08:00 UTC) que revierten al VWAP. Busca sobre-extensiones de más de 1 ATR respecto al VWAP en BTC y ETH. SL a 1.2x ATR, TP a 1.5x ATR. Límites diarios: -1% pérdida máxima, +1.5% target. Sin trailing, filosofía cobrar y fuera. No opera fines de semana.',
    capital: 10000,
    riskPerTrade: 0.003,
    maxPositions: 2,
    mode: 'paper',
    enabled: true,
    assets: ['BTC-USD', 'ETH-USD'],
    assetDescription: 'BTC y ETH (sesión asiática)',
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
    key: 'intraday_1pct',
    name: '1% Spot',
    version: 'v4.2',
    status: 'ACTIVE',
    description: 'Estrategia intraday trend-following. Busca +1% rápidos en altcoins con momentum limpio. Filtros estrictos: market cap >$300M, volumen 24h >$50M, ratio vol/mcap >0.15, ADX >20, RSI 40-55. TP fijo +1%, SL -0.5% (R:R 2:1). Mueve a breakeven en +0.6%. Límites diarios: -1.5% pérdida, +3% target. No opera fines de semana.',
    capital: 10000,
    riskPerTrade: 0.005,
    maxPositions: 5,
    mode: 'paper',
    enabled: true,
    assets: ['SOL', 'XRP', 'AVAX', 'LINK', 'MATIC', 'DOT', 'UNI', 'ATOM'],
    assetDescription: 'Altcoins high-volume (mcap >$300M)',
    timeframes: { context: '15m', trend: '5m', entry: '1m' },
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
      tradesPerMonth: '80-120',
      winRate: '50-55%',
      riskReward: '2.0:1',
      annualReturn: '35-60%',
      maxDrawdown: '-10%'
    }
  }
]

// Posiciones y trades vacíos - se cargarán desde Redis
const DEMO_POSITIONS: Position[] = []
const DEMO_TRADES: Trade[] = []

interface TradingStore {
  // Estado
  strategies: StrategyConfig[]
  intradayConfig: IntradayConfig
  intraday1PctConfig: Intraday1PctConfig
  positions: Position[]
  trades: Trade[]
  btcRegime: MarketRegime
  spyRegime: MarketRegime
  botActive: boolean
  redisConnected: boolean
  lastUpdate: string
  
  // Getters computados
  getDashboardStats: () => DashboardStats
  getStrategyPerformance: (strategyKey: string) => StrategyPerformance
  getPositionsByStrategy: (strategyKey: string) => Position[]
  getTradesByStrategy: (strategyKey: string) => Trade[]
  getGlobalTradingMode: () => TradingMode
  
  // Acciones
  updateStrategy: (key: string, updates: Partial<StrategyConfig>) => void
  updateIntradayConfig: (updates: Partial<IntradayConfig>) => void
  updateIntraday1PctConfig: (updates: Partial<Intraday1PctConfig>) => void
  addPosition: (position: Position) => void
  removePosition: (id: string) => void
  addTrade: (trade: Trade) => void
  setRegime: (market: 'btc' | 'spy', regime: MarketRegime) => void
  setBotActive: (active: boolean) => void
  setRedisConnected: (connected: boolean) => void
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
      positions: DEMO_POSITIONS,
      trades: DEMO_TRADES,
      btcRegime: 'BULL',
      spyRegime: 'BULL',
      botActive: true,
      redisConnected: true,
      lastUpdate: new Date().toISOString(),
      
      // Getters computados
      getDashboardStats: () => {
        const state = get()
        
        // Capital inicial por categoría
        const initialCapital = state.strategies.reduce((sum, s) => sum + s.capital, 0)
        const cryptoInitial = state.strategies
          .filter(s => s.key.includes('crypto'))
          .reduce((sum, s) => sum + s.capital, 0)
        const stocksInitial = state.strategies
          .filter(s => !s.key.includes('crypto'))
          .reduce((sum, s) => sum + s.capital, 0)
        
        // PnL realizado por categoría
        const totalRealizedPnL = state.trades.reduce((sum, t) => sum + t.pnl, 0)
        const cryptoRealizedPnL = state.trades
          .filter(t => t.strategy.includes('crypto'))
          .reduce((sum, t) => sum + t.pnl, 0)
        const stocksRealizedPnL = state.trades
          .filter(t => !t.strategy.includes('crypto'))
          .reduce((sum, t) => sum + t.pnl, 0)
        
        // PnL no realizado (posiciones abiertas)
        const totalUnrealizedPnL = state.positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0)
        
        // Equity actual = capital inicial + PnL realizado
        const totalCapital = initialCapital + totalRealizedPnL
        const cryptoCapital = cryptoInitial + cryptoRealizedPnL
        const stocksCapital = stocksInitial + stocksRealizedPnL
        
        // PnL total (realizado + no realizado)
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
          spyRegime: state.spyRegime
        }
      },
      
      getStrategyPerformance: (strategyKey: string) => {
        const state = get()
        const strategy = state.strategies.find(s => s.key === strategyKey)
        const strategyTrades = state.trades.filter(t => t.strategy === strategyKey)
        const winners = strategyTrades.filter(t => t.pnl > 0)
        const positions = state.positions.filter(p => p.strategy === strategyKey)
        
        // Calcular PnL realizado (trades cerrados)
        const realizedPnL = strategyTrades.reduce((sum, t) => sum + t.pnl, 0)
        
        // Calcular PnL no realizado (posiciones abiertas)
        const unrealizedPnL = positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0)
        
        // Capital inicial de la estrategia
        const initialCapital = strategy?.capital || 0
        
        // Equity actual = capital inicial + PnL realizado + PnL no realizado
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
      
      // Acciones
      updateStrategy: (key, updates) => set(state => ({
        strategies: state.strategies.map(s => 
          s.key === key ? { ...s, ...updates } : s
        ),
        lastUpdate: new Date().toISOString()
      })),
      
      updateIntradayConfig: (updates) => set(state => ({
        intradayConfig: { ...state.intradayConfig, ...updates },
        lastUpdate: new Date().toISOString()
      })),
      
      updateIntraday1PctConfig: (updates) => set(state => ({
        intraday1PctConfig: { ...state.intraday1PctConfig, ...updates },
        lastUpdate: new Date().toISOString()
      })),
      
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
      
      setBotActive: (active) => set({ botActive: active, lastUpdate: new Date().toISOString() }),
      
      setRedisConnected: (connected) => set({ redisConnected: connected }),
      
      setPositions: (positions) => set({ positions, lastUpdate: new Date().toISOString() }),
      
      setTrades: (trades) => set({ trades, lastUpdate: new Date().toISOString() }),
      
      refreshData: () => set({ lastUpdate: new Date().toISOString() })
    }),
    {
      name: 'eleve-trading-store-v19',
      partialize: (state) => ({
        positions: state.positions,
        trades: state.trades,
        intradayConfig: state.intradayConfig,
        intraday1PctConfig: state.intraday1PctConfig
      })
    }
  )
)
