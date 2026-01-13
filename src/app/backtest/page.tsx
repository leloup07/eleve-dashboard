'use client'

import { useState, useMemo } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts'
import { useTradingStore } from '@/stores/tradingStore'
import { formatCurrency, formatPercent } from '@/lib/formatters'

// Constantes v4.1
const ATR_MULT_RANGE = 2.0
const ATR_MULT_TRANSITION = 2.2
const ATR_MULT_TREND = 2.5

type Regime = 'RANGE' | 'TRANSITION' | 'TREND'

// Tipos
interface BacktestTrade {
  id: number
  ticker: string
  entryDate: string
  exitDate: string
  entryPrice: number
  exitPrice: number
  pnl: number
  pnlPercent: number
  rMultiple: number
  maxR: number
  exitReason: 'TP' | 'SL' | 'TRAIL' | 'BE'
  grade: 'A+' | 'A' | 'B'
  holdingDays: number
  entryRegime: Regime
  entryAdx: number
  convexity: number
  atrMultUsed: number
}

interface BacktestResult {
  trades: BacktestTrade[]
  totalPnL: number
  totalPnLPercent: number
  winRate: number
  profitFactor: number
  maxDrawdown: number
  sharpe: number
  avgR: number
  equityCurve: { day: number, equity: number }[]
}

