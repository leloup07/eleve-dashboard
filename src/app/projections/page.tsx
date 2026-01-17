'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, ReferenceLine, BarChart, Bar, Cell
} from 'recharts'
import { useTradingStore } from '@/stores/tradingStore'
import { formatCurrency, formatPercent } from '@/lib/formatters'

// Tipos
interface MonteCarloResult {
  paths: number[][]
  percentiles: { p5: number, p25: number, p50: number, p75: number, p95: number }
  finalPrices: number[]
  distribution: { price: number, count: number }[]
}

interface TechnicalLevels {
  supports: number[]
  resistances: number[]
  fibonacci: { level: string, price: number }[]
  pivots: { name: string, price: number }[]
}

interface GoNoGoDecision {
  signal: 'GO' | 'WATCH' | 'NO-GO'
  color: 'green' | 'yellow' | 'red'
  zone: string
  zoneColor: string
  reason: string
  tradePlan: {
    action: string
    entries?: number[]
    stop?: number
    tp1?: number
    tp2?: number
    tp3?: number
    confirmation?: string
  } | null
  probabilities: {
    probDown5: number
    probUp5: number
    probR1: number
    medianChange: number
  }
}

// Constantes
const CRYPTO_TICKERS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD']
const STOCK_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BROS', 'HIMS']
const ALL_TICKERS = [...CRYPTO_TICKERS, ...STOCK_TICKERS]

// Función para generar datos simulados
// Función para obtener datos reales de Yahoo Finance
async function fetchRealPriceData(ticker: string): Promise<{ current: number, history: number[], volatility: number }> {
  try {
    const url = `/api/indicators?ticker=${ticker}&interval=1h&range=30d`
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 }
    })
    
    if (!response.ok) throw new Error('Yahoo API error')
    
    const json = await response.json()
    const result = json
    
    if (!result?.indicators?.quote?.[0]) throw new Error('No data')
    
    const closes = result.data.map((d: any) => d.close).filter((c: number | null) => c !== null) as number[]
    const current = closes[closes.length - 1]
    
    const returns: number[] = []
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i-1]) / closes[i-1])
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)
    
    return { current, history: closes, volatility }
  } catch (error) {
    console.error('Error fetching price data:', error)
    const d: Record<string, { price: number, vol: number }> = {
      'BTC-USD': { price: 104000, vol: 0.025 },
      'ETH-USD': { price: 3300, vol: 0.03 },
      'SOL-USD': { price: 210, vol: 0.04 },
      'AAPL': { price: 230, vol: 0.015 },
      'MSFT': { price: 430, vol: 0.012 },
      'NVDA': { price: 140, vol: 0.025 },
    }
    const def = d[ticker] || { price: 100, vol: 0.02 }
    const history: number[] = []
    let price = def.price * 0.9
    for (let i = 0; i < 180; i++) { price *= (1 + (Math.random() - 0.48) * def.vol); history.push(price) }
    return { current: price, history, volatility: def.vol }
  }
}

function runMonteCarlo(currentPrice: number, volatility: number, days: number = 30, simulations: number = 1000): MonteCarloResult {
  const mu = 0.0001 // Small positive drift
  const sigma = volatility
  
  const paths: number[][] = []
  const finalPrices: number[] = []
  
  for (let sim = 0; sim < simulations; sim++) {
    const path: number[] = [currentPrice]
    let price = currentPrice
    
    for (let day = 1; day < days; day++) {
      const randomReturn = mu + sigma * (Math.random() * 2 - 1) * Math.sqrt(1/252)
      price = price * (1 + randomReturn)
      path.push(price)
    }
    
    paths.push(path)
    finalPrices.push(price)
  }
  
  // Sort for percentiles
  finalPrices.sort((a, b) => a - b)
  
  const percentiles = {
    p5: finalPrices[Math.floor(simulations * 0.05)],
    p25: finalPrices[Math.floor(simulations * 0.25)],
    p50: finalPrices[Math.floor(simulations * 0.50)],
    p75: finalPrices[Math.floor(simulations * 0.75)],
    p95: finalPrices[Math.floor(simulations * 0.95)]
  }
  
  // Distribution histogram
  const min = finalPrices[0]
  const max = finalPrices[finalPrices.length - 1]
  const bucketSize = (max - min) / 50
  const distribution: { price: number, count: number }[] = []
  
  for (let i = 0; i < 50; i++) {
    const bucketStart = min + i * bucketSize
    const bucketEnd = bucketStart + bucketSize
    const count = finalPrices.filter(p => p >= bucketStart && p < bucketEnd).length
    distribution.push({ price: (bucketStart + bucketEnd) / 2, count })
  }
  
  return { paths, percentiles, finalPrices, distribution }
}

