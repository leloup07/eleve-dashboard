'use client'

import { useState } from 'react'

interface Trade {
  id: string
  date: string
  strategy: string
  asset: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  size: number
  pnl: number
  pnlPercent: number
  rMultiple: number
  status: 'WIN' | 'LOSS' | 'BREAKEVEN'
  // Razones y learnings
  entryReason: string
  exitReason: string
  whatWentWell: string
  whatCouldBeBetter: string
  learnings: string
  emotions: string
  screenshots?: string[]
}

// Trades de ejemplo con datos educativos
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

Trigger: Hammer en soporte dinámico EMA20 con volumen creciente`,
    exitReason: `📈 Take Profit ejecutado según plan:
• TP1 (70%) a $97,800 (+2.5 ATR) - EJECUTADO
• Resto (30%) con trailing stop
• RSI llegó a 72 - zona de sobrecompra
• Trailing stop activado a $98,200 cuando precio retrocedió`,
    whatWentWell: `• Esperé el pullback en vez de perseguir el precio
• Respeté el tamaño de posición (1% riesgo)
• No moví el stop loss cuando el precio bajó temporalmente
• Tomé ganancias parciales según el plan`,
    whatCouldBeBetter: `• Podría haber añadido a la posición cuando confirmó el rebote
• El trailing stop era quizás muy ajustado - perdí $400 adicionales de movimiento
• Entré un poco tarde - había mejor precio 2 horas antes`,
    learnings: `💡 Key takeaway: La paciencia paga. Esperar el pullback a EMA20 dio una entrada con R:R de 3:1 vs entrar en la ruptura que hubiera sido 1.5:1.

📝 Regla a recordar: En tendencia fuerte (ADX >25), los pullbacks a EMA20 son oportunidades de compra, no señales de debilidad.

🎯 Para próxima vez: Considerar trailing stop más amplio (2 ATR vs 1.5 ATR) cuando ADX >30.`,
    emotions: `😌 Tranquilo durante el trade. Un momento de ansiedad cuando bajó $800 después de entrar, pero el plan estaba claro y lo seguí.`
  },
  {
    id: '2',
    date: '2026-01-08',
    strategy: 'Crypto Aggressive',
    asset: 'SOL-USD',
    direction: 'LONG',
    entryPrice: 185,
    exitPrice: 178,
    size: 25,
    pnl: -175,
    pnlPercent: -3.8,
    rMultiple: -1.0,
    status: 'LOSS',
    entryReason: `⚠️ Setup parcial - 4/6 condiciones:
• Régimen BULL en BTC ✓
• RSI en 58 - aceptable ✓
• MACD sobre señal ✓
• ADX en 22 - BAJO EL MÍNIMO ✗
• Precio sobre EMA20 ✓
• +DI > -DI pero por poco ✓

Trigger: Rompimiento de resistencia en $184 con volumen`,
    exitReason: `🛑 Stop Loss ejecutado:
• SL a $178 (-2.5 ATR) - EJECUTADO
• El precio nunca confirmó - fue falso breakout
• BTC empezó a corregir y SOL siguió con beta amplificado`,
    whatWentWell: `• El stop loss funcionó perfectamente - limitó la pérdida a 1R
• No moví el stop ni "esperé a ver qué pasa"
• Tamaño de posición correcto - pérdida asumible`,
    whatCouldBeBetter: `• NO debí entrar con ADX < 25 - era señal clara de falta de tendencia
• El volumen en el breakout no era convincente (menor que media)
• Ignoré la correlación con BTC que ya mostraba debilidad
• Entré por FOMO - SOL había subido 8% en 2 días y quería "subirme"`,
    learnings: `💡 Key takeaway: ADX < 25 = NO HAY TENDENCIA. Sin tendencia, los breakouts fallan más del 60%.

📝 Regla violada: Entré con solo 4/6 condiciones. El mínimo es 5/6. Esta regla existe por algo.

