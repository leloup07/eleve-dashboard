import { NextResponse } from 'next/server'
import Redis from 'ioredis'

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('REDIS_URL no configurada')
  }
  return new Redis(redisUrl)
}

export async function GET() {
  let redis: Redis | null = null
  
  try {
    redis = getRedisClient()
    
    // === POSICIONES ===
    // El worker guarda en: eleve:positions:{category}
    // Categorías: crypto, large_caps, small_caps
    let allPositions: any[] = []
    
    const categories = ['crypto', 'large_caps', 'small_caps']
    for (const cat of categories) {
      const key = `eleve:positions:${cat}`
      const raw = await redis.get(key)
      if (raw) {
        try {
          const positions = JSON.parse(raw)
          if (Array.isArray(positions)) {
            allPositions = [...allPositions, ...positions.map(p => ({ ...p, category: cat }))]
          }
        } catch {}
      }
    }
    
    // === TRADES ===
    // El worker guarda en: eleve:trades como JSON array
    let trades: any[] = []
    const tradesRaw = await redis.get('eleve:trades')
    if (tradesRaw) {
      try {
        trades = JSON.parse(tradesRaw)
        if (!Array.isArray(trades)) trades = []
      } catch {}
    }
    
    // === REGÍMENES ===
    // El worker guarda: {"regime": "BULL", "updated": "..."}
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
    
    // Intraday positions
    const intradayPosRaw = await redis.get('eleve:intraday:positions')
    if (intradayPosRaw) {
      try {
        intradayPositions = JSON.parse(intradayPosRaw)
        if (!Array.isArray(intradayPositions)) intradayPositions = []
      } catch {}
    }
    
    // Intraday trades
    const intradayTradesRaw = await redis.get('eleve:intraday:trades')
    if (intradayTradesRaw) {
      try {
        intradayTrades = JSON.parse(intradayTradesRaw)
        if (!Array.isArray(intradayTrades)) intradayTrades = []
      } catch {}
    }
    
    // Intraday daily stats (today)
    const today = new Date().toISOString().split('T')[0]
    const intradayDailyRaw = await redis.get(`eleve:intraday:daily:${today}`)
    if (intradayDailyRaw) {
      try {
        intradayDaily = JSON.parse(intradayDailyRaw)
      } catch {}
    }
    
    // Intraday worker status
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
    
    // 1% positions
    const i1PctPosRaw = await redis.get('eleve:intraday1pct:positions')
    if (i1PctPosRaw) {
      try {
        intraday1PctPositions = JSON.parse(i1PctPosRaw)
        if (!Array.isArray(intraday1PctPositions)) intraday1PctPositions = []
      } catch {}
    }
    
    // 1% trades
    const i1PctTradesRaw = await redis.get('eleve:intraday1pct:trades')
    if (i1PctTradesRaw) {
      try {
        intraday1PctTrades = JSON.parse(i1PctTradesRaw)
        if (!Array.isArray(intraday1PctTrades)) intraday1PctTrades = []
      } catch {}
    }
    
    // 1% daily stats
    const i1PctDailyRaw = await redis.get(`eleve:intraday1pct:daily:${today}`)
    if (i1PctDailyRaw) {
      try {
        intraday1PctDaily = JSON.parse(i1PctDailyRaw)
      } catch {}
    }
    
    // 1% worker status
    const i1PctWorkerRaw = await redis.get('eleve:intraday1pct:worker')
    if (i1PctWorkerRaw) {
      try {
        intraday1PctWorker = JSON.parse(i1PctWorkerRaw)
      } catch {}
    }
    
    // 1% selected assets for today
    const i1PctSelectedRaw = await redis.get(`eleve:intraday1pct:selected:${today}`)
    if (i1PctSelectedRaw) {
      try {
        intraday1PctSelected = JSON.parse(i1PctSelectedRaw)
      } catch {}
    }
    
    // 1% analysis for today
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
        // Intraday VWAP data
        intradayPositions,
        intradayTrades,
        intradayDaily,
        intradayWorker,
        // Intraday 1% data
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
