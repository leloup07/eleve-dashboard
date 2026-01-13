'use client'

import { useState, useEffect } from 'react'

interface ApiTrade {
  ticker: string
  result: string
  entry: number
  exit: number
  pnl: number
  r_multiple: number
  invested_amount: number
  size: number
  strategy: string
  entry_reason: string
  exit_reason: string
  entry_grade: string
  close_date: string
  holding_days: number
  entry_indicators?: {
    rsi?: number
    adx?: number
    volume?: number
    ema20?: number
    ema50?: number
    atr?: number
  }
}

interface Trade {
  id: string
  date: string
  strategy: string
  asset: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  size: number
  investedAmount: number
  pnl: number
  pnlPercent: number
  rMultiple: number
  status: 'WIN' | 'LOSS' | 'BREAKEVEN'
  entryReason: string
  exitReason: string
  whatWentWell: string
  whatCouldBeBetter: string
  learnings: string
  emotions: string
}

// Generar análisis detallado basado en datos reales
const generateEntryReason = (t: ApiTrade) => {
  const ind = t.entry_indicators || {}
  const rsiOK = (ind.rsi || 50) >= 40 && (ind.rsi || 50) <= 70
  const adxOK = (ind.adx || 0) >= 25
  const grade = t.entry_grade || 'B'
  
  return `${grade === "A" || grade === "B" ? "✅" : "⚠️"} Setup ${grade} - Condiciones:
• RSI en ${ind.rsi?.toFixed(0) || "N/A"} ${rsiOK ? "✅ (zona ideal)" : "⚠️ (fuera de rango)"}
• ADX en ${ind.adx?.toFixed(0) || "N/A"} ${adxOK ? "✅ (tendencia fuerte)" : "⚠️ (tendencia débil)"}
• Volumen: ${ind.volume?.toFixed(0) || "N/A"}%
• EMA20: $${ind.ema20?.toFixed(2) || "N/A"} | EMA50: $${ind.ema50?.toFixed(2) || "N/A"}
• ATR: $${ind.atr?.toFixed(2) || "N/A"}

🎯 Razón original: ${t.entry_reason || 'Setup cumplió condiciones'}`
}

const generateExitReason = (t: ApiTrade) => {
  const isWin = t.result === "TP1" || t.result === "TP2" || t.result === "TRAIL"
  const isSL = t.result === "SL"
  const icon = isWin ? "✅" : isSL ? "🛑" : "↔️"
  const label = isWin ? `Take Profit (${t.result})` : isSL ? "Stop Loss ejecutado" : "Breakeven/Trailing"
  
  return `${icon} ${label}
• Precio de salida: $${t.exit?.toFixed(2)}
• R Multiple: ${t.r_multiple?.toFixed(2)}R
• Duración: ${t.holding_days || 1} días

📊 ${t.exit_reason || 'Salida según reglas de la estrategia'}`
}

const generateWhatWentWell = (t: ApiTrade) => {
  const isWin = t.result === "TP1" || t.result === "TP2" || t.result === "TRAIL"
  const grade = t.entry_grade || 'B'
  
  if (isWin) {
    return `• El setup ${grade} cumplió las expectativas
• Entrada ejecutada según plan
• Take Profit alcanzado (+${t.r_multiple?.toFixed(1)}R)
• Gestión de riesgo correcta
• Disciplina en mantener la posición`
  } else {
    return `• El Stop Loss protegió el capital
• Pérdida controlada a ${t.r_multiple?.toFixed(1)}R
• No promedié a la baja
• Disciplina en aceptar la pérdida
• Sistema funcionó como diseñado`
  }
}

const generateWhatCouldBeBetter = (t: ApiTrade) => {
  const issues: string[] = []
  const ind = t.entry_indicators || {}
  
  if ((ind.adx || 30) < 25) issues.push("• ADX bajo - esperar tendencia más fuerte")
  if ((ind.rsi || 50) < 40 || (ind.rsi || 50) > 70) issues.push("• RSI fuera de zona ideal")
  if (t.result === "SL") {
    issues.push("• Revisar si las condiciones de entrada fueron óptimas")
    issues.push("• Analizar si el timing fue correcto")
  }
  if (t.entry_grade === "C") issues.push("• Setup grado C - ser más selectivo")
  
  return issues.length > 0 ? issues.join("\n") : "• Trade ejecutado según plan - mantener disciplina\n• Proceso correcto independiente del resultado"
}

