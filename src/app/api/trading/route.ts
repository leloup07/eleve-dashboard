import { NextResponse } from 'next/server'
import Redis from 'ioredis'

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('REDIS_URL no configurada')
  }
  return new Redis(redisUrl)
}

// Función para procesar posiciones con todos los campos calculados
function processPosition(p: any, category: string) {
  const entry = p.entry || 0
  const size = p.size || 0
  const sl = p.sl || 0
  const tp = p.tp || 0
  const maxPrice = p.max_price || entry
  const currentPrice = maxPrice // Usamos max_price como proxy de precio actual
  
  // Calcular invested_amount
  const investedAmount = entry * size
  
  // Calcular riesgo original (R) - el SL original antes de moverlo
  const originalSl = p.original_sl || sl
  const riskPerUnit = entry - originalSl
  
  // Calcular PnL no realizado
  const unrealizedPnl = (currentPrice - entry) * size
  const unrealizedPnlPercent = entry > 0 ? ((currentPrice - entry) / entry) * 100 : 0
  
  // Calcular R-Multiple actual
  const rMultiple = riskPerUnit > 0 ? (currentPrice - entry) / riskPerUnit : 0
  
  return {
    ...p,
    category,
    strategy: category,
    invested_amount: investedAmount,
    current_price: currentPrice,
    unrealized_pnl: unrealizedPnl,
    unrealized_pnl_percent: unrealizedPnlPercent,
    r_multiple: rMultiple,
    original_sl: originalSl,
    risk_per_unit: riskPerUnit,
    // Campos para el Journal
    open_date: p.timestamp || p.open_date || new Date().toISOString(),
    reason: p.reason || '',
    grade: p.grade || 'B',
    rsi: p.rsi || null,
    adx: p.adx || null,
    volume: p.volume || null,
    ema20: p.ema20 || null,
    ema50: p.ema50 || null,
    atr: p.atr || (riskPerUnit / 2) // Estimamos ATR como riesgo/2
  }
}

// Función para procesar trades con todos los campos calculados
function processTrade(t: any) {
  const entry = t.entry || 0
  const exit = t.exit || t.exit_price || 0
  const size = t.size || 0
  const sl = t.original_sl || t.sl || 0
  const tp = t.tp || 0
  const pnl = t.pnl || 0
  
  // Calcular invested_amount
  const investedAmount = entry * size
  
  // Calcular riesgo original (R)
  const riskPerUnit = entry - sl
  const totalRisk = riskPerUnit * size
  
  // Calcular R-Multiple
  const rMultiple = totalRisk > 0 ? pnl / totalRisk : 0
  
  // Calcular días de holding
  const entryDate = new Date(t.timestamp || t.entry_time || Date.now())
  const exitDate = new Date(t.exit_time || Date.now())
  const holdingMs = exitDate.getTime() - entryDate.getTime()
  const holdingDays = Math.max(1, Math.ceil(holdingMs / (1000 * 60 * 60 * 24)))
  
  // Determinar estrategia/categoría
  const strategy = t.category || t.strategy || 'unknown'
  
  return {
    ...t,
    strategy,
    invested_amount: investedAmount,
    exit: exit,
    original_sl: sl,
    risk_per_unit: riskPerUnit,
    total_risk: totalRisk,
    r_multiple: rMultiple,
    holding_days: holdingDays,
    close_date: t.exit_time || new Date().toISOString(),
    // Campos para el Journal
    reason: t.reason || '',
    grade: t.grade || 'B',
    rsi: t.rsi || null,
    adx: t.adx || null,
    volume: t.volume || null,
    ema20: t.ema20 || null,
    ema50: t.ema50 || null,
    atr: t.atr || (riskPerUnit / 2)
  }
}