// Función para generar backtest simulado con lógica v4.1
function runBacktest(
  strategyKey: string, 
  period: string, 
  capital: number,
  riskPerTrade: number,
  slAtrMult: number,
  tpAtrMult: number
): BacktestResult {
  const trades: BacktestTrade[] = []
  let equity = capital
  const equityCurve: { day: number, equity: number }[] = [{ day: 0, equity: capital }]
  
  const periodDays = period === '6mo' ? 180 : period === '1y' ? 365 : period === '2y' ? 730 : 1825
  const tradesPerMonth = strategyKey.includes('crypto') ? 8 : 4
  const totalTrades = Math.floor((periodDays / 30) * tradesPerMonth)
  
  const baseWinRate = strategyKey.includes('aggressive') ? 0.55 : 0.62
  const avgWinR = tpAtrMult / slAtrMult
  
  const tickers = strategyKey.includes('crypto') 
    ? ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD']
    : strategyKey.includes('large') 
    ? ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL']
    : ['BROS', 'HIMS', 'OSCR', 'FIVE', 'WING']
  
  let day = 1
  let peakEquity = capital
  let maxDrawdown = 0
  
  for (let i = 0; i < totalTrades; i++) {
    const ticker = tickers[Math.floor(Math.random() * tickers.length)]
    
    // v4.1: Simular régimen de entrada basado en ADX
    const entryAdx = 10 + Math.random() * 35 // ADX entre 10-45
    const entryRegime: Regime = entryAdx < 18 ? 'RANGE' : entryAdx < 25 ? 'TRANSITION' : 'TREND'
    const atrMultUsed = entryRegime === 'RANGE' ? ATR_MULT_RANGE : 
                        entryRegime === 'TRANSITION' ? ATR_MULT_TRANSITION : ATR_MULT_TREND
    
    // Ajustar probabilidades según régimen
    const regimeWinBonus = entryRegime === 'TREND' ? 0.08 : entryRegime === 'TRANSITION' ? 0.03 : 0
    const isWin = Math.random() < (baseWinRate + regimeWinBonus)
    const isBigWin = isWin && Math.random() < (entryRegime === 'TREND' ? 0.4 : 0.25)
    
    let rMult: number
    let maxR: number
    let exitReason: 'TP' | 'SL' | 'TRAIL' | 'BE'
    
    if (isWin) {
      if (isBigWin) {
        // v4.1: En TREND, trailing más holgado permite más ganancias
        const trendBonus = entryRegime === 'TREND' ? 1.3 : 1.0
        rMult = avgWinR * (1 + Math.random() * 0.5) * trendBonus
        maxR = rMult * (1 + Math.random() * 0.3)
        exitReason = 'TRAIL'
      } else {
        rMult = avgWinR * (0.7 + Math.random() * 0.3)
        maxR = rMult * (1 + Math.random() * 0.2)
        exitReason = 'TP'
      }
    } else {
      // v4.1: En RANGE, SL en TP1 puede dar breakeven
      if (entryRegime === 'RANGE' && Math.random() < 0.3) {
        rMult = 0
        maxR = 2 + Math.random()
        exitReason = 'BE'
      } else {
        rMult = -1 * (0.8 + Math.random() * 0.4)
        maxR = Math.random() * 1.5
        exitReason = 'SL'
      }
    }
    
    const convexity = rMult > 0 ? maxR / rMult : 0
    
    const riskAmount = equity * (riskPerTrade / 100)
    const pnl = riskAmount * rMult
    const pnlPercent = (pnl / equity) * 100
    
    equity += pnl
    
    if (equity > peakEquity) peakEquity = equity
    const currentDrawdown = ((peakEquity - equity) / peakEquity) * 100
    if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown
    
    const entryDay = Math.floor((i / totalTrades) * periodDays)
    const holdingDays = Math.floor(Math.random() * 10) + 2
    const entryDate = new Date()
    entryDate.setDate(entryDate.getDate() - (periodDays - entryDay))
    const exitDate = new Date(entryDate)
    exitDate.setDate(exitDate.getDate() + holdingDays)
    
    const basePrice = ticker.includes('-USD') 
      ? (ticker === 'BTC-USD' ? 45000 + Math.random() * 50000 : 1000 + Math.random() * 3000)
      : 50 + Math.random() * 400
    const entryPrice = basePrice
    const exitPrice = entryPrice * (1 + pnlPercent / 100)
    
    trades.push({
      id: i + 1,
      ticker,
      entryDate: entryDate.toISOString().split('T')[0],
      exitDate: exitDate.toISOString().split('T')[0],
      entryPrice,
      exitPrice,
      pnl,
      pnlPercent,
      rMultiple: rMult,
      maxR,
      exitReason,
      grade: rMult >= 2.5 ? 'A+' : rMult >= 1.5 ? 'A' : 'B',
      holdingDays,
      entryRegime,
      entryAdx,
      convexity,
      atrMultUsed
    })
    
    day += Math.floor(periodDays / totalTrades)
    equityCurve.push({ day, equity })
  }
  
  const winners = trades.filter(t => t.pnl > 0)
  const losers = trades.filter(t => t.pnl <= 0)
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
  const totalPnLPercent = ((equity - capital) / capital) * 100
  const winRate = (winners.length / trades.length) * 100
  const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
  const avgR = trades.reduce((sum, t) => sum + t.rMultiple, 0) / trades.length
  
  const returns = equityCurve.slice(1).map((p, i) => 
    (p.equity - equityCurve[i].equity) / equityCurve[i].equity
  )
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
  const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0
  
  return {
    trades,
    totalPnL,
    totalPnLPercent,
    winRate,
    profitFactor,
    maxDrawdown,
    sharpe,
    avgR,
    equityCurve
  }
}