🎯 Para próxima vez: 
1. NUNCA entrar con ADX < 25 en estrategia de tendencia
2. Si BTC muestra debilidad, NO operar altcoins long
3. Reconocer el FOMO y alejarme del ordenador

⚠️ Costo de la lección: $175 - barato por aprender algo importante`,
    emotions: `😤 Frustrado conmigo mismo. Sabía que el setup no era perfecto pero entré igual. El FOMO me ganó. Necesito más disciplina.`
  },
  {
    id: '3',
    date: '2026-01-06',
    strategy: 'VWAP Reversion',
    asset: 'ETH-USD',
    direction: 'LONG',
    entryPrice: 3380,
    exitPrice: 3415,
    size: 1.5,
    pnl: 52.5,
    pnlPercent: 1.03,
    rMultiple: 1.7,
    status: 'WIN',
    entryReason: `✅ Setup intraday perfecto:
• Sesión asiática (02:30 UTC) - horario correcto ✓
• Precio cayó >1 ATR bajo VWAP ($3,420) ✓
• Fake break del rango nocturno ✓
• Mecha de rechazo >0.3 ATR ✓
• RSI en 28 - sobreventa extrema ✓
• Volumen spike en el fake break ✓

Trigger: Vela de rechazo cerrando dentro del rango después del sweep`,
    exitReason: `✅ Target alcanzado:
• TP a VWAP ($3,420) - casi alcanzado
• Cerré a $3,415 cuando el momentum se frenó
• Mejor salir con +1.7R que arriesgar reversión`,
    whatWentWell: `• Entrada perfecta en el fake break
• Identificación correcta del sweep de liquidez
• Salida disciplinada sin buscar más
• Horario correcto (sesión asiática)`,
    whatCouldBeBetter: `• Podría haber esperado a que tocara VWAP exacto (+$7 más)
• El size podría haber sido mayor dado lo limpio del setup`,
    learnings: `💡 Key takeaway: Los fake breaks en sesión asiática son muy fiables porque hay menos liquidez y los sweeps son más obvios.

📝 Lo que funcionó: La combinación RSI sobreventa + fake break + mecha rechazo es setup de alta probabilidad.

🎯 Para próxima vez: Confiar más en setups tan limpios - size podría ser 1.5x del normal.`,
    emotions: `😊 Satisfecho. Trade ejecutado exactamente según el plan. Sin ansiedad porque el setup era muy claro.`
  },
  {
    id: '4',
    date: '2026-01-05',
    strategy: 'Large Caps',
    asset: 'NVDA',
    direction: 'LONG',
    entryPrice: 138.50,
    exitPrice: 145.20,
    size: 50,
    pnl: 335,
    pnlPercent: 4.8,
    rMultiple: 2.4,
    status: 'WIN',
    entryReason: `✅ Setup swing stocks:
• SPY en tendencia alcista (filtro macro) ✓
• NVDA estructura HH-HL en diario ✓
• Pullback a EMA20 ($138) ✓
• RSI en 48 - zona ideal ✓
• Earnings en 3 semanas - no inmediato ✓
• Sector tech fuerte (XLK +2% semana) ✓

Trigger: Gap up después de pullback con volumen sobre media`,
    exitReason: `📈 TP escalonado:
• TP1 (50%) a $143 (+1.8 ATR) - ejecutado
• TP2 (50%) a $145.20 cuando tocó resistencia anterior
• RSI llegó a 68 - cerca de sobrecompra
• Volumen decreciente en últimas velas`,
    whatWentWell: `• Filtro macro correcto - SPY confirmaba
• Paciencia esperando el pullback a EMA20
• Respeto del horario de mercado
• TP escalonado maximizó ganancias`,
    whatCouldBeBetter: `• Podría haber mantenido 25% con trailing para capturar más
• Entré con orden de mercado - limit order hubiera ahorrado ~$0.30`,
    learnings: `💡 Key takeaway: En stocks, el filtro macro (SPY) es crítico. NVDA solo funciona bien cuando el mercado general está alcista.