export async function GET() {
  let redis: Redis | null = null
  
  try {
    redis = getRedisClient()
    
    // === POSICIONES ===
    let allPositions: any[] = []
    
    const categories = ['crypto', 'large_caps', 'small_caps']
    for (const cat of categories) {
      const key = `eleve:positions:${cat}`
      const raw = await redis.get(key)
      if (raw) {
        try {
          const positions = JSON.parse(raw)
          if (Array.isArray(positions)) {
            const processedPositions = positions.map(p => processPosition(p, cat))
            allPositions = [...allPositions, ...processedPositions]
          }
        } catch {}
      }
    }
    
    // === TRADES ===
    let trades: any[] = []
    const tradesRaw = await redis.get('eleve:trades')
    if (tradesRaw) {
      try {
        const rawTrades = JSON.parse(tradesRaw)
        if (Array.isArray(rawTrades)) {
          trades = rawTrades.map(t => processTrade(t))
        }
      } catch {}
    }
    
    // === REGÍMENES ===
    let cryptoRegime = 'UNKNOWN'
    let stocksRegime = 'UNKNOWN'
    
    const cryptoRegimeRaw = await redis.get('eleve:regime:crypto')
    if (cryptoRegimeRaw) {
      try {
        const parsed = JSON.parse(cryptoRegimeRaw)
        cryptoRegime = parsed.regime || 'UNKNOWN'
      } catch {}
    }
    
    const stocksRegimeRaw = await redis.get('eleve:regime:stocks')
    if (stocksRegimeRaw) {
      try {
        const parsed = JSON.parse(stocksRegimeRaw)
        stocksRegime = parsed.regime || 'UNKNOWN'
      } catch {}
    }
    
    // === WORKER STATUS ===
    let workerStatus: any = {}
    const workerRaw = await redis.get('eleve:worker')
    if (workerRaw) {
      try {
        workerStatus = JSON.parse(workerRaw)
      } catch {}
    }
    
    // === ESTADÍSTICAS ===
    const totalTradesRaw = await redis.get('eleve:stats:total_trades')
    const totalPnlRaw = await redis.get('eleve:stats:total_pnl')
    const winningTradesRaw = await redis.get('eleve:stats:winning_trades')
    
    // === INTRADAY DATA ===
    let intradayPositions: any[] = []
    let intradayTrades: any[] = []
    let intradayDaily: any = null
    let intradayWorker: any = null
    
    const intradayPosRaw = await redis.get('eleve:intraday:positions')
    if (intradayPosRaw) {
      try {
        intradayPositions = JSON.parse(intradayPosRaw)
        if (!Array.isArray(intradayPositions)) intradayPositions = []
      } catch {}
    }
    
    const intradayTradesRaw = await redis.get('eleve:intraday:trades')
    if (intradayTradesRaw) {
      try {
        intradayTrades = JSON.parse(intradayTradesRaw)
        if (!Array.isArray(intradayTrades)) intradayTrades = []
      } catch {}
    }
    
    const today = new Date().toISOString().split('T')[0]
    const intradayDailyRaw = await redis.get(`eleve:intraday:daily:${today}`)
    if (intradayDailyRaw) {
      try {
        intradayDaily = JSON.parse(intradayDailyRaw)
      } catch {}
    }
    
    const intradayWorkerRaw = await redis.get('eleve:intraday:worker')
    if (intradayWorkerRaw) {
      try {
        intradayWorker = JSON.parse(intradayWorkerRaw)
      } catch {}
    }
    
    // === INTRADAY 1% DATA ===
    let intraday1PctPositions: any[] = []
    let intraday1PctTrades: any[] = []
    let intraday1PctDaily: any = null
    let intraday1PctWorker: any = null
    let intraday1PctSelected: any = null
    
    const i1PctPosRaw = await redis.get('eleve:intraday1pct:positions')
    if (i1PctPosRaw) {
      try {
        intraday1PctPositions = JSON.parse(i1PctPosRaw)
        if (!Array.isArray(intraday1PctPositions)) intraday1PctPositions = []
      } catch {}
    }
    
    const i1PctTradesRaw = await redis.get('eleve:intraday1pct:trades')
    if (i1PctTradesRaw) {
      try {
        intraday1PctTrades = JSON.parse(i1PctTradesRaw)
        if (!Array.isArray(intraday1PctTrades)) intraday1PctTrades = []
      } catch {}
    }
    
    const i1PctDailyRaw = await redis.get(`eleve:intraday1pct:daily:${today}`)
    if (i1PctDailyRaw) {
      try {
        intraday1PctDaily = JSON.parse(i1PctDailyRaw)
      } catch {}
    }
    
    const i1PctWorkerRaw = await redis.get('eleve:intraday1pct:worker')
    if (i1PctWorkerRaw) {
      try {
        intraday1PctWorker = JSON.parse(i1PctWorkerRaw)
      } catch {}
    }
    
    const i1PctSelectedRaw = await redis.get(`eleve:intraday1pct:selected:${today}`)
    if (i1PctSelectedRaw) {
      try {
        intraday1PctSelected = JSON.parse(i1PctSelectedRaw)
      } catch {}
    }
    
    let intraday1PctAnalysis: any = null
    const i1PctAnalysisRaw = await redis.get(`eleve:intraday1pct:analysis:${today}`)
    if (i1PctAnalysisRaw) {
      try {
        intraday1PctAnalysis = JSON.parse(i1PctAnalysisRaw)
      } catch {}
    }
    
    await redis.quit()
    
    return NextResponse.json({
      success: true,
      data: {
        positions: allPositions,
        trades,
        btcRegime: cryptoRegime,
        spyRegime: stocksRegime,
        botActive: workerStatus.status === 'running',
        redisConnected: true,
        lastUpdate: new Date().toISOString(),
        worker: workerStatus,
        stats: {
          totalTrades: parseInt(totalTradesRaw || '0'),
          totalPnl: parseFloat(totalPnlRaw || '0'),
          winningTrades: parseInt(winningTradesRaw || '0')
        },
        intradayPositions,
        intradayTrades,
        intradayDaily,
        intradayWorker,
        intraday1PctPositions,
        intraday1PctTrades,
        intraday1PctDaily,
        intraday1PctWorker,
        intraday1PctSelected,
        intraday1PctAnalysis
      }
    })
    
  } catch (error) {
    if (redis) {
      try { await redis.quit() } catch {}
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      data: {
        positions: [],
        trades: [],
        btcRegime: 'UNKNOWN',
        spyRegime: 'UNKNOWN',
        botActive: false,
        redisConnected: false,
        lastUpdate: new Date().toISOString()
      }
    }, { status: 500 })
  }
}
