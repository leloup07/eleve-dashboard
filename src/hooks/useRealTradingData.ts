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
          strategy: p.strategy || p.category || 'unknown',
          entry: p.entry || 0,
          sl: p.sl || 0,
          tp: p.tp || 0,
          size: p.size || 0,
          investedAmount: (p.entry || 0) * (p.size || 0),
          mode: (p.mode || 'PAPER').toLowerCase(),
          openDate: p.timestamp || new Date().toISOString(),
          // El precio actual y el PnL vienen ya calculados del API sobre current_price
          // (escrito por el worker). max_price se queda como "máximo alcanzado".
          currentPrice: p.current_price || p.entry || 0,
          currentPriceStale: p.current_price_stale ?? true,
          unrealizedPnL: p.unrealized_pnl ?? 0,
          unrealizedPnLPercent: p.unrealized_pnl_percent ?? 0,
          maxPrice: p.max_price || p.entry,
          // La tarjeta los pinta y el API los sirve, pero no se mapeaban: salían "—"
          atr: p.atr ?? undefined,
          riskPerShare: p.riskPerShare ?? p.risk_per_unit ?? undefined,
          partialTpTaken: p.partial_tp_taken || false,
          entryReason: p.reason || '',
          entryGrade: p.grade || 'B',
          // Indicadores reales de la entrada (0 = sin dato, como en el resto del dashboard)
          entryIndicators: {
            rsi: p.rsi ?? 0,
            macd: 0,
            adx: p.adx ?? 0,
            ema20: p.ema20 ?? 0,
            ema50: p.ema50 ?? 0,
            atr: p.atr ?? (p.entry - (p.original_sl || p.sl)) / 2,
            volume: p.volume ?? 0
          }
        }))
        
        // Transformar trades
        const trades = (data.trades || []).map((t: any, idx: number) => {
          const riskPerShare = Math.abs((t.entry || 0) - (t.original_sl || t.sl || 0))
          const rMultiple = riskPerShare > 0 ? (t.pnl || 0) / (riskPerShare * (t.size || 1)) : 0
          
          return {
            id: t.ticker + '-' + idx,
            ticker: t.ticker || 'UNKNOWN',
            strategy: t.strategy || t.category || 'unknown',
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
            holdingDays: t.holding_days ?? 1,
            rMultiple: rMultiple,
            entryReason: t.reason || '',
            entryGrade: t.grade || 'B',
            // Indicadores reales de la entrada (0 = sin dato)
            entryIndicators: {
              rsi: t.rsi ?? 0,
              macd: 0,
              adx: t.adx ?? 0,
              ema20: t.ema20 ?? 0,
              ema50: t.ema50 ?? 0,
              atr: t.atr ?? riskPerShare,
              volume: t.volume ?? 0
            },
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
        if (configJson.data?.strategies) {
          Object.entries(configJson.data.strategies).forEach(([key, config]: [string, any]) => {
            // Las estrategias intraday tienen su capital/riesgo en su propia clave de Redis
            // (eleve:intraday:config / eleve:intraday1pct:config), que es la que lee el worker.
            // Lo que haya en eleve:config:strategies para ellas puede estar desfasado.
            if (key === 'vwap_reversion' || key === 'one_percent_spot') return

            const updates: any = {}
            if (config.capital !== undefined) updates.capital = config.capital
            if (config.riskPerTrade !== undefined) updates.riskPerTrade = config.riskPerTrade
            if (config.maxPositions !== undefined) updates.maxPositions = config.maxPositions
            // Filtros y stops: Redis es la fuente de verdad, es lo que lee el worker.
            // Sin esto la ficha mostraba los valores hardcodeados de INITIAL_STRATEGIES,
            // que no coincidian con lo que realmente se ejecuta.
            if (config.entryFilters !== undefined) updates.entryFilters = config.entryFilters
            if (config.stops !== undefined) updates.stops = config.stops
            if (config.costs !== undefined) updates.costs = config.costs
            if (config.description !== undefined) updates.description = config.description
            // Editable desde /config: como la lista ya no se cachea en el navegador,
            // esto tiene que venir de Redis o se perdería al recargar.
            if (config.mode !== undefined) updates.mode = config.mode
            if (config.enabled !== undefined) updates.enabled = config.enabled
            if (config.assets !== undefined) updates.assets = config.assets
            if (Object.keys(updates).length > 0) {
              // Hidratación local: NO usar updateStrategy(), que hace POST de vuelta a Redis
              // y convierte cada refresco en un ciclo lectura→escritura.
              useTradingStore.setState(state => ({
                strategies: state.strategies.map(s => s.key === key ? { ...s, ...updates } : s)
              }))
            }
          })
        }
        // Las dos intraday toman sus cifras de la clave que realmente lee su worker
        const mirrorIntraday = (strategyKey: string, cfg: any) => {
          if (!cfg) return
          useTradingStore.setState(state => ({
            strategies: state.strategies.map(s => s.key === strategyKey ? {
              ...s,
              capital: cfg.capital ?? s.capital,
              riskPerTrade: cfg.riskPerTrade ?? s.riskPerTrade,
              maxPositions: cfg.maxPositions ?? s.maxPositions,
              // Stops, filtros y costes reales: su worker lee esta clave, no
              // eleve:config:strategies, asi que la ficha tiene que salir de aqui.
              stops: {
                ...s.stops,
                ...(cfg.slAtrMult != null ? { slAtrMult: cfg.slAtrMult } : {}),
                ...(cfg.tpAtrMult != null ? { tpAtrMult: cfg.tpAtrMult } : {}),
                ...(cfg.slPercent != null ? { slPercent: cfg.slPercent } : {}),
                ...(cfg.tpPercent != null ? { tpPercent: cfg.tpPercent } : {})
              },
              // Solo lo que su worker lee de verdad. Los valores de adxMin y
              // pullbackAtr que traía el store eran de la plantilla swing: el
              // worker VWAP no mira ADX ni pullback, y el del 1% tampoco usa
              // un pullback configurable. Anunciar filtros que no se aplican
              // es el mismo problema que teníamos con el IRG.
              // null, no 0: "no configurado" y "configurado a cero" son cosas
              // distintas, y un 0 se muestra como un umbral real.
              entryFilters: {
                ...s.entryFilters,
                rsiMin: cfg.rsiMin ?? null,
                rsiMax: cfg.rsiMax ?? null,
                adxMin: cfg.minAdx ?? null,
                pullbackAtr: null
              },
              costs: {
                commissionPct: cfg.commissionPct ?? 0,
                slippagePct: cfg.slippagePct ?? 0
              }
            } : s)
          }))
        }
        mirrorIntraday('one_percent_spot', configJson.data?.intraday1pct)
        mirrorIntraday('vwap_reversion', configJson.data?.intraday)

        // v5.1 P0-1: identidad de la spec activa y estado de congelación
        if (configJson.data?.specs) {
          useTradingStore.setState(state => ({
            strategies: state.strategies.map(s => ({
              ...s,
              specId: configJson.data.specs[s.key] ?? null
            }))
          }))
        }
        useTradingStore.getState().setExperiment(configJson.data?.experiment ?? null)
        if (configJson.data?.intraday) {
          setIntradayConfig(configJson.data.intraday)
        }
        // Se adjunta la frescura calculada en el API: el worker nunca escribe
        // "parado" al morir, así que sin esto un proceso caído seguiría saliendo
        // como activo para siempre.
        setWorker(data.worker ? { ...data.worker, stale: data.workerStale, staleMinutes: data.workerStaleMinutes } : null)
        
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
