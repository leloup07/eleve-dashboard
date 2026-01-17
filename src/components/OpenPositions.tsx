'use client'

import { useState } from 'react'
import { useTradingStore } from '@/stores/tradingStore'
import { formatCurrency, formatPercent, formatNumber, getValueColorClass } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { Position } from '@/types'

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return {
    date: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    dayOfWeek: date.toLocaleDateString('es-ES', { weekday: 'long' }),
    full: date.toLocaleString('es-ES')
  }
}

function getDaysOpen(dateStr: string) {
  const openDate = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - openDate.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (diffDays === 0) return `${diffHours}h`
  return `${diffDays}d ${diffHours}h`
}

function isCrypto(ticker: string): boolean {
  const cryptoTickers = ['BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'LINK', 'DOT', 'ADA', 'MATIC', 'ATOM']
  return cryptoTickers.some(c => ticker.toUpperCase().includes(c))
}

function formatUnits(size: number, ticker: string): string {
  if (isCrypto(ticker)) {
    if (size >= 1) return size.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    return size.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 8 })
  } else {
    return Math.round(size).toLocaleString('es-ES')
  }
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
  
  const currentPrice = position.currentPrice || position.entry
  
  // ATR para calcular riesgo original (2x ATR fue el SL original)
  const atr = position.entryIndicators?.atr || 0
  
  // Riesgo original = 2x ATR (así se puso el SL al entrar)
  const originalRisk = atr > 0 ? atr * 2 : (position.entry * 0.03) // fallback 3%
  
  // R-Multiple basado en riesgo original
  const currentGain = currentPrice - position.entry
  const rMultiple = originalRisk > 0 ? currentGain / originalRisk : 0
  
  // TP1 = Entry + 2R (donde R = riesgo original)
  const tp1Price = position.entry + (originalRisk * 2)
  
  // Unidades
  const originalUnits = position.partialTpTaken ? position.size * 2 : position.size
  const soldUnits = position.partialTpTaken ? position.size : 0
  const remainingUnits = position.size
  
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-0">
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
            <span className="text-xs text-gray-400">{formatUnits(remainingUnits, position.ticker)} uds</span>
          </div>
          <div className="text-right hidden lg:block">
            <span className="text-xs text-gray-500">ATR</span>
            <p className="font-medium">${position.atr?.toFixed(2) || —}</p>
          </div>
          <div className="text-right hidden lg:block">
            <span className="text-xs text-gray-500">R ($)</span>
            <p className="font-medium">${position.riskPerShare?.toFixed(2) || —}</p>
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
      
      {expanded && (
        <div className="bg-gray-50 p-4 border-t border-gray-200 overflow-x-auto">
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
          
          <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
            <h5 className="font-semibold text-blue-900 mb-2 text-sm">📦 Unidades</h5>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded p-2">
                <span className="text-xs text-gray-500 block">Compradas</span>
                <span className="font-bold">{formatUnits(originalUnits, position.ticker)}</span>
              </div>
              <div className={clsx('rounded p-2', position.partialTpTaken ? 'bg-green-100' : 'bg-white')}>
                <span className="text-xs text-gray-500 block">Vendidas</span>
                <span className={clsx('font-bold', position.partialTpTaken ? 'text-green-600' : 'text-gray-400')}>
                  {formatUnits(soldUnits, position.ticker)}
                </span>
              </div>
              <div className="bg-yellow-50 rounded p-2">
                <span className="text-xs text-gray-500 block">En cartera</span>
                <span className="font-bold text-yellow-700">{formatUnits(remainingUnits, position.ticker)}</span>
              </div>
            </div>
          </div>
          
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
              {position.partialTpTaken && position.sl >= position.entry && (
                <span className="text-xs text-green-600">✓ En BE o mejor</span>
              )}
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
              <span className="text-xs text-green-600 block mb-1">Take Profit Final</span>
              <p className="text-lg font-bold text-green-600">{formatCurrency(position.tp, 2)}</p>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              🤖 ¿Por qué entró el bot?
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="bg-white rounded-lg p-3">
                <h5 className="font-semibold text-gray-700 mb-2 text-sm">✅ Condiciones:</h5>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Precio {'>'} EMA20 {'>'} EMA50</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>ADX = {position.entryIndicators?.adx ?? 'N/A'} {'>'} 25</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>RSI = {position.entryIndicators?.rsi ?? 'N/A'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Vol: {position.entryIndicators?.volume ?? 'N/A'}%</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-3">
                <h5 className="font-semibold text-gray-700 mb-2 text-sm">📊 Indicadores:</h5>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-1.5 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">RSI</span>
                    <span className={clsx('font-bold text-sm', 
                      (position.entryIndicators?.rsi ?? 0) >= 40 && (position.entryIndicators?.rsi ?? 0) <= 65 ? 'text-green-600' : 'text-yellow-600'
                    )}>{position.entryIndicators?.rsi ?? 'N/A'}</span>
                  </div>
                  <div className="text-center p-1.5 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">ADX</span>
                    <span className={clsx('font-bold text-sm',
                      (position.entryIndicators?.adx ?? 0) > 25 ? 'text-green-600' : 'text-yellow-600'
                    )}>{position.entryIndicators?.adx ?? 'N/A'}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">Vol%</span>
                    <span className={clsx('font-bold',
                      (position.entryIndicators?.volume ?? 0) > 100 ? 'text-green-600' : 'text-yellow-600'
                    )}>{position.entryIndicators?.volume ?? 'N/A'}%</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">EMA20</span>
                    <span className="font-bold text-gray-700">{formatCurrency(position.entryIndicators?.ema20 ?? 0, 0)}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">EMA50</span>
                    <span className="font-bold text-gray-700">{formatCurrency(position.entryIndicators?.ema50 ?? 0, 0)}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500 block">ATR</span>
                    <span className="font-bold text-gray-700">{atr > 0 ? formatNumber(atr, 2) : 'N/A'}</span>
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
                  position.entryGrade?.startsWith('A') ? 'bg-green-100 text-green-700' :
                  position.entryGrade?.startsWith('B') ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                )}>
                  Grade {position.entryGrade || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-5 mb-5 border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-4 text-lg flex items-center gap-2">
              ⚙️ Gestión del Riesgo
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-red-600 mb-2 text-sm">🛑 Stop Loss</h5>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(position.sl, 2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {atr > 0 ? `Riesgo original: 2x ATR = ${formatCurrency(originalRisk, 2)}` : 'ATR no disponible'}
                </p>
                <p className="text-xs text-gray-500">
                  Riesgo actual: {formatCurrency(Math.abs(currentPrice - position.sl) * remainingUnits, 0)}
                </p>
                {position.partialTpTaken && (
                  <p className="text-xs text-green-600 mt-1">✓ SL subido tras TP1</p>
                )}
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-yellow-600 mb-2 text-sm">🎯 Take Profit 1 (50%)</h5>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(tp1Price, 2)}</p>
                <p className="text-xs text-gray-500 mt-1">Precio objetivo = Entry + 2R</p>
                {position.partialTpTaken ? (
                  <>
                    <p className="text-xs text-green-600 font-medium mt-1">✅ ALCANZADO</p>
                    <p className="text-xs text-green-600">
                      Vendidas {formatUnits(soldUnits, position.ticker)} uds a ~{formatCurrency(tp1Price, 2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">📈 SL subido a BE</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">
                      Al alcanzar: vender {formatUnits(originalUnits / 2, position.ticker)} uds
                    </p>
                    <p className="text-xs text-gray-500">Luego subir SL a breakeven</p>
                  </>
                )}
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-semibold text-green-600 mb-2 text-sm">
                  📈 Trailing Stop {position.partialTpTaken ? '(Activo)' : '(Tras TP1)'}
                </h5>
                {position.partialTpTaken ? (
                  <>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(position.sl, 2)}</p>
                    <p className="text-xs text-gray-500 mt-1">SL actual = Max Price - 2x ATR</p>
                    <p className="text-xs text-yellow-600">
                      Protegiendo {formatUnits(remainingUnits, position.ticker)} uds restantes
                    </p>
                    <p className="text-xs text-green-600 font-medium mt-1">
                      🎯 Sin TP fijo - dejando correr ganancias
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Max alcanzado: {formatCurrency(position.maxPrice || currentPrice, 2)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-green-600">Pendiente</p>
                    <p className="text-xs text-gray-500 mt-1">Se activa tras TP1</p>
                    <p className="text-xs text-gray-500">
                      Seguirá al precio: SL = Max - 2x ATR
                    </p>
                    <p className="text-xs text-gray-500">
                      Aplicará a {formatUnits(originalUnits / 2, position.ticker)} uds restantes
                    </p>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-lg text-sm">
              <strong>📐 Estrategia Swing v4.3:</strong>
              <ol className="list-decimal list-inside mt-2 text-gray-600 space-y-1">
                <li>Entrada: comprar {formatUnits(originalUnits, position.ticker)} uds a {formatCurrency(position.entry, 2)}</li>
                <li>TP1 ({formatCurrency(tp1Price, 2)}): vender 50% ({formatUnits(originalUnits / 2, position.ticker)} uds), subir SL a BE</li>
                <li>Trailing: SL sigue al precio (Max - 2x ATR), sin límite de ganancias</li>
                <li>Salida: cuando el trailing stop se ejecuta o el mercado cierra la posición</li>
              </ol>
            </div>
          </div>
          
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
                <span className="font-bold text-xl">{formatCurrency(position.maxPrice || currentPrice, 2)}</span>
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
                  <span>TP1 alcanzado - {formatUnits(soldUnits, position.ticker)} uds vendidas con ganancia</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  El trailing stop protege las {formatUnits(remainingUnits, position.ticker)} unidades restantes.
                  El SL actual ({formatCurrency(position.sl, 2)}) sube automáticamente según el precio máximo alcanzado.
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
            ? 'No hay posiciones. Trading bloqueado por régimen.'
            : 'No hay posiciones abiertas. Esperando setup.'}</p>
        </div>
      </div>
    )
  }
  
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
