'use client'
import { useState, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'

interface Position {
  ticker: string
  strategy: string
  entry: number
  sl: number
  tp: number
  size: number
  invested_amount: number
  current_price?: number
  unrealized_pnl?: number
  unrealized_pnl_percent?: number
  r_multiple?: number
  open_date: string
  reason: string
  grade: string
  rsi?: number
  adx?: number
  volume?: number
  ema20?: number
  ema50?: number
  atr?: number
  riskPerShare?: number
}

interface ClosedTrade {
  ticker: string
  strategy: string
  result: string
  entry: number
  exit: number
  sl: number
  tp: number
  size: number
  invested_amount: number
  pnl: number
  pnl_percent?: number
  r_multiple: number
  holding_days: number
  close_date: string
  exit_time: string
  reason: string
  grade: string
  rsi?: number
  adx?: number
  volume?: number
  ema20?: number
  ema50?: number
  atr?: number
  riskPerShare?: number
}

// Tipos para filtros y ordenamiento
type SortField = 'date' | 'ticker' | 'pnl' | 'r_multiple' | 'strategy'
type SortOrder = 'asc' | 'desc'
type ResultFilter = 'all' | 'winners' | 'losers' | 'breakeven'
type StrategyFilter = 'all' | 'crypto' | 'large_caps' | 'small_caps' | 'vwap_reversion' | 'intraday_1pct'

// Helper para detectar si es stock
const isStock = (ticker: string) => {
  const cryptos = ["BTC","ETH","SOL","XRP","AVAX","LINK","MATIC","DOT","UNI","ATOM","LTC","FIL","FET","AAVE","INJ","BTC-USD","ETH-USD","SOL-USD","LTC-USD","FIL-USD","FET-USD","AAVE-USD","INJ-USD"]
  return !cryptos.some(c => ticker.toUpperCase().includes(c))
}

// Formatear size
const formatSize = (size: number, ticker: string) => {
  if (isStock(ticker)) return Math.floor(size).toString()
  return size < 1 ? size.toFixed(4) : size.toFixed(2)
}

// Formatear fecha/hora
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const day = date.getDate()
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const month = months[date.getMonth()]
  const hours = date.getHours().toString().padStart(2, '0')
  const mins = date.getMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${hours}:${mins}`
}

// ============================================
// NORMALIZACIÓN DE DATOS - FIX para $0, NaN, decimales
// ============================================
const normalizePosition = (p: any): Position => {
  const entry = p.entry || 0
  const size = p.size || 0
  const invested = (p.invested_amount && p.invested_amount > 0) ? p.invested_amount : entry * size
  
  return {
    ...p,
    entry,
    size,
    invested_amount: invested,
    rsi: p.rsi ? Number(p.rsi) : undefined,
    adx: p.adx ? Number(p.adx) : undefined,
    volume: p.volume ? Number(p.volume) : undefined,
  }
}

const normalizeTrade = (t: any): ClosedTrade => {
  const entry = t.entry || 0
  const exit = t.exit || entry  // Si no hay exit, usar entry (BE)
  const size = t.size || 0
  const invested = (t.invested_amount && t.invested_amount > 0) ? t.invested_amount : entry * size
  const pnl = t.pnl || 0
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0
  
  return {
    ...t,
    entry,
    exit,
    size,
    invested_amount: invested,
    pnl,
    pnl_percent: pnlPercent,
    rsi: t.rsi ? Number(t.rsi) : undefined,
    adx: t.adx ? Number(t.adx) : undefined,
    volume: t.volume ? Number(t.volume) : undefined,
  }
}

// Formatear indicadores (1 decimal, N/A si no hay)
const fmtIndicator = (val: number | undefined, decimals: number = 1): string => {
  if (val === undefined || val === null || isNaN(val)) return 'N/A'
  return val.toFixed(decimals)
}

// Análisis de posición abierta
const generatePositionAnalysis = (p: Position) => {
  const grade = p.grade || 'B'
  const rsi = p.rsi
  const adx = p.adx
  const rsiOK = rsi !== undefined && rsi >= 40 && rsi <= 70
  const adxOK = adx !== undefined && adx >= 25
  
  return {
    entryAnalysis: `${grade === "A" || grade === "A+" || grade === "B" ? "✅" : "⚠️"} Setup Grado ${grade}

📊 Indicadores de entrada:
• RSI: ${fmtIndicator(rsi)} ${rsi !== undefined ? (rsiOK ? "✅ zona ideal" : "⚠️ fuera de rango") : ""}
• ADX: ${fmtIndicator(adx)} ${adx !== undefined ? (adxOK ? "✅ tendencia fuerte" : "⚠️ tendencia débil") : ""}
• Volumen: ${fmtIndicator(p.volume, 0)}%
• EMA20: ${p.ema20 ? `$${p.ema20.toFixed(2)}` : "N/A"}
• EMA50: ${p.ema50 ? `$${p.ema50.toFixed(2)}` : "N/A"}
• ATR: ${p.atr ? `$${p.atr.toFixed(2)}` : "N/A"}
• R($): ${p.riskPerShare ? `$${p.riskPerShare.toFixed(2)}` : "N/A"}

🎯 Razón: ${p.reason || 'Setup cumplió condiciones de entrada'}`,
    
    riskManagement: `📏 Gestión de Riesgo:
• Entry: $${p.entry?.toFixed(2)}
• Stop Loss: $${p.sl?.toFixed(2)} (${((p.sl - p.entry) / p.entry * 100).toFixed(1)}%)
• Take Profit: $${p.tp?.toFixed(2)} (${((p.tp - p.entry) / p.entry * 100).toFixed(1)}%)
• Size: ${formatSize(p.size, p.ticker)} unidades
• Inversión: $${p.invested_amount?.toLocaleString('es-ES')}`
  }
}

// Análisis de trade cerrado
const generateTradeAnalysis = (t: ClosedTrade) => {
  const grade = t.grade || 'B'
  const rsi = t.rsi
  const adx = t.adx
  const isWin = t.result === "TP" || t.result === "TP1" || t.result === "TP2" || t.result === "TRAIL"
  const isSL = t.result === "SL"
  const rsiOK = rsi !== undefined && rsi >= 40 && rsi <= 70
  const adxOK = adx !== undefined && adx >= 25
  const pnlPct = t.pnl_percent || (t.invested_amount > 0 ? (t.pnl / t.invested_amount) * 100 : 0)
  
  return {
    entryReason: `${grade === "A" || grade === "A+" || grade === "B" ? "✅" : "⚠️"} Setup Grado ${grade}

📊 Indicadores al momento de entrada:
• RSI: ${fmtIndicator(rsi)} ${rsi !== undefined ? (rsiOK ? "✅ zona ideal" : "⚠️ fuera de rango") : ""}
• ADX: ${fmtIndicator(adx)} ${adx !== undefined ? (adxOK ? "✅ tendencia fuerte" : "⚠️ tendencia débil") : ""}
• Volumen: ${fmtIndicator(t.volume, 0)}%
• EMA20: ${t.ema20 ? `$${t.ema20.toFixed(2)}` : "N/A"}
• EMA50: ${t.ema50 ? `$${t.ema50.toFixed(2)}` : "N/A"}
• ATR: ${t.atr ? `$${t.atr.toFixed(2)}` : "N/A"}
• R($): ${t.riskPerShare ? `$${t.riskPerShare.toFixed(2)}` : "N/A"}

🎯 Razón original: ${t.reason || 'Setup cumplió condiciones'}`,
    
    exitReason: `${isWin ? "✅" : isSL ? "🛑" : "↔️"} ${isWin ? `Take Profit (${t.result})` : isSL ? "Stop Loss ejecutado" : "Breakeven"}
• Precio de entrada: $${t.entry?.toFixed(2)}
• Precio de salida: $${t.exit?.toFixed(2)}
• Movimiento: ${t.entry > 0 ? ((t.exit - t.entry) / t.entry * 100).toFixed(2) : '0'}%
• Duración: ${t.holding_days || 1} día(s)`,
    
    whatWentWell: isWin ? `✅ Lo que funcionó bien:
• Setup grado ${grade} cumplió expectativas
• Entrada ejecutada según plan
• ${t.result} alcanzado (+${(t.r_multiple || 0).toFixed(2)}R)
• Gestión de riesgo correcta
• Disciplina en mantener la posición` 
    : `✅ Lo que funcionó bien:
• Stop Loss protegió el capital
• Pérdida controlada a ${(t.r_multiple || 0).toFixed(2)}R
• No se promedió a la baja
• Disciplina al aceptar la pérdida
• Sistema funcionó como diseñado`,
    
    whatCouldBeBetter: (() => {
      const issues: string[] = []
      if (adx !== undefined && adx < 25) issues.push("• ADX bajo - esperar tendencia más fuerte")
      if (rsi !== undefined && (rsi < 40 || rsi > 70)) issues.push("• RSI fuera de zona ideal")
      if (isSL) {
        issues.push("• Revisar condiciones de entrada")
        issues.push("• Analizar timing de ejecución")
      }
      if (grade === "C") issues.push("• Setup grado C - ser más selectivo")
      return issues.length > 0 
        ? `⚠️ Áreas de mejora:\n${issues.join("\n")}` 
        : "⚠️ Áreas de mejora:\n• Trade ejecutado según plan\n• Mantener disciplina"
    })(),
    
    learnings: `💡 Key Takeaways:
${isWin 
  ? `✅ Regla validada: ${t.strategy} funciona con setup grado ${grade}
📈 Los setups con ADX ${fmtIndicator(adx)} tienen buena probabilidad`
  : `❌ Revisar: ¿Cumplía TODOS los filtros de ${t.strategy}?
📉 ADX en ${fmtIndicator(adx)} - ${adx !== undefined && adx < 25 ? "tendencia insuficiente" : "revisar otros factores"}`}

🎯 Para próxima vez: ${isWin 
  ? "Confiar en setups similares - el sistema funciona" 
  : "Verificar TODAS las condiciones antes de entrar"}

📊 Resultado: ${(t.r_multiple || 0).toFixed(2)}R en ${t.holding_days || 1} día(s)
💰 P&L: $${t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(0)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`
  }
}

interface DiaDeDiario {
  fecha: string
  porEstrategia: Record<string, {
    evaluaciones: number
    senales: number
    abiertas: number
    cerradas: number
    regimen_bloqueado: number
    motivos: Record<string, number>
  }>
}

const NOMBRE_ESTRATEGIA: Record<string, string> = {
  crypto_swing: 'Crypto Swing',
  crypto_breakout: 'Crypto Breakout',
  large_caps: 'Large Caps',
  small_caps: 'Small Caps',
}

/**
 * Por qué el sistema no operó (v5.1 · P0-6).
 *
 * El journal registraba lo que se OPERÓ, y la mayoría de los días no se opera.
 * Sin esto, "hoy no hubo trades" es indistinguible de "hoy el worker no miró",
 * de "hubo señales y algo las frenó" y de "el régimen tenía la estrategia
 * apagada". Durante una validación, esa distinción es justo la información.
 */
function Decisiones({ dias }: { dias: DiaDeDiario[] }) {
  if (!dias.length) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <p className="text-gray-400">
          Todavía no hay días registrados. El diario empieza a llenarse con el próximo ciclo
          del worker.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {dias.map((dia) => {
        const estrategias = Object.entries(dia.porEstrategia)
        const totalSenales = estrategias.reduce((a, [, d]) => a + d.senales, 0)
        const totalAbiertas = estrategias.reduce((a, [, d]) => a + d.abiertas, 0)
        return (
          <div key={dia.fecha} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-semibold">
                {new Date(dia.fecha + 'T00:00:00Z').toLocaleDateString('es-ES', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </h3>
              <span className="text-sm text-gray-400 tabular-nums">
                {totalSenales} {totalSenales === 1 ? 'señal' : 'señales'} · {totalAbiertas}{' '}
                {totalAbiertas === 1 ? 'posición abierta' : 'posiciones abiertas'}
              </span>
            </div>
            <div className="space-y-3">
              {estrategias.map(([clave, d]) => (
                <div key={clave} className="border-t border-gray-800 pt-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-gray-200 font-medium">
                      {NOMBRE_ESTRATEGIA[clave] || clave}
                    </span>
                    <span className="text-gray-500 tabular-nums text-xs">
                      {d.evaluaciones} evaluaciones · {d.senales} señales · {d.abiertas} abiertas
                      {d.cerradas > 0 && ` · ${d.cerradas} cerradas`}
                    </span>
                  </div>
                  {d.regimen_bloqueado > 0 && (
                    <p className="text-xs text-amber-400/90 mt-1">
                      La puerta de régimen tuvo la estrategia apagada en {d.regimen_bloqueado}{' '}
                      {d.regimen_bloqueado === 1 ? 'ciclo' : 'ciclos'}: no es que no hubiera
                      señales, es que no se llegó a mirar.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    {Object.entries(d.motivos)
                      .sort((a, b) => b[1] - a[1])
                      .map(([motivo, n]) => (
                        <span key={motivo} className="text-xs text-gray-500">
                          {motivo} <span className="text-gray-400 tabular-nums">{n}</span>
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function JournalPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<ClosedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estado de UI
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'decisiones'>('closed')
  const [diario, setDiario] = useState<DiaDeDiario[]>([])
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedTrade, setSelectedTrade] = useState<ClosedTrade | null>(null)
  
  // Filtros y ordenamiento
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('all')
  const [tickerFilter, setTickerFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/trading')
        const data = await response.json()

        // Diario de decisiones: lo que se evaluó y por qué no se operó
        try {
          const dj = await (await fetch('/api/journal')).json()
          if (dj.success) setDiario(dj.dias || [])
        } catch (e) {
          console.error('[journal] no se pudo leer el diario de decisiones:', e)
        }
        
        if (data.success !== false) {
          // NORMALIZAR posiciones
          const allPositions = [
            ...(data.data?.positions || []),
            ...(data.data?.intradayPositions || []).map((p: any) => ({ ...p, strategy: 'vwap_reversion' })),
            ...(data.data?.intraday1PctPositions || []).map((p: any) => ({ ...p, strategy: 'intraday_1pct' }))
          ].map(normalizePosition)
          
          // NORMALIZAR trades
          const allTrades = [
            ...(data.data?.trades || []),
            ...(data.data?.intradayTrades || []).map((t: any) => ({ ...t, strategy: 'vwap_reversion' })),
            ...(data.data?.intraday1PctTrades || []).map((t: any) => ({ ...t, strategy: 'intraday_1pct' }))
          ].map(normalizeTrade)
          
          setPositions(allPositions)
          setTrades(allTrades)
          setError(null)
        } else {
          setError(data.error || 'Error cargando datos')
        }
      } catch (err) {
        setError('Error de conexión')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Obtener tickers únicos para el filtro
  const uniqueTickers = useMemo(() => {
    const tickers = new Set<string>()
    trades.forEach(t => tickers.add(t.ticker))
    positions.forEach(p => tickers.add(p.ticker))
    return Array.from(tickers).sort()
  }, [trades, positions])

  // Filtrar y ordenar trades
  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades]
    
    // Filtro por resultado
    if (resultFilter === 'winners') {
      result = result.filter(t => t.pnl > 0)
    } else if (resultFilter === 'losers') {
      result = result.filter(t => t.pnl < 0)
    } else if (resultFilter === 'breakeven') {
      result = result.filter(t => t.pnl === 0 || t.result === 'BE')
    }
    
    // Filtro por estrategia
    if (strategyFilter !== 'all') {
      result = result.filter(t => t.strategy === strategyFilter)
    }
    
    // Filtro por ticker
    if (tickerFilter) {
      result = result.filter(t => t.ticker === tickerFilter)
    }
    
    // Filtro por fecha desde
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      result = result.filter(t => new Date(t.close_date || t.exit_time) >= fromDate)
    }
    
    // Filtro por fecha hasta
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59)
      result = result.filter(t => new Date(t.close_date || t.exit_time) <= toDate)
    }
    
    // Ordenar
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.close_date || a.exit_time).getTime() - new Date(b.close_date || b.exit_time).getTime()
          break
        case 'ticker':
          comparison = a.ticker.localeCompare(b.ticker)
          break
        case 'pnl':
          comparison = a.pnl - b.pnl
          break
        case 'r_multiple':
          comparison = (a.r_multiple || 0) - (b.r_multiple || 0)
          break
        case 'strategy':
          comparison = a.strategy.localeCompare(b.strategy)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [trades, resultFilter, strategyFilter, tickerFilter, dateFrom, dateTo, sortField, sortOrder])

  // Estadísticas basadas en trades filtrados
  const stats = useMemo(() => {
    const filtered = filteredAndSortedTrades
    const winners = filtered.filter(t => t.pnl > 0)
    const losers = filtered.filter(t => t.pnl < 0)
    const totalInvested = filtered.reduce((sum, t) => sum + (t.invested_amount || 0), 0)
    const totalPnL = filtered.reduce((sum, t) => sum + (t.pnl || 0), 0)
    
    return {
      openPositions: positions.length,
      closedTrades: filtered.length,
      totalPnL,
      totalPnLPercent: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
      winRate: filtered.length > 0 
        ? (winners.length / filtered.length * 100).toFixed(1)
        : '0',
      avgR: filtered.length > 0 
        ? (filtered.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / filtered.length).toFixed(2)
        : '0',
      winners: winners.length,
      losers: losers.length
    }
  }, [filteredAndSortedTrades, positions])

  // Limpiar filtros
  const clearFilters = () => {
    setResultFilter('all')
    setStrategyFilter('all')
    setTickerFilter('')
    setDateFrom('')
    setDateTo('')
    setSortField('date')
    setSortOrder('desc')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">📔 Trading Journal</h1>
            <p className="text-gray-400 mt-1">Analiza cada operación y aprende de ella</p>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">Posiciones Abiertas</p>
            <p className="text-2xl font-bold">{stats.openPositions}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">Trades Cerrados</p>
            <p className="text-2xl font-bold">{stats.closedTrades}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">Win Rate</p>
            <p className="text-2xl font-bold text-green-400">{stats.winRate}%</p>
            <p className="text-xs text-gray-500">{stats.winners}W / {stats.losers}L</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">Avg R-Multiple</p>
            <p className={clsx('text-2xl font-bold', Number(stats.avgR) >= 0 ? 'text-green-400' : 'text-red-400')}>
              {stats.avgR}R
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">P&L Total</p>
            <p className={clsx('text-2xl font-bold', stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400')}>
              ${stats.totalPnL.toFixed(0)}
            </p>
            <p className={clsx('text-xs', stats.totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400')}>
              ({stats.totalPnLPercent >= 0 ? '+' : ''}{stats.totalPnLPercent.toFixed(2)}%)
            </p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('closed'); setSelectedPosition(null) }}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === 'closed' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            Trades Cerrados ({trades.length})
          </button>
          <button
            onClick={() => { setActiveTab('open'); setSelectedTrade(null) }}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            Posiciones Abiertas ({positions.length})
          </button>
          <button
            onClick={() => { setActiveTab('decisiones'); setSelectedTrade(null); setSelectedPosition(null) }}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === 'decisiones' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            Por qué no se operó
          </button>
        </div>

        {activeTab === 'decisiones' && <Decisiones dias={diario} />}
        
        {/* Filtros - Solo para trades cerrados */}
        {activeTab === 'closed' && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-300">🔍 Filtros y Ordenamiento</h3>
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Limpiar filtros
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {/* Ordenar por */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Ordenar por</label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="date">Fecha</option>
                  <option value="ticker">Ticker</option>
                  <option value="pnl">P&L</option>
                  <option value="r_multiple">R-Multiple</option>
                  <option value="strategy">Estrategia</option>
                </select>
              </div>
              
              {/* Orden */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Orden</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="desc">Desc ↓</option>
                  <option value="asc">Asc ↑</option>
                </select>
              </div>
              
              {/* Filtro resultado */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Resultado</label>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="winners">✅ Winners</option>
                  <option value="losers">❌ Losers</option>
                  <option value="breakeven">↔️ Breakeven</option>
                </select>
              </div>
              
              {/* Filtro estrategia */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Estrategia</label>
                <select
                  value={strategyFilter}
                  onChange={(e) => setStrategyFilter(e.target.value as StrategyFilter)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Todas</option>
                  <option value="crypto">Crypto</option>
                  <option value="large_caps">Large Caps</option>
                  <option value="small_caps">Small Caps</option>
                  <option value="vwap_reversion">VWAP Reversion</option>
                  <option value="intraday_1pct">1% Spot</option>
                </select>
              </div>
              
              {/* Filtro ticker */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Ticker</label>
                <select
                  value={tickerFilter}
                  onChange={(e) => setTickerFilter(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {uniqueTickers.map(ticker => (
                    <option key={ticker} value={ticker}>{ticker}</option>
                  ))}
                </select>
              </div>
              
              {/* Fecha desde */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              {/* Fecha hasta */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Main content */}
        {activeTab !== 'decisiones' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de trades/posiciones */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">
                {activeTab === 'closed' ? `📊 Trades (${filteredAndSortedTrades.length})` : `📈 Posiciones (${positions.length})`}
              </h3>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto">
              {activeTab === 'closed' ? (
                filteredAndSortedTrades.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No hay trades que coincidan</p>
                  </div>
                ) : (
                  filteredAndSortedTrades.map((trade, idx) => {
                    const pnlPct = trade.pnl_percent || (trade.invested_amount > 0 ? (trade.pnl / trade.invested_amount) * 100 : 0)
                    return (
                      <div
                        key={`${trade.ticker}-${idx}`}
                        onClick={() => setSelectedTrade(trade)}
                        className={clsx(
                          'p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors',
                          selectedTrade === trade && 'bg-gray-800'
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{
                              backgroundColor: trade.pnl > 0 ? '#22c55e' : trade.pnl < 0 ? '#ef4444' : '#6b7280'
                            }} />
                            <span className="font-bold text-lg">{trade.ticker}</span>
                          </div>
                          <span className={clsx(
                            'px-2 py-1 rounded text-xs font-medium',
                            trade.result === 'TP' || trade.result === 'TP1' || trade.result === 'TP2' || trade.result === 'TRAIL' 
                              ? 'bg-green-900/50 text-green-400'
                              : trade.result === 'SL' 
                              ? 'bg-red-900/50 text-red-400'
                              : 'bg-gray-700 text-gray-400'
                          )}>
                            {trade.result}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">{trade.strategy}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatSize(trade.size, trade.ticker)} uds • ${trade.invested_amount?.toLocaleString('es-ES')}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">{formatDateTime(trade.close_date || trade.exit_time)}</span>
                          <div className="text-right">
                            <span className={clsx('font-semibold', trade.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                              ${trade.pnl >= 0 ? '+' : ''}{trade.pnl?.toFixed(0)}
                            </span>
                            <span className={clsx('text-xs ml-2', trade.r_multiple >= 0 ? 'text-green-400' : 'text-red-400')}>
                              ({trade.r_multiple >= 0 ? '+' : ''}{trade.r_multiple?.toFixed(2)}R)
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )
              ) : (
                positions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No hay posiciones abiertas</p>
                  </div>
                ) : (
                  positions.map((pos, idx) => (
                    <div
                      key={`${pos.ticker}-${idx}`}
                      onClick={() => setSelectedPosition(pos)}
                      className={clsx(
                        'p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors',
                        selectedPosition === pos && 'bg-gray-800'
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                          <span className="font-bold text-lg">{pos.ticker}</span>
                        </div>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-400">ABIERTA</span>
                      </div>
                      <div className="text-sm text-gray-400">{pos.strategy}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatSize(pos.size, pos.ticker)} uds • ${pos.invested_amount?.toLocaleString('es-ES')}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">{formatDateTime(pos.open_date)}</span>
                        {pos.unrealized_pnl !== undefined && (
                          <span className={clsx('font-semibold', pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                            ${pos.unrealized_pnl >= 0 ? '+' : ''}{pos.unrealized_pnl?.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
          
          {/* Panel de análisis */}
          <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-6">
            {activeTab === 'closed' && selectedTrade ? (
              <>
                {/* Header del trade seleccionado */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      {selectedTrade.ticker}
                      <span className={clsx(
                        'px-3 py-1 rounded text-sm',
                        selectedTrade.pnl > 0 ? 'bg-green-900/50 text-green-400' :
                        selectedTrade.pnl < 0 ? 'bg-red-900/50 text-red-400' :
                        'bg-gray-700 text-gray-400'
                      )}>
                        {selectedTrade.result}
                      </span>
                    </h2>
                    <p className="text-gray-400">{selectedTrade.strategy}</p>
                  </div>
                  <div className="text-right">
                    <p className={clsx('text-3xl font-bold', selectedTrade.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                      ${selectedTrade.pnl >= 0 ? '+' : ''}{selectedTrade.pnl?.toFixed(0)}
                    </p>
                    <p className={clsx('text-lg', selectedTrade.r_multiple >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {selectedTrade.r_multiple >= 0 ? '+' : ''}{selectedTrade.r_multiple?.toFixed(2)}R
                    </p>
                  </div>
                </div>
                
                {/* Detalles del trade */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Entry</p>
                    <p className="font-semibold">${selectedTrade.entry?.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Exit</p>
                    <p className="font-semibold">${selectedTrade.exit?.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-900/30 rounded-lg p-4 text-center">
                    <p className="text-xs text-red-400">Stop Loss</p>
                    <p className="font-semibold text-red-400">${selectedTrade.sl?.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-4 text-center">
                    <p className="text-xs text-green-400">Take Profit</p>
                    <p className="font-semibold text-green-400">${selectedTrade.tp?.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Size</p>
                    <p className="font-semibold">{formatSize(selectedTrade.size, selectedTrade.ticker)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Inversión</p>
                    <p className="font-semibold">${selectedTrade.invested_amount?.toLocaleString('es-ES')}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Días</p>
                    <p className="font-semibold">{selectedTrade.holding_days || 1}</p>
                  </div>
                  <div className={clsx(
                    'rounded-lg p-4 text-center',
                    selectedTrade.pnl >= 0 ? 'bg-green-900/30' : 'bg-red-900/30'
                  )}>
                    <p className="text-xs text-gray-500">Rentabilidad</p>
                    <p className={clsx('font-semibold', selectedTrade.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {(selectedTrade.pnl_percent || 0) >= 0 ? '+' : ''}{(selectedTrade.pnl_percent || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                {/* Análisis */}
                {(() => {
                  const analysis = generateTradeAnalysis(selectedTrade)
                  return (
                    <div className="space-y-4">
                      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                        <h3 className="text-blue-400 font-semibold mb-2">📥 Razón de Entrada</h3>
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.entryReason}</pre>
                      </div>
                      
                      <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
                        <h3 className="text-orange-400 font-semibold mb-2">📤 Razón de Salida</h3>
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.exitReason}</pre>
                      </div>
                      
                      <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                        <h3 className="text-green-400 font-semibold mb-2">✅ Lo que funcionó</h3>
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.whatWentWell}</pre>
                      </div>
                      
                      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                        <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Áreas de mejora</h3>
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.whatCouldBeBetter}</pre>
                      </div>
                      
                      <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4">
                        <h3 className="text-purple-400 font-semibold mb-2">💡 Learnings</h3>
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.learnings}</pre>
                      </div>
                    </div>
                  )
                })()}
              </>
            ) : activeTab === 'open' && selectedPosition ? (
              <>
                {/* Header de posición seleccionada */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      {selectedPosition.ticker}
                      <span className="px-3 py-1 rounded text-sm bg-blue-900/50 text-blue-400">
                        ABIERTA
                      </span>
                    </h2>
                    <p className="text-gray-400">{selectedPosition.strategy}</p>
                  </div>
                  {selectedPosition.unrealized_pnl !== undefined && (
                    <div className="text-right">
                      <p className={clsx('text-3xl font-bold', selectedPosition.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                        ${selectedPosition.unrealized_pnl >= 0 ? '+' : ''}{selectedPosition.unrealized_pnl?.toFixed(0)}
                      </p>
                      <p className={clsx('text-lg', (selectedPosition.r_multiple || 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {(selectedPosition.r_multiple || 0) >= 0 ? '+' : ''}{(selectedPosition.r_multiple || 0).toFixed(2)}R
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Detalles */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Entry</p>
                    <p className="font-semibold">${selectedPosition.entry?.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-900/30 rounded-lg p-4 text-center">
                    <p className="text-xs text-red-400">Stop Loss</p>
                    <p className="font-semibold text-red-400">${selectedPosition.sl?.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-4 text-center">
                    <p className="text-xs text-green-400">Take Profit</p>
                    <p className="font-semibold text-green-400">${selectedPosition.tp?.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Size</p>
                    <p className="font-semibold">{formatSize(selectedPosition.size, selectedPosition.ticker)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Inversión</p>
                    <p className="font-semibold">${selectedPosition.invested_amount?.toLocaleString('es-ES')}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Grado</p>
                    <p className="font-semibold">{selectedPosition.grade || 'B'}</p>
                  </div>
                </div>
                
                {/* Análisis */}
                {(() => {
                  const analysis = generatePositionAnalysis(selectedPosition)
                  return (
                    <div className="space-y-4">
                      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                        <h3 className="text-blue-400 font-semibold mb-2">📥 Análisis de Entrada</h3>
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.entryAnalysis}</pre>
                      </div>
                      
                      <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4">
                        <h3 className="text-purple-400 font-semibold mb-2">📏 Gestión de Riesgo</h3>
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.riskManagement}</pre>
                      </div>
                    </div>
                  )
                })()}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                <span className="text-6xl mb-4">📔</span>
                <p className="text-lg">Selecciona {activeTab === 'closed' ? 'un trade cerrado' : 'una posición abierta'}</p>
                <p className="text-sm mt-2">para ver el análisis completo</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
