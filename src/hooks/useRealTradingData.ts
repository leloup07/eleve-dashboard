'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTradingStore } from '@/stores/tradingStore'

interface IntradayData {
  vwap: {
    positions: any[]
    trades: any[]
    daily: any
    worker: any
  }
  onePct: {
    positions: any[]
    trades: any[]
    daily: any
    worker: any
    selected: any[]
  }
}

export function useRealTradingData(autoRefreshMs = 30000) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [worker, setWorker] = useState<any>(null)
  const [intraday, setIntraday] = useState<IntradayData>({
    vwap: { positions: [], trades: [], daily: null, worker: null },
    onePct: { positions: [], trades: [], daily: null, worker: null, selected: [] }
  })
  
  const setPositions = useTradingStore(state => state.setPositions)
  const setTrades = useTradingStore(state => state.setTrades)
  const setRegime = useTradingStore(state => state.setRegime)
  const setBotActive = useTradingStore(state => state.setBotActive)
  const setRedisConnected = useTradingStore(state => state.setRedisConnected)
  const setIntraday1PctConfig = useTradingStore(state => state.setIntraday1PctConfig)
  const setIntradayConfig = useTradingStore(state => state.setIntradayConfig)
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/trading')
      const result = await response.json()
      
      if (result.success && result.data) {
        const data = result.data
        
        // Transformar posiciones - mapear campos del bot a campos del dashboard
        const positions = (data.positions || []).map((p: any, idx: number) => ({
          id: p.ticker + '-' + idx,
          ticker: p.ticker || 'UNKNOWN',
          strategy: p.category || 'small_caps',
          entry: p.entry || 0,
          sl: p.sl || 0,
          tp: p.tp || 0,
          size: p.size || 0,
          investedAmount: (p.entry || 0) * (p.size || 0),
          mode: (p.mode || 'PAPER').toLowerCase(),
          openDate: p.timestamp || new Date().toISOString(),
          currentPrice: p.max_price || p.entry || 0,
          unrealizedPnL: ((p.max_price || p.entry) - p.entry) * (p.size || 0),
          unrealizedPnLPercent: p.entry > 0 ? (((p.max_price || p.entry) - p.entry) / p.entry) * 100 : 0,
          maxPrice: p.max_price || p.entry,
          partialTpTaken: p.partial_tp_taken || false,
          entryReason: p.reason || '',
          entryGrade: p.grade || 'B',
          entryIndicators: { rsi: 50, macd: 0, adx: 25, ema20: 0, ema50: 0, atr: (p.entry - (p.original_sl || p.sl)) / 2, volume: 100 }
        }))
        
        // Transformar trades
        const trades = (data.trades || []).map((t: any, idx: number) => {
          const riskPerShare = Math.abs((t.entry || 0) - (t.original_sl || t.sl || 0))
          const rMultiple = riskPerShare > 0 ? (t.pnl || 0) / (riskPerShare * (t.size || 1)) : 0
          
          return {
            id: t.ticker + '-' + idx,
            ticker: t.ticker || 'UNKNOWN',
            strategy: t.category || 'small_caps',
            entry: t.entry || 0,
            exit: t.exit || 0,
            sl: t.original_sl || t.sl || 0,
            tp: t.tp || 0,
            size: t.size || 0,
            investedAmount: (t.entry || 0) * (t.size || 0),
            pnl: t.pnl || 0,
            pnlPercent: (t.entry || 0) * (t.size || 0) > 0 ? ((t.pnl || 0) / ((t.entry || 0) * (t.size || 0))) * 100 : 0,
            result: t.result || 'SL',
            mode: (t.mode || 'PAPER').toLowerCase(),
            openDate: t.timestamp || new Date().toISOString(),
            closeDate: t.exit_time || new Date().toISOString(),
            holdingDays: 1,
            rMultiple: rMultiple,
            entryReason: t.reason || '',
            entryGrade: t.grade || 'B',
            entryIndicators: { rsi: 50, macd: 0, adx: 25, ema20: 0, ema50: 0, atr: riskPerShare, volume: 100 },
            exitReason: t.result === 'SL' ? 'Stop Loss alcanzado' 
              : t.result === 'TP1' ? `Take Profit 1 (50%) - Régimen: ${t.exit_regime || 'N/A'}` 
              : t.result === 'TP2' ? 'Take Profit 2 (estrategia antigua)' 
              : t.result === 'TRAIL' ? `Trailing Stop (${t.exit_regime || 'N/A'})`
              : 'Breakeven',
            exitIndicators: { rsi: 50, macd: 0, price: t.exit || 0 },
            strategyExplanation: t.reason || '',
            regime: t.exit_regime || null,
            lessons: t.result === 'SL' 
              ? ['✅ El SL protegió el capital', `📊 Pérdida controlada a ${rMultiple.toFixed(2)}R`, '💡 Revisar si las condiciones de entrada fueron óptimas']
              : t.result === 'TP1'
              ? t.exit_regime === 'RANGE' 
                ? ['✅ TP1 aseguró +2R en 50%', '📊 Régimen RANGE: SL subió a TP1', '🎯 Trailing 2.0x ATR activo']
                : t.exit_regime === 'TREND'
                ? ['✅ TP1 aseguró +2R en 50%', '📊 Régimen TREND: SL a BE', '🎯 Trailing holgado 2.5x ATR']
                : ['✅ TP1 aseguró +2R en 50%', '📊 Régimen TRANSITION: SL a BE', '🎯 Trailing 2.0x ATR activo']
              : t.result === 'TP2'
              ? ['✅ Objetivo completo alcanzado (estrategia v2)', '📊 Trade anterior a v4']
              : t.result === 'TRAIL'
              ? t.exit_regime === 'RANGE'
                ? ['✅ Trailing capturó ganancias', `📈 Salida a ${rMultiple.toFixed(2)}R`, '📊 RANGE: SL arrancó en TP1 (+2R)']
                : t.exit_regime === 'TREND'
                ? ['✅ Trailing capturó tendencia extendida', `📈 Salida a ${rMultiple.toFixed(2)}R`, '📊 TREND: Trailing holgado dejó respirar']
                : ['✅ Trailing capturó ganancias', `📈 Salida a ${rMultiple.toFixed(2)}R`, '📊 TRANSITION: Balance protección/opcionalidad']
              : t.result === 'BE'
              ? ['📊 Trade cerrado en breakeven', '✅ Capital protegido', '💡 El mercado revirtió antes de alcanzar TP1']
              : ['📊 Trade cerrado']
          }
        })
        
        setPositions(positions)
        setTrades(trades)
        setRegime('btc', (data.btcRegime || 'UNKNOWN') as any)
        setRegime('spy', (data.spyRegime || 'UNKNOWN') as any)
        setBotActive(data.botActive || false)
        setRedisConnected(data.redisConnected || false)
        
        // Fetch config from Redis
        const configRes = await fetch("/api/config")
        const configJson = await configRes.json()
        if (configJson.success && configJson.data?.intraday1pct) {
          setIntraday1PctConfig(configJson.data.intraday1pct)
        }
        if (configJson.data?.intraday) {
          setIntradayConfig(configJson.data.intraday)
        }
        setWorker(data.worker || null)
        
        // Set intraday data
        setIntraday({
          vwap: {
            positions: data.intradayPositions || [],
            trades: data.intradayTrades || [],
            daily: data.intradayDaily || null,
            worker: data.intradayWorker || null
          },
          onePct: {
            positions: data.intraday1PctPositions || [],
            trades: data.intraday1PctTrades || [],
            daily: data.intraday1PctDaily || null,
            worker: data.intraday1PctWorker || null,
            selected: data.intraday1PctSelected?.selected || []
          }
        })
        
        setError(null)
      } else {
        setError(result.error || 'Error desconocido')
        setRedisConnected(false)
      }
      
      setLastFetch(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
      setRedisConnected(false)
    } finally {
      setLoading(false)
    }
  }, [setPositions, setTrades, setRegime, setBotActive, setRedisConnected, setIntraday1PctConfig, setIntradayConfig])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  useEffect(() => {
    if (autoRefreshMs > 0) {
      const interval = setInterval(fetchData, autoRefreshMs)
      return () => clearInterval(interval)
    }
  }, [autoRefreshMs, fetchData])
  
  return { loading, error, lastFetch, worker, intraday, refresh: fetchData }
}