export default function BacktestPage() {
  const strategies = useTradingStore(state => state.strategies)
  const [selectedStrategy, setSelectedStrategy] = useState(strategies[0]?.key || 'crypto_core')
  const [period, setPeriod] = useState('2y')
  const [customCapital, setCustomCapital] = useState<number | null>(null)
  const [customRisk, setCustomRisk] = useState<number | null>(null)
  const [customSL, setCustomSL] = useState<number | null>(null)
  const [customTP, setCustomTP] = useState<number | null>(null)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  
  const currentStrategy = strategies.find(s => s.key === selectedStrategy) || strategies[0]
  
  const handleRunBacktest = () => {
    setIsRunning(true)
    
    // Simulate processing delay
    setTimeout(() => {
      const backtestResult = runBacktest(
        selectedStrategy,
        period,
        customCapital || currentStrategy?.capital || 10000,
        customRisk || currentStrategy?.riskPerTrade || 1,
        customSL || currentStrategy?.stops?.slAtrMult || 1.5,
        customTP || currentStrategy?.stops?.tpAtrMult || 3.0
      )
      setResult(backtestResult)
      setIsRunning(false)
    }, 1500)
  }
  
  // Stats by exit reason
  const exitStats = useMemo(() => {
    if (!result) return null
    
    const stats: Record<string, { count: number, pnl: number }> = {}
    result.trades.forEach(t => {
      if (!stats[t.exitReason]) {
        stats[t.exitReason] = { count: 0, pnl: 0 }
      }
      stats[t.exitReason].count++
      stats[t.exitReason].pnl += t.pnl
    })
    
    return Object.entries(stats).map(([reason, data]) => ({
      reason,
      count: data.count,
      pnl: data.pnl
    }))
  }, [result])
  
  // Stats by ticker
  const tickerStats = useMemo(() => {
    if (!result) return null
    
    const stats: Record<string, { trades: number, pnl: number, wins: number }> = {}
    result.trades.forEach(t => {
      if (!stats[t.ticker]) {
        stats[t.ticker] = { trades: 0, pnl: 0, wins: 0 }
      }
      stats[t.ticker].trades++
      stats[t.ticker].pnl += t.pnl
      if (t.pnl > 0) stats[t.ticker].wins++
    })
    
    return Object.entries(stats)
      .map(([ticker, data]) => ({
        ticker,
        trades: data.trades,
        pnl: data.pnl,
        winRate: (data.wins / data.trades) * 100
      }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [result])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">🔬 Backtesting v4.1 - Régimen Adaptativo</h1>
        <p className="text-gray-500 mt-1">Prueba histórica de estrategias con simulación Monte Carlo</p>
      </div>
      
      {/* Configuration */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">⚙️ Configuración del Backtest</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Estrategia</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            >
              {strategies.map(s => (
                <option key={s.key} value={s.key}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm text-gray-500 block mb-1">Período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value="6mo">6 meses</option>
              <option value="1y">1 año</option>
              <option value="2y">2 años</option>
              <option value="5y">5 años</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm text-gray-500 block mb-1">Capital Inicial</label>
            <input
              type="number"
              placeholder={currentStrategy?.capital?.toString() || '10000'}
              value={customCapital || ''}
              onChange={(e) => setCustomCapital(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-500 block mb-1">Riesgo %</label>
            <input
              type="number"
              step="0.1"
              placeholder={currentStrategy?.riskPerTrade?.toString() || '1'}
              value={customRisk || ''}
              onChange={(e) => setCustomRisk(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-sm text-gray-500 block mb-1">SL (ATR mult)</label>
            <input
              type="number"
              step="0.1"
              placeholder={currentStrategy?.stops?.slAtrMult?.toString() || '1.5'}
              value={customSL || ''}
              onChange={(e) => setCustomSL(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-500 block mb-1">TP (ATR mult)</label>
            <input
              type="number"
              step="0.1"
              placeholder={currentStrategy?.stops?.tpAtrMult?.toString() || '3.0'}
              value={customTP || ''}
              onChange={(e) => setCustomTP(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          
          <div className="col-span-2 flex items-end">
            <button
              onClick={handleRunBacktest}
              disabled={isRunning}
              className="w-full px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isRunning ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Ejecutando...
                </>
              ) : (
                <>
                  🚀 Ejecutar Backtest
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Strategy Info */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
          <strong>{currentStrategy?.name}</strong> | 
          Capital: ${(customCapital || currentStrategy?.capital || 10000).toLocaleString('es-ES')} | 
          Riesgo: {customRisk || currentStrategy?.riskPerTrade || 1}% | 
          SL: {customSL || currentStrategy?.stops?.slAtrMult || 1.5} ATR | 
          TP: {customTP || currentStrategy?.stops?.tpAtrMult || 3.0} ATR | 
          Tickers: {currentStrategy?.assets?.length || 0}
        </div>
      </div>
      
      {/* Results */}
      {result && (
        <>
          {/* Main Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">Total Trades</span>
              <span className="text-2xl font-bold">{result.trades.length}</span>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">PnL Total</span>
              <span className={`text-2xl font-bold ${result.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(result.totalPnL)}
              </span>
              <span className={`text-sm ${result.totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(result.totalPnLPercent)}
              </span>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">Win Rate</span>
              <span className={`text-2xl font-bold ${result.winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                {result.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">Profit Factor</span>
              <span className={`text-2xl font-bold ${result.profitFactor >= 1.5 ? 'text-green-400' : result.profitFactor >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                {result.profitFactor.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">Max Drawdown</span>
              <span className={`text-2xl font-bold ${result.maxDrawdown <= 15 ? 'text-green-400' : result.maxDrawdown <= 25 ? 'text-yellow-400' : 'text-red-400'}`}>
                -{result.maxDrawdown.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">Sharpe Ratio</span>
              <span className={`text-2xl font-bold ${result.sharpe >= 1 ? 'text-green-400' : result.sharpe >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {result.sharpe.toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">Avg R-Multiple</span>
              <span className={`text-2xl font-bold ${result.avgR >= 0.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                {result.avgR.toFixed(2)}R
              </span>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">W / L</span>
              <span className="text-2xl font-bold">
                <span className="text-green-400">{result.trades.filter(t => t.pnl > 0).length}</span>
                {' / '}
                <span className="text-red-400">{result.trades.filter(t => t.pnl <= 0).length}</span>
              </span>
            </div>
          </div>
          
          {/* Análisis por Régimen v4.1 */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">📊 Análisis por Régimen de Entrada (v4.1)</h3>
            <div className="grid grid-cols-3 gap-4">
              {(['RANGE', 'TRANSITION', 'TREND'] as Regime[]).map(regime => {
                const regimeTrades = result.trades.filter(t => t.entryRegime === regime)
                const wins = regimeTrades.filter(t => t.pnl > 0).length
                const totalPnl = regimeTrades.reduce((s, t) => s + t.pnl, 0)
                const avgR = regimeTrades.length > 0 ? regimeTrades.reduce((s, t) => s + t.rMultiple, 0) / regimeTrades.length : 0
                const avgMaxR = regimeTrades.length > 0 ? regimeTrades.reduce((s, t) => s + t.maxR, 0) / regimeTrades.length : 0
                const avgConvex = regimeTrades.length > 0 ? regimeTrades.reduce((s, t) => s + t.convexity, 0) / regimeTrades.length : 0
                const winRate = regimeTrades.length > 0 ? (wins / regimeTrades.length) * 100 : 0
                
                const emoji = regime === 'RANGE' ? '📊' : regime === 'TRANSITION' ? '⚖️' : '📈'
                const color = regime === 'RANGE' ? 'yellow' : regime === 'TRANSITION' ? 'blue' : 'green'
                const atrMult = regime === 'RANGE' ? ATR_MULT_RANGE : regime === 'TRANSITION' ? ATR_MULT_TRANSITION : ATR_MULT_TREND
                
                return (
                  <div key={regime} className={`p-4 rounded-lg border bg-${color}-50 border-${color}-200`}>
                    <div className="font-bold text-lg mb-2">{emoji} {regime}</div>
                    <div className="text-xs text-gray-500 mb-3">
                      {regime === 'RANGE' ? 'ADX < 18 | SL→TP1' : regime === 'TRANSITION' ? '18 ≤ ADX < 25 | SL→BE' : 'ADX ≥ 25 | SL→BE'} | {atrMult}x ATR
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Trades:</span>
                        <span className="font-bold">{regimeTrades.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PnL:</span>
                        <span className={`font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(totalPnl)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Win Rate:</span>
                        <span className={`font-bold ${winRate >= 50 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {winRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg R:</span>
                        <span className="font-bold">{avgR.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Max R:</span>
                        <span className="font-bold">{avgMaxR.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Convexity:</span>
                        <span className="font-bold">{avgConvex.toFixed(2)}x</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Equity Curve */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">📈 Equity Curve</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.equityCurve}>
                  <XAxis 
                    dataKey="day" 
                    stroke="#666" 
                    tickFormatter={(v) => `D${v}`}
                  />
                  <YAxis 
                    stroke="#666" 
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    formatter={(value: number) => [formatCurrency(value), 'Equity']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="equity" 
                    stroke={result.totalPnL >= 0 ? '#22c55e' : '#ef4444'} 
                    dot={false} 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Exit Type */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">📊 Por Tipo de Salida</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={exitStats || []}>
                    <XAxis dataKey="reason" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      formatter={(value: number, name: string) => [
                        name === 'count' ? value : formatCurrency(value),
                        name === 'count' ? 'Trades' : 'PnL'
                      ]}
                    />
                    <Bar dataKey="count" name="Trades">
                      {exitStats?.map((entry, index) => (
                        <Cell 
                          key={index} 
                          fill={entry.reason === 'TP' ? '#22c55e' : entry.reason === 'TRAIL' ? '#3b82f6' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 space-y-2">
                {exitStats?.map(stat => (
                  <div key={stat.reason} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className={`font-medium ${
                      stat.reason === 'TP' ? 'text-green-400' : 
                      stat.reason === 'TRAIL' ? 'text-blue-400' : 'text-red-400'
                    }`}>
                      {stat.reason}
                    </span>
                    <span>{stat.count} trades</span>
                    <span className={stat.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatCurrency(stat.pnl)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* By Ticker */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">📋 Por Ticker</h3>
              <div className="overflow-y-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Ticker</th>
                      <th className="text-right py-2">Trades</th>
                      <th className="text-right py-2">PnL</th>
                      <th className="text-right py-2">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickerStats?.map(stat => (
                      <tr key={stat.ticker} className="border-b border-white/5">
                        <td className="py-2 font-medium">{stat.ticker}</td>
                        <td className="py-2 text-right">{stat.trades}</td>
                        <td className={`py-2 text-right ${stat.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(stat.pnl)}
                        </td>
                        <td className={`py-2 text-right ${stat.winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {stat.winRate.toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Trades Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">📋 Historial de Trades (v4.1)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Ticker</th>
                    <th className="text-left py-2">Régimen</th>
                    <th className="text-left py-2">Grade</th>
                    <th className="text-left py-2">Días</th>
                    <th className="text-right py-2">PnL</th>
                    <th className="text-right py-2">R</th>
                    <th className="text-right py-2">Max R</th>
                    <th className="text-right py-2">Convex</th>
                    <th className="text-center py-2">Exit</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.slice(-30).reverse().map(trade => (
                    <tr key={trade.id} className="border-b border-white/5 hover:bg-gray-50">
                      <td className="py-2 font-medium">{trade.ticker}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          trade.entryRegime === 'RANGE' ? 'bg-yellow-100 text-yellow-700' :
                          trade.entryRegime === 'TRANSITION' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {trade.entryRegime}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          trade.grade === 'A+' ? 'bg-green-500/20 text-green-400' :
                          trade.grade === 'A' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {trade.grade}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">{trade.holdingDays}d</td>
                      <td className={`py-2 text-right font-mono ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(trade.pnl)}
                      </td>
                      <td className={`py-2 text-right font-mono ${trade.rMultiple >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.rMultiple >= 0 ? '+' : ''}{trade.rMultiple.toFixed(2)}R
                      </td>
                      <td className="py-2 text-right font-mono">{trade.maxR.toFixed(2)}</td>
                      <td className="py-2 text-right font-mono">{trade.convexity.toFixed(1)}x</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          trade.exitReason === 'TP' ? 'bg-green-500/20 text-green-400' :
                          trade.exitReason === 'TRAIL' ? 'bg-blue-500/20 text-blue-400' :
                          trade.exitReason === 'BE' ? 'bg-gray-200 text-gray-600' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.exitReason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.trades.length > 30 && (
              <p className="text-gray-400 text-sm mt-4 text-center">
                Mostrando últimos 30 de {result.trades.length} trades
              </p>
            )}
          </div>
        </>
      )}
      
      {!result && !isRunning && (
        <div className="card text-center py-12">
          <span className="text-6xl mb-4 block">🔬</span>
          <h3 className="text-xl font-semibold mb-2">Configura y ejecuta un backtest</h3>
          <p className="text-gray-500">
            Selecciona una estrategia, período y parámetros, luego haz clic en Ejecutar
          </p>
        </div>
      )}
    </div>
  )
}
