'use client'

import { useTradingStore } from '@/stores/tradingStore'
import { useRealTradingData } from '@/hooks/useRealTradingData'

import { useState, useEffect } from 'react'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters'
import { clsx } from 'clsx'

interface IntradayPosition {
  ticker: string
  direction: 'LONG' | 'SHORT'
  entry: number
  sl: number
  tp: number
  size: number
  setup: string
  entry_time: string
  vwap: number
  asia_high: number
  asia_low: number
}

interface IntradayTrade {
  ticker: string
  direction: 'LONG' | 'SHORT'
  entry: number
  exit_price: number
  exit_reason: string
  pnl: number
  exit_r: number
  duration_mins: number
  entry_time: string
  exit_time: string
}

interface DailyStats {
  date: string
  trades: number
  pnl: number
  wins: number
  losses: number
  locked: boolean
  lock_reason: string
}

interface WorkerStatus {
  status: string
  last_scan: string
  positions: number
  daily_trades: number
  daily_pnl: number
  locked: boolean
}

export default function IntradayPage() {
  const [positions, setPositions] = useState<IntradayPosition[]>([])
  const [trades, setTrades] = useState<IntradayTrade[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      const response = await fetch('/api/trading')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Datos intraday vienen en keys separados
          setPositions(result.data.intradayPositions || [])
          setTrades(result.data.intradayTrades || [])
          setDailyStats(result.data.intradayDaily || null)
          setWorkerStatus(result.data.intradayWorker || null)
        }
      }
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching intraday data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Cada 30s
    return () => clearInterval(interval)
  }, [])

  const todayTrades = trades.filter(t => {
    const tradeDate = new Date(t.exit_time).toDateString()
    const today = new Date().toDateString()
    return tradeDate === today
  })

  const winRate = todayTrades.length > 0 
    ? (todayTrades.filter(t => t.pnl > 0).length / todayTrades.length) * 100 
    : 0

  useRealTradingData(0)
  const intradayConfig = useTradingStore(state => state.intradayConfig)
  const capital = intradayConfig?.capital || 10000

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">⚡</span>
            VWAP Reversion
          </h1>
          <p className="text-gray-500 mt-1">
            Estrategia intraday mean-reversion. Opera fake breaks del rango asiático (00:00-08:00 UTC) que revierten al VWAP. Busca sobre-extensiones de más de 1 ATR respecto al VWAP en BTC y ETH. SL a 1.2x ATR, TP a 1.5x ATR. Límites diarios: -1% pérdida máxima, +1.5% target. Sin trailing, filosofía cobrar y fuera.
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {lastUpdate && (
            <p>Actualizado: {lastUpdate.toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={clsx(
        'p-4 rounded-lg border',
        workerStatus?.status === 'running' 
          ? dailyStats?.locked 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={clsx(
              'w-3 h-3 rounded-full',
              workerStatus?.status === 'running' 
                ? dailyStats?.locked ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'
                : 'bg-red-500'
            )} />
            <span className="font-medium">
              {workerStatus?.status === 'running' 
                ? dailyStats?.locked 
                  ? `🔒 ${dailyStats.lock_reason}`
                  : '✅ Worker Activo'
                : '❌ Worker Inactivo'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {workerStatus?.last_scan && (
              <span>Último scan: {new Date(workerStatus.last_scan).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card">
          <span className="text-sm text-gray-500">Capital</span>
          <p className="text-2xl font-bold">{formatCurrency(capital)}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">PnL Hoy</span>
          <p className={clsx(
            'text-2xl font-bold',
            (dailyStats?.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {formatCurrency(dailyStats?.pnl || 0)}
          </p>
          <span className="text-xs text-gray-400">
            {formatPercent(((dailyStats?.pnl || 0) / capital) * 100)}
          </span>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Trades Hoy</span>
          <p className="text-2xl font-bold">{dailyStats?.trades || 0}</p>
          <span className="text-xs text-gray-400">
            {dailyStats?.wins || 0}W / {dailyStats?.losses || 0}L
          </span>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Win Rate</span>
          <p className="text-2xl font-bold">{formatPercent(winRate)}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Posiciones</span>
          <p className="text-2xl font-bold">{positions.length}/{intradayConfig?.maxPositions || 2}</p>
        </div>
      </div>

      {/* Strategy Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Setup Description */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">📋 Setup: VWAP Reversion</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700">Condiciones de entrada:</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>✓ Fake break del rango asiático (00:00-08:00 UTC)</li>
                <li>✓ Cierre de vela 15m de vuelta dentro del rango</li>
                <li>✓ Mecha de rechazo significativa ({">"} 0.3× ATR)</li>
                <li>✓ RSI no en extremos (20-80)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700">Gestión:</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>🛑 SL: 1.2× ATR fuera del fake break</li>
                <li>🎯 TP: VWAP o 1.5× ATR (lo más cerca)</li>
                <li>⏰ Time stop: 20:00 UTC (EOD)</li>
                <li>❌ Sin trailing - cobrar y fuera</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-700">Límites diarios:</h4>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-red-600 font-medium">-1% = STOP</span>
                  <p className="text-gray-500 text-xs">Max pérdida diaria</p>
                </div>
                <div>
                  <span className="text-green-600 font-medium">+1.5% = STOP</span>
                  <p className="text-gray-500 text-xs">Target diario</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Configuration */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">⚙️ Configuración</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Activos</span>
              <span className="font-mono">BTC-USD, ETH-USD</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Timeframe</span>
              <span className="font-mono">15m</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Riesgo/Trade</span>
              <span className="font-mono">{(intradayConfig?.riskPerTrade || 0.003) * 100}%</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Max Posiciones</span>
              <span className="font-mono">{intradayConfig?.maxPositions || 2}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">SL (ATR)</span>
              <span className="font-mono">{intradayConfig?.slAtrMult || 1.2}×</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">TP (ATR)</span>
              <span className="font-mono">{intradayConfig?.tpAtrMult || 1.5}×</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Horario</span>
              <span className="font-mono">08:00 - 20:00 UTC</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Scan Interval</span>
              <span className="font-mono">{(intradayConfig?.scanInterval || 300) / 60} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Positions */}
      {positions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">📦 Posiciones Abiertas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Ticker</th>
                  <th className="pb-2">Dirección</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">SL</th>
                  <th className="pb-2">TP</th>
                  <th className="pb-2">VWAP</th>
                  <th className="pb-2">Asia Range</th>
                  <th className="pb-2">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 font-mono font-medium">{pos.ticker}</td>
                    <td className={clsx(
                      'py-2 font-medium',
                      pos.direction === 'LONG' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {pos.direction === 'LONG' ? '📈 LONG' : '📉 SHORT'}
                    </td>
                    <td className="py-2">{formatCurrency(pos.entry)}</td>
                    <td className="py-2 text-red-600">{formatCurrency(pos.sl)}</td>
                    <td className="py-2 text-green-600">{formatCurrency(pos.tp)}</td>
                    <td className="py-2 text-blue-600">{formatCurrency(pos.vwap)}</td>
                    <td className="py-2 text-xs">
                      {formatCurrency(pos.asia_low)} - {formatCurrency(pos.asia_high)}
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(pos.entry_time).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's Trades */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📊 Trades de Hoy</h3>
        {todayTrades.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No hay trades cerrados hoy
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Ticker</th>
                  <th className="pb-2">Dir</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">Exit</th>
                  <th className="pb-2">Razón</th>
                  <th className="pb-2">PnL</th>
                  <th className="pb-2">R</th>
                  <th className="pb-2">Duración</th>
                </tr>
              </thead>
              <tbody>
                {todayTrades.map((trade, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 font-mono">{trade.ticker}</td>
                    <td className={clsx(
                      'py-2',
                      trade.direction === 'LONG' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {trade.direction === 'LONG' ? '📈' : '📉'}
                    </td>
                    <td className="py-2">{formatCurrency(trade.entry)}</td>
                    <td className="py-2">{formatCurrency(trade.exit_price)}</td>
                    <td className="py-2">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        trade.exit_reason === 'TP' ? 'bg-green-100 text-green-700' :
                        trade.exit_reason === 'SL' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {trade.exit_reason}
                      </span>
                    </td>
                    <td className={clsx(
                      'py-2 font-medium',
                      trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                    </td>
                    <td className={clsx(
                      'py-2',
                      trade.exit_r >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {trade.exit_r >= 0 ? '+' : ''}{formatNumber(trade.exit_r, 1)}R
                    </td>
                    <td className="py-2 text-gray-500">
                      {trade.duration_mins}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Philosophy */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">💡 Filosofía de la estrategia</h4>
        <p className="text-blue-700 text-sm">
          <strong>Mientras el swing espera estructura, la intraday monetiza el ruido alrededor de la VWAP.</strong>
        </p>
        <ul className="mt-2 text-sm text-blue-600 space-y-1">
          <li>• Mean-reversion, NO trend-following</li>
          <li>• Quirúrgica, NO heroica</li>
          <li>• Cashflow diario, NO convexidad</li>
          <li>• Cobrar y fuera, NO dejar correr</li>
        </ul>
      </div>
    </div>
  )
}
