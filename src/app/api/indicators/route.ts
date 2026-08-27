import { NextRequest, NextResponse } from 'next/server'

// Datos en vivo desde Redis: Next 14 cachea por defecto los route handlers GET,
// asi que sin esto la ruta se sirve como un snapshot congelado del momento del build.
export const dynamic = 'force-dynamic'
export const revalidate = 0


function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const ema: number[] = [data[0]]
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k))
  }
  return ema
}

function calcRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = Array(period).fill(50)
  const gains: number[] = []
  const losses: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    gains.push(diff > 0 ? diff : 0)
    losses.push(diff < 0 ? -diff : 0)
  }
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }
  return rsi
}

function calcMACD(closes: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { macd: number[], signal: number[], hist: number[] } {
  const emaFast = calcEMA(closes, fastPeriod)
  const emaSlow = calcEMA(closes, slowPeriod)
  const macd = emaFast.map((v, i) => v - emaSlow[i])
  const signal = calcEMA(macd, signalPeriod)
  const hist = macd.map((v, i) => v - signal[i])
  return { macd, signal, hist }
}

function calcATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const tr: number[] = [highs[0] - lows[0]]
  for (let i = 1; i < closes.length; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])))
  }
  const atr: number[] = []
  for (let i = 0; i < tr.length; i++) {
    if (i < period) atr.push(tr.slice(0, i+1).reduce((a,b) => a+b, 0) / (i+1))
    else atr.push((atr[i-1] * (period-1) + tr[i]) / period)
  }
  return atr
}

function calcADX(highs: number[], lows: number[], closes: number[], period: number = 14) {
  const tr: number[] = [], plusDm: number[] = [], minusDm: number[] = []
  for (let i = 1; i < closes.length; i++) {
    tr.push(Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1])))
    const up = highs[i] - highs[i-1], down = lows[i-1] - lows[i]
    plusDm.push(up > down && up > 0 ? up : 0)
    minusDm.push(down > up && down > 0 ? down : 0)
  }
  const smoothTr = calcEMA(tr, period), smoothPlus = calcEMA(plusDm, period), smoothMinus = calcEMA(minusDm, period)
  const plusDi = smoothPlus.map((v,i) => smoothTr[i] > 0 ? (v/smoothTr[i])*100 : 0)
  const minusDi = smoothMinus.map((v,i) => smoothTr[i] > 0 ? (v/smoothTr[i])*100 : 0)
  const dx = plusDi.map((v,i) => { const s = v + minusDi[i]; return s > 0 ? (Math.abs(v - minusDi[i])/s)*100 : 0 })
  return { adx: [0, ...calcEMA(dx, period)], plusDi: [0, ...plusDi], minusDi: [0, ...minusDi] }
}

function calcBollinger(closes: number[], period: number = 20, mult: number = 2) {
  const middle = calcEMA(closes, period), upper: number[] = [], lower: number[] = []
  for (let i = 0; i < closes.length; i++) {
    const slice = closes.slice(Math.max(0, i-period+1), i+1)
    const mean = slice.reduce((a,b) => a+b, 0) / slice.length
    const std = Math.sqrt(slice.reduce((a,b) => a + Math.pow(b-mean, 2), 0) / slice.length)
    upper.push(middle[i] + std*mult)
    lower.push(middle[i] - std*mult)
  }
  return { upper, middle, lower }
}

function calcStochastic(highs: number[], lows: number[], closes: number[], period: number = 14, smooth: number = 3) {
  const k: number[] = []
  for (let i = 0; i < closes.length; i++) {
    const start = Math.max(0, i-period+1)
    const highest = Math.max(...highs.slice(start, i+1)), lowest = Math.min(...lows.slice(start, i+1))
    k.push(highest === lowest ? 50 : ((closes[i]-lowest)/(highest-lowest))*100)
  }
  return { k, d: calcEMA(k, smooth) }
}

