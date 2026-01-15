import { NextResponse } from 'next/server'

const KRAKEN_PAIRS: Record<string, string> = {
  'BTC-USD': 'XXBTZUSD',
  'ETH-USD': 'XETHZUSD',
  'SOL-USD': 'SOLUSD',
  'XRP-USD': 'XXRPZUSD',
  'AVAX-USD': 'AVAXUSD',
  'LINK-USD': 'LINKUSD',
  'ADA-USD': 'ADAUSD',
  'DOT-USD': 'DOTUSD'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker') || 'BTC-USD'
  const isCrypto = ticker.includes('-USD') && KRAKEN_PAIRS[ticker]
  
  try {
    let closes: number[] = []
    let highs: number[] = []
    let lows: number[] = []
    let volumes: number[] = []
    let timestamps: number[] = []
    
    if (isCrypto) {
      // KRAKEN para crypto - datos reales
      const pair = KRAKEN_PAIRS[ticker]
      const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=1440`
      const response = await fetch(url, { cache: 'no-store' })
      const json = await response.json()
      
      if (json.error?.length > 0) throw new Error(json.error[0])
      
      const dataKey = Object.keys(json.result).find(k => k !== 'last') || ''
      const data = json.result[dataKey] || []
      
      for (const candle of data.slice(-90)) {
        timestamps.push(candle[0] * 1000)
        highs.push(parseFloat(candle[2]))
        lows.push(parseFloat(candle[3]))
        closes.push(parseFloat(candle[4]))
        volumes.push(parseFloat(candle[6]))
      }
    } else {
      // Yahoo Finance para stocks
      const period1 = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60
      const period2 = Math.floor(Date.now() / 1000)
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`
      
      const response = await fetch(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store'
      })
      const json = await response.json()
      const result = json.chart?.result?.[0]
      
      if (!result) throw new Error('No data from Yahoo')
      
      timestamps = (result.timestamp || []).map((t: number) => t * 1000)
      const quote = result.indicators?.quote?.[0] || {}
      closes = quote.close || []
      highs = quote.high || []
      lows = quote.low || []
      volumes = quote.volume || []
    }
    
    // Calcular indicadores
    const indicators = []
    
    for (let i = 50; i < closes.length; i++) {
      if (!closes[i]) continue
      
      const slice = closes.slice(0, i + 1)
      const ema20 = calcEMA(slice, 20)
      const ema50 = calcEMA(slice, 50)
      const ema200 = i >= 200 ? calcEMA(slice, 200) : ema50
      const rsi = calcRSI(slice.slice(-15))
      const rsiPrev = calcRSI(slice.slice(-16, -1))
      const macdData = calcMACD(slice)
      const atr = calcATR(highs.slice(i-14, i+1), lows.slice(i-14, i+1), closes.slice(i-14, i+1))
      const adxData = calcADX(highs.slice(i-14, i+1), lows.slice(i-14, i+1), closes.slice(i-14, i+1))
      const bb = calcBollinger(closes.slice(i-20, i+1))
      const stoch = calcStoch(highs.slice(i-14, i+1), lows.slice(i-14, i+1), closes[i])
      
      indicators.push({
        timestamp: new Date(timestamps[i]).toISOString(),
        close: closes[i],
        ema20, ema50, ema200,
        rsi, rsiPrev,
        macd: macdData.macd, macdSignal: macdData.signal, macdHist: macdData.hist, macdHistPrev: macdData.histPrev,
        atr,
        adx: adxData.adx, plusDi: adxData.plusDi, minusDi: adxData.minusDi,
        bbUpper: bb.upper, bbMiddle: bb.middle, bbLower: bb.lower,
        stochK: stoch.k, stochD: stoch.d,
        volume: volumes[i], obv: 0
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: indicators, 
      ticker,
      source: isCrypto ? 'kraken' : 'yahoo'
    })
  } catch (error) {
    console.error('Indicators API error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

function calcEMA(data: number[], period: number): number {
  const k = 2 / (period + 1)
  let ema = data[0] || 0
  for (let i = 1; i < data.length; i++) {
    if (data[i] != null) ema = data[i] * k + ema * (1 - k)
  }
  return ema
}

function calcRSI(closes: number[]): number {
  if (closes.length < 2) return 50
  let gains = 0, losses = 0
  for (let i = 1; i < closes.length; i++) {
    const diff = (closes[i] || 0) - (closes[i-1] || 0)
    if (diff > 0) gains += diff; else losses -= diff
  }
  if (losses === 0) return 100
  const rs = (gains / (closes.length-1)) / (losses / (closes.length-1))
  return 100 - (100 / (1 + rs))
}

function calcMACD(closes: number[]) {
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  const macd = ema12 - ema26
  const prevSlice = closes.slice(0, -1)
  const prevMacd = calcEMA(prevSlice, 12) - calcEMA(prevSlice, 26)
  const signal = (macd + prevMacd) / 2
  return { macd, signal, hist: macd - signal, histPrev: prevMacd - signal }
}

function calcATR(highs: number[], lows: number[], closes: number[]): number {
  if (highs.length < 2) return 0
  let sum = 0
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      (highs[i]||0) - (lows[i]||0),
      Math.abs((highs[i]||0) - (closes[i-1]||0)),
      Math.abs((lows[i]||0) - (closes[i-1]||0))
    )
    sum += tr
  }
  return sum / (highs.length - 1)
}

function calcADX(highs: number[], lows: number[], closes: number[]) {
  let plusDM = 0, minusDM = 0, trSum = 0
  for (let i = 1; i < highs.length; i++) {
    const upMove = (highs[i]||0) - (highs[i-1]||0)
    const downMove = (lows[i-1]||0) - (lows[i]||0)
    if (upMove > downMove && upMove > 0) plusDM += upMove
    if (downMove > upMove && downMove > 0) minusDM += downMove
    trSum += Math.max((highs[i]||0)-(lows[i]||0), Math.abs((highs[i]||0)-(closes[i-1]||0)), Math.abs((lows[i]||0)-(closes[i-1]||0)))
  }
  const plusDi = trSum > 0 ? (plusDM / trSum) * 100 : 0
  const minusDi = trSum > 0 ? (minusDM / trSum) * 100 : 0
  const dx = (plusDi + minusDi) > 0 ? Math.abs(plusDi - minusDi) / (plusDi + minusDi) * 100 : 0
  return { adx: dx, plusDi, minusDi }
}

function calcBollinger(closes: number[]) {
  const valid = closes.filter(c => c != null)
  const avg = valid.reduce((a,b) => a+b, 0) / valid.length
  const variance = valid.reduce((s,c) => s + Math.pow(c-avg,2), 0) / valid.length
  const std = Math.sqrt(variance)
  return { upper: avg + std*2, middle: avg, lower: avg - std*2 }
}

function calcStoch(highs: number[], lows: number[], close: number) {
  const high = Math.max(...highs.filter(h => h != null))
  const low = Math.min(...lows.filter(l => l != null))
  const k = high !== low ? ((close - low) / (high - low)) * 100 : 50
  return { k, d: k }
}
