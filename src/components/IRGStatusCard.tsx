'use client'

import { useTradingStore } from '@/stores/tradingStore'
import { clsx } from 'clsx'
import { formatNumber, formatPercent } from '@/lib/formatters'

/**
 * Tarjeta de estado del Intraday Risk Guard (IRG)
 * Muestra si el trading intraday está permitido y por qué
 */
export function IRGStatusCard() {
  const irgState = useTradingStore(state => state.irgState)
  const irgConfig = useTradingStore(state => state.irgConfig)
  
  if (!irgConfig.enabled) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🔒</span>
          <h3 className="font-semibold text-gray-700">Intraday Risk Guard</h3>
        </div>
        <p className="text-sm text-gray-500">Deshabilitado</p>
      </div>
    )
  }
  
  return (
    <div className={clsx(
      'rounded-xl p-5 border-2 transition-all',
      irgState.intradayAllowed 
        ? 'bg-green-50 border-green-300' 
        : 'bg-red-50 border-red-300'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{irgState.intradayAllowed ? '🟢' : '🔴'}</span>
          <div>
            <h3 className="font-bold text-gray-900">Intraday Risk Guard</h3>
            <p className="text-xs text-gray-500">
              Gatekeeper para VWAP Reversion y 1% Spot
            </p>
          </div>
        </div>
        <div className={clsx(
          'px-3 py-1.5 rounded-lg font-semibold text-sm',
          irgState.intradayAllowed 
            ? 'bg-green-200 text-green-800' 
            : 'bg-red-200 text-red-800'
        )}>
          {irgState.intradayAllowed ? 'PERMITIDO' : 'BLOQUEADO'}
        </div>
      </div>
      
      {/* Condiciones */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Condición A: Volatilidad BTC */}
        <div className={clsx(
          'p-3 rounded-lg border',
          irgState.conditionAMet 
            ? 'bg-green-100 border-green-200' 
            : 'bg-gray-100 border-gray-200'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <span>{irgState.conditionAMet ? '✅' : '❌'}</span>
            <span className="font-medium text-sm">Volatilidad BTC</span>
          </div>
          <p className="text-lg font-bold">
            P{formatNumber(irgState.btcAtrPercentile, 0)}
          </p>
          <p className="text-xs text-gray-500">
            Umbral: ≥ P{irgConfig.btcAtrMinPercentile}
          </p>
        </div>
        
        {/* Condición B: Breadth */}
        <div className={clsx(
          'p-3 rounded-lg border',
          irgState.conditionBMet 
            ? 'bg-green-100 border-green-200' 
            : 'bg-gray-100 border-gray-200'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <span>{irgState.conditionBMet ? '✅' : '❌'}</span>
            <span className="font-medium text-sm">Breadth Crypto</span>
          </div>
          <p className="text-lg font-bold">
            {formatPercent(irgState.breadthPercentage)}
          </p>
          <p className="text-xs text-gray-500">
            {irgState.breadthActiveCount}/{irgState.breadthTotalCount} activos vivos
          </p>
        </div>
      </div>
      
      {/* Explicación */}
      <div className={clsx(
        'p-3 rounded-lg text-sm',
        irgState.intradayAllowed ? 'bg-green-100' : 'bg-red-100'
      )}>
        <p className="font-medium mb-1">
          {irgState.intradayAllowed ? '✅ Intraday permitido porque:' : '❌ Intraday bloqueado porque:'}
        </p>
        {irgState.intradayAllowed ? (
          <ul className="text-gray-700 space-y-0.5">
            {irgState.conditionAMet && (
              <li>• {irgState.conditionAReason}</li>
            )}
            {irgState.conditionBMet && (
              <li>• {irgState.conditionBReason}</li>
            )}
          </ul>
        ) : (
          <p className="text-gray-700">{irgState.blockReason}</p>
        )}
      </div>
      
      {/* Timestamp */}
      {irgState.lastEvaluation && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          Última evaluación: {new Date(irgState.lastEvaluation).toLocaleTimeString('es-ES')}
        </p>
      )}
    </div>
  )
}

/**
 * Versión compacta para el header del dashboard
 */
export function IRGIndicator() {
  const irgState = useTradingStore(state => state.irgState)
  const irgConfig = useTradingStore(state => state.irgConfig)
  
  if (!irgConfig.enabled) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
        <span>IRG</span>
        <span className="text-gray-400">OFF</span>
      </div>
    )
  }
  
  return (
    <div 
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium cursor-help',
        irgState.intradayAllowed 
          ? 'bg-green-100 text-green-700' 
          : 'bg-red-100 text-red-700'
      )}
      title={irgState.intradayAllowed 
        ? `Intraday permitido: ${irgState.conditionAReason || irgState.conditionBReason}` 
        : `Intraday bloqueado: ${irgState.blockReason}`
      }
    >
      <span className={clsx(
        'w-2 h-2 rounded-full',
        irgState.intradayAllowed ? 'bg-green-500' : 'bg-red-500'
      )} />
      <span>IRG</span>
      <span>{irgState.intradayAllowed ? '✓' : '✗'}</span>
    </div>
  )
}

/**
 * Explicación educativa del IRG
 */
export function IRGExplainer() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
        <span className="text-xl">🎓</span>
        ¿Qué es el Intraday Risk Guard (IRG)?
      </h3>
      
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          El IRG es el <strong>gatekeeper para estrategias intraday</strong> (VWAP Reversion, 1% Spot).
          Decide si hay suficiente actividad en el mercado para operar en timeframes cortos.
        </p>
        
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-semibold mb-2">Principio arquitectónico v4.3:</h4>
          <ul className="space-y-1">
            <li>• <strong>Swing:</strong> BTC manda → usa régimen macro (BTC BULL/BEAR/RANGE)</li>
            <li>• <strong>Intraday:</strong> La actividad manda → usa IRG (volatilidad + breadth local)</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-semibold mb-2">Condiciones del IRG:</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Condición</th>
                <th className="text-left py-1">Métrica</th>
                <th className="text-left py-1">Umbral</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-1 font-medium">A: Volatilidad BTC</td>
                <td className="py-1">ATR(14) en 15m vs últimos 30 días</td>
                <td className="py-1">Percentil ≥ 40</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">B: Breadth Crypto</td>
                <td className="py-1">% de activos con ATR/precio ≥ 0.12%</td>
                <td className="py-1">≥ 30%</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="font-medium text-yellow-800">
            ⚡ Lógica: Intraday permitido si Condición A <strong>OR</strong> Condición B se cumple.
          </p>
          <p className="text-yellow-700 mt-1">
            Si AMBAS fallan → Mercado muerto → No hay edge en intraday.
          </p>
        </div>
      </div>
    </div>
  )
}
