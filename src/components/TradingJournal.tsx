'use client'

import { useState } from 'react'
import { useTradingStore } from '@/stores/tradingStore'
import { formatCurrency, formatPercent, formatNumber, getValueColorClass, getValueBgClass } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { Trade } from '@/types'

interface TradeDetailProps {
  trade: Trade
}

function TradeDetail({ trade }: TradeDetailProps) {
  const [expanded, setExpanded] = useState(false)
  const pnlColor = getValueColorClass(trade.pnl)
  
  // Formatear fechas
  const openDate = new Date(trade.openDate)
  const closeDate = new Date(trade.closeDate)
  const openDateTime = {
    date: openDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: openDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    dayOfWeek: openDate.toLocaleDateString('es-ES', { weekday: 'long' })
  }
  const closeDateTime = {
    date: closeDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: closeDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    dayOfWeek: closeDate.toLocaleDateString('es-ES', { weekday: 'long' })
  }
  
  const resultInfo = {
    'TP': { emoji: '🟢', label: 'Take Profit', color: 'bg-green-100 text-green-700', desc: 'Objetivo alcanzado' },
    'TP1': { emoji: '🟡', label: 'TP1 Parcial', color: 'bg-yellow-100 text-yellow-700', desc: '50% cerrado, resto en trailing' },
    'TP2': { emoji: '🟢', label: 'TP2 Completo', color: 'bg-green-100 text-green-700', desc: 'Objetivo máximo alcanzado' },
    'SL': { emoji: '🔴', label: 'Stop Loss', color: 'bg-red-100 text-red-700', desc: 'Pérdida controlada' },
    'BE': { emoji: '⚪', label: 'Breakeven', color: 'bg-gray-100 text-gray-700', desc: 'Salida sin pérdida ni ganancia' },
    'TRAIL': { emoji: '🟢', label: 'Trailing Stop', color: 'bg-green-100 text-green-700', desc: 'Ganancia protegida por trailing' }
  }[trade.result] || { emoji: '⚪', label: trade.result, color: 'bg-gray-100', desc: '' }
  
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm">
      {/* Cabecera del trade */}
      <div 
        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="text-3xl">{resultInfo.emoji}</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg text-gray-900">{trade.ticker}</span>
              <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', resultInfo.color)}>
                {resultInfo.label}
              </span>
              <span className={clsx(
                'px-2 py-0.5 rounded text-xs',
                trade.mode === 'live' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              )}>
                {trade.mode.toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-500">{trade.strategy} • {trade.holdingDays} días</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-gray-500">Invertido</span>
            <p className="font-semibold">{formatCurrency(trade.investedAmount)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">PnL</span>
            <p className={clsx('font-bold text-lg', pnlColor)}>
              {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">R</span>
            <p className={clsx('font-bold text-lg', pnlColor)}>
              {trade.rMultiple >= 0 ? '+' : ''}{formatNumber(trade.rMultiple, 2)}R
            </p>
          </div>
          <span className={clsx('transform transition-transform text-gray-400', expanded && 'rotate-180')}>
            ▼
          </span>
        </div>
      </div>
      
      {/* Detalles expandidos */}
      {expanded && (
        <div className="bg-gray-50 p-6 border-t border-gray-200">
          {/* Fecha y hora de entrada/salida */}
          <div className="bg-white rounded-xl p-4 mb-5 border">
            <h4 className="font-semibold text-gray-700 mb-3 text-sm">📅 Timing del Trade</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <span className="text-xs text-blue-600 block mb-1">📥 Entrada</span>
                <p className="font-bold text-gray-900">{openDateTime.date}</p>
                <p className="text-lg font-bold text-blue-600">{openDateTime.time}</p>
                <p className="text-xs text-gray-500 capitalize">{openDateTime.dayOfWeek}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <span className="text-xs text-orange-600 block mb-1">📤 Salida</span>
                <p className="font-bold text-gray-900">{closeDateTime.date}</p>
                <p className="text-lg font-bold text-orange-600">{closeDateTime.time}</p>
                <p className="text-xs text-gray-500 capitalize">{closeDateTime.dayOfWeek}</p>
              </div>
              <div className="text-center p-3 bg-gray-100 rounded-lg">
                <span className="text-xs text-gray-600 block mb-1">⏱️ Duración</span>
                <p className="text-2xl font-bold text-gray-900">{trade.holdingDays}</p>
                <p className="text-xs text-gray-500">días</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <span className="text-xs text-purple-600 block mb-1">📊 Sesión entrada</span>
                <p className="font-bold text-gray-900">
                  {parseInt(openDateTime.time) < 12 ? 'Mañana' : 
                   parseInt(openDateTime.time) < 17 ? 'Tarde' : 'Noche'}
                </p>
                <p className="text-xs text-gray-500">
                  {parseInt(openDateTime.time) >= 14 && parseInt(openDateTime.time) <= 16 
                    ? '✓ Apertura US' 
                    : parseInt(openDateTime.time) >= 8 && parseInt(openDateTime.time) <= 10
                    ? '✓ Apertura EU'
                    : ''}
                </p>
              </div>
            </div>
          </div>
          
          {/* Resumen visual del trade */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-lg p-4 border text-center">
              <span className="text-xs text-gray-500 block mb-1">Entry</span>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(trade.entry, 2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border text-center">
              <span className="text-xs text-gray-500 block mb-1">Exit</span>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(trade.exit, 2)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200 text-center">
              <span className="text-xs text-red-600 block mb-1">Stop Loss</span>
              <p className="text-xl font-bold text-red-600">{formatCurrency(trade.sl, 2)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
              <span className="text-xs text-green-600 block mb-1">Take Profit</span>
              <p className="text-xl font-bold text-green-600">{formatCurrency(trade.tp, 2)}</p>
            </div>
          </div>
          
          {/* SECCIÓN 1: ¿Por qué entró el bot? */}
          <div className="bg-blue-50 rounded-xl p-5 mb-5 border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-4 text-lg flex items-center gap-2">
              🤖 ¿Por qué entró el bot en {trade.ticker}?
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Condiciones cumplidas */}
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3 text-sm">✅ Condiciones de entrada cumplidas:</h5>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span><strong>Tendencia:</strong> Precio {'>'} EMA20 {'>'} EMA50 (estructura alcista)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span><strong>Fuerza:</strong> ADX = {trade.entryIndicators.adx} {'>'} 25 (tendencia con fuerza)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span><strong>Momentum:</strong> RSI = {trade.entryIndicators.rsi} en zona óptima (40-65)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span><strong>Volumen:</strong> {trade.entryIndicators.volume}% vs media (confirmación)</span>
                  </li>
                </ul>
              </div>
              
              {/* Indicadores al momento de entrada */}
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3 text-sm">📊 Indicadores al entrar:</h5>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">RSI</span>
                    <span className={clsx('font-bold', 
                      trade.entryIndicators.rsi >= 40 && trade.entryIndicators.rsi <= 65 ? 'text-green-600' : 'text-yellow-600'
                    )}>{trade.entryIndicators.rsi}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">ADX</span>
                    <span className={clsx('font-bold',
                      trade.entryIndicators.adx > 25 ? 'text-green-600' : 'text-yellow-600'
                    )}>{trade.entryIndicators.adx}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">Vol%</span>
                    <span className={clsx('font-bold',
                      trade.entryIndicators.volume > 100 ? 'text-green-600' : 'text-yellow-600'
                    )}>{trade.entryIndicators.volume}%</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">EMA20</span>
                    <span className="font-bold text-gray-700">{formatCurrency(trade.entryIndicators.ema20, 0)}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">EMA50</span>
                    <span className="font-bold text-gray-700">{formatCurrency(trade.entryIndicators.ema50, 0)}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">ATR</span>
                    <span className="font-bold text-gray-700">{formatNumber(trade.entryIndicators.atr, 2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-2 text-sm">📝 Razón específica de entrada:</h5>
              <p className="text-gray-700">{trade.entryReason}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-gray-500">Calidad del setup:</span>
                <span className={clsx(
                  'px-3 py-1 rounded-full text-sm font-bold',
                  trade.entryGrade.startsWith('A') ? 'bg-green-100 text-green-700' :
                  trade.entryGrade.startsWith('B') ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                )}>
                  Grade {trade.entryGrade}
                </span>
              </div>
            </div>
          </div>
          
          {/* SECCIÓN 2: Gestión del trade */}
          <div className="bg-purple-50 rounded-xl p-5 mb-5 border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-4 text-lg flex items-center gap-2">
              ⚙️ Gestión del Riesgo
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-red-600 mb-2 text-sm">🛑 Stop Loss</h5>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(trade.sl, 2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((trade.entry - trade.sl) / trade.entryIndicators.atr).toFixed(1)}x ATR bajo entrada
                </p>
                <p className="text-xs text-gray-500">
                  Riesgo máximo: {formatCurrency(Math.abs(trade.entry - trade.sl) * trade.size, 0)}
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-green-600 mb-2 text-sm">🎯 Take Profit 1 (50%)</h5>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(trade.entry + (trade.tp - trade.entry) * 0.6, 2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">~3x ATR sobre entrada</p>
                <p className="text-xs text-gray-500">Cerrar 50% de posición</p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-green-600 mb-2 text-sm">🎯 Take Profit 2 (50%)</h5>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(trade.tp, 2)}</p>
                <p className="text-xs text-gray-500 mt-1">~5x ATR sobre entrada</p>
                <p className="text-xs text-gray-500">Trailing stop para el resto</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-lg text-sm">
              <strong>📐 Ratio Riesgo/Beneficio:</strong> 1:{((trade.tp - trade.entry) / (trade.entry - trade.sl)).toFixed(1)} 
              <span className="text-gray-500 ml-2">
                (Objetivo mínimo: 1:2)
              </span>
            </div>
          </div>
          
          {/* SECCIÓN 3: ¿Qué pasó? (Salida) */}
          <div className={clsx(
            'rounded-xl p-5 mb-5 border',
            trade.pnl >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          )}>
            <h4 className={clsx(
              'font-bold mb-4 text-lg flex items-center gap-2',
              trade.pnl >= 0 ? 'text-green-900' : 'text-red-900'
            )}>
              {trade.pnl >= 0 ? '✅' : '❌'} ¿Qué pasó? - {resultInfo.label}
            </h4>
            
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-gray-700 font-medium">{trade.exitReason}</p>
              {trade.regime && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Régimen ADX:</span>
                  <span className={clsx(
                    'px-2 py-1 rounded text-xs font-bold',
                    trade.regime === 'RANGE' ? 'bg-yellow-100 text-yellow-700' :
                    trade.regime === 'TREND' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  )}>
                    {trade.regime === 'RANGE' ? '📊 RANGE (SL→TP1)' :
                     trade.regime === 'TREND' ? '📈 TREND (SL→BE, trailing holgado)' :
                     '⚖️ TRANSITION (SL→BE)'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <span className="text-xs text-gray-500 block">RSI al salir</span>
                <span className={clsx('font-bold text-lg',
                  trade.exitIndicators.rsi > 70 ? 'text-red-600' : 
                  trade.exitIndicators.rsi < 30 ? 'text-green-600' : 'text-gray-700'
                )}>{trade.exitIndicators.rsi}</span>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <span className="text-xs text-gray-500 block">MACD</span>
                <span className={clsx('font-bold text-lg',
                  trade.exitIndicators.macd > 0 ? 'text-green-600' : 'text-red-600'
                )}>{formatNumber(trade.exitIndicators.macd, 1)}</span>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <span className="text-xs text-gray-500 block">Precio salida</span>
                <span className="font-bold text-lg">{formatCurrency(trade.exitIndicators.price, 2)}</span>
              </div>
            </div>
            
            <div className={clsx(
              'mt-4 p-4 rounded-lg text-center',
              trade.pnl >= 0 ? 'bg-green-100' : 'bg-red-100'
            )}>
              <span className="text-sm text-gray-600 block mb-1">Resultado final</span>
              <span className={clsx('text-3xl font-bold', pnlColor)}>
                {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)} ({trade.rMultiple >= 0 ? '+' : ''}{formatNumber(trade.rMultiple, 2)}R)
              </span>
            </div>
          </div>
          
          {/* SECCIÓN 4: Lecciones aprendidas */}
          <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
            <h4 className="font-bold text-yellow-900 mb-4 text-lg flex items-center gap-2">
              🎓 Lecciones Aprendidas
            </h4>
            <ul className="space-y-3">
              {trade.lessons.map((lesson, idx) => (
                <li key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg">
                  <span className="text-xl">{lesson.startsWith('✅') ? '✅' : lesson.startsWith('❌') ? '❌' : lesson.startsWith('📊') ? '📊' : lesson.startsWith('💡') ? '💡' : '•'}</span>
                  <span className="text-gray-700">{lesson.replace(/^[✅❌📊💡]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export function TradingJournal() {
  const trades = useTradingStore(state => state.trades)
  const [filter, setFilter] = useState<'all' | 'crypto' | 'stocks'>('all')
  
  const filteredTrades = trades.filter(t => {
    if (filter === 'all') return true
    if (filter === 'crypto') return t.strategy.includes('crypto')
    return !t.strategy.includes('crypto')
  })
  
  // Estadísticas
  const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0)
  const winners = filteredTrades.filter(t => t.pnl > 0)
  const losers = filteredTrades.filter(t => t.pnl < 0)
  const winRate = filteredTrades.length > 0 ? (winners.length / filteredTrades.length) * 100 : 0
  const avgR = filteredTrades.length > 0 
    ? filteredTrades.reduce((sum, t) => sum + t.rMultiple, 0) / filteredTrades.length 
    : 0
  const avgWin = winners.length > 0 ? winners.reduce((sum, t) => sum + t.rMultiple, 0) / winners.length : 0
  const avgLoss = losers.length > 0 ? losers.reduce((sum, t) => sum + t.rMultiple, 0) / losers.length : 0
  const profitFactor = losers.length > 0 && winners.length > 0
    ? Math.abs(winners.reduce((sum, t) => sum + t.pnl, 0) / losers.reduce((sum, t) => sum + t.pnl, 0))
    : 0
  
  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📔 Trading Journal</h2>
            <p className="text-gray-500 text-sm">Historial detallado de todos los trades con análisis completo</p>
          </div>
          <div className="flex gap-2">
            {(['all', 'crypto', 'stocks'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  filter === f 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {f === 'all' ? 'Todos' : f === 'crypto' ? '₿ Crypto' : '📈 Stocks'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <span className="text-xs text-gray-500 uppercase block mb-1">Trades</span>
            <p className="text-2xl font-bold text-gray-900">{filteredTrades.length}</p>
            <span className="text-xs text-gray-500">{winners.length}W / {losers.length}L</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <span className="text-xs text-gray-500 uppercase block mb-1">PnL Total</span>
            <p className={clsx('text-2xl font-bold', getValueColorClass(totalPnL))}>
              {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <span className="text-xs text-gray-500 uppercase block mb-1">Win Rate</span>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(winRate, 0)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <span className="text-xs text-gray-500 uppercase block mb-1">Avg R</span>
            <p className={clsx('text-2xl font-bold', getValueColorClass(avgR))}>
              {avgR >= 0 ? '+' : ''}{formatNumber(avgR, 2)}R
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <span className="text-xs text-gray-500 uppercase block mb-1">Profit Factor</span>
            <p className={clsx('text-2xl font-bold', profitFactor >= 1.5 ? 'text-green-600' : profitFactor >= 1 ? 'text-yellow-600' : 'text-red-600')}>
              {formatNumber(profitFactor, 2)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <span className="text-xs text-gray-500 uppercase block mb-1">Avg W / Avg L</span>
            <p className="text-lg font-bold">
              <span className="text-green-600">+{formatNumber(avgWin, 1)}R</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-red-600">{formatNumber(avgLoss, 1)}R</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Leyenda de resultados */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📖 Guía de resultados:</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1"><span className="text-xl">🟢</span> TP/TP2/TRAIL = Ganancia completa</span>
          <span className="flex items-center gap-1"><span className="text-xl">🟡</span> TP1 = Ganancia parcial (50%), resto en trailing</span>
          <span className="flex items-center gap-1"><span className="text-xl">🔴</span> SL = Pérdida controlada</span>
          <span className="flex items-center gap-1"><span className="text-xl">⚪</span> BE = Breakeven</span>
        </div>
      </div>
      
      {/* Lista de trades */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-2">📋 Historial de Trades</h3>
        <p className="text-sm text-gray-500 mb-4">
          Haz clic en cada trade para ver el análisis completo: razón de entrada, gestión de riesgo, salida y lecciones aprendidas.
        </p>
        
        {filteredTrades.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">📭</span>
            <p className="text-lg">No hay trades completados todavía</p>
            <p className="text-sm mt-2">Los trades aparecerán aquí cuando el bot cierre posiciones</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...filteredTrades].reverse().map(trade => (
              <TradeDetail key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
