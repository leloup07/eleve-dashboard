'use client'

import { useTradingStore } from '@/stores/tradingStore'
import { formatCurrency, formatPercent, formatNumber, formatRatio, getValueColorClass } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { Position, Trade } from '@/types'

interface StrategyPageProps {
  strategyKey: string
}

function PositionCard({ position }: { position: Position }) {
  const pnlColor = getValueColorClass(position.unrealizedPnL || 0)
  
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold text-lg">{position.ticker}</h4>
          <span className="text-xs text-gray-500">Abierta: {new Date(position.openDate).toLocaleDateString('es-ES')}</span>
        </div>
        <span className={clsx('badge', position.mode === 'live' ? 'badge-danger' : 'badge-info')}>
          {position.mode.toUpperCase()}
        </span>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-xs text-gray-500">Invertido</span>
          <p className="font-bold text-blue-600">{formatCurrency(position.investedAmount)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Entry</span>
          <p className="font-semibold">{formatCurrency(position.entry, 2)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Actual</span>
          <p className="font-semibold">{formatCurrency(position.currentPrice, 2)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">PnL</span>
          <p className={clsx('font-bold', pnlColor)}>
            {formatCurrency(position.unrealizedPnL, 0)}
            <span className="text-xs ml-1">({position.unrealizedPnLPercent && position.unrealizedPnLPercent >= 0 ? '+' : ''}{formatNumber(position.unrealizedPnLPercent || 0, 1)}%)</span>
          </p>
        </div>
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-red-600">SL: {formatCurrency(position.sl, 2)}</span>
        <span className="text-green-600">TP: {formatCurrency(position.tp, 2)}</span>
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <p className="text-sm text-gray-600">
          <strong>Razón de entrada:</strong> {position.entryReason}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="badge badge-success">{position.entryGrade}</span>
          <span className="text-xs text-gray-500">RSI: {position.entryIndicators.rsi} | ADX: {position.entryIndicators.adx}</span>
        </div>
      </div>
    </div>
  )
}

function TradeRow({ trade }: { trade: Trade }) {
  const pnlColor = getValueColorClass(trade.pnl)
  const resultEmoji = { 'TP': '🟢', 'TP1': '🟡', 'TP2': '🟢', 'SL': '🔴', 'BE': '⚪', 'TRAIL': '🟢' }[trade.result] || '⚪'
  
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span>{resultEmoji}</span>
          <span className="font-medium">{trade.ticker}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={clsx('badge', trade.pnl >= 0 ? 'badge-success' : 'badge-danger')}>
          {trade.result}
        </span>
      </td>
      <td className="px-4 py-3 font-semibold text-blue-600">
        {formatCurrency(trade.investedAmount)}
      </td>
      <td className="px-4 py-3">{formatCurrency(trade.entry, 2)}</td>
      <td className="px-4 py-3">{formatCurrency(trade.exit, 2)}</td>
      <td className={clsx('px-4 py-3 font-bold', pnlColor)}>
        {formatCurrency(trade.pnl)}
      </td>
      <td className={clsx('px-4 py-3 font-medium', pnlColor)}>
        {trade.rMultiple >= 0 ? '+' : ''}{formatNumber(trade.rMultiple, 2)}R
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {trade.holdingDays}d
      </td>
    </tr>
  )
}

export function StrategyPage({ strategyKey }: StrategyPageProps) {
  const strategies = useTradingStore(state => state.strategies)
  const positions = useTradingStore(state => state.getPositionsByStrategy(strategyKey))
  const trades = useTradingStore(state => state.getTradesByStrategy(strategyKey))
  const performance = useTradingStore(state => state.getStrategyPerformance(strategyKey))
  const btcRegime = useTradingStore(state => state.btcRegime)
  const spyRegime = useTradingStore(state => state.spyRegime)
  
  const strategy = strategies.find(s => s.key === strategyKey)
  
  if (!strategy) {
    return <div>Estrategia no encontrada</div>
  }
  
  const isCrypto = strategyKey.includes('crypto')
  const relevantRegime = isCrypto ? btcRegime : spyRegime
  const isBlocked = relevantRegime !== 'BULL'
  const rrRatio = strategy.stops.tpAtrMult / strategy.stops.slAtrMult
  
  const emoji = {
    crypto_core: '💎',
    crypto_aggressive: '⚡',
    large_caps: '📈',
    small_caps: '🎯'
  }[strategyKey] || '📊'
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{emoji}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{strategy.name}</h1>
            <p className="text-gray-500">{strategy.version} • {strategy.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className={clsx(
            'badge text-lg py-2 px-4',
            strategy.mode === 'live' ? 'badge-danger' : 'badge-info'
          )}>
            {strategy.mode === 'live' ? '🔴 LIVE' : '📝 PAPER'}
          </span>
          
          {isBlocked ? (
            <span className="badge badge-danger text-lg py-2 px-4">
              🔴 BLOQUEADA ({relevantRegime})
            </span>
          ) : (
            <span className="badge badge-success text-lg py-2 px-4">
              🟢 ACTIVA
            </span>
          )}
        </div>
      </div>
      
      {/* Métricas principales */}
      <div className="grid grid-cols-6 gap-4">
        <div className="card">
          <span className="text-xs text-gray-500 uppercase">Capital</span>
          <p className="text-2xl font-bold">{formatCurrency(strategy.capital)}</p>
        </div>
        <div className="card">
          <span className="text-xs text-gray-500 uppercase">Posiciones</span>
          <p className="text-2xl font-bold">
            <span className={positions.length > 0 ? 'text-blue-600' : ''}>{positions.length}</span>
            <span className="text-gray-400">/{strategy.maxPositions}</span>
          </p>
        </div>
        <div className="card">
          <span className="text-xs text-gray-500 uppercase">PnL Total</span>
          <p className={clsx('text-2xl font-bold', getValueColorClass(performance.pnl))}>
            {formatCurrency(performance.pnl)}
          </p>
        </div>
        <div className="card">
          <span className="text-xs text-gray-500 uppercase">Win Rate</span>
          <p className="text-2xl font-bold">{formatNumber(performance.winRate, 0)}%</p>
        </div>
        <div className="card">
          <span className="text-xs text-gray-500 uppercase">Trades</span>
          <p className="text-2xl font-bold">{performance.trades}</p>
        </div>
        <div className="card">
          <span className="text-xs text-gray-500 uppercase">R:R</span>
          <p className="text-2xl font-bold">{formatRatio(rrRatio)}</p>
        </div>
      </div>
      
      {/* Posiciones Abiertas */}
      <div className="card">
        <h3 className="card-title mb-4">📊 Posiciones Abiertas</h3>
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-2 block">📭</span>
            {isBlocked 
              ? 'No hay posiciones. Trading bloqueado por régimen.' 
              : 'No hay posiciones abiertas. Esperando setup.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {positions.map(pos => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        )}
      </div>
      
      {/* Historial de Trades */}
      <div className="card">
        <h3 className="card-title mb-4">📋 Historial de Trades</h3>
        
        {trades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-2 block">📭</span>
            Sin trades completados en esta estrategia
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Resultado</th>
                  <th>Invertido</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>PnL</th>
                  <th>R-Multiple</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                {[...trades].reverse().map(trade => (
                  <TradeRow key={trade.id} trade={trade} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Configuración */}
      <div className="card">
        <h3 className="card-title mb-4">⚙️ Configuración</h3>
        
        <div className="grid grid-cols-3 gap-6">
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">📊 Timeframes</h4>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Contexto:</span> {strategy.timeframes.context}</p>
              <p><span className="text-gray-500">Tendencia:</span> {strategy.timeframes.trend}</p>
              <p><span className="text-gray-500">Entrada:</span> {strategy.timeframes.entry}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">🎯 Stops</h4>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Stop Loss:</span> {strategy.stops.slAtrMult}x ATR</p>
              <p><span className="text-gray-500">Trailing:</span> +2R → (n-1)R</p>
              <p><span className="text-gray-500">Riesgo/Trade:</span> {formatPercent(strategy.riskPerTrade * 100, 2)}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">📈 Rendimiento Esperado</h4>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Trades/mes:</span> {strategy.expectedPerformance.tradesPerMonth}</p>
              <p><span className="text-gray-500">Win Rate:</span> {strategy.expectedPerformance.winRate}</p>
              <p><span className="text-gray-500">Retorno Anual:</span> {strategy.expectedPerformance.annualReturn}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold text-gray-700 mb-2">🎯 Assets</h4>
          <p className="text-sm text-gray-600">{strategy.assetDescription}</p>
        </div>
      </div>
    </div>
  )
}