const generateLearnings = (t: ApiTrade) => {
  const isWin = t.result === "TP1" || t.result === "TP2" || t.result === "TRAIL"
  const ind = t.entry_indicators || {}
  const grade = t.entry_grade || 'B'
  
  const keyTakeaway = isWin 
    ? `Los setups grado ${grade} con ADX ${ind.adx?.toFixed(0) || '>25'} tienen buena probabilidad`
    : `ADX en ${ind.adx?.toFixed(0) || 'N/A'} - ${(ind.adx || 30) < 25 ? "tendencia insuficiente" : "revisar otros factores"}`
  
  const rule = isWin
    ? `✅ Regla validada: ${t.strategy} funciona con RSI ${ind.rsi?.toFixed(0) || 'en rango'}`
    : `❌ Revisar: ¿Cumplía TODOS los filtros de ${t.strategy}?`
  
  return `💡 Key takeaway: ${keyTakeaway}

${rule}

🎯 Para próxima vez: ${isWin ? "Confiar en setups similares - el sistema funciona" : "Verificar TODAS las condiciones antes de entrar"}

📊 Estadística: R-Multiple de ${t.r_multiple?.toFixed(2)}R en ${t.holding_days || 1} día(s)`
}

const generateEmotions = (t: ApiTrade) => {
  const isWin = t.result === "TP1" || t.result === "TP2" || t.result === "TRAIL"
  
  if (isWin) {
    return `😌 Estado: Disciplinado
• Trade ejecutado según plan
• Sin FOMO ni miedo
• Satisfecho con el proceso
• El resultado positivo refuerza la confianza en el sistema`
  } else {
    return `🔍 Estado: Analítico
• ¿Hubo FOMO en la entrada?
• ¿Ignoré alguna señal de alerta?
• Pérdida aceptada, enfocado en mejorar
• Recordar: una pérdida no define el sistema`
  }
}

// Helper para detectar si es stock
const isStock = (ticker: string) => {
  const cryptos = ["BTC","ETH","SOL","XRP","AVAX","LINK","MATIC","DOT","UNI","ATOM"]
  return ticker.indexOf("-USD") === -1 && cryptos.indexOf(ticker.toUpperCase()) === -1
}

// Convertir trade de API al formato Journal
const convertApiTrade = (t: ApiTrade, index: number): Trade => {
  const isWin = t.result === "TP1" || t.result === "TP2" || t.result === "TRAIL"
  const isSL = t.result === "SL"
  
  return {
    id: `trade-${index}-${t.ticker}`,
    date: t.close_date || new Date().toISOString().split('T')[0],
    strategy: t.strategy || 'Unknown',
    asset: t.ticker,
    direction: "LONG",
    entryPrice: t.entry,
    exitPrice: t.exit,
    size: isStock(t.ticker) ? Math.round(t.size || 0) : (t.size || 0),
    investedAmount: t.invested_amount || (t.entry * (t.size || 0)),
    pnl: t.pnl,
    pnlPercent: t.invested_amount ? (t.pnl / t.invested_amount * 100) : 0,
    rMultiple: t.r_multiple,
    status: isWin ? "WIN" : isSL ? "LOSS" : "BREAKEVEN",
    entryReason: generateEntryReason(t),
    exitReason: generateExitReason(t),
    whatWentWell: generateWhatWentWell(t),
    whatCouldBeBetter: generateWhatCouldBeBetter(t),
    learnings: generateLearnings(t),
    emotions: generateEmotions(t)
  }
}