// Configuración de EMAs por estrategia
const STRATEGY_EMAS: Record<string, { fast: number, mid: number, slow: number }> = {
  'crypto_swing': { fast: 20, mid: 50, slow: 200 },
  'large_caps': { fast: 20, mid: 50, slow: 200 },
  'small_caps': { fast: 20, mid: 50, slow: 200 },
  'vwap_reversion': { fast: 9, mid: 21, slow: 50 },      // EMAs intraday
  'one_percent_spot': { fast: 9, mid: 21, slow: 50 },
  'default': { fast: 20, mid: 50, slow: 200 }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker') || 'BTC-USD'
  const interval = searchParams.get('interval') || '1h'
  const range = searchParams.get('range') || '7d'
  const strategy = searchParams.get('strategy') || 'default'
  
  // Obtener EMAs para la estrategia
  const emaConfig = STRATEGY_EMAS[strategy] || STRATEGY_EMAS['default']
  
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!response.ok) throw new Error(`Yahoo error: ${response.status}`)
    
    const json = await response.json()
    const result = json.chart?.result?.[0]
    if (!result?.indicators?.quote?.[0]) throw new Error('No data from Yahoo')
    
    const ts = result.timestamp || []
    const q = result.indicators.quote[0]
    const idx = q.close.map((c: any, i: number) => c !== null ? i : -1).filter((i: number) => i !== -1)
    
    const closes = idx.map((i: number) => q.close[i])
    const highs = idx.map((i: number) => q.high[i] || q.close[i])
    const lows = idx.map((i: number) => q.low[i] || q.close[i])
    const volumes = idx.map((i: number) => q.volume[i] || 0)
    const timestamps = idx.map((i: number) => ts[i])
    
    if (closes.length < 20) throw new Error('Not enough data')
    
    // EMAs dinámicas según estrategia
    const emaFast = calcEMA(closes, emaConfig.fast)
    const emaMid = calcEMA(closes, emaConfig.mid)
    const emaSlow = closes.length >= emaConfig.slow 
      ? calcEMA(closes, emaConfig.slow) 
      : calcEMA(closes, Math.min(closes.length, emaConfig.mid))
    
    // MACD usa EMAs de la estrategia si es aggressive, sino 12/26/9 estándar
    const macdFast = 12
    const macdSlow = 26
    
    const rsi = calcRSI(closes)
    const { macd, signal, hist } = calcMACD(closes, macdFast, macdSlow, 9)
    const atr = calcATR(highs, lows, closes)
    const { adx, plusDi, minusDi } = calcADX(highs, lows, closes)
    const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = calcBollinger(closes)
    const { k: stochK, d: stochD } = calcStochastic(highs, lows, closes)
    
    const data = closes.map((close: number, i: number) => ({
      timestamp: new Date(timestamps[i] * 1000).toISOString(),
      close, high: highs[i], low: lows[i], volume: volumes[i],
      // EMAs con nombres genéricos + valores de período
      emaFast: emaFast[i], 
      emaMid: emaMid[i], 
      emaSlow: emaSlow[i] || emaMid[i],
      // Mantener compatibilidad con código existente
      ema20: emaFast[i],  // Alias para compatibilidad
      ema50: emaMid[i],   // Alias para compatibilidad
      ema200: emaSlow[i] || emaMid[i],  // Alias para compatibilidad
      rsi: rsi[i] || 50, rsiPrev: rsi[i-1] || 50,
      macd: macd[i], macdSignal: signal[i], macdHist: hist[i], macdHistPrev: hist[i-1] || 0,
      bbUpper: bbUpper[i], bbMiddle: bbMiddle[i], bbLower: bbLower[i],
      atr: atr[i], adx: adx[i] || 20, plusDi: plusDi[i] || 20, minusDi: minusDi[i] || 20,
      stochK: stochK[i], stochD: stochD[i], obv: 0
    }))
    
    return NextResponse.json({ 
      success: true, 
      ticker, 
      strategy,
      emaConfig,  // Devolver config para que el frontend sepa qué EMAs se usan
      data 
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
