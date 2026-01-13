'use client'

import { useState, useEffect } from 'react'

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
  open_date: string
  entry_reason: string
  entry_grade: string
  entry_indicators?: {
    rsi?: number
    adx?: number
    volume?: number
    ema20?: number
    ema50?: number
    atr?: number
  }
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
  r_multiple: number
  holding_days: number
  close_date: string
  entry_reason: string
  exit_reason: string
  entry_grade: string
  entry_indicators?: {
    rsi?: number
    adx?: number
    volume?: number
    ema20?: number
    ema50?: number
    atr?: number
  }
}

// ====== GENERADORES DE ANÁLISIS DETALLADO ======

const generatePositionAnalysis = (p: Position) => {
  const ind = p.entry_indicators || {}
  const grade = p.entry_grade || 'B'
  const rsiOK = (ind.rsi || 50) >= 40 && (ind.rsi || 50) <= 70
  const adxOK = (ind.adx || 0) >= 25
  
  return {
    entryAnalysis: `${grade === "A" || grade === "B" ? "✅" : "⚠️"} Setup Grado ${grade}

📊 Indicadores de entrada:
• RSI: ${ind.rsi?.toFixed(0) || "N/A"} ${rsiOK ? "✅ zona ideal" : "⚠️ fuera de rango"}
• ADX: ${ind.adx?.toFixed(0) || "N/A"} ${adxOK ? "✅ tendencia fuerte" : "⚠️ tendencia débil"}
• Volumen: ${ind.volume?.toFixed(0) || "N/A"}%
• EMA20: $${ind.ema20?.toFixed(2) || "N/A"}
• EMA50: $${ind.ema50?.toFixed(2) || "N/A"}
• ATR: $${ind.atr?.toFixed(2) || "N/A"}

🎯 Razón: ${p.entry_reason || 'Setup cumplió condiciones de entrada'}`,
    
    riskManagement: `📏 Gestión de Riesgo:
• Entry: $${p.entry?.toFixed(2)}
• Stop Loss: $${p.sl?.toFixed(2)} (${((p.sl - p.entry) / p.entry * 100).toFixed(1)}%)
• Take Profit: $${p.tp?.toFixed(2)} (${((p.tp - p.entry) / p.entry * 100).toFixed(1)}%)
• R:R Ratio: ${((p.tp - p.entry) / (p.entry - p.sl)).toFixed(1)}:1
• Capital en riesgo: $${(p.invested_amount * Math.abs((p.sl - p.entry) / p.entry)).toFixed(0)}`,
    
    currentStatus: p.current_price ? `📈 Estado Actual:
• Precio actual: $${p.current_price?.toFixed(2)}
• P&L no realizado: $${p.unrealized_pnl?.toFixed(0) || 0} (${p.unrealized_pnl_percent?.toFixed(1) || 0}%)
• Distancia a SL: ${((p.current_price - p.sl) / p.current_price * 100).toFixed(1)}%
• Distancia a TP: ${((p.tp - p.current_price) / p.current_price * 100).toFixed(1)}%` : ''
  }
}