📝 Diferencia con crypto: Stocks respetan más los niveles técnicos y tienen menos ruido. EMA20 funcionó como soporte perfecto.

🎯 Para próxima vez: Usar limit orders en stocks - el spread es menor y hay tiempo.`,
    emotions: `😌 Confiado. Los stocks se mueven más predecible que crypto. Menos estrés durante el trade.`
  },
  {
    id: '5',
    date: '2026-01-03',
    strategy: '1% Spot',
    asset: 'AVAX-USD',
    direction: 'LONG',
    entryPrice: 42.50,
    exitPrice: 42.20,
    size: 120,
    pnl: -36,
    pnlPercent: -0.7,
    rMultiple: -0.7,
    status: 'LOSS',
    entryReason: `⚠️ Setup apresurado:
• BTC lateral (ADX 18) - contexto débil ✗
• AVAX ADX en 21 - por debajo del mínimo 25 ✗
• RSI en 52 - ok ✓
• Volumen 24h $48M - justo bajo mínimo $50M ✗

Trigger: Cruce de EMA12 sobre EMA26 - pero sin confirmación de volumen`,
    exitReason: `🛑 Stop Loss ejecutado:
• SL a $42.20 (-0.5%) - ejecutado
• El precio nunca tuvo momentum
• Movimiento lateral durante 40 minutos y luego breakdown`,
    whatWentWell: `• Stop loss funcionó - pérdida limitada a 0.7R
• Reconocí rápido que no iba a funcionar
• No promedié a la baja`,
    whatCouldBeBetter: `• NO debí entrar - múltiples filtros no cumplidos
• BTC lateral = no operar altcoins momentum
• Volumen bajo el mínimo requerido
• Entré por aburrimiento después de 2 horas sin trades`,
    learnings: `💡 Key takeaway: Los filtros de liquidez existen por algo. Vol < $50M = slippage y movimientos erráticos.

📝 Regla violada: "Si BTC ADX < 20, NO operar 1% Spot". BTC estaba en ADX 18.

🎯 Para próxima vez:
1. Checklist de filtros ANTES de entrar
2. Si estoy aburrido, alejarme - el mercado no me debe entretenimiento
3. La disciplina es más rentable que la actividad