// Technical levels calculation
function calculateLevels(history: number[], currentPrice: number): TechnicalLevels {
  // Find pivot highs and lows
  const pivotHighs: number[] = []
  const pivotLows: number[] = []
  
  for (let i = 5; i < history.length - 5; i++) {
    const window = history.slice(i - 5, i + 6)
    const max = Math.max(...window)
    const min = Math.min(...window)
    
    if (history[i] === max && !pivotHighs.includes(history[i])) {
      pivotHighs.push(history[i])
    }
    if (history[i] === min && !pivotLows.includes(history[i])) {
      pivotLows.push(history[i])
    }
  }
  
  const supports = pivotLows.filter(p => p < currentPrice).sort((a, b) => b - a).slice(0, 3)
  const resistances = pivotHighs.filter(p => p > currentPrice).sort((a, b) => a - b).slice(0, 3)
  
  // Fibonacci
  const recent = history.slice(-60)
  const high = Math.max(...recent)
  const low = Math.min(...recent)
  const diff = high - low
  
  const fibonacci = [
    { level: '0%', price: high },
    { level: '23.6%', price: high - diff * 0.236 },
    { level: '38.2%', price: high - diff * 0.382 },
    { level: '50%', price: high - diff * 0.5 },
    { level: '61.8%', price: high - diff * 0.618 },
    { level: '78.6%', price: high - diff * 0.786 },
    { level: '100%', price: low },
    { level: '127.2%', price: high + diff * 0.272 },
    { level: '161.8%', price: high + diff * 0.618 }
  ]
  
  // Pivots
  const lastDay = history.slice(-1)[0]
  const prevHigh = Math.max(...history.slice(-20))
  const prevLow = Math.min(...history.slice(-20))
  const pivot = (prevHigh + prevLow + lastDay) / 3
  
  const pivots = [
    { name: 'R3', price: prevHigh + 2 * (pivot - prevLow) },
    { name: 'R2', price: pivot + (prevHigh - prevLow) },
    { name: 'R1', price: 2 * pivot - prevLow },
    { name: 'Pivot', price: pivot },
    { name: 'S1', price: 2 * pivot - prevHigh },
    { name: 'S2', price: pivot - (prevHigh - prevLow) },
    { name: 'S3', price: prevLow - 2 * (prevHigh - pivot) }
  ]
  
  return { supports, resistances, fibonacci, pivots }
}

