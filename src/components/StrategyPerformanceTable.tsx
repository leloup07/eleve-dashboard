'use client'

import { useTradingStore } from '@/stores/tradingStore'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { clsx } from 'clsx'

// Con menos de 30 trades cerrados cualquier win rate es ruido: se muestra el
// dato pero marcado, para que nadie tome decisiones sobre 3 trades.
const MUESTRA_MINIMA = 30

interface FilaEstrategia {
  key: string
  name: string
  trades: number
  winRate: number
  profitFactor: number | null
  avgR: number
  pnl: number
}

export function StrategyPerformanceTable() {
  const trades = useTradingStore(state => state.trades)
  const strategies = useTradingStore(state => state.strategies)

  const porEstrategia = new Map<string, typeof trades>()
  for (const t of trades) {
    const key = t.strategy || 'desconocida'
    if (!porEstrategia.has(key)) porEstrategia.set(key, [])
    porEstrategia.get(key)!.push(t)
  }

  const filas: FilaEstrategia[] = Array.from(porEstrategia.entries()).map(([key, ts]) => {
    const ganadoras = ts.filter(t => t.pnl > 0)
    const brutoGanado = ganadoras.reduce((s, t) => s + t.pnl, 0)
    const brutoPerdido = Math.abs(ts.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
    return {
      key,
      name: strategies.find(s => s.key === key)?.name || key,
      trades: ts.length,
      winRate: (100 * ganadoras.length) / ts.length,
      profitFactor: brutoPerdido > 0 ? brutoGanado / brutoPerdido : brutoGanado > 0 ? Infinity : null,
      avgR: ts.reduce((s, t) => s + (t.rMultiple || 0), 0) / ts.length,
      pnl: ts.reduce((s, t) => s + t.pnl, 0),
    }
  }).sort((a, b) => b.trades - a.trades)

  if (filas.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🎯 Win rate por estrategia</h3>
        <p className="text-sm text-gray-500">Sin trades cerrados todavía.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">🎯 Win rate por estrategia</h3>
        <span className="text-xs text-gray-400">solo trades cerrados</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b">
              <th className="py-2 pr-3">Estrategia</th>
              <th className="py-2 px-3 text-right">Trades</th>
              <th className="py-2 px-3 text-right">Win rate</th>
              <th className="py-2 px-3 text-right">Profit factor</th>
              <th className="py-2 px-3 text-right">R medio</th>
              <th className="py-2 pl-3 text-right">PnL</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.key} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-3 font-medium text-gray-900">
                  {f.name}
                  {f.trades < MUESTRA_MINIMA && (
                    <span
                      className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] align-middle"
                      title={`Menos de ${MUESTRA_MINIMA} trades: métrica no concluyente`}
                    >
                      muestra pequeña
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-right text-gray-600">{f.trades}</td>
                <td className={clsx(
                  'py-2 px-3 text-right font-semibold',
                  f.winRate >= 50 ? 'text-green-600' : f.winRate >= 35 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {formatNumber(f.winRate, 0)}%
                </td>
                <td className={clsx(
                  'py-2 px-3 text-right font-semibold',
                  f.profitFactor === null ? 'text-gray-400'
                    : f.profitFactor >= 1 ? 'text-green-600' : 'text-red-600'
                )}>
                  {f.profitFactor === null ? '—'
                    : f.profitFactor === Infinity ? '∞' : formatNumber(f.profitFactor, 2)}
                </td>
                <td className={clsx('py-2 px-3 text-right', f.avgR >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatNumber(f.avgR, 2)}R
                </td>
                <td className={clsx('py-2 pl-3 text-right font-semibold', f.pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(f.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
