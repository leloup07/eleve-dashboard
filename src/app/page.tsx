'use client'

import { useEffect, useState } from 'react'
import { useHidratado } from '@/hooks/useHidratado'
import { useTradingStore } from '@/stores/tradingStore'
import { useRealTradingData } from '@/hooks/useRealTradingData'
import { MetricCard } from '@/components/MetricCard'
import { StrategyCard } from '@/components/StrategyCard'
import { OpenPositions } from '@/components/OpenPositions'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters'
import { clsx } from 'clsx'

// TradingView Ticker Banner Component
function TickerBanner({ symbols, title }: { symbols: { proName: string, title: string }[], title: string }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  useEffect(() => {
    if (!mounted) return
    
    const containerId = `tradingview-widget-${title.replace(/\s/g, '-')}`
    const container = document.getElementById(containerId)
    if (!container) return
    
    // Clear previous widget
    container.innerHTML = ''
    
    // Create widget container div
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    container.appendChild(widgetDiv)
    
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols,
      showSymbolLogo: true,
      colorTheme: "light",
      isTransparent: false,
      displayMode: "adaptive",
      locale: "es"
    })
    container.appendChild(script)
    
    return () => {
      if (container) container.innerHTML = ''
    }
  }, [mounted, symbols, title])
  
  if (!mounted) {
    return (
      <div className="h-12 bg-gray-50 animate-pulse flex items-center justify-center">
        <span className="text-xs text-gray-400">Cargando {title}...</span>
      </div>
    )
  }
  
  return (
    <div className="tradingview-widget-container w-full max-w-full overflow-hidden">
      <div 
        id={`tradingview-widget-${title.replace(/\s/g, '-')}`}
        className="h-12 overflow-hidden w-full"
      />
    </div>
  )
}

function RegimeIndicator({ 
  label, 
  regime, 
  isTrading 
}: { 
  label: string
  regime: string
  isTrading: boolean 
}) {
  const regimeColors = {
    BULL: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    BEAR: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    RANGE: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  }[regime] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' }
  
  return (
    <div className="bg-white rounded-lg p-4 border">
      <span className="text-xs text-gray-500 uppercase block mb-2">{label}</span>
      <div className="flex items-center gap-2">
        <span className={clsx('w-3 h-3 rounded-full', regimeColors.dot)} />
        <span className={clsx('font-bold', regimeColors.text)}>{regime}</span>
      </div>
      <div className="mt-2">
        {isTrading ? (
          <span className="text-xs text-green-600 font-medium">✅ OPERANDO</span>
        ) : (
          <span className="text-xs text-red-600 font-medium">❌ BLOQUEADO</span>
        )}
      </div>
    </div>
  )
}