// GO/NO-GO decision
function calculateGoNoGo(
  currentPrice: number, 
  levels: TechnicalLevels, 
  monteCarlo: MonteCarloResult
): GoNoGoDecision {
  const { finalPrices, percentiles } = monteCarlo
  const { supports, resistances } = levels
  
  const probDown5 = (finalPrices.filter(p => p < currentPrice * 0.95).length / finalPrices.length) * 100
  const probUp5 = (finalPrices.filter(p => p > currentPrice * 1.05).length / finalPrices.length) * 100
  const probR1 = resistances[0] 
    ? (finalPrices.filter(p => p >= resistances[0]).length / finalPrices.length) * 100 
    : 0
  const medianChange = ((percentiles.p50 - currentPrice) / currentPrice) * 100
  
  const s1 = supports[0] || currentPrice * 0.95
  const s2 = supports[1] || currentPrice * 0.90
  const r1 = resistances[0] || currentPrice * 1.05
  
  const buyZoneTop = s1 * 1.01
  const sellZoneBottom = r1 * 0.99
  
  let zone: string, zoneColor: string
  if (currentPrice <= buyZoneTop) {
    zone = 'BUY ZONE'
    zoneColor = 'green'
  } else if (currentPrice >= sellZoneBottom) {
    zone = 'SELL/TP ZONE'
    zoneColor = 'red'
  } else {
    zone = 'NO-TRADE ZONE'
    zoneColor = 'yellow'
  }
  
  let signal: 'GO' | 'WATCH' | 'NO-GO'
  let color: 'green' | 'yellow' | 'red'
  let reason: string
  let tradePlan: GoNoGoDecision['tradePlan'] = null
  
  if (probDown5 >= 35 && probUp5 <= 25) {
    if (zone === 'BUY ZONE') {
      signal = 'WATCH'
      color = 'yellow'
      reason = `Sesgo bajista (↓${probDown5.toFixed(0)}% vs ↑${probUp5.toFixed(0)}%) pero en soporte. Esperar confirmación.`
      tradePlan = {
        action: 'ESPERAR CONFIRMACIÓN',
        entries: [s1, (s1 + s2) / 2, s2],
        stop: s2 * 0.98,
        tp1: currentPrice,
        tp2: r1 * 0.98,
        confirmation: '2/3: RSI sale sobreventa, cierre>EMA20, doble suelo'
      }
    } else {
      signal = 'NO-GO'
      color = 'red'
      reason = `Sesgo bajista (↓${probDown5.toFixed(0)}% vs ↑${probUp5.toFixed(0)}%) en zona neutra. Esperar.`
    }
  } else if (zone === 'BUY ZONE' && probDown5 < 50) {
    signal = 'GO'
    color = 'green'
    reason = 'Precio en zona de soporte con probabilidad razonable.'
    tradePlan = {
      action: 'ENTRADA ESCALONADA',
      entries: [s1, (s1 + s2) / 2, s2],
      stop: s2 * 0.97,
      tp1: currentPrice * 1.02,
      tp2: r1 * 0.98,
      tp3: r1,
      confirmation: 'Opcional: RSI>30, cierre>EMA20'
    }
  } else if (zone === 'NO-TRADE ZONE') {
    signal = 'WATCH'
    color = 'yellow'
    reason = `Precio entre S/R. Esperar entrada a $${s1.toLocaleString('es-ES', { maximumFractionDigits: 0 })} o ruptura de $${r1.toLocaleString('es-ES', { maximumFractionDigits: 0 })}.`
    tradePlan = {
      action: 'CONFIGURAR ALERTAS',
      entries: [s1],
      tp1: r1
    }
  } else if (zone === 'SELL/TP ZONE') {
    signal = 'WATCH'
    color = 'yellow'
    reason = 'Precio en resistencia. No abrir longs nuevos.'
  } else {
    signal = 'WATCH'
    color = 'yellow'
    reason = 'Condiciones mixtas.'
  }
  
  return {
    signal,
    color,
    zone,
    zoneColor,
    reason,
    tradePlan,
    probabilities: { probDown5, probUp5, probR1, medianChange }
  }
}