⚠️ Error de proceso, no de mercado. El mercado hizo lo que tenía que hacer - yo no seguí mis reglas.`,
    emotions: `😔 Decepcionado conmigo. Sabía que no debía entrar pero lo hice igual. El aburrimiento es peligroso.`
  }
]

const STRATEGIES = [
  { key: 'all', name: 'Todas', color: 'gray' },
  { key: 'crypto_core', name: 'Crypto Core', color: 'blue' },
  { key: 'crypto_aggressive', name: 'Crypto Aggressive', color: 'purple' },
  { key: 'large_caps', name: 'Large Caps', color: 'green' },
  { key: 'small_caps', name: 'Small Caps', color: 'orange' },
  { key: 'vwap_reversion', name: 'VWAP Reversion', color: 'cyan' },
  { key: 'intraday_1pct', name: '1% Spot', color: 'pink' },
]

export default function JournalPage() {
  const [selectedStrategy, setSelectedStrategy] = useState('all')
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list')

  const filteredTrades = selectedStrategy === 'all' 
    ? DEMO_TRADES 
    : DEMO_TRADES.filter(t => t.strategy.toLowerCase().replace(' ', '_') === selectedStrategy)

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
    bestTrade: filteredTrades.reduce((best, t) => t.pnl > best.pnl ? t : best, filteredTrades[0]),
    worstTrade: filteredTrades.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, filteredTrades[0]),
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">📔 Trading Journal</h1>
            <p className="text-gray-400">Documenta, analiza y aprende de cada trade</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              📋 Trades
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'stats' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              📊 Estadísticas
            </button>
          </div>
        </div>

        {/* Strategy Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STRATEGIES.map(s => (
            <button
              key={s.key}
              onClick={() => setSelectedStrategy(s.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedStrategy === s.key 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Trades</p>
            <p className="text-2xl font-bold">{stats.totalTrades}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Win Rate</p>
            <p className="text-2xl font-bold text-green-400">{stats.winRate}%</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Wins / Losses</p>
            <p className="text-2xl font-bold">
              <span className="text-green-400">{stats.wins}</span>
              <span className="text-gray-500"> / </span>
              <span className="text-red-400">{stats.losses}</span>
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total P&L</p>
            <p className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${stats.totalPnl.toFixed(0)}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Avg R Multiple</p>
            <p className={`text-2xl font-bold ${parseFloat(stats.avgRMultiple) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.avgRMultiple}R
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Expectancy</p>
            <p className={`text-2xl font-bold ${parseFloat(stats.avgRMultiple) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(parseFloat(stats.avgRMultiple) * parseFloat(stats.winRate) / 100).toFixed(2)}R
            </p>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trade List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-lg font-semibold text-gray-300 mb-3">Historial de Trades</h2>
              {filteredTrades.map(trade => (
                <button
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedTrade?.id === trade.id 
                      ? 'bg-blue-900/50 border-blue-500' 
                      : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`text-lg font-bold ${trade.status === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.asset}
                      </span>
                      <span className="text-gray-500 text-sm ml-2">{trade.direction}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      trade.status === 'WIN' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {trade.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{trade.strategy}</span>
                    <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(0)} ({trade.rMultiple}R)
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{trade.date}</p>
                </button>
              ))}
            </div>

            {/* Trade Detail */}
            <div className="lg:col-span-2">
              {selectedTrade ? (
                <div className="bg-gray-900 rounded-xl p-6 space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedTrade.asset} 
                        <span className={`ml-2 text-lg ${selectedTrade.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedTrade.direction}
                        </span>
                      </h2>
                      <p className="text-gray-400">{selectedTrade.strategy} • {selectedTrade.date}</p>
                    </div>
                    <div className={`text-right px-4 py-2 rounded-lg ${
                      selectedTrade.status === 'WIN' ? 'bg-green-900/50' : 'bg-red-900/50'
                    }`}>
                      <p className={`text-2xl font-bold ${selectedTrade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedTrade.pnl >= 0 ? '+' : ''}${selectedTrade.pnl.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {selectedTrade.pnlPercent >= 0 ? '+' : ''}{selectedTrade.pnlPercent.toFixed(1)}% • {selectedTrade.rMultiple}R
                      </p>
                    </div>
                  </div>

                  {/* Trade Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Entry</p>
                      <p className="text-lg font-semibold">${selectedTrade.entryPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Exit</p>
                      <p className="text-lg font-semibold">${selectedTrade.exitPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Size</p>
                      <p className="text-lg font-semibold">{selectedTrade.size}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">R Multiple</p>
                      <p className={`text-lg font-semibold ${selectedTrade.rMultiple >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedTrade.rMultiple}R
                      </p>
                    </div>
                  </div>

                  {/* Entry Reason */}
                  <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
                    <h3 className="text-blue-400 font-semibold mb-2">🎯 Razón de Entrada</h3>
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.entryReason}</pre>
                  </div>

                  {/* Exit Reason */}
                  <div className={`border rounded-lg p-4 ${
                    selectedTrade.status === 'WIN' 
                      ? 'bg-green-900/30 border-green-800' 
                      : 'bg-red-900/30 border-red-800'
                  }`}>
                    <h3 className={`font-semibold mb-2 ${selectedTrade.status === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedTrade.status === 'WIN' ? '📈' : '🛑'} Razón de Salida
                    </h3>
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.exitReason}</pre>
                  </div>

                  {/* What Went Well / Could Be Better */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-900/20 border border-green-900 rounded-lg p-4">
                      <h3 className="text-green-400 font-semibold mb-2">✅ What Went Well</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.whatWentWell}</pre>
                    </div>
                    <div className="bg-orange-900/20 border border-orange-900 rounded-lg p-4">
                      <h3 className="text-orange-400 font-semibold mb-2">⚠️ What Could Be Better</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.whatCouldBeBetter}</pre>
                    </div>
                  </div>

                  {/* Learnings */}
                  <div className="bg-purple-900/30 border border-purple-800 rounded-lg p-4">
                    <h3 className="text-purple-400 font-semibold mb-2">💡 Learnings</h3>
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{selectedTrade.learnings}</pre>
                  </div>

                  {/* Emotions */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-gray-400 font-semibold mb-2">🧠 Estado Emocional</h3>
                    <p className="text-gray-300 text-sm">{selectedTrade.emotions}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-xl p-12 text-center">
                  <p className="text-gray-500 text-lg">← Selecciona un trade para ver detalles</p>
                  <p className="text-gray-600 text-sm mt-2">Incluye razones de entrada/salida, learnings y emociones</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Stats View */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Best Trade */}
              {stats.bestTrade && (
                <div className="bg-green-900/30 border border-green-800 rounded-xl p-6">
                  <h3 className="text-green-400 font-semibold mb-4">🏆 Mejor Trade</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xl font-bold">{stats.bestTrade.asset}</span>
                    <span className="text-green-400 text-xl font-bold">+${stats.bestTrade.pnl.toFixed(0)}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{stats.bestTrade.strategy} • {stats.bestTrade.date}</p>
                  <p className="text-gray-300 text-sm mt-3">
                    <strong>Key learning:</strong> {stats.bestTrade.learnings.split('\n')[0]}
                  </p>
                </div>
              )}

              {/* Worst Trade */}
              {stats.worstTrade && (
                <div className="bg-red-900/30 border border-red-800 rounded-xl p-6">
                  <h3 className="text-red-400 font-semibold mb-4">📉 Peor Trade</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xl font-bold">{stats.worstTrade.asset}</span>
                    <span className="text-red-400 text-xl font-bold">${stats.worstTrade.pnl.toFixed(0)}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{stats.worstTrade.strategy} • {stats.worstTrade.date}</p>
                  <p className="text-gray-300 text-sm mt-3">
                    <strong>Lección:</strong> {stats.worstTrade.learnings.split('\n')[0]}
                  </p>
                </div>
              )}
            </div>

            {/* Key Learnings Summary */}
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">📚 Resumen de Learnings</h3>
              <div className="space-y-4">
                <div className="bg-purple-900/20 border border-purple-900 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">🎯 Reglas que funcionan:</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Esperar pullback a EMA20 en tendencia fuerte da mejor R:R</li>
                    <li>• ADX &gt; 25 es crítico para estrategias de tendencia</li>
                    <li>• Fake breaks en sesión asiática son muy fiables</li>
                    <li>• Filtro macro (SPY/BTC) previene pérdidas</li>
                  </ul>
                </div>
                <div className="bg-red-900/20 border border-red-900 rounded-lg p-4">
                  <h4 className="text-red-400 font-semibold mb-2">⚠️ Errores a evitar:</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• NO entrar con ADX &lt; 25 en estrategias de tendencia</li>
                    <li>• NO operar altcoins cuando BTC está débil</li>
                    <li>• NO entrar por aburrimiento - el mercado no debe entretenerte</li>
                    <li>• NO ignorar filtros de liquidez</li>
                  </ul>
                </div>
                <div className="bg-blue-900/20 border border-blue-900 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">💡 Para mejorar:</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Usar trailing stops más amplios cuando ADX &gt; 30</li>
                    <li>• Confiar más en setups muy limpios - aumentar size</li>
                    <li>• Usar limit orders en stocks para mejor ejecución</li>
                    <li>• Checklist de filtros ANTES de cada entrada</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer tip */}
        <div className="mt-8 bg-gray-900 rounded-lg p-4">
          <p className="text-gray-400 text-sm">
            💡 <strong>Tip:</strong> Documentar cada trade con razones y learnings es más valioso que el P&L. 
            Los mejores traders aprenden más de sus pérdidas que de sus ganancias.
          </p>
        </div>
      </div>
    </div>
  )
}