function RecentTrades() {
  const trades = useTradingStore(state => state.trades)
  const recentTrades = [...trades].reverse().slice(0, 5)
  
  if (recentTrades.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        Sin trades completados todavía
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {recentTrades.map(trade => (
        <div 
          key={trade.id} 
          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
        >
          <div className="flex items-center gap-2">
            <span>{trade.result === 'SL' ? '🔴' : '🟢'}</span>
            <span className="font-medium">{trade.ticker}</span>
            <span className="text-xs text-gray-500">{trade.result}</span>
          </div>
          <span className={clsx(
            'font-medium',
            trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {formatCurrency(trade.pnl)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  // La hora y todo lo derivado del reloj solo se pintan tras montar: si no,
  // el HTML del servidor y el primer render del cliente difieren y React aborta
  // la hidratación, con lo que los efectos que traen los datos no llegan a
  // ejecutarse y la página se queda con los valores por defecto.
  const hidratado = useHidratado()
  const strategies = useTradingStore(state => state.strategies.map(s => s.key === 'one_percent_spot' ? { ...s, capital: state.intraday1PctConfig?.capital || s.capital, maxPositions: state.intraday1PctConfig?.maxPositions || s.maxPositions } : s.key === 'vwap_reversion' ? { ...s, capital: state.intradayConfig?.capital || s.capital, maxPositions: state.intradayConfig?.maxPositions || s.maxPositions } : s))
  const positions = useTradingStore(state => state.positions)
  const trades = useTradingStore(state => state.trades)
  const redisConnected = useTradingStore(state => state.redisConnected)
  const globalMode = useTradingStore(state => state.getGlobalTradingMode())
  const getDashboardStats = useTradingStore(state => state.getDashboardStats)
  
  // Cargar datos reales de Redis (auto-refresh cada 30s)
  const { loading, error, lastFetch, refresh, worker, intraday } = useRealTradingData(30000)
  
  const stats = getDashboardStats()
  
  const cryptoSymbols = [
    { proName: "BINANCE:BTCUSDT", title: "BTC" },
    { proName: "BINANCE:ETHUSDT", title: "ETH" },
    { proName: "BINANCE:SOLUSDT", title: "SOL" },
    { proName: "BINANCE:XRPUSDT", title: "XRP" }
  ]
  
  const stockSymbols = [
    { proName: "AMEX:SPY", title: "SPY" },
    { proName: "NASDAQ:AAPL", title: "AAPL" },
    { proName: "NASDAQ:NVDA", title: "NVDA" },
    { proName: "NASDAQ:MSFT", title: "MSFT" }
  ]

  return (
    <div className="space-y-5 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏠 Dashboard</h1>
          <p className="text-gray-500 text-sm">ELEVE Trading System</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Connection Status */}
          <div className={clsx(
            'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1',
            loading ? 'bg-yellow-100 text-yellow-700' :
            redisConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            <span className={clsx(
              'w-2 h-2 rounded-full',
              loading ? 'bg-yellow-500 animate-pulse' :
              redisConnected ? 'bg-green-500' : 'bg-red-500'
            )} />
            {loading ? '...' : redisConnected ? 'Redis ✓' : 'Sin conexión'}
          </div>
          <button 
            onClick={refresh}
            disabled={loading}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            🔄
          </button>
          <div className={clsx(
            'px-3 py-1.5 rounded-lg font-semibold text-sm',
            globalMode === 'live' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-blue-100 text-blue-700'
          )}>
            {globalMode === 'live' ? '🔴 LIVE' : '📝 PAPER'}
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <strong>Error de conexión:</strong> {error}
          <p className="text-sm mt-1">Verifica que REDIS_URL esté configurada en Railway.</p>
        </div>
      )}
      
      {/* Worker status */}
      {worker && (
        <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-600 flex items-center justify-between">
          <div>
            <strong>Bot:</strong> {worker.stale
              ? `🔴 Sin señal${worker.staleMinutes ? ` (${Math.round(worker.staleMinutes)} min)` : ''}`
              : worker.status === 'running' ? '🟢 Ejecutando' : '🔴 Parado'} |
            <strong> Modo:</strong> {worker.mode || 'PAPER'} |
            <strong> Última actualización:</strong> {lastFetch?.toLocaleTimeString('es-ES') || '-'}
          </div>
          {worker.last_scan && (
            <div className="text-xs text-gray-400">
              Último scan: {new Date(worker.last_scan).toLocaleString('es-ES')}
            </div>
          )}
        </div>
      )}
      
      {/* TradingView Ticker Banners */}
      <div className="space-y-2 w-full max-w-full overflow-hidden">
        <div className="bg-white rounded-lg border overflow-hidden w-full">
          <TickerBanner symbols={cryptoSymbols} title="Crypto" />
        </div>
        <div className="bg-white rounded-lg border overflow-hidden w-full">
          <TickerBanner symbols={stockSymbols} title="Stocks" />
        </div>
      </div>
      
      {/* Regimes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RegimeIndicator 
          label="Régimen BTC" 
          regime={stats.btcRegime} 
          isTrading={stats.btcRegime === 'BULL'} 
        />
        <RegimeIndicator 
          label="Régimen SPY" 
          regime={stats.spyRegime} 
          isTrading={stats.spyRegime === 'BULL'} 
        />
        <div className="bg-white rounded-lg p-4 border">
          <span className="text-xs text-gray-500 uppercase block mb-2">Crypto</span>
          {stats.btcRegime === 'BULL' ? (
            <span className="text-green-600 font-bold">✅ OPERANDO</span>
          ) : (
            <span className="text-red-600 font-bold">❌ BLOQUEADO</span>
          )}
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <span className="text-xs text-gray-500 uppercase block mb-2">Stocks</span>
          {stats.spyRegime === 'BULL' ? (
            <span className="text-green-600 font-bold">✅ OPERANDO</span>
          ) : (
            <span className="text-red-600 font-bold">❌ BLOQUEADO</span>
          )}
        </div>
      </div>
      
      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          label="Capital Total" 
          value={formatCurrency(stats.totalCapital)} 
          icon="💰"
        />
        <MetricCard 
          label="Posiciones Abiertas" 
          value={stats.openPositions.toString()} 
          icon="📊"
        />
        <MetricCard 
          label="Win Rate" 
          value={formatPercent(stats.winRate)} 
          icon="🎯"
        />
        <MetricCard 
          label="Profit Factor" 
          value={stats.profitFactor.toFixed(2)} 
          icon="📈"
        />
      </div>
      
      {/* Strategies Grid — solo las operativas: StrategyCard afirma PAPER/LIVE,
          equity, R:R y posiciones, que es falso para una estrategia con
          research cerrado y el worker sin escanear. */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Estrategias Operativas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategies.filter(s => s.key !== 'vwap_reversion' && s.key !== 'one_percent_spot').map(strategy => (
            <StrategyCard key={strategy.key} strategy={strategy} />
          ))}
        </div>
      </div>

      {/* Open Positions */}
      <OpenPositions />
      
      {/* Performance & Recent Trades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Summary */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Rendimiento</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-500 uppercase">PnL Total</span>
              <p className={clsx(
                'text-xl font-bold',
                stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {formatCurrency(stats.totalPnL)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Total Trades</span>
              <p className="text-xl font-bold text-gray-900">{stats.totalTrades}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Win Rate</span>
              <p className="text-xl font-bold text-gray-900">{formatPercent(stats.winRate)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Profit Factor</span>
              <p className="text-xl font-bold text-gray-900">{stats.profitFactor.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        {/* Recent Trades */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Últimos Trades</h3>
          <RecentTrades />
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        ELEVE{hidratado && ` | ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
      </div>
    </div>
  )
}