export default function ProjectionsPage() {
  const strategies = useTradingStore(state => state.strategies)
  const [selectedTicker, setSelectedTicker] = useState('BTC-USD')
  const [projectionDays, setProjectionDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [priceData, setPriceData] = useState<{ current: number, history: number[], volatility: number } | null>(null)
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloResult | null>(null)
  const [levels, setLevels] = useState<TechnicalLevels | null>(null)
  const [decision, setDecision] = useState<GoNoGoDecision | null>(null)
  
  // Get all tickers from strategies
  const allTickers = useMemo(() => {
    const tickers = new Set<string>()
    strategies.forEach(s => s.assets.forEach(a => tickers.add(a)))
    return Array.from(tickers).sort()
  }, [strategies])
  
  // Run analysis when ticker or days change
  useEffect(() => {
    setLoading(true)
    
    const loadData = async () => {
      const data = await fetchRealPriceData(selectedTicker)
      const mc = runMonteCarlo(data.current, data.volatility, projectionDays)
      const lvls = calculateLevels(data.history, data.current)
      const dec = calculateGoNoGo(data.current, lvls, mc)
      
      setPriceData(data)
      setMonteCarlo(mc)
      setLevels(lvls)
      setDecision(dec)
      setLoading(false)
    }
    loadData()
  }, [selectedTicker, projectionDays])
  
  // Prepare chart data for percentile paths
  const percentilePaths = useMemo(() => {
    if (!monteCarlo || !priceData) return []
    
    const { paths, percentiles } = monteCarlo
    const data: { day: number, p5: number, p25: number, p50: number, p75: number, p95: number }[] = []
    
    for (let day = 0; day < projectionDays; day++) {
      const dayPrices = paths.map(p => p[day]).sort((a, b) => a - b)
      data.push({
        day,
        p5: dayPrices[Math.floor(dayPrices.length * 0.05)],
        p25: dayPrices[Math.floor(dayPrices.length * 0.25)],
        p50: dayPrices[Math.floor(dayPrices.length * 0.50)],
        p75: dayPrices[Math.floor(dayPrices.length * 0.75)],
        p95: dayPrices[Math.floor(dayPrices.length * 0.95)]
      })
    }
    
    return data
  }, [monteCarlo, priceData, projectionDays])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">🔮 Proyecciones de Precio</h1>
          <p className="text-gray-500 mt-1">Análisis técnico + Monte Carlo + GO/NO-GO</p>
        </div>
        
        <div className="flex gap-4">
          <select
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
          >
            <optgroup label="Crypto">
              {CRYPTO_TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
            </optgroup>
            <optgroup label="Stocks">
              {STOCK_TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
            </optgroup>
          </select>
          
          <select
            value={projectionDays}
            onChange={(e) => setProjectionDays(Number(e.target.value))}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
          >
            <option value={7}>7 días</option>
            <option value={14}>14 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-500">Analizando {selectedTicker}...</div>
        </div>
      ) : priceData && monteCarlo && levels && decision && (
        <>
          {/* GO/NO-GO Decision */}
          <div className={`card border-2 ${
            decision.color === 'green' ? 'border-green-500 bg-green-500/10' :
            decision.color === 'red' ? 'border-red-500 bg-red-500/10' :
            'border-yellow-500 bg-yellow-500/10'
          }`}>
            <h3 className="text-lg font-semibold mb-4">🚦 Decisión de Trading</h3>
            
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <span className={`text-4xl font-bold ${
                  decision.color === 'green' ? 'text-green-400' :
                  decision.color === 'red' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {decision.signal === 'GO' ? '🟢' : decision.signal === 'NO-GO' ? '🔴' : '🟡'} {decision.signal}
                </span>
              </div>
              
              <div className="flex gap-4">
                <div className="text-center">
                  <span className="text-gray-500 text-sm block">P(↓5%)</span>
                  <span className="text-xl font-bold text-red-400">{decision.probabilities.probDown5.toFixed(0)}%</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-500 text-sm block">P(↑5%)</span>
                  <span className="text-xl font-bold text-green-400">{decision.probabilities.probUp5.toFixed(0)}%</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-500 text-sm block">P(R1)</span>
                  <span className="text-xl font-bold text-blue-400">{decision.probabilities.probR1.toFixed(0)}%</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-500 text-sm block">Mediana</span>
                  <span className={`text-xl font-bold ${decision.probabilities.medianChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {decision.probabilities.medianChange >= 0 ? '+' : ''}{decision.probabilities.medianChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-black/20 rounded-lg mb-4">
              <span className={`font-bold ${
                decision.zoneColor === 'green' ? 'text-green-400' :
                decision.zoneColor === 'red' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {decision.zone}
              </span>
              <span className="text-gray-500 mx-2">|</span>
              <span className="text-gray-600">{decision.reason}</span>
            </div>
            
            {decision.tradePlan && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">{decision.tradePlan.action}</h4>
                  {decision.tradePlan.entries && (
                    <div className="space-y-1">
                      <span className="text-gray-500 text-sm">Entradas:</span>
                      {decision.tradePlan.entries.map((e, i) => (
                        <p key={i} className="text-green-400">E{i + 1}: ${e.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>
                      ))}
                    </div>
                  )}
                </div>
                
                {decision.tradePlan.stop && (
                  <div>
                    <span className="text-gray-500 text-sm">Stop Loss:</span>
                    <p className="text-red-400 font-bold">${decision.tradePlan.stop.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>
                    {decision.tradePlan.confirmation && (
                      <p className="text-gray-400 text-xs mt-2">{decision.tradePlan.confirmation}</p>
                    )}
                  </div>
                )}
                
                <div>
                  <span className="text-gray-500 text-sm">Take Profits:</span>
                  {decision.tradePlan.tp1 && <p className="text-blue-400">TP1: ${decision.tradePlan.tp1.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>}
                  {decision.tradePlan.tp2 && <p className="text-blue-400">TP2: ${decision.tradePlan.tp2.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>}
                  {decision.tradePlan.tp3 && <p className="text-blue-400">TP3: ${decision.tradePlan.tp3.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>}
                </div>
              </div>
            )}
          </div>
          
          {/* Price Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">Precio Actual</span>
              <span className="text-2xl font-bold">${priceData.current.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <span className="text-gray-500 text-sm">Proyección 50%</span>
              <span className={`text-2xl font-bold ${monteCarlo.percentiles.p50 >= priceData.current ? 'text-green-400' : 'text-red-400'}`}>
                ${monteCarlo.percentiles.p50.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
              </span>
              <span className={`text-sm ${monteCarlo.percentiles.p50 >= priceData.current ? 'text-green-400' : 'text-red-400'}`}>
                {((monteCarlo.percentiles.p50 - priceData.current) / priceData.current * 100).toFixed(1)}%
              </span>
            </div>
            {levels.resistances[0] && (
              <div className="bg-white rounded-xl border p-4">
                <span className="text-gray-500 text-sm">R1 ${levels.resistances[0].toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                <span className="text-xl font-bold text-blue-400">{decision.probabilities.probR1.toFixed(0)}% prob</span>
              </div>
            )}
            {levels.supports[0] && (
              <div className="bg-white rounded-xl border p-4">
                <span className="text-gray-500 text-sm">S1 ${levels.supports[0].toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                <span className="text-xl font-bold text-yellow-400">
                  {(100 - (monteCarlo.finalPrices.filter(p => p >= levels.supports[0]).length / monteCarlo.finalPrices.length * 100)).toFixed(0)}% prob caer
                </span>
              </div>
            )}
          </div>
          
          {/* Monte Carlo Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">🎲 Simulación Monte Carlo ({projectionDays} días)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={percentilePaths}>
                  <XAxis dataKey="day" stroke="#666" tickFormatter={(v) => `D${v}`} />
                  <YAxis 
                    stroke="#666" 
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `$${v.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    formatter={(value: number) => [`$${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`, '']}
                  />
                  <Area type="monotone" dataKey="p95" stroke="transparent" fill="rgba(34,197,94,0.1)" />
                  <Area type="monotone" dataKey="p75" stroke="transparent" fill="rgba(34,197,94,0.2)" />
                  <Area type="monotone" dataKey="p50" stroke="transparent" fill="rgba(34,197,94,0.1)" />
                  <Area type="monotone" dataKey="p25" stroke="transparent" fill="rgba(239,68,68,0.2)" />
                  <Area type="monotone" dataKey="p5" stroke="transparent" fill="rgba(239,68,68,0.1)" />
                  <Line type="monotone" dataKey="p50" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p75" stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="p25" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  <ReferenceLine y={priceData.current} stroke="#fbbf24" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-5 gap-4 mt-4 text-center">
              {[
                { label: '5%', value: monteCarlo.percentiles.p5, color: 'text-red-400' },
                { label: '25%', value: monteCarlo.percentiles.p25, color: 'text-red-300' },
                { label: '50%', value: monteCarlo.percentiles.p50, color: 'text-white' },
                { label: '75%', value: monteCarlo.percentiles.p75, color: 'text-green-300' },
                { label: '95%', value: monteCarlo.percentiles.p95, color: 'text-green-400' }
              ].map(p => (
                <div key={p.label}>
                  <span className="text-gray-500 text-sm block">{p.label}</span>
                  <span className={`font-bold ${p.color}`}>
                    ${p.value.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`text-xs block ${((p.value - priceData.current) / priceData.current) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {((p.value - priceData.current) / priceData.current * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">📊 Distribución de Precios Finales</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monteCarlo.distribution}>
                  <XAxis 
                    dataKey="price" 
                    stroke="#666" 
                    tickFormatter={(v) => `$${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
                  />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6">
                    {monteCarlo.distribution.map((entry, index) => (
                      <Cell 
                        key={index} 
                        fill={entry.price >= priceData.current ? '#22c55e' : '#ef4444'} 
                        opacity={0.7}
                      />
                    ))}
                  </Bar>
                  <ReferenceLine x={priceData.current} stroke="#fbbf24" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Technical Levels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* S/R */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">📐 Soportes / Resistencias</h3>
              <div className="space-y-2">
                {levels.resistances.map((r, i) => (
                  <div key={`r${i}`} className="flex justify-between items-center p-2 bg-red-500/10 rounded">
                    <span className="text-red-400">R{i + 1}</span>
                    <span className="font-mono">${r.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
                    <span className="text-gray-500 text-sm">
                      {(monteCarlo.finalPrices.filter(p => p >= r).length / monteCarlo.finalPrices.length * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
                
                <div className="flex justify-between items-center p-2 bg-yellow-500/20 rounded border border-yellow-500/50">
                  <span className="text-yellow-400">📍 Actual</span>
                  <span className="font-mono font-bold">${priceData.current.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
                </div>
                
                {levels.supports.map((s, i) => (
                  <div key={`s${i}`} className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                    <span className="text-green-400">S{i + 1}</span>
                    <span className="font-mono">${s.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Fibonacci */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">📐 Fibonacci</h3>
              <div className="space-y-1 text-sm">
                {levels.fibonacci
                  .filter(f => f.price > priceData.current * 0.8 && f.price < priceData.current * 1.3)
                  .map((f, i) => (
                    <div key={i} className={`flex justify-between items-center p-2 rounded ${
                      Math.abs(f.price - priceData.current) / priceData.current < 0.02 
                        ? 'bg-yellow-500/20 border border-yellow-500/50' 
                        : 'bg-gray-50'
                    }`}>
                      <span className="text-gray-500">{f.level}</span>
                      <span className="font-mono">${f.price.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Pivots */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">📐 Puntos Pivote</h3>
              <div className="space-y-1 text-sm">
                {levels.pivots.map((p, i) => (
                  <div key={i} className={`flex justify-between items-center p-2 rounded ${
                    p.name === 'Pivot' 
                      ? 'bg-blue-500/20 border border-blue-500/50' 
                      : p.name.startsWith('R') 
                      ? 'bg-red-500/10' 
                      : 'bg-green-500/10'
                  }`}>
                    <span className={
                      p.name === 'Pivot' ? 'text-blue-400' :
                      p.name.startsWith('R') ? 'text-red-400' : 'text-green-400'
                    }>{p.name}</span>
                    <span className="font-mono">${p.price.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