const generateTradeAnalysis = (t: ClosedTrade) => {
  const ind = t.entry_indicators || {}
  const grade = t.entry_grade || 'B'
  const isWin = t.result === "TP1" || t.result === "TP2" || t.result === "TRAIL"
  const isSL = t.result === "SL"
  const rsiOK = (ind.rsi || 50) >= 40 && (ind.rsi || 50) <= 70
  const adxOK = (ind.adx || 0) >= 25
  
  return {
    entryReason: `${grade === "A" || grade === "B" ? "✅" : "⚠️"} Setup Grado ${grade}

📊 Indicadores al momento de entrada:
• RSI: ${ind.rsi?.toFixed(0) || "N/A"} ${rsiOK ? "✅ zona ideal" : "⚠️ fuera de rango"}
• ADX: ${ind.adx?.toFixed(0) || "N/A"} ${adxOK ? "✅ tendencia fuerte" : "⚠️ tendencia débil"}
• Volumen: ${ind.volume?.toFixed(0) || "N/A"}%
• EMA20: $${ind.ema20?.toFixed(2) || "N/A"}
• EMA50: $${ind.ema50?.toFixed(2) || "N/A"}

🎯 Razón original: ${t.entry_reason || 'Setup cumplió condiciones'}`,
    
    exitReason: `${isWin ? "✅" : isSL ? "🛑" : "↔️"} ${isWin ? `Take Profit (${t.result})` : isSL ? "Stop Loss ejecutado" : "Breakeven/Trailing"}

• Precio de entrada: $${t.entry?.toFixed(2)}
• Precio de salida: $${t.exit?.toFixed(2)}
• Movimiento: ${((t.exit - t.entry) / t.entry * 100).toFixed(2)}%
• Duración: ${t.holding_days || 1} día(s)

📊 ${t.exit_reason || 'Salida según reglas de la estrategia'}`,
    
    whatWentWell: isWin ? `✅ Lo que funcionó bien:
• Setup grado ${grade} cumplió expectativas
• Entrada ejecutada según plan
• ${t.result} alcanzado (+${t.r_multiple?.toFixed(2)}R)
• Gestión de riesgo correcta
• Disciplina en mantener la posición` 
    : `✅ Lo que funcionó bien:
• Stop Loss protegió el capital
• Pérdida controlada a ${t.r_multiple?.toFixed(2)}R
• No se promedió a la baja
• Disciplina al aceptar la pérdida
• Sistema funcionó como diseñado`,
    
    whatCouldBeBetter: (() => {
      const issues: string[] = []
      if ((ind.adx || 30) < 25) issues.push("• ADX bajo - esperar tendencia más fuerte")
      if ((ind.rsi || 50) < 40 || (ind.rsi || 50) > 70) issues.push("• RSI fuera de zona ideal")
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
📈 Los setups con ADX ${ind.adx?.toFixed(0) || '>25'} tienen buena probabilidad`
  : `❌ Revisar: ¿Cumplía TODOS los filtros de ${t.strategy}?
📉 ADX en ${ind.adx?.toFixed(0) || 'N/A'} - ${(ind.adx || 30) < 25 ? "tendencia insuficiente" : "revisar otros factores"}`}

🎯 Para próxima vez: ${isWin 
  ? "Confiar en setups similares - el sistema funciona" 
  : "Verificar TODAS las condiciones antes de entrar"}

📊 Resultado: ${t.r_multiple?.toFixed(2)}R en ${t.holding_days || 1} día(s)
💰 P&L: $${t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(0)} (${(t.pnl / t.invested_amount * 100).toFixed(1)}%)`,
    
    emotions: isWin ? `😌 Estado: Disciplinado
• Trade ejecutado según plan
• Sin FOMO ni miedo
• Satisfecho con el proceso
• Resultado refuerza confianza en el sistema`
    : `🔍 Estado: Analítico
• ¿Hubo FOMO en la entrada?
• ¿Ignoré alguna señal de alerta?
• Pérdida aceptada, enfocado en mejorar
• Una pérdida no define el sistema`
  }
}

// ====== COMPONENTE PRINCIPAL ======

export default function TradingJournal() {
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<ClosedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('closed')
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedTrade, setSelectedTrade] = useState<ClosedTrade | null>(null)
  const [filterStrategy, setFilterStrategy] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/trading')
        const data = await response.json()
        
        if (data.success !== false) {
          setPositions(data.positions || data.data?.positions || [])
          setTrades(data.trades || data.data?.trades || [])
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

  // Filtrar por estrategia
  const filteredPositions = filterStrategy === 'all' 
    ? positions 
    : positions.filter(p => p.strategy?.toLowerCase().includes(filterStrategy))
  
  const filteredTrades = filterStrategy === 'all' 
    ? trades 
    : trades.filter(t => t.strategy?.toLowerCase().includes(filterStrategy))

  // Stats
  const stats = {
    openPositions: positions.length,
    closedTrades: trades.length,
    totalPnL: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    winRate: trades.length > 0 
      ? (trades.filter(t => t.result === 'TP1' || t.result === 'TP2' || t.result === 'TRAIL').length / trades.length * 100).toFixed(1)
      : '0',
    avgR: trades.length > 0 
      ? (trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length).toFixed(2)
      : '0'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando datos de trading...</p>
        </div>
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
          <div className="flex gap-3">
            <select
              value={filterStrategy}
              onChange={(e) => setFilterStrategy(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm"
            >
              <option value="all">Todas las estrategias</option>
              <option value="small_caps">Small Caps</option>
              <option value="large_caps">Large Caps</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm">⚠️ {error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">Posiciones Abiertas</p>
            <p className="text-2xl font-bold text-blue-400">{stats.openPositions}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">Trades Cerrados</p>
            <p className="text-2xl font-bold">{stats.closedTrades}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">Win Rate</p>
            <p className="text-2xl font-bold text-green-400">{stats.winRate}%</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">Avg R-Multiple</p>
            <p className={`text-2xl font-bold ${Number(stats.avgR) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.avgR}R
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs">P&L Total</p>
            <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${stats.totalPnL.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('closed'); setSelectedPosition(null); }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'closed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            📋 Trades Cerrados ({filteredTrades.length})
          </button>
          <button
            onClick={() => { setActiveTab('open'); setSelectedTrade(null); }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'open' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            🔵 Posiciones Abiertas ({filteredPositions.length})
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1">
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
              {activeTab === 'closed' ? (
                filteredTrades.length > 0 ? (
                  filteredTrades.map((trade, idx) => {
                    const isWin = trade.result === 'TP1' || trade.result === 'TP2' || trade.result === 'TRAIL'
                    const isSL = trade.result === 'SL'
                    return (
                      <div
                        key={`${trade.ticker}-${idx}`}
                        onClick={() => setSelectedTrade(trade)}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                          selectedTrade === trade
                            ? 'bg-blue-900/50 border-blue-500'
                            : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${
                              isWin ? 'bg-green-500' : isSL ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <span className="font-bold text-lg">{trade.ticker}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            isWin ? 'bg-green-900/50 text-green-400' :
                            isSL ? 'bg-red-900/50 text-red-400' :
                            'bg-yellow-900/50 text-yellow-400'
                          }`}>
                            {trade.result}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">{trade.strategy}</div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">${trade.invested_amount?.toLocaleString()}</span>
                          <span className={`font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${trade.pnl >= 0 ? '+' : ''}{trade.pnl?.toFixed(0)} ({trade.r_multiple?.toFixed(2)}R)
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{trade.close_date?.split('T')[0]}</div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No hay trades cerrados
                  </div>
                )
              ) : (
                filteredPositions.length > 0 ? (
                  filteredPositions.map((pos, idx) => (
                    <div
                      key={`${pos.ticker}-${idx}`}
                      onClick={() => setSelectedPosition(pos)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${
                        selectedPosition === pos
                          ? 'bg-blue-900/50 border-blue-500'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                          <span className="font-bold text-lg">{pos.ticker}</span>
                        </div>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-400">
                          ABIERTA
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">{pos.strategy}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">${pos.invested_amount?.toLocaleString()}</span>
                        {pos.unrealized_pnl !== undefined && (
                          <span className={`font-semibold ${pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${pos.unrealized_pnl >= 0 ? '+' : ''}{pos.unrealized_pnl?.toFixed(0)} ({pos.unrealized_pnl_percent?.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{pos.open_date?.split('T')[0]}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No hay posiciones abiertas
                  </div>
                )
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {activeTab === 'closed' && selectedTrade ? (
              (() => {
                const analysis = generateTradeAnalysis(selectedTrade)
                const isWin = selectedTrade.result === 'TP1' || selectedTrade.result === 'TP2' || selectedTrade.result === 'TRAIL'
                return (
                  <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedTrade.ticker}</h2>
                        <p className="text-gray-400">{selectedTrade.strategy} • {selectedTrade.close_date?.split('T')[0]}</p>
                      </div>
                      <div className={`text-right px-4 py-2 rounded-lg ${isWin ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                        <p className={`text-2xl font-bold ${selectedTrade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${selectedTrade.pnl >= 0 ? '+' : ''}{selectedTrade.pnl?.toFixed(0)}
                        </p>
                        <p className="text-sm text-gray-400">{selectedTrade.r_multiple?.toFixed(2)}R • {selectedTrade.holding_days}d</p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Entry</p>
                        <p className="font-semibold">${selectedTrade.entry?.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Exit</p>
                        <p className="font-semibold">${selectedTrade.exit?.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Invertido</p>
                        <p className="font-semibold">${selectedTrade.invested_amount?.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Resultado</p>
                        <p className={`font-semibold ${isWin ? 'text-green-400' : 'text-red-400'}`}>{selectedTrade.result}</p>
                      </div>
                    </div>

                    {/* Entry Reason */}
                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                      <h3 className="text-blue-400 font-semibold mb-2">🎯 Análisis de Entrada</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.entryReason}</pre>
                    </div>

                    {/* Exit Reason */}
                    <div className={`border rounded-lg p-4 ${isWin ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
                      <h3 className={`font-semibold mb-2 ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                        {isWin ? '📈' : '🛑'} Análisis de Salida
                      </h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.exitReason}</pre>
                    </div>

                    {/* What Went Well / Could Be Better */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-900/10 border border-green-800/50 rounded-lg p-4">
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.whatWentWell}</pre>
                      </div>
                      <div className="bg-yellow-900/10 border border-yellow-800/50 rounded-lg p-4">
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.whatCouldBeBetter}</pre>
                      </div>
                    </div>

                    {/* Learnings */}
                    <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4">
                      <h3 className="text-purple-400 font-semibold mb-2">💡 Learnings</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.learnings}</pre>
                    </div>

                    {/* Emotions */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <h3 className="text-gray-400 font-semibold mb-2">🧠 Estado Emocional</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.emotions}</pre>
                    </div>
                  </div>
                )
              })()
            ) : activeTab === 'open' && selectedPosition ? (
              (() => {
                const analysis = generatePositionAnalysis(selectedPosition)
                return (
                  <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                          {selectedPosition.ticker}
                        </h2>
                        <p className="text-gray-400">{selectedPosition.strategy} • Abierta {selectedPosition.open_date?.split('T')[0]}</p>
                      </div>
                      <div className="text-right px-4 py-2 rounded-lg bg-blue-900/30">
                        <p className="text-2xl font-bold text-blue-400">ACTIVA</p>
                        <p className="text-sm text-gray-400">Grado {selectedPosition.entry_grade || 'B'}</p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Entry</p>
                        <p className="font-semibold">${selectedPosition.entry?.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Stop Loss</p>
                        <p className="font-semibold text-red-400">${selectedPosition.sl?.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Take Profit</p>
                        <p className="font-semibold text-green-400">${selectedPosition.tp?.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Invertido</p>
                        <p className="font-semibold">${selectedPosition.invested_amount?.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Current Status */}
                    {selectedPosition.current_price && (
                      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                        <h3 className="text-blue-400 font-semibold mb-2">📊 Estado Actual</h3>
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.currentStatus}</pre>
                      </div>
                    )}

                    {/* Entry Analysis */}
                    <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                      <h3 className="text-green-400 font-semibold mb-2">🎯 Análisis de Entrada</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.entryAnalysis}</pre>
                    </div>

                    {/* Risk Management */}
                    <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                      <h3 className="text-yellow-400 font-semibold mb-2">📏 Gestión de Riesgo</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{analysis.riskManagement}</pre>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 text-center">
                <span className="text-6xl mb-4 block">📔</span>
                <h3 className="text-xl font-semibold text-gray-400">
                  {activeTab === 'closed' ? 'Selecciona un trade cerrado' : 'Selecciona una posición abierta'}
                </h3>
                <p className="text-gray-500 mt-2">
                  Haz clic en cualquier {activeTab === 'closed' ? 'trade' : 'posición'} para ver el análisis completo
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
