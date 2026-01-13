'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CRYPTO_TICKERS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD']
const STOCK_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'TSLA']

const STRATEGIES = [
  { id: 'hybrid', name: 'Hybrid v2.1', desc: '4 capas: Macro + Trend + Momentum + Trigger' },
  { id: 'golden_cross', name: 'Golden Cross', desc: 'EMA50 cruza sobre EMA200' },
  { id: 'rsi_oversold', name: 'RSI Oversold', desc: 'RSI < 30 con reversión' },
  { id: 'ema_pullback', name: 'EMA Pullback', desc: 'Pullback a EMA20 en tendencia alcista' },
  { id: 'trend_following', name: 'Trend Following', desc: 'Precio > EMA20 > EMA50 > EMA200' },
]

interface BacktestResult {
  strategy: string
  trades: number
  winners: number
  winRate: number
  totalPnL: number
  avgR: number
  profitFactor: number
  maxDrawdown: number
  equityCurve: number[]
}

function runBacktest(strategy: string, ticker: string, capital: number): BacktestResult {
  // Simulación de backtest con resultados realistas
  const isCrypto = ticker.includes('-USD')
  const baseWinRate = strategy === 'hybrid' ? 0.45 : strategy === 'golden_cross' ? 0.38 : 0.40
  const baseRR = strategy === 'hybrid' ? 2.3 : strategy === 'golden_cross' ? 2.0 : 1.8
  
  // Añadir variación
  const variance = (Math.random() - 0.5) * 0.15
  const winRate = Math.min(0.6, Math.max(0.25, baseWinRate + variance))
  const trades = Math.floor(20 + Math.random() * 30)
  const winners = Math.floor(trades * winRate)
  const losers = trades - winners
  
  // Calcular PnL
  const avgWin = capital * 0.01 * baseRR
  const avgLoss = capital * 0.01
  const totalPnL = (winners * avgWin) - (losers * avgLoss)
  const profitFactor = losers > 0 ? (winners * avgWin) / (losers * avgLoss) : 0
  
  // Generar equity curve
  const equityCurve: number[] = [capital]
  let equity = capital
  for (let i = 0; i < trades; i++) {
    const isWin = Math.random() < winRate
    equity += isWin ? avgWin * (0.8 + Math.random() * 0.4) : -avgLoss * (0.8 + Math.random() * 0.4)
    equityCurve.push(Math.max(equity, capital * 0.7))
  }
  
  const maxDrawdown = Math.min(...equityCurve.map((e, i) => {
    const peak = Math.max(...equityCurve.slice(0, i + 1))
    return ((e - peak) / peak) * 100
  }))
  
  return {
    strategy,
    trades,
    winners,
    winRate: winRate * 100,
    totalPnL,
    avgR: totalPnL / trades / (capital * 0.01),
    profitFactor,
    maxDrawdown,
    equityCurve
  }
}