// Trades de ejemplo educativos
const DEMO_TRADES: Trade[] = [
  {
    id: '1',
    date: '2026-01-10',
    strategy: 'Crypto Core',
    asset: 'BTC-USD',
    direction: 'LONG',
    entryPrice: 94500,
    exitPrice: 98200,
    size: 0.15,
    investedAmount: 14175,
    pnl: 555,
    pnlPercent: 3.9,
    rMultiple: 2.6,
    status: 'WIN',
    entryReason: `✅ Setup válido - 5/6 condiciones cumplidas:
• Régimen BULL confirmado (EMA20 > EMA50 > EMA200)
• RSI en 52 - zona ideal de pullback
• MACD sobre señal y sobre cero
• ADX en 28 - tendencia fuerte
• Precio tocó EMA20 con vela de rechazo (hammer)
• +DI > -DI confirmando dirección

🎯 Trigger: Cierre de vela 4H sobre EMA20 después de pullback de 3 días.`,
    exitReason: `✅ TP1 ejecutado en +2.5x ATR como planeado.
• Precio alcanzó zona de resistencia previa
• RSI llegó a 68 - cercano a sobrecompra
• Volumen decreciente en el rally

📊 Resultado: Cerré 50% posición, resto con trailing stop.`,
    whatWentWell: `• Esperé confirmación de vela antes de entrar
• No perseguí el precio cuando se escapó inicialmente
• Respeté el plan de salida escalonada
• Journaling durante todo el proceso`,
    whatCouldBeBetter: `• Podría haber entrado con más size dado lo limpio del setup
• El stop inicial estaba un poco ajustado
• Tardé 2 horas en ejecutar después de la señal`,
    learnings: `💡 Key takeaway: Los pullbacks a EMA20 en tendencia fuerte tienen alta probabilidad.

📏 Regla validada: Esperar cierre de vela para confirmar, no anticipar.

🎯 Para próxima vez: Confiar más en setups tan limpios - size podría ser 1.5x del normal.`,
    emotions: `😌 Estado: Calmado y disciplinado
• No sentí FOMO cuando el precio subió antes de mi entrada
• Mantuve la calma durante el pullback inicial post-entrada
• Satisfecho con la ejecución del plan`
  },
  {
    id: '2',
    date: '2026-01-08',
    strategy: 'Crypto Aggressive',
    asset: 'SOL-USD',
    direction: 'LONG',
    entryPrice: 185.50,
    exitPrice: 178.30,
    size: 25,
    investedAmount: 4637.50,
    pnl: -175,
    pnlPercent: -3.8,
    rMultiple: -1.0,
    status: 'LOSS',
    entryReason: `⚠️ Setup cuestionable - 3/6 condiciones:
• Régimen BULL en BTC ✅
• RSI en 58 - aceptable ✅
• ADX en 22 - DÉBIL ⚠️ (quería >25)
• Precio sobre EMA20 pero sin pullback limpio
• MACD positivo pero plano
• Entré por FOMO después de ver el rally de ayer`,
    exitReason: `🛑 Stop Loss ejecutado
• Precio rompió EMA20 con fuerza
• ADX nunca confirmó tendencia
• Mi SL estaba bien colocado, limitó la pérdida`,
    whatWentWell: `• El stop loss funcionó perfectamente
• No moví el SL cuando el precio se acercó
• Acepté la pérdida sin revenge trading`,
    whatCouldBeBetter: `• NO debí entrar con ADX < 25
• Ignoré mi propia regla por FOMO
• Debí esperar un pullback más limpio
• El size era correcto pero el trade no debió existir`,
    learnings: `💡 Key takeaway: ADX < 25 = NO TRADE. Sin excepciones.

❌ Regla violada: Entré sin confirmación de tendencia fuerte.

🔴 Coste de la lección: -$180, pero aprendizaje valioso.

🎯 Para próxima vez: Crear checklist físico y marcar TODAS las condiciones antes de entrar.`,
    emotions: `😤 Estado: Frustrado pero consciente
• Reconozco que el FOMO me hizo entrar
• La pérdida duele pero el proceso fue malo
• Necesito más disciplina en días de rally`
  }
]

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState('all')
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list')

  // Cargar trades de la API (Redis)
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/trading')
        if (!response.ok) throw new Error('Error cargando trades')
        
        const data = await response.json()
        
        if (data.trades && Array.isArray(data.trades) && data.trades.length > 0) {
          const convertedTrades = data.trades.map((t: ApiTrade, i: number) => convertApiTrade(t, i))
          setTrades(convertedTrades)
        } else {
          // No hay trades reales, usar demos
          setTrades(DEMO_TRADES)
        }
      } catch (err) {
        console.error('Error fetching trades:', err)
        setError('Error cargando trades')
        setTrades(DEMO_TRADES)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTrades()
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchTrades, 30000)
    return () => clearInterval(interval)
  }, [])

  const filteredTrades = selectedStrategy === 'all' 
    ? trades 
    : trades.filter(t => t.strategy.toLowerCase().replace(' ', '_') === selectedStrategy)

  const stats = {
    totalTrades: filteredTrades.length,
    wins: filteredTrades.filter(t => t.status === 'WIN').length,
    losses: filteredTrades.filter(t => t.status === 'LOSS').length,
    winRate: filteredTrades.length > 0 
      ? (filteredTrades.filter(t => t.status === 'WIN').length / filteredTrades.length * 100).toFixed(1) 
      : '0',
    totalPnl: filteredTrades.reduce((sum, t) => sum + t.pnl, 0),
    avgRMultiple: filteredTrades.length > 0
      ? (filteredTrades.reduce((sum, t) => sum + t.rMultiple, 0) / filteredTrades.length).toFixed(2)
      : '0',
    bestTrade: filteredTrades.length > 0 ? filteredTrades.reduce((best, t) => t.pnl > best.pnl ? t : best, filteredTrades[0]) : null,
    worstTrade: filteredTrades.length > 0 ? filteredTrades.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, filteredTrades[0]) : null,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando trades desde Redis...</p>
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
            <p className="text-gray-400 mt-1">Documenta, analiza y aprende de cada operación</p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                📋 Lista
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'stats' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                📊 Estadísticas
              </button>
            </div>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todas las estrategias</option>
              <option value="crypto_core">Crypto Core</option>
              <option value="crypto_aggressive">Crypto Aggressive</option>
              <option value="large_caps">Large Caps</option>
              <option value="small_caps">Small Caps</option>
              <option value="vwap_reversion">VWAP Reversion</option>
              <option value="1%_spot">1% Spot</option>
            </select>
          </div>
        </div>

        {/* Info banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm">⚠️ {error} - Mostrando ejemplos didácticos</p>
          </div>
        )}
        
        {trades === DEMO_TRADES && !error && (
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4 mb-6">
            <p className="text-purple-300 text-sm">
              📚 <strong>Modo didáctico:</strong> No hay trades cerrados en Redis. 
              Mostrando ejemplos educativos. Los trades reales aparecerán automáticamente.
            </p>
          </div>
        )}

        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trade List */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-4 text-gray-300">
                Historial de Trades ({filteredTrades.length})
              </h2>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {filteredTrades.map(trade => (
                  <div
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      selectedTrade?.id === trade.id 
                        ? 'bg-blue-900/50 border-blue-500' 
                        : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-lg">{trade.asset}</span>
                        <span className="ml-2 text-xs text-gray-400">{trade.direction}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.status === 'WIN' ? 'bg-green-900 text-green-400' :
                        trade.status === 'LOSS' ? 'bg-red-900 text-red-400' :
                        'bg-yellow-900 text-yellow-400'
                      }`}>
                        {trade.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">{trade.strategy}</div>
                    <div className="text-xs text-gray-500 mt-1">{trade.date}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">${trade.investedAmount?.toLocaleString()}</span>
                      <span className={`font-semibold ${
                        trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)} ({trade.rMultiple?.toFixed(2)}R)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade Detail */}
            <div className="lg:col-span-2">
              {selectedTrade ? (
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedTrade.asset} <span className="text-blue-400">{selectedTrade.direction}</span></h2>
                      <p className="text-gray-400">{selectedTrade.strategy} • {selectedTrade.date}</p>
                    </div>
                    <div className={`text-right px-4 py-2 rounded-lg ${
                      selectedTrade.pnl >= 0 ? 'bg-green-900/50' : 'bg-red-900/50'
                    }`}>
                      <p className={`text-2xl font-bold ${selectedTrade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${selectedTrade.pnl >= 0 ? '+' : ''}{selectedTrade.pnl.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-400">{selectedTrade.pnlPercent?.toFixed(1)}% • {selectedTrade.rMultiple?.toFixed(2)}R</p>
                    </div>
                  </div>

                  {/* Trade Metrics */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Entry</p>
                      <p className="text-lg font-semibold">${selectedTrade.entryPrice?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Exit</p>
                      <p className="text-lg font-semibold">${selectedTrade.exitPrice?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Size / Invertido</p>
                      <p className="text-lg font-semibold">{selectedTrade.size} uds</p>
                      <p className="text-sm text-gray-400">${selectedTrade.investedAmount?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">R Multiple</p>
                      <p className={`text-lg font-semibold ${selectedTrade.rMultiple >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedTrade.rMultiple?.toFixed(2)}R
                      </p>
                    </div>
                  </div>

                  {/* Entry Reason */}
                  <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 mb-4">
                    <h3 className="text-blue-400 font-semibold mb-2">🎯 Razón de Entrada</h3>
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.entryReason}</pre>
                  </div>

                  {/* Exit Reason */}
                  <div className={`border rounded-lg p-4 mb-4 ${
                    selectedTrade.status === 'WIN' 
                      ? 'bg-green-900/30 border-green-800' 
                      : selectedTrade.status === 'LOSS'
                      ? 'bg-red-900/30 border-red-800'
                      : 'bg-yellow-900/30 border-yellow-800'
                  }`}>
                    <h3 className={`font-semibold mb-2 ${
                      selectedTrade.status === 'WIN' ? 'text-green-400' : 
                      selectedTrade.status === 'LOSS' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {selectedTrade.status === 'WIN' ? '📈' : '🛑'} Razón de Salida
                    </h3>
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.exitReason}</pre>
                  </div>

                  {/* What Went Well / Could Be Better */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                      <h3 className="text-green-400 font-semibold mb-2">✅ What Went Well</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.whatWentWell}</pre>
                    </div>
                    <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                      <h3 className="text-yellow-400 font-semibold mb-2">⚠️ What Could Be Better</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.whatCouldBeBetter}</pre>
                    </div>
                  </div>

                  {/* Learnings */}
                  <div className="bg-purple-900/30 border border-purple-800 rounded-lg p-4 mb-4">
                    <h3 className="text-purple-400 font-semibold mb-2">💡 Learnings</h3>
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.learnings}</pre>
                  </div>

                  {/* Emotions */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-gray-400 font-semibold mb-2">🧠 Estado Emocional</h3>
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.emotions}</pre>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 text-center">
                  <span className="text-6xl mb-4 block">📔</span>
                  <h3 className="text-xl font-semibold text-gray-400">Selecciona un trade</h3>
                  <p className="text-gray-500 mt-2">Haz clic en cualquier trade de la lista para ver el análisis completo</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Stats View */
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <p className="text-gray-500 text-sm">Total Trades</p>
                <p className="text-3xl font-bold mt-1">{stats.totalTrades}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <p className="text-gray-500 text-sm">Win Rate</p>
                <p className="text-3xl font-bold mt-1 text-green-400">{stats.winRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{stats.wins}W / {stats.losses}L</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <p className="text-gray-500 text-sm">Total P&L</p>
                <p className={`text-3xl font-bold mt-1 ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${stats.totalPnl.toFixed(0)}
                </p>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <p className="text-gray-500 text-sm">Avg R Multiple</p>
                <p className={`text-3xl font-bold mt-1 ${Number(stats.avgRMultiple) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.avgRMultiple}R
                </p>
              </div>
            </div>

            {/* Best/Worst Trades */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.bestTrade && (
                <div className="bg-green-900/20 border border-green-800 rounded-xl p-5">
                  <h3 className="text-green-400 font-semibold mb-3">🏆 Mejor Trade</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">{stats.bestTrade.asset}</p>
                      <p className="text-gray-400 text-sm">{stats.bestTrade.strategy}</p>
                    </div>
                    <p className="text-2xl font-bold text-green-400">+${stats.bestTrade.pnl.toFixed(0)}</p>
                  </div>
                </div>
              )}
              {stats.worstTrade && (
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-5">
                  <h3 className="text-red-400 font-semibold mb-3">📉 Peor Trade</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">{stats.worstTrade.asset}</p>
                      <p className="text-gray-400 text-sm">{stats.worstTrade.strategy}</p>
                    </div>
                    <p className="text-2xl font-bold text-red-400">${stats.worstTrade.pnl.toFixed(0)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Learnings Summary */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold mb-4">📚 Resumen de Aprendizajes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-green-400 font-semibold mb-3">✅ Reglas que funcionan</h4>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Pullbacks a EMA20 en tendencia fuerte</li>
                    <li>• Esperar cierre de vela para confirmar</li>
                    <li>• VWAP como imán en reversiones</li>
                    <li>• Filtro macro antes de entrar</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-red-400 font-semibold mb-3">❌ Errores a evitar</h4>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Entrar con ADX bajo (&lt;25)</li>
                    <li>• Ignorar filtros por FOMO</li>
                    <li>• &ldquo;Casi cumple&rdquo; = NO cumple</li>
                    <li>• Entrar sin todos los filtros OK</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-yellow-400 font-semibold mb-3">🎯 Para mejorar</h4>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Checklist físico pre-trade</li>
                    <li>• Confiar más en setups limpios</li>
                    <li>• Considerar runners en setups A+</li>
                    <li>• Documentar emociones en tiempo real</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
