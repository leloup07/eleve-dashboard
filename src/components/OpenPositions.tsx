'use client'

import { useState } from 'react'
import { useTradingStore } from '@/stores/tradingStore'
import { formatCurrency, formatPercent, formatNumber, getValueColorClass } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { Position } from '@/types'

// Función para formatear fecha/hora
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return {
    date: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    dayOfWeek: date.toLocaleDateString('es-ES', { weekday: 'long' }),
    full: date.toLocaleString('es-ES')
  }
}

// Calcular días desde apertura
function getDaysOpen(dateStr: string) {
  const openDate = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - openDate.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (diffDays === 0) return `${diffHours}h`
  return `${diffDays}d ${diffHours}h`
}

interface PositionRowProps {
  position: Position
  expanded?: boolean
  onToggle?: () => void
}

export function PositionRow({ position, expanded, onToggle }: PositionRowProps) {
  const unrealizedPnL = position.unrealizedPnL || 0
  const pnlColor = getValueColorClass(unrealizedPnL)
  const openDateTime = formatDateTime(position.openDate)
  const daysOpen = getDaysOpen(position.openDate)
  
  // Calcular R-Multiple actual
  const riskPerShare = position.entry - position.sl
  const currentPrice = position.currentPrice || position.entry
  const currentGain = currentPrice - position.entry
  const rMultiple = riskPerShare > 0 ? currentGain / riskPerShare : 0
  
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-0">
      {/* Fila principal */}
      <div 
        className="flex flex-wrap items-center justify-between p-3 md:p-4 hover:bg-gray-50 cursor-pointer transition-colors gap-2"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base md:text-lg text-gray-900">{position.ticker}</span>
              {position.partialTpTaken && (
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                  TP1✓
                </span>
              )}
              <span className={clsx(
                'px-1.5 py-0.5 rounded text-xs',
                position.mode === 'live' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              )}>
                {position.mode.toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-gray-500 truncate block">
              {position.strategy} • {daysOpen}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-5 text-sm">
          <div className="text-right">
            <span className="text-xs text-gray-500">Invertido</span>
            <p className="font-medium">{formatCurrency(position.investedAmount, 0)}</p>
            <span className="text-xs text-gray-400">{position.size} uds</span>
          </div>
          <div className="text-right hidden md:block">
            <span className="text-xs text-gray-500">Entry</span>
            <p className="font-medium">{formatCurrency(position.entry, 2)}</p>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs text-gray-500">Actual</span>
            <p className="font-medium">{formatCurrency(currentPrice, 2)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">PnL</span>
            <p className={clsx('font-bold', pnlColor)}>
              {unrealizedPnL >= 0 ? '+' : ''}${Math.abs(unrealizedPnL).toFixed(0)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">R</span>
            <p className={clsx('font-bold', pnlColor)}>
              {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
            </p>
          </div>
          <span className={clsx('transform transition-transform text-gray-400', expanded && 'rotate-180')}>
            ▼
          </span>
        </div>
      </div>
      
      {/* Detalles expandidos */}
      {expanded && (
        <div className="bg-gray-50 p-4 border-t border-gray-200 overflow-x-auto">
          {/* Fecha/Hora de apertura */}
          <div className="bg-white rounded-lg p-3 mb-4 border flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs text-gray-500 block">📅 Fecha</span>
              <span className="font-bold">{openDateTime.date}</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500 block">🕐 Hora</span>
              <span className="font-bold">{openDateTime.time}</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500 block">📆 Día</span>
              <span className="font-bold capitalize">{openDateTime.dayOfWeek}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">⏱️ Abierto</span>
              <span className="font-bold text-blue-600">{daysOpen}</span>
            </div>
          </div>
          
          {/* Precios */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-white rounded-lg p-3 border text-center">
              <span className="text-xs text-gray-500 block mb-1">Entry</span>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(position.entry, 2)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border text-center">
              <span className="text-xs text-gray-500 block mb-1">Actual</span>
              <p className={clsx('text-lg font-bold', pnlColor)}>{formatCurrency(currentPrice, 2)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
              <span className="text-xs text-red-600 block mb-1">Stop Loss</span>
              <p className="text-lg font-bold text-red-600">{formatCurrency(position.sl, 2)}</p>
              {position.partialTpTaken && position.sl === position.entry && (
                <span className="text-xs text-green-600">✓ BE</span>
              )}
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
              <span className="text-xs text-green-600 block mb-1">Take Profit</span>
              <p className="text-lg font-bold text-green-600">{formatCurrency(position.tp, 2)}</p>
            </div>
          </div>
          
          {/* SECCIÓN 1: ¿Por qué entró el bot? */}
          <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              🤖 ¿Por qué entró el bot?
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Condiciones cumplidas */}
              <div className="bg-white rounded-lg p-3">
                <h5 className="font-semibold text-gray-700 mb-2 text-sm">✅ Condiciones:</h5>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Precio {'>'} EMA20 {'>'} EMA50</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>ADX = {position.entryIndicators.adx} {'>'} 25</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>RSI = {position.entryIndicators.rsi}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Vol: {position.entryIndicators.volume}%</span>
                  </li>
                </ul>
              </div>
              
              {/* Indicadores al momento de entrada */}
              <div className="bg-white rounded-lg p-3">
                <h5 className="font-semibold text-gray-700 mb-2 text-sm">📊 Indicadores:</h5>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-1.5 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">RSI</span>
                    <span className={clsx('font-bold text-sm', 
                      position.entryIndicators.rsi >= 40 && position.entryIndicators.rsi <= 65 ? 'text-green-600' : 'text-yellow-600'
                    )}>{position.entryIndicators.rsi}</span>
                  </div>
                  <div className="text-center p-1.5 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">ADX</span>
                    <span className={clsx('font-bold text-sm',
                      position.entryIndicators.adx > 25 ? 'text-green-600' : 'text-yellow-600'
                    )}>{position.entryIndicators.adx}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">Vol%</span>
                    <span className={clsx('font-bold',
                      position.entryIndicators.volume > 100 ? 'text-green-600' : 'text-yellow-600'
                    )}>{position.entryIndicators.volume}%</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">EMA20</span>
                    <span className="font-bold text-gray-700">{formatCurrency(position.entryIndicators.ema20, 0)}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">EMA50</span>
                    <span className="font-bold text-gray-700">{formatCurrency(position.entryIndicators.ema50, 0)}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">ATR</span>
                    <span className="font-bold text-gray-700">{formatNumber(position.entryIndicators.atr, 2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-2 text-sm">📝 Razón específica de entrada:</h5>
              <p className="text-gray-700">{position.entryReason}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-gray-500">Calidad del setup:</span>
                <span className={clsx(
                  'px-3 py-1 rounded-full text-sm font-bold',
                  position.entryGrade.startsWith('A') ? 'bg-green-100 text-green-700' :
                  position.entryGrade.startsWith('B') ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                )}>
                  Grade {position.entryGrade}
                </span>
              </div>
            </div>
          </div>
          
          {/* SECCIÓN 2: Gestión del Riesgo */}
          <div className="bg-purple-50 rounded-xl p-5 mb-5 border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-4 text-lg flex items-center gap-2">
              ⚙️ Gestión del Riesgo
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-red-600 mb-2 text-sm">🛑 Stop Loss</h5>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(position.sl, 2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {position.entryIndicators?.atr > 0 ? ((position.entry - position.sl) / position.entryIndicators.atr).toFixed(1) : "N/A"}x ATR bajo entrada
                </p>
                <p className="text-xs text-gray-500">
                  Riesgo máximo: {formatCurrency(Math.abs(position.entry - position.sl) * position.size, 0)}
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-yellow-600 mb-2 text-sm">🎯 Take Profit 1 (50%)</h5>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(position.entry + (position.tp - position.entry) * 0.6, 2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">~2R sobre entrada</p>
                {position.partialTpTaken ? (
                  <>
                    <p className="text-xs text-green-600 font-medium mt-1">✅ ALCANZADO</p>
                    <p className="text-xs text-blue-600 mt-1">📈 SL subido a TP1</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Cerrar 50% de posición</p>
                )}
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-green-600 mb-2 text-sm">
                  {position.partialTpTaken ? '📈 Trailing Stop Activo' : '🎯 Tras TP1: Trailing'}
                </h5>
                {position.partialTpTaken ? (
                  <>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(position.sl, 2)}</p>
                    <p className="text-xs text-gray-500 mt-1">SL actual (2x ATR desde max)</p>
                    <p className="text-xs text-green-600 font-medium">🎯 Sin TP2 fijo - dejando correr</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-green-600">∞</p>
                    <p className="text-xs text-gray-500 mt-1">Sin límite fijo</p>
                    <p className="text-xs text-gray-500">Trailing 2x ATR desde máximo</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-lg text-sm">
              <strong>📐 Estrategia v4:</strong> TP1 a 2R (50%) → SL según régimen ADX (RANGE: TP1 / TRANSITION-TREND: BE) → Trailing siempre activo
            </div>
          </div>
          
          {/* SECCIÓN 3: Estado actual */}
          <div className={clsx(
            'rounded-xl p-5 border',
            unrealizedPnL >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          )}>
            <h4 className={clsx(
              'font-bold mb-4 text-lg flex items-center gap-2',
              unrealizedPnL >= 0 ? 'text-green-900' : 'text-red-900'
            )}>
              📊 Estado Actual de la Posición
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <span className="text-xs text-gray-500 block">PnL No Realizado</span>
                <span className={clsx('font-bold text-xl', pnlColor)}>
                  {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL)}
                </span>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <span className="text-xs text-gray-500 block">R-Multiple</span>
                <span className={clsx('font-bold text-xl', pnlColor)}>
                  {rMultiple >= 0 ? '+' : ''}{formatNumber(rMultiple, 2)}R
                </span>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <span className="text-xs text-gray-500 block">Max Price</span>
                <span className="font-bold text-xl">{formatCurrency(position.maxPrice, 2)}</span>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <span className="text-xs text-gray-500 block">% desde máximo</span>
                <span className="font-bold text-xl">
                  {formatNumber(((currentPrice - (position.maxPrice || currentPrice)) / (position.maxPrice || currentPrice)) * 100, 1)}%
                </span>
              </div>
            </div>
            
            {position.partialTpTaken && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <span className="text-xl">✅</span>
                  <span>TP1 alcanzado - 50% de posición cerrada con ganancias</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  El trailing stop está activo para proteger el 50% restante mientras busca TP2.
                  El Stop Loss se ha movido a breakeven ({formatCurrency(position.entry, 2)}).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function OpenPositions() {
  const positions = useTradingStore(state => state.positions)
  const btcRegime = useTradingStore(state => state.btcRegime)
  const spyRegime = useTradingStore(state => state.spyRegime)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [expandAll, setExpandAll] = useState(false)
  
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }
  
  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedIds(new Set())
    } else {
      setExpandedIds(new Set(positions.map(p => p.id)))
    }
    setExpandAll(!expandAll)
  }
  
  if (positions.length === 0) {
    const blocked = btcRegime !== 'BULL' && spyRegime !== 'BULL'
    return (
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📋 Posiciones Abiertas</h3>
        <div className="text-center py-8 text-gray-500">
          <span className="text-5xl mb-4 block">📭</span>
          <p className="text-lg">{blocked 
            ? 'No hay posiciones. Trading bloqueado (régimen BEAR/RANGE)'
            : 'No hay posiciones abiertas. Esperando setup.'}</p>
        </div>
      </div>
    )
  }
  
  // Calcular totales
  const totalInvested = positions.reduce((sum, p) => sum + p.investedAmount, 0)
  const totalPnL = positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0)
  
  return (
    <div className="bg-white rounded-xl border p-4 md:p-6 overflow-hidden min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">📋 Posiciones Abiertas</h3>
          <p className="text-xs text-gray-500 hidden sm:block">Clic para ver análisis</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <span className="text-gray-500">
            ${totalInvested.toLocaleString('es-ES', {maximumFractionDigits: 0})}
          </span>
          <span className={clsx('font-bold', getValueColorClass(totalPnL))}>
            {totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toFixed(0)}
          </span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
            {positions.length}
          </span>
          <button
            onClick={toggleExpandAll}
            className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            {expandAll ? '🔼' : '🔽'}
          </button>
        </div>
      </div>
      
      <div className="space-y-3 overflow-x-auto min-w-0">
        {positions.map(pos => (
          <PositionRow 
            key={pos.id} 
            position={pos}
            expanded={expandedIds.has(pos.id)}
            onToggle={() => toggleExpand(pos.id)}
          />
        ))}
      </div>
    </div>
  )
}
