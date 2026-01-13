'use client'

import { useEffect, useState } from 'react'
import { useTradingStore } from '@/stores/tradingStore'
import { clsx } from 'clsx'

interface Position {
  ticker: string
  entry: number
  sl: number
  tp: number
  size: number
  be_price: number
  moved_to_be: boolean
  entry_time: string
  rsi: number
  reason: string
}

interface Trade {
  ticker: string
  entry: number
  exit_price: number
  pnl: number
  pnl_pct: number
  exit_reason: string
  entry_time: string
  exit_time: string
}

interface WorkerStatus {
  status: string
  last_scan: string
  positions: number
  daily_trades: number
  daily_pnl: number
  btc_adx: number
  btc_ok: boolean
  selected_count: number
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

interface SelectedAsset {
  ticker: string
  market_cap: number
  volume_24h: number
  vol_mc_ratio: number
  adx: number
  plus_di: number
  minus_di: number
  price: number
  ema20: number
  ema50: number
  score: number
}

interface CheckResult {
  passed: boolean
  value: string
  required: string
  detail?: string
}

interface Analysis {
  ticker: string
  timestamp: string
  signal: string
  reason: string
  excluded: boolean
  price?: number
  rsi?: number
  ema20?: number
  volume_ratio?: number
  entry?: number
  sl?: number
  tp?: number
  checks: {
    data?: CheckResult
    rsi_range?: CheckResult
    rsi_turning?: CheckResult
    volume?: CheckResult
    near_ema20?: CheckResult
    higher_low?: CheckResult
  }
}

export default function Intraday1PctPage() {
  const config = useTradingStore(state => state.intraday1PctConfig)
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [worker, setWorker] = useState<WorkerStatus | null>(null)
  const [daily, setDaily] = useState<DailyStats | null>(null)
  const [selected, setSelected] = useState<SelectedAsset[]>([])
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [rejected, setRejected] = useState<any[]>([])
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/trading')
        const data = await res.json()
        
        if (data.data) {
          if (data.data.intraday1PctPositions) setPositions(data.data.intraday1PctPositions)
          if (data.data.intraday1PctTrades) setTrades(data.data.intraday1PctTrades)
          if (data.data.intraday1PctWorker) setWorker(data.data.intraday1PctWorker)
          if (data.data.intraday1PctDaily) setDaily(data.data.intraday1PctDaily)
          if (data.data.intraday1PctSelected?.selected) setSelected(data.data.intraday1PctSelected.selected)
          if (data.data.intraday1PctSelected?.rejected) setRejected(data.data.intraday1PctSelected.rejected)
          if (data.data.intraday1PctAnalysis?.analyses) setAnalyses(data.data.intraday1PctAnalysis.analyses)
        }
      } catch (e) {
        console.error('Error fetching data:', e)
      }
    }
    
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const winRate = daily && daily.trades > 0 
    ? ((daily.wins / daily.trades) * 100).toFixed(0) 
    : '0'

  const getAnalysisForTicker = (ticker: string) => {
    return analyses.find(a => a.ticker === ticker)
  }
  
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">💯 Estrategia 1%</h1>
          <p className="text-gray-500 text-sm">Spot momentum con filtros estrictos</p>
        </div>
        <div className={clsx(
          'px-3 py-1.5 rounded-lg font-medium text-sm',
          config.mode === 'live' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
        )}>
          {config.mode === 'live' ? '🔴 LIVE' : '📝 PAPER'}
        </div>
      </div>
      
      {/* Worker Status */}
      {worker ? (
        <div className={clsx(
          'p-3 rounded-lg text-sm',
          worker.status === 'running' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        )}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={worker.status === 'running' ? 'text-green-600' : 'text-yellow-600'}>
                {worker.status === 'running' ? '✅ Activo' : worker.status === 'weekend' ? '🌴 Weekend' : '⏸️ Pausado'}
              </span>
              <span className="text-gray-500 text-xs">
                {new Date(worker.last_scan).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs">
                BTC ADX: <span className="font-mono">{worker.btc_adx?.toFixed(1) || '-'}</span>
                {worker.btc_ok ? ' ✅' : ' ⚠️'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
          <span className="text-gray-500">❌ Worker no conectado</span>
        </div>
      )}
      
      {/* Daily Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card text-center p-4">
          <p className="text-xs text-gray-500">Capital</p>
          <p className="text-xl font-bold">${config.capital.toLocaleString()}</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-xs text-gray-500">PnL Hoy</p>
          <p className={clsx('text-xl font-bold', (daily?.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
            ${(daily?.pnl || 0).toFixed(0)}
          </p>
        </div>
        <div className="card text-center p-4">
          <p className="text-xs text-gray-500">Trades</p>
          <p className="text-xl font-bold">{daily?.trades || 0}</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-xs text-gray-500">Win Rate</p>
          <p className="text-xl font-bold">{winRate}%</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-xs text-gray-500">Posiciones</p>
          <p className="text-xl font-bold">{positions.length}/{config.maxPositions}</p>
        </div>
      </div>
      
      {/* Lock Warning */}
      {daily?.locked && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
          <span className="text-orange-700">🔒 {daily.lock_reason}</span>
        </div>
      )}
      
      {/* MAIN: Selected Assets with Analysis */}
      <div className="card">
        <h3 className="font-bold text-lg mb-4">🎯 Activos Seleccionados ({selected.length}/10)</h3>
        <p className="text-xs text-gray-500 mb-4">
          Activos que pasaron filtros de liquidez y tendencia. Click para ver análisis de entrada.
        </p>
        
        {selected.length > 0 ? (
          <div className="space-y-2">
            {selected.map((asset, idx) => {
              const analysis = getAnalysisForTicker(asset.ticker)
              const isExpanded = expandedTicker === asset.ticker
              const hasPosition = positions.some(p => p.ticker === asset.ticker)
              
              return (
                <div key={asset.ticker} className="border rounded-lg overflow-hidden">
                  {/* Row Header */}
                  <div 
                    className={clsx(
                      'p-3 cursor-pointer flex items-center justify-between',
                      analysis?.signal === 'LONG' && !analysis?.excluded ? 'bg-green-50' : 
                      analysis?.excluded ? 'bg-yellow-50' :
                      'bg-white hover:bg-gray-50'
                    )}
                    onClick={() => setExpandedTicker(isExpanded ? null : asset.ticker)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm w-5">{idx + 1}.</span>
                      <span className="font-mono font-bold">{asset.ticker.replace('-USD', '')}</span>
                      {hasPosition && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">En posición</span>}
                      {analysis?.signal === 'LONG' && !analysis?.excluded && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                          ✅ SEÑAL
                        </span>
                      )}
                      {analysis?.excluded && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                          ⚠️ Excluido
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>ADX: {asset.adx.toFixed(0)}</span>
                      <span>Score: {asset.score.toFixed(0)}</span>
                      <span className={clsx('transition-transform', isExpanded && 'rotate-180')}>▼</span>
                    </div>
                  </div>
                  
                  {/* Expanded Analysis */}
                  {isExpanded && (
                    <div className="p-4 bg-gray-50 border-t">
                      {/* Liquidity Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-white p-2 rounded text-center">
                          <p className="text-xs text-gray-500">Market Cap</p>
                          <p className="font-bold">${(asset.market_cap / 1e9).toFixed(1)}B</p>
                        </div>
                        <div className="bg-white p-2 rounded text-center">
                          <p className="text-xs text-gray-500">Vol 24h</p>
                          <p className="font-bold">${(asset.volume_24h / 1e6).toFixed(0)}M</p>
                        </div>
                        <div className="bg-white p-2 rounded text-center">
                          <p className="text-xs text-gray-500">Vol/MC</p>
                          <p className="font-bold">{asset.vol_mc_ratio.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-2 rounded text-center">
                          <p className="text-xs text-gray-500">Precio</p>
                          <p className="font-bold">${asset.price?.toFixed(2) || '-'}</p>
                        </div>
                      </div>
                      
                      {/* Entry Analysis */}
                      {analysis ? (
                        <div>
                          <h4 className="font-medium text-sm mb-2">📊 Análisis de Entrada</h4>
                          <div className="bg-white rounded p-3">
                            {/* Status */}
                            <div className={clsx(
                              'px-3 py-2 rounded mb-3 text-sm',
                              analysis.signal === 'LONG' && !analysis.excluded ? 'bg-green-100 text-green-800' :
                              analysis.excluded ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-700'
                            )}>
                              <strong>{analysis.signal}</strong>: {analysis.reason}
                            </div>
                            
                            {/* Checks */}
                            <div className="space-y-2 text-xs">
                              {analysis.checks.rsi_range && (
                                <div className={clsx('flex justify-between p-2 rounded', analysis.checks.rsi_range.passed ? 'bg-green-50' : 'bg-red-50')}>
                                  <span>{analysis.checks.rsi_range.passed ? '✅' : '❌'} RSI en rango</span>
                                  <span className="font-mono">{analysis.checks.rsi_range.value} (req: {analysis.checks.rsi_range.required})</span>
                                </div>
                              )}
                              {analysis.checks.rsi_turning && (
                                <div className={clsx('flex justify-between p-2 rounded', analysis.checks.rsi_turning.passed ? 'bg-green-50' : 'bg-red-50')}>
                                  <span>{analysis.checks.rsi_turning.passed ? '✅' : '❌'} RSI girando</span>
                                  <span className="font-mono">{analysis.checks.rsi_turning.detail}</span>
                                </div>
                              )}
                              {analysis.checks.volume && (
                                <div className={clsx('flex justify-between p-2 rounded', analysis.checks.volume.passed ? 'bg-green-50' : 'bg-red-50')}>
                                  <span>{analysis.checks.volume.passed ? '✅' : '❌'} Volumen</span>
                                  <span className="font-mono">{analysis.checks.volume.value}</span>
                                </div>
                              )}
                              {analysis.checks.near_ema20 && (
                                <div className={clsx('flex justify-between p-2 rounded', analysis.checks.near_ema20.passed ? 'bg-green-50' : 'bg-red-50')}>
                                  <span>{analysis.checks.near_ema20.passed ? '✅' : '❌'} Cerca de EMA20</span>
                                  <span className="font-mono">{analysis.checks.near_ema20.value} (max 2%)</span>
                                </div>
                              )}
                              {analysis.checks.higher_low && (
                                <div className={clsx('flex justify-between p-2 rounded', analysis.checks.higher_low.passed ? 'bg-green-50' : 'bg-red-50')}>
                                  <span>{analysis.checks.higher_low.passed ? '✅' : '❌'} Higher Low</span>
                                  <span className="font-mono">{analysis.checks.higher_low.detail}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Entry levels if LONG */}
                            {analysis.signal === 'LONG' && analysis.entry && (
                              <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="bg-blue-50 p-2 rounded">
                                  <p className="text-gray-500">Entry</p>
                                  <p className="font-bold">${analysis.entry.toFixed(2)}</p>
                                </div>
                                <div className="bg-red-50 p-2 rounded">
                                  <p className="text-gray-500">SL (-0.5%)</p>
                                  <p className="font-bold text-red-600">${analysis.sl?.toFixed(2)}</p>
                                </div>
                                <div className="bg-green-50 p-2 rounded">
                                  <p className="text-gray-500">TP (+1%)</p>
                                  <p className="font-bold text-green-600">${analysis.tp?.toFixed(2)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Esperando análisis del worker...</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8 text-sm">
            Esperando selección diaria de activos (08:00 UTC)
          </p>
        )}
      </div>
      
      {/* Open Positions */}
      {positions.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-lg mb-4">📈 Posiciones Abiertas ({positions.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs">
                  <th className="pb-2">Ticker</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">SL</th>
                  <th className="pb-2">TP</th>
                  <th className="pb-2">RSI</th>
                  <th className="pb-2">BE</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => (
                  <tr key={pos.ticker} className="border-b border-gray-100">
                    <td className="py-2 font-mono font-medium">{pos.ticker.replace('-USD', '')}</td>
                    <td className="py-2">${pos.entry.toFixed(2)}</td>
                    <td className="py-2 text-red-600">${pos.sl.toFixed(2)}</td>
                    <td className="py-2 text-green-600">${pos.tp.toFixed(2)}</td>
                    <td className="py-2">{pos.rsi?.toFixed(0) || '-'}</td>
                    <td className="py-2">{pos.moved_to_be ? '✅' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Today's Trades */}
      {trades.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-lg mb-4">📊 Trades de Hoy</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs">
                  <th className="pb-2">Ticker</th>
                  <th className="pb-2">PnL</th>
                  <th className="pb-2">%</th>
                  <th className="pb-2">Salida</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(-10).reverse().map((trade, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 font-mono">{trade.ticker?.replace('-USD', '')}</td>
                    <td className={clsx('py-2 font-medium', trade.pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                      ${trade.pnl?.toFixed(0)}
                    </td>
                    <td className={clsx('py-2', trade.pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {trade.pnl_pct >= 0 ? '+' : ''}{trade.pnl_pct?.toFixed(1)}%
                    </td>
                    <td className="py-2">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-xs',
                        trade.exit_reason === 'TP' ? 'bg-green-100 text-green-700' :
                        trade.exit_reason === 'SL' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {trade.exit_reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Strategy Rules (collapsed) */}
      <details className="card">
        <summary className="font-bold cursor-pointer">📋 Reglas de la Estrategia</summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">🎯 Filtros de Liquidez</h4>
            <ul className="text-xs space-y-1 text-gray-600">
              <li>• MC &gt; ${(config.minMarketCap / 1e6).toFixed(0)}M</li>
              <li>• Vol 24h &gt; ${(config.minVolume24h / 1e6).toFixed(0)}M</li>
              <li>• Vol/MC ≥ {config.minVolMcRatio}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">📊 Filtros Técnicos</h4>
            <ul className="text-xs space-y-1 text-gray-600">
              <li>• ADX ≥ {config.minAdx}</li>
              <li>• BTC ADX ≥ {config.btcMinAdx}</li>
              <li>• RSI: {config.rsiMin}-{config.rsiMax}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">💰 Gestión</h4>
            <ul className="text-xs space-y-1 text-gray-600">
              <li>• TP: +{(config.tpPercent * 100).toFixed(1)}%</li>
              <li>• SL: -{(config.slPercent * 100).toFixed(1)}%</li>
              <li>• BE a +{(config.bePercent * 100).toFixed(1)}%</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">🛡️ Límites</h4>
            <ul className="text-xs space-y-1 text-gray-600">
              <li>• Max loss: -{(config.maxDailyLoss * 100).toFixed(1)}%</li>
              <li>• Target: +{(config.maxDailyProfit * 100).toFixed(1)}%</li>
              <li>• Horario: 08:00-20:00 UTC</li>
            </ul>
          </div>
        </div>
      </details>
      
      {/* Philosophy */}
      <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
        💡 El 1% diario viene de NO PERDER -1% nunca. Solo operamos con estructura clara y liquidez.
      </div>
    </div>
  )
}
