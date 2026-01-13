'use client'

import { useTradingStore } from '@/stores/tradingStore'
import { formatCurrency, formatRatio, formatNumber, getValueColorClass } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { StrategyConfig } from '@/types'

interface StrategyCardProps {
  strategy: StrategyConfig
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const positions = useTradingStore(state => state.getPositionsByStrategy(strategy.key))
  const performance = useTradingStore(state => state.getStrategyPerformance(strategy.key))
  const stats = useTradingStore(state => state.getDashboardStats())
  
  const isCrypto = strategy.key.includes('crypto') || strategy.key.includes('intraday')
  const relevantRegime = isCrypto ? stats.btcRegime : stats.spyRegime
  const isBlocked = relevantRegime !== 'BULL'
  
  const rrRatio = strategy.stops.tpAtrMult / strategy.stops.slAtrMult
  
  // Calcular equity: capital inicial + PnL realizado
  const currentEquity = performance.currentEquity
  const totalPnL = performance.pnl + performance.unrealizedPnL
  const pnlPercent = strategy.capital > 0 ? (totalPnL / strategy.capital) * 100 : 0
  
  const getStatusDisplay = () => {
    if (!strategy.enabled) {
      return { text: 'Desactivada', color: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400' }
    }
    if (isBlocked) {
      return { text: `Bloqueada (${relevantRegime})`, color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' }
    }
    return { text: 'Activa', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' }
  }
  
  const status = getStatusDisplay()
  
  const getModeDisplay = () => {
    if (strategy.mode === 'live') {
      return { text: 'LIVE', color: 'text-red-600', bg: 'bg-red-100' }
    }
    return { text: 'PAPER', color: 'text-blue-600', bg: 'bg-blue-100' }
  }
  
  const mode = getModeDisplay()
  
  const emoji = {
    crypto_core: '💎',
    crypto_aggressive: '⚡',
    large_caps: '📈',
    small_caps: '🎯',
    intraday: '⚡',
    intraday_1pct: '💯'
  }[strategy.key] || '📊'

  return (
    <div className={clsx(
      'bg-white rounded-xl border p-6 transition-all duration-200 hover:shadow-md',
      isBlocked && strategy.enabled && 'border-red-200 bg-red-50/30'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
            <span className="text-xs text-gray-500">{strategy.version}</span>
          </div>
        </div>
        <span className={clsx('px-2 py-1 rounded text-xs font-medium', mode.bg, mode.color)}>
          {mode.text}
        </span>
      </div>
      
      {/* Status */}
      <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg mb-3', status.bg)}>
        <span className={clsx('w-2 h-2 rounded-full', status.dot, !isBlocked && strategy.enabled && 'animate-pulse')} />
        <span className={clsx('text-sm font-medium', status.color)}>{status.text}</span>
      </div>
      
      {/* Description */}
      {strategy.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{strategy.description}</p>
      )}
      
      {/* Equity actual (capital + ganancias) */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-500 uppercase block">Equity Actual</span>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(currentEquity, 0)}</p>
          </div>
          {totalPnL !== 0 && (
            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase block">PnL Total</span>
              <p className={clsx('text-lg font-bold', getValueColorClass(totalPnL))}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, 0)}
                <span className="text-xs ml-1">({pnlPercent >= 0 ? '+' : ''}{formatNumber(pnlPercent, 1)}%)</span>
              </p>
            </div>
          )}
        </div>
        {performance.unrealizedPnL !== 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-xs">
            <span className="text-gray-500">Realizado: <span className={getValueColorClass(performance.pnl)}>{formatCurrency(performance.pnl, 0)}</span></span>
            <span className="text-gray-500">No realizado: <span className={getValueColorClass(performance.unrealizedPnL)}>{formatCurrency(performance.unrealizedPnL, 0)}</span></span>
          </div>
        )}
      </div>
      
      {/* Assets */}
      <div className="mb-4">
        <span className="text-xs text-gray-500 uppercase block mb-1">Activos</span>
        <div className="flex flex-wrap gap-1">
          {strategy.assets.map(asset => (
            <span key={asset} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono">
              {asset}
            </span>
          ))}
        </div>
      </div>
      
      {/* Métricas */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Inicial</span>
          <p className="text-sm font-medium text-gray-600">{formatCurrency(strategy.capital, 0)}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Max</span>
          <p className="text-sm font-bold text-gray-900">{strategy.maxPositions}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">R:R</span>
          <p className="text-sm font-bold text-gray-900">{formatRatio(rrRatio)}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Pos</span>
          <p className="text-sm font-bold text-gray-900">
            <span className={positions.length > 0 ? 'text-blue-600' : ''}>{positions.length}</span>
            <span className="text-gray-400">/{strategy.maxPositions}</span>
          </p>
        </div>
      </div>
      
      {/* Performance resumido */}
      {performance.trades > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Trades: {performance.trades}</span>
            <span className="text-gray-500">Win Rate: {formatNumber(performance.winRate, 0)}%</span>
            <span className="text-gray-500">Avg R: {formatNumber(performance.avgR, 2)}R</span>
          </div>
        </div>
      )}
    </div>
  )
}