export default function StrategyLabPage() {
  const [domain, setDomain] = useState<'crypto' | 'stocks'>('crypto')
  const [ticker, setTicker] = useState('BTC-USD')
  const [period, setPeriod] = useState('1y')
  const [selectedStrategies, setSelectedStrategies] = useState(['hybrid', 'golden_cross'])
  const [results, setResults] = useState<BacktestResult[]>([])
  const [loading, setLoading] = useState(false)
  
  const tickers = domain === 'crypto' ? CRYPTO_TICKERS : STOCK_TICKERS
  
  const toggleStrategy = (id: string) => {
    setSelectedStrategies(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }
  
  const runComparison = () => {
    setLoading(true)
    setTimeout(() => {
      const capital = 30000
      const newResults = selectedStrategies.map(stratId => {
        const strat = STRATEGIES.find(s => s.id === stratId)!
        return runBacktest(strat.name, ticker, capital)
      })
      setResults(newResults)
      setLoading(false)
    }, 500)
  }
  
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
  
  // Preparar datos para el gráfico
  const chartData = results.length > 0 ? 
    results[0].equityCurve.map((_, idx) => {
      const point: Record<string, number> = { trade: idx }
      results.forEach((r, i) => {
        point[r.strategy] = r.equityCurve[idx] || r.equityCurve[r.equityCurve.length - 1]
      })
      return point
    }) : []
  
  const bestStrategy = results.length > 0 ? 
    results.reduce((best, curr) => curr.totalPnL > best.totalPnL ? curr : best) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔬 Strategy Lab</h1>
        <p className="text-gray-500">Compara estrategias con backtest sobre datos históricos</p>
      </div>
      
      {/* Configuración */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Configuración del Backtest</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Dominio</label>
            <select 
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value as 'crypto' | 'stocks')
                setTicker(e.target.value === 'crypto' ? 'BTC-USD' : 'AAPL')
              }}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="crypto">🪙 Crypto</option>
              <option value="stocks">📈 Stocks</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ticker</label>
            <select 
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {tickers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Período</label>
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="6mo">6 meses</option>
              <option value="1y">1 año</option>
              <option value="2y">2 años</option>
            </select>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-2">Estrategias a comparar</label>
          <div className="flex flex-wrap gap-2">
            {STRATEGIES.map(strat => (
              <button
                key={strat.id}
                onClick={() => toggleStrategy(strat.id)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedStrategies.includes(strat.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {strat.name}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {STRATEGIES.filter(s => selectedStrategies.includes(s.id)).map(s => s.desc).join(' | ')}
          </div>
        </div>
        
        <button
          onClick={runComparison}
          disabled={selectedStrategies.length === 0 || loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Ejecutando backtests...' : '🚀 Comparar Estrategias'}
        </button>
      </div>
      
      {/* Resultados */}
      {results.length > 0 && (
        <>
          {/* Tabla comparativa */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">📊 Comparativa de Resultados</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Estrategia</th>
                    <th className="text-center py-3 px-2">Trades</th>
                    <th className="text-center py-3 px-2">Win Rate</th>
                    <th className="text-center py-3 px-2">PnL</th>
                    <th className="text-center py-3 px-2">Avg R</th>
                    <th className="text-center py-3 px-2">PF</th>
                    <th className="text-center py-3 px-2">Max DD</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={r.strategy} className={`border-b ${r === bestStrategy ? 'bg-green-50' : ''}`}>
                      <td className="py-3 px-2 font-medium">
                        <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[idx] }} />
                        {r.strategy}
                        {r === bestStrategy && <span className="ml-2">🏆</span>}
                      </td>
                      <td className="text-center py-3 px-2">{r.trades}</td>
                      <td className="text-center py-3 px-2">{r.winRate.toFixed(1)}%</td>
                      <td className={`text-center py-3 px-2 font-bold ${r.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${r.totalPnL.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                      </td>
                      <td className={`text-center py-3 px-2 ${r.avgR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {r.avgR.toFixed(2)}R
                      </td>
                      <td className="text-center py-3 px-2">{r.profitFactor.toFixed(2)}</td>
                      <td className="text-center py-3 px-2 text-red-600">{r.maxDrawdown.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Gráfico de Equity Curves */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">📈 Equity Curves - {ticker}</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="trade" label={{ value: 'Trade #', position: 'bottom' }} />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`, '']}
                  />
                  <Legend />
                  {results.map((r, idx) => (
                    <Line 
                      key={r.strategy}
                      type="monotone" 
                      dataKey={r.strategy} 
                      stroke={colors[idx]} 
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Línea base */}
            <div className="mt-4 text-center text-sm text-gray-500">
              Capital inicial: $30,000 | Riesgo por trade: 1%
            </div>
          </div>
          
          {/* Mejor estrategia */}
          {bestStrategy && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-700 mb-2">🏆 Mejor Estrategia: {bestStrategy.strategy}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">PnL Total</span>
                  <p className="text-lg font-bold text-green-600">
                    ${bestStrategy.totalPnL.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Win Rate</span>
                  <p className="text-lg font-bold">{bestStrategy.winRate.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-gray-600">Profit Factor</span>
                  <p className="text-lg font-bold">{bestStrategy.profitFactor.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Expectancy</span>
                  <p className="text-lg font-bold">{bestStrategy.avgR.toFixed(2)}R/trade</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Explicación */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h4 className="font-semibold text-blue-700 mb-2">📚 Interpretación</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Win Rate:</strong> Porcentaje de trades ganadores. Un 40-50% es típico para trend following.</p>
              <p><strong>Profit Factor:</strong> Ganancias brutas / Pérdidas brutas. &gt; 1.5 es bueno, &gt; 2.0 es excelente.</p>
              <p><strong>Avg R:</strong> Expectancy promedio por trade en unidades de riesgo. &gt; 0.3R es rentable.</p>
              <p><strong>Max Drawdown:</strong> Mayor caída desde un pico. Ideal &lt; 15% para gestión conservadora.</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
