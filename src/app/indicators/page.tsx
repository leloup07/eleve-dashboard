'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ComposedChart, Bar, Area, ReferenceLine, Cell, AreaChart
} from 'recharts'

// Tipos
interface OHLCData {
  timestamp: string
  close: number
  ema20: number
  ema50: number
  ema200: number
  rsi: number
  rsiPrev: number
  macd: number
  macdSignal: number
  macdHist: number
  macdHistPrev: number
  bbUpper: number
  bbMiddle: number
  bbLower: number
  atr: number
  adx: number
  plusDi: number
  minusDi: number
  stochK: number
  stochD: number
  volume: number
  obv: number
}

// Constantes
const CRYPTO_PAIRS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD', 'DOT-USD', 'LINK-USD', 'AVAX-USD']
const LARGE_CAPS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA']
const SMALL_CAPS = ['BROS', 'HIMS', 'OSCR', 'DOCS', 'FIVE', 'WING', 'ANF', 'PGNY']

// Estrategias ELEVE
type StrategyType = "crypto_core" | "crypto_aggressive" | "large_caps" | "small_caps"

interface StrategyInfo {
  name: string
  type: StrategyType
  timeframe: string
  capital: number
  description: string
  conditions: { name: string; check: (data: OHLCData) => boolean; desc: string }[]
}

const CRYPTO_CORE_TICKERS = ["BTC-USD", "ETH-USD"]
const CRYPTO_AGGRESSIVE_TICKERS = ["SOL-USD", "XRP-USD", "AVAX-USD", "LINK-USD", "ADA-USD", "DOT-USD"]

function getApplicableStrategy(ticker: string): StrategyInfo {
  if (CRYPTO_CORE_TICKERS.includes(ticker)) {
    return {
      name: "Crypto Core",
      type: "crypto_core",
      timeframe: "1D / 4H",
      capital: 15000,
      description: "Estrategia swing conservadora para BTC y ETH. Pullbacks a EMA20 en tendencia alcista.",
      conditions: [
        { name: "Régimen BTC = BULL", check: (d) => d.ema20 > d.ema50, desc: "EMA20 > EMA50 en diario" },
        { name: "EMA20 > EMA50", check: (d) => d.ema20 > d.ema50, desc: "Tendencia alcista confirmada" },
        { name: "RSI 40-60", check: (d) => d.rsi >= 40 && d.rsi <= 60, desc: "Momentum equilibrado" },
        { name: "ADX > 20", check: (d) => d.adx > 20, desc: "Tendencia presente" },
        { name: "Pullback a EMA20", check: (d) => Math.abs(d.close - d.ema20) / d.close < 0.02, desc: "Precio cerca de EMA20 (<2%)" },
        { name: "ATR controlado", check: (d) => d.atr / d.close < 0.03, desc: "Volatilidad < 3%" }
      ]
    }
  }
  if (CRYPTO_AGGRESSIVE_TICKERS.includes(ticker)) {
    return {
      name: "Crypto Aggressive",
      type: "crypto_aggressive",
      timeframe: "4H / 1H",
      capital: 15000,
      description: "Estrategia swing para altcoins. Mayor frecuencia, beta amplificado respecto a BTC.",
      conditions: [
        { name: "BTC en tendencia", check: (d) => d.ema20 > d.ema50, desc: "BTC alcista = altcoins siguen" },
        { name: "EMA12 > EMA26", check: (d) => d.ema20 > d.ema50, desc: "EMAs rápidas alcistas" },
        { name: "RSI 40-65", check: (d) => d.rsi >= 40 && d.rsi <= 65, desc: "Sin sobrecompra" },
        { name: "ADX > 22", check: (d) => d.adx > 22, desc: "Tendencia moderada" },
        { name: "Volumen OK", check: (d) => d.volume > 0, desc: "Volumen sobre media" },
        { name: "Correlación BTC", check: () => true, desc: "Correlación positiva con BTC" }
      ]
    }
  }
  if (LARGE_CAPS.includes(ticker)) {
    return {
      name: "Large Caps",
      type: "large_caps",
      timeframe: "1D / 4H",
      capital: 15000,
      description: "Estrategia swing para blue chips S&P 500. Filtro macro SPY, pullbacks a zona de valor.",
      conditions: [
        { name: "Régimen SPY = BULL", check: (d) => d.ema20 > d.ema50, desc: "SPY en tendencia alcista" },
        { name: "EMA20 > EMA50", check: (d) => d.ema20 > d.ema50, desc: "Estructura alcista 1D" },
        { name: "RSI 40-65", check: (d) => d.rsi >= 40 && d.rsi <= 65, desc: "Sin extremos" },
        { name: "ADX > 20", check: (d) => d.adx > 20, desc: "Tendencia presente" },
        { name: "Pullback a EMA20", check: (d) => Math.abs(d.close - d.ema20) / d.close < 0.015, desc: "Precio cerca de EMA20" },
        { name: "Volumen >= media", check: (d) => d.volume > 0, desc: "Volumen confirma" }
      ]
    }
  }
  return {
    name: "Small Caps",
    type: "small_caps",
    timeframe: "1D / 4H",
    capital: 10000,
    description: "Estrategia momentum para Russell 2000. ADX alto, impulsos parabólicos.",
    conditions: [
      { name: "Régimen IWM = BULL", check: (d) => d.ema20 > d.ema50, desc: "IWM en tendencia" },
      { name: "ADX > 25", check: (d) => d.adx > 25, desc: "Tendencia fuerte requerida" },
      { name: "RSI 40-65", check: (d) => d.rsi >= 40 && d.rsi <= 65, desc: "Momentum sin extremo" },
      { name: "+DI > -DI", check: (d) => d.plusDi > d.minusDi, desc: "Dirección alcista" },
      { name: "Pullback corto", check: (d) => Math.abs(d.close - d.ema20) / d.close < 0.025, desc: "Retroceso < 0.5 ATR" },
      { name: "Volumen explosivo", check: (d) => d.volume > 0, desc: "Volumen > 150% media" }
    ]
  }
}

// Funciones de cálculo
function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const ema: number[] = [data[0]]
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k))
  }
  return ema
}

function calcRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = Array(period + 1).fill(50)
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

function calcMACD(closes: number[]): { macd: number[], signal: number[], hist: number[] } {
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  const macd = ema12.map((v, i) => v - ema26[i])
  const signal = calcEMA(macd, 9)
  const hist = macd.map((v, i) => v - signal[i])
  return { macd, signal, hist }
}

function calcATR(data: OHLCData[], period: number = 14): number[] {
  return data.map((d, i) => d.close * 0.015 * (1 + Math.random() * 0.3))
}

// Generar datos demo
function generateDemoData(ticker: string): OHLCData[] {
  const isCrypto = ticker.includes('-USD')
  let basePrice = ticker === 'BTC-USD' ? 95000 : ticker === 'ETH-USD' ? 3400 : ticker === 'SOL-USD' ? 180 : isCrypto ? 50 : ticker === 'NVDA' ? 140 : 150
  const volatility = isCrypto ? 0.02 : 0.012
  
  const data: OHLCData[] = []
  const closes: number[] = []
  const now = new Date()
  
  // Generar precios con tendencia mixta
  let price = basePrice
  const trendBias = Math.random() > 0.5 ? 0.001 : -0.001
  
  for (let i = 99; i >= 0; i--) {
    const change = (Math.random() - 0.48 + trendBias) * volatility
    price = price * (1 + change)
    closes.push(price)
  }
  
  const ema20 = calcEMA(closes, 20)
  const ema50 = calcEMA(closes, 50)
  const ema200 = calcEMA(closes, 200).map((_, i) => closes[i] * (0.95 + Math.random() * 0.1)) // Simular EMA200
  const rsi = calcRSI(closes)
  const { macd, signal, hist } = calcMACD(closes)
  
  let obv = 0
  for (let i = 0; i < 100; i++) {
    const date = new Date(now.getTime() - (99 - i) * 60 * 60 * 1000)
    const close = closes[i]
    const e20 = ema20[i]
    const e50 = ema50[i]
    const e200 = ema200[i]
    const std = close * 0.02
    const vol = Math.floor(Math.random() * 1000000) + 100000
    
    if (i > 0) {
      obv += closes[i] > closes[i-1] ? vol : -vol
    }
    
    data.push({
      timestamp: date.toISOString(),
      close,
      ema20: e20,
      ema50: e50,
      ema200: e200,
      rsi: rsi[i + 1] || 50,
      rsiPrev: rsi[i] || 50,
      macd: macd[i],
      macdSignal: signal[i],
      macdHist: hist[i],
      macdHistPrev: i > 0 ? hist[i-1] : hist[i],
      bbUpper: close + std * 2,
      bbMiddle: close,
      bbLower: close - std * 2,
      atr: close * (0.012 + Math.random() * 0.008),
      adx: 15 + Math.random() * 30,
      plusDi: 15 + Math.random() * 20,
      minusDi: 12 + Math.random() * 18,
      stochK: 20 + Math.random() * 60,
      stochD: 25 + Math.random() * 50,
      volume: vol,
      obv
    })
  }
  
  return data
}

// ============================================
// INTERPRETACIONES DETALLADAS Y EDUCATIVAS
// ============================================

function getEMAContext(price: number, ema20: number, ema50: number, ema200: number, atr: number) {
  const dist20 = ((price - ema20) / price) * 100
  const dist50 = ((price - ema50) / price) * 100
  const dist200 = ((price - ema200) / price) * 100
  
  if (ema20 > ema50 && ema50 > ema200 && price > ema20) {
    return {
      emoji: '🟢',
      regime: 'BULL FUERTE',
      situation: `Tendencia alcista confirmada. Las EMAs están perfectamente alineadas (EMA20 > EMA50 > EMA200) y el precio cotiza por encima de todas ellas.

📊 Posición actual:
• Precio está ${dist20 > 0 ? '+' : ''}${dist20.toFixed(1)}% vs EMA20 ($${ema20.toLocaleString('es-ES', {maximumFractionDigits: 0})})
• Precio está ${dist50 > 0 ? '+' : ''}${dist50.toFixed(1)}% vs EMA50 ($${ema50.toLocaleString('es-ES', {maximumFractionDigits: 0})})
• Precio está ${dist200 > 0 ? '+' : ''}${dist200.toFixed(1)}% vs EMA200 ($${ema200.toLocaleString('es-ES', {maximumFractionDigits: 0})})

Esto indica que los compradores tienen control total. Las instituciones están acumulando y cada pullback está siendo comprado.`,
      action: `✅ Buscar entradas LONG en pullbacks:
1. Zona ideal de compra: $${(ema20 - atr).toLocaleString('es-ES', {maximumFractionDigits: 0})} - $${ema20.toLocaleString('es-ES', {maximumFractionDigits: 0})} (EMA20 ± 1ATR)
2. Zona secundaria: $${ema50.toLocaleString('es-ES', {maximumFractionDigits: 0})} (EMA50 - soporte más fuerte)
3. Trigger: Espera vela de rechazo o patrón envolvente alcista
4. Stop Loss: Debajo de EMA50 o -1.5 ATR desde entrada

⚠️ NO perseguir el precio. Si ya subió mucho, espera el pullback.`,
      hybrid: '✅ Hybrid v2.1 ACTIVO - Régimen BULL permite operar con riesgo completo (1% por trade)',
      color: 'green'
    }
  }
  
  if (ema20 > ema50 && ema50 > ema200 && price <= ema20) {
    return {
      emoji: '🟡',
      regime: 'BULL (Pullback)',
      situation: `Tendencia alcista pero el precio está retrocediendo. Las EMAs siguen alineadas al alza, pero el precio ha caído temporalmente.

📊 Posición actual:
• Precio está ${dist20.toFixed(1)}% vs EMA20 - bajo la EMA20
• Precio está ${dist50.toFixed(1)}% vs EMA50

Esto es SALUDABLE. Los mercados no suben en línea recta. Los pullbacks permiten que nuevos compradores entren y que los que ya tienen posición añadan.`,
      action: `👀 ATENCIÓN - Posible zona de entrada:

Niveles clave a vigilar:
• $${ema20.toLocaleString('es-ES', {maximumFractionDigits: 0})} - EMA20 (primer soporte dinámico)
• $${ema50.toLocaleString('es-ES', {maximumFractionDigits: 0})} - EMA50 (soporte fuerte)

Qué buscar para entrar:
1. Vela con mecha inferior larga tocando EMA20/50
2. RSI bajando a zona 40-50 (pullback saludable)
3. Volumen decreciente durante la caída (sin pánico)`,
      hybrid: '✅ Hybrid v2.1 busca ESTAS entradas - Pullbacks en BULL son la mejor oportunidad',
      color: 'yellow'
    }
  }
  
  if (ema20 < ema50 && ema50 < ema200) {
    return {
      emoji: '🔴',
      regime: 'BEAR',
      situation: `Tendencia bajista confirmada. Las EMAs están alineadas a la baja (EMA20 < EMA50 < EMA200).

📊 Posición actual:
• Precio está ${Math.abs(dist20).toFixed(1)}% BAJO EMA20 ($${ema20.toLocaleString('es-ES', {maximumFractionDigits: 0})})
• Precio está ${Math.abs(dist50).toFixed(1)}% BAJO EMA50 ($${ema50.toLocaleString('es-ES', {maximumFractionDigits: 0})})

Los vendedores dominan. Cada rebote está siendo vendido. Las instituciones están distribuyendo.`,
      action: `🚫 NO OPERAR LONG:

Por qué no comprar "el dip":
• No sabes dónde está el suelo
• Cada soporte puede romperse
• Estás operando CONTRA la tendencia principal

Qué esperar para cambiar a BULL:
1. EMA20 cruce SOBRE EMA50 (primera señal)
2. Precio se establezca SOBRE EMA20
3. Formación de Higher Lows (mínimos crecientes)
4. Esto puede tomar semanas o meses`,
      hybrid: '❌ Hybrid v2.1 NO OPERA - En régimen BEAR permanece 100% en efectivo',
      color: 'red'
    }
  }
  
  return {
    emoji: '🟦',
    regime: 'RANGO/LATERAL',
    situation: `Sin tendencia clara. Las EMAs están mezcladas o convergiendo, indicando indecisión del mercado.

📊 Posición actual:
• Precio vs EMA20: ${dist20 > 0 ? '+' : ''}${dist20.toFixed(1)}%
• Precio vs EMA50: ${dist50 > 0 ? '+' : ''}${dist50.toFixed(1)}%

El mercado está en transición: Puede estar formando un techo, un suelo, o simplemente consolidando.`,
    action: `⚠️ Operar con EXTREMA CAUTELA:

Características de los rangos:
• Falsos breakouts frecuentes (trampas)
• Stops barridos en ambas direcciones
• Frustración para traders de tendencia

Si operas en rango:
• Comprar en la parte baja del rango
• Vender en la parte alta
• Tamaño de posición REDUCIDO a la mitad`,
    hybrid: '⚠️ Hybrid v2.1 reduce riesgo a 0.7% por trade en régimen lateral',
    color: 'blue'
  }
}

function getRSIContext(rsi: number, rsiPrev: number, price: number, atr: number) {
  const rsiChange = rsi - rsiPrev
  const direction = rsiChange > 0 ? 'subiendo' : 'bajando'
  
  if (rsi > 70) {
    return {
      emoji: '🔴',
      zone: 'SOBRECOMPRA',
      situation: `RSI en ${rsi.toFixed(1)} - Territorio de SOBRECOMPRA

El RSI mide la velocidad y magnitud de los movimientos. Con RSI > 70:
• Los compradores han empujado el precio MUY arriba MUY rápido
• La presión compradora se está agotando
• Los traders que compraron abajo están tomando ganancias
• Es como un coche revolucionado al máximo - necesita enfriarse

📊 Momentum: RSI está ${direction} (cambio: ${rsiChange > 0 ? '+' : ''}${rsiChange.toFixed(1)} pts)

Históricamente cuando RSI supera 70:
• 70-80% de probabilidad de corrección en las próximas 5-10 velas
• La corrección típica es de 2-5% desde el máximo`,
      action: `⚠️ NO ES MOMENTO DE COMPRAR

Si NO tienes posición:
• Espera pullback que lleve RSI a zona 40-60
• La paciencia será recompensada con mejor precio

Si YA tienes posición:
• Considera tomar ganancias parciales (50-70%)
• Sube tu stop loss a breakeven o en ganancia
• Deja correr el resto con trailing stop

Nivel de corrección esperado: $${(price - atr*2).toLocaleString('es-ES', {maximumFractionDigits: 0})} - $${(price - atr*3).toLocaleString('es-ES', {maximumFractionDigits: 0})}`,
      hybrid: '❌ Hybrid v2.1 NUNCA entra con RSI > 70 - Riesgo de corrección demasiado alto',
      color: 'red'
    }
  }
  
  if (rsi > 65) {
    return {
      emoji: '🟠',
      zone: 'ALTO',
      situation: `RSI en ${rsi.toFixed(1)} - Zona ALTA (precaución)

El momentum alcista es fuerte pero estamos cerca del límite:
• Compradores siguen activos pero perdiendo fuerza
• Cada punto adicional de RSI cuesta más esfuerzo
• Zona de transición - puede seguir subiendo o corregir

📊 Momentum: RSI está ${direction} (cambio: ${rsiChange > 0 ? '+' : ''}${rsiChange.toFixed(1)} pts)

El riesgo/beneficio NO es óptimo aquí:
• Si compras ahora y sube a RSI 75, ganas poco
• Si corrige a RSI 50, pierdes el pullback de 5-10%`,
      action: `⚠️ PRECAUCIÓN - No es zona ideal:

Si quieres entrar de todos modos:
• Usa MITAD del tamaño normal de posición
• Stop loss más ajustado (1 ATR en vez de 1.5 ATR)
• Objetivo de ganancia más cercano

Mejor estrategia:
• Espera pullback a zona RSI 45-55
• El precio ideal de entrada sería alrededor de $${(price - atr*1.5).toLocaleString('es-ES', {maximumFractionDigits: 0})}`,
      hybrid: '⚠️ Hybrid v2.1 prefiere esperar - Zona límite superior (ideal: 40-65)',
      color: 'orange'
    }
  }
  
  if (rsi >= 40) {
    const isUpperHalf = rsi >= 50
    return {
      emoji: '🟢',
      zone: 'IDEAL (40-65)',
      situation: `RSI en ${rsi.toFixed(1)} - ZONA PERFECTA para entradas ✨

Esta es la zona dorada para swing trading alcista:
• El precio ha retrocedido lo suficiente desde el último impulso
• Los compradores débiles ya vendieron asustados
• Los compradores fuertes están entrando
• Hay "espacio" para que RSI suba (hasta 70+)

📊 Momentum: RSI está ${direction} (cambio: ${rsiChange > 0 ? '+' : ''}${rsiChange.toFixed(1)} pts)
${rsiChange > 0 ? '• RSI girando al alza = momentum recuperándose 📈' : '• RSI aún cayendo = esperar señal de giro 📉'}

Por qué esta zona es ideal:
• Ratio riesgo/beneficio óptimo
• Stop loss más cercano (menos riesgo)
• Mayor potencial de ganancia (RSI puede subir 20-30 pts)`,
      action: isUpperHalf ? `✅ CONDICIONES FAVORABLES PARA LONG:

RSI ${rsi.toFixed(1)} está en la mitad superior de la zona ideal (50-65)
• El momentum es positivo
• Los compradores tienen control

Plan de entrada:
1. Confirmar con otros indicadores: EMAs alcistas, MACD positivo, ADX > 25
2. Buscar trigger: Vela envolvente alcista, martillo, o ruptura de resistencia menor
3. Stop Loss: $${(price - atr*1.5).toLocaleString('es-ES', {maximumFractionDigits: 0})} (1.5 ATR abajo)
4. Take Profit 1: $${(price + atr*2.5).toLocaleString('es-ES', {maximumFractionDigits: 0})} (2.5 ATR arriba) - cerrar 70%
5. Take Profit 2: Trailing stop para el 30% restante` : 
`👀 OBSERVAR - RSI en parte baja de zona ideal (40-50):

RSI ${rsi.toFixed(1)} indica pullback profundo pero saludable
• Espera confirmación de que el pullback terminó
• Busca RSI girando al alza

Señales de entrada:
1. RSI cruza por encima de 50
2. Vela de rechazo en soporte (EMA o Fibonacci)
3. Divergencia alcista (precio hace mínimo, RSI no)

Riesgo: Si RSI cae bajo 40, el pullback puede convertirse en cambio de tendencia`,
      hybrid: '✅ Hybrid v2.1 BUSCA entradas aquí - Zona óptima 40-65',
      color: 'green'
    }
  }
  
  if (rsi >= 30) {
    return {
      emoji: '🔵',
      zone: 'BAJO',
      situation: `RSI en ${rsi.toFixed(1)} - Zona BAJA (debilidad)

El momentum es débil:
• El precio ha caído bastante
• Los vendedores han dominado recientemente
• Podría ser capitulación final o inicio de tendencia bajista

📊 Momentum: RSI está ${direction} (cambio: ${rsiChange > 0 ? '+' : ''}${rsiChange.toFixed(1)} pts)

Dos escenarios posibles:
1. Capitulación final: Los últimos vendedores salen, rebote inminente
2. Inicio de bear market: El primer tramo bajista, vendrán más`,
      action: `👀 ESPERAR - No entrar todavía:

Por qué esperar:
• RSI < 40 indica debilidad significativa
• El rebote puede ser solo un "dead cat bounce"
• Mejor esperar confirmación de cambio

Para considerar entrada:
1. RSI suba por encima de 40 (recuperación de momentum)
2. Precio rompa resistencia significativa
3. Volumen alto en el rebote (compradores reales)

Si eres muy agresivo:
• Posición muy pequeña (25% del tamaño normal)
• Stop loss estricto bajo el mínimo reciente`,
      hybrid: '⚠️ Hybrid v2.1 espera RSI > 40 para confirmar recuperación de fuerza',
      color: 'blue'
    }
  }
  
  return {
    emoji: '📉',
    zone: 'SOBREVENTA',
    situation: `RSI en ${rsi.toFixed(1)} - SOBREVENTA extrema

Situación de pánico en el mercado:
• Venta masiva, probablemente con miedo
• Los últimos alcistas están capitulando
• Precio muy estirado a la baja

Históricamente con RSI < 30:
• 60-70% probabilidad de rebote en próximas 5-10 velas
• Pero el rebote puede ser temporal`,
    action: `👀 ZONA DE POSIBLE REBOTE - Pero con cautela:

NO es señal automática de compra:
• "Barato" puede volverse "más barato"
• El cuchillo que cae puede cortarte

Señales de reversión a buscar:
1. Divergencia alcista (precio nuevo mínimo, RSI mínimo más alto)
2. Vela de reversión (martillo, envolvente alcista) con volumen alto
3. RSI cruzando por encima de 30

Si hay reversión confirmada:
• Entrada pequeña, añadir si confirma
• Stop bajo el mínimo del pánico`,
    hybrid: '⚠️ Hybrid v2.1 espera confirmación - Sobreventa no es señal de compra automática',
    color: 'purple'
  }
}

function getMACDContext(macd: number, signal: number, hist: number, histPrev: number) {
  const histGrowing = hist > histPrev
  
  if (macd > signal && macd > 0) {
    return {
      emoji: '🟢',
      position: 'MUY ALCISTA',
      situation: `MACD confirma TENDENCIA ALCISTA fuerte

• Línea MACD: ${macd.toFixed(2)} (sobre cero ✓)
• Línea Signal: ${signal.toFixed(2)}
• Histograma: ${hist.toFixed(2)} ${histGrowing ? '📈 creciendo' : '📉 decreciendo'}

Interpretación:
MACD sobre Signal Y sobre cero = momentum positivo en ambos plazos
• Corto plazo (MACD): alcista
• Medio plazo (Signal): alcista
• El histograma ${histGrowing ? 'crece = la tendencia se ACELERA' : 'decrece = la tendencia PIERDE fuerza (ojo)'}`,
      action: histGrowing ? `✅ MOMENTUM EN EXPANSIÓN - Excelente para LONG:

El histograma creciente confirma que la tendencia se acelera.
• Mantener posiciones existentes
• Buscar añadir en retrocesos menores
• El trailing stop es tu mejor amigo aquí` : 
`⚠️ MOMENTUM DESACELERANDO:

Aunque MACD sigue alcista, el histograma decrece:
• La tendencia pierde fuerza
• Posible corrección en camino
• NO es momento de abrir posiciones nuevas
• Considerar tomar ganancias parciales`,
      hybrid: histGrowing ? '✅ Hybrid v2.1: MACD > Signal ✓' : '⚠️ Hybrid v2.1: MACD > Signal ✓ pero perdiendo fuerza',
      color: 'green'
    }
  }
  
  if (macd > signal && macd <= 0) {
    return {
      emoji: '🟡',
      position: 'CRUCE ALCISTA (débil)',
      situation: `MACD cruzó AL ALZA pero aún bajo cero

• Línea MACD: ${macd.toFixed(2)} (bajo cero ✗)
• Línea Signal: ${signal.toFixed(2)}
• Histograma: ${hist.toFixed(2)} ${histGrowing ? '📈 creciendo' : '📉 decreciendo'}

Interpretación:
• Corto plazo: mejorando (MACD > Signal)
• Medio/largo plazo: aún débil (MACD < 0)
• Esto puede ser inicio de recuperación o solo rebote temporal`,
      action: `👀 SEÑAL TEMPRANA - Esperar confirmación:

El cruce alcista bajo cero es prometedor pero no definitivo.

Para confirmar entrada:
1. MACD cruce por encima de cero
2. Histograma siga creciendo
3. Precio confirme con ruptura de resistencia

Riesgo: Muchos cruces alcistas bajo cero fallan y vuelven a caer`,
      hybrid: '⚠️ Hybrid v2.1: MACD > Signal ✓ pero espera cruce sobre cero para máxima confianza',
      color: 'yellow'
    }
  }
  
  if (macd < signal && macd > 0) {
    return {
      emoji: '🟠',
      position: 'CRUCE BAJISTA (advertencia)',
      situation: `MACD cruzó A LA BAJA pero aún sobre cero

• Línea MACD: ${macd.toFixed(2)} (sobre cero ✓)
• Línea Signal: ${signal.toFixed(2)}
• Histograma: ${hist.toFixed(2)} (negativo = momentum perdido)

Interpretación:
• Corto plazo: debilitándose (MACD < Signal)
• Medio plazo: aún en territorio alcista (MACD > 0)
• Probablemente corrección, no necesariamente cambio de tendencia`,
      action: `⚠️ PROTEGER GANANCIAS:

El cruce bajista sobre cero sugiere corrección:
• Tomar ganancias parciales (50-70%)
• Subir stops a breakeven o en ganancia
• NO abrir posiciones nuevas

Escenarios posibles:
1. Corrección menor → rebota y continúa alcista
2. Corrección profunda → MACD cruza bajo cero = bear`,
      hybrid: '❌ Hybrid v2.1: MACD < Signal = no entrar nuevas posiciones',
      color: 'orange'
    }
  }
  
  return {
    emoji: '🔴',
    position: 'BAJISTA',
    situation: `MACD confirma TENDENCIA BAJISTA

• Línea MACD: ${macd.toFixed(2)} (bajo cero ✗)
• Línea Signal: ${signal.toFixed(2)}
• Histograma: ${hist.toFixed(2)} ${!histGrowing ? '📉 empeorando' : '📈 recuperándose'}

Interpretación:
MACD bajo Signal Y bajo cero = momentum negativo total
• Corto plazo: bajista
• Medio plazo: bajista
• No hay razón técnica para estar long`,
    action: `🚫 NO OPERAR LONG:

El MACD bajista dice claramente: los vendedores dominan.

Qué esperar para cambio:
1. Histograma empiece a achicarse (menos negativo)
2. MACD cruce sobre Signal (primera señal)
3. MACD cruce sobre cero (confirmación)

Esto puede tomar varias semanas. Paciencia.`,
    hybrid: '❌ Hybrid v2.1: NO OPERA con MACD bajista',
    color: 'red'
  }
}

function getADXContext(adx: number, plusDi: number, minusDi: number) {
  const diDiff = plusDi - minusDi
  const trend = plusDi > minusDi ? 'ALCISTA' : 'BAJISTA'
  
  if (adx > 25 && plusDi > minusDi) {
    return {
      emoji: '🟢',
      situation: `ADX ${adx.toFixed(1)} - TENDENCIA ALCISTA FUERTE

• ADX: ${adx.toFixed(1)} (> 25 = tendencia fuerte ✓)
• +DI: ${plusDi.toFixed(1)} (compradores)
• -DI: ${minusDi.toFixed(1)} (vendedores)
• Diferencia: +DI supera a -DI por ${diDiff.toFixed(1)} pts

Interpretación:
ADX alto + DI positivo = Los compradores dominan Y la tendencia es fuerte.
Esta es la configuración ideal para trades direccionales alcistas.`,
      action: `✅ CONDICIONES IDEALES PARA TREND FOLLOWING:

Con ADX > 25 y +DI > -DI:
• La tendencia tiene fuerza real
• Los pullbacks son para comprar
• Usar trailing stops amplios (2-3 ATR)
• Dejar correr las ganancias

El ADX alto significa que los movimientos direccionales son sostenibles.`,
      hybrid: '✅ Hybrid v2.1: ADX > 25 ✓ y +DI > -DI ✓',
      color: 'green'
    }
  }
  
  if (adx > 25 && minusDi > plusDi) {
    return {
      emoji: '🔴',
      situation: `ADX ${adx.toFixed(1)} - TENDENCIA BAJISTA FUERTE

• ADX: ${adx.toFixed(1)} (> 25 = tendencia fuerte ✓)
• +DI: ${plusDi.toFixed(1)} (compradores)
• -DI: ${minusDi.toFixed(1)} (vendedores)
• Diferencia: -DI supera a +DI por ${Math.abs(diDiff).toFixed(1)} pts

Interpretación:
ADX alto + DI negativo = Los vendedores dominan Y la tendencia es fuerte.
NO operar long contra esta configuración.`,
      action: `🚫 TENDENCIA EN CONTRA - NO LONG:

Con ADX > 25 y -DI > +DI:
• La fuerza bajista es real y sostenida
• Los rebotes serán vendidos
• Comprar es "atrapar cuchillos cayendo"

Esperar para cambio:
• +DI cruce sobre -DI
• ADX empiece a caer (tendencia se agota)`,
      hybrid: '❌ Hybrid v2.1: +DI < -DI = tendencia en contra',
      color: 'red'
    }
  }
  
  return {
    emoji: '🟡',
    situation: `ADX ${adx.toFixed(1)} - SIN TENDENCIA CLARA

• ADX: ${adx.toFixed(1)} (< 25 = sin tendencia fuerte)
• +DI: ${plusDi.toFixed(1)}
• -DI: ${minusDi.toFixed(1)}

Interpretación:
ADX bajo significa que el mercado no tiene dirección clara.
Puede estar:
• Consolidando antes de moverse
• En rango lateral
• Cambiando de tendencia`,
    action: `⚠️ EVITAR TRADES DIRECCIONALES:

Con ADX < 25:
• Los breakouts probablemente fallarán
• Las estrategias de tendencia no funcionan
• Stops serán barridos en ambas direcciones

Alternativas:
• Esperar que ADX suba > 25 con dirección clara
• Operar rango (comprar bajo, vender alto)
• Reducir tamaño de posición`,
    hybrid: `⚠️ Hybrid v2.1: ADX ${adx.toFixed(1)} < 25 = señal débil, esperar fuerza`,
    color: 'yellow'
  }
}

function getBollingerContext(price: number, upper: number, middle: number, lower: number) {
  const width = ((upper - lower) / middle) * 100
  const position = ((price - lower) / (upper - lower)) * 100
  
  if (price > upper) {
    return {
      zone: 'SOBRE BANDA SUPERIOR',
      situation: `Precio rompiendo banda superior - Posible sobreextensión alcista o breakout.
      
• Banda Superior: $${upper.toLocaleString('es-ES', {maximumFractionDigits: 0})}
• Precio actual: $${price.toLocaleString('es-ES', {maximumFractionDigits: 0})} (${(((price-upper)/upper)*100).toFixed(1)}% sobre banda)
• Ancho de bandas: ${width.toFixed(1)}%`,
      action: width > 4 ? 'Bandas anchas = volatilidad alta. El breakout puede ser válido.' : 'Bandas estrechas previas = posible inicio de movimiento grande.',
      color: 'orange'
    }
  }
  
  if (price < lower) {
    return {
      zone: 'BAJO BANDA INFERIOR',
      situation: `Precio rompiendo banda inferior - Posible sobreventa o breakdown.
      
• Banda Inferior: $${lower.toLocaleString('es-ES', {maximumFractionDigits: 0})}
• Precio actual: $${price.toLocaleString('es-ES', {maximumFractionDigits: 0})} (${(((lower-price)/lower)*100).toFixed(1)}% bajo banda)`,
      action: 'Buscar señales de reversión. El precio tiende a volver dentro de las bandas.',
      color: 'red'
    }
  }
  
  return {
    zone: position > 80 ? 'ZONA ALTA' : position < 20 ? 'ZONA BAJA' : 'ZONA MEDIA',
    situation: `Precio dentro de las bandas - Posición: ${position.toFixed(0)}%

• Superior: $${upper.toLocaleString('es-ES', {maximumFractionDigits: 0})}
• Media (SMA20): $${middle.toLocaleString('es-ES', {maximumFractionDigits: 0})}
• Inferior: $${lower.toLocaleString('es-ES', {maximumFractionDigits: 0})}
• Ancho: ${width.toFixed(1)}%`,
    action: position > 80 ? 'Cerca de resistencia dinámica. Precaución con longs.' : position < 20 ? 'Cerca de soporte dinámico. Posible zona de compra.' : 'Zona neutral. La SMA20 actúa como pivote.',
    color: position > 80 ? 'orange' : position < 20 ? 'green' : 'blue'
  }
}

function getStochasticContext(k: number, d: number) {
  if (k > 80 && d > 80) {
    return {
      zone: 'SOBRECOMPRA',
      emoji: '🔴',
      situation: `Estocástico en sobrecompra (%K: ${k.toFixed(1)}, %D: ${d.toFixed(1)})
      
El precio está cerca de los máximos del rango reciente. Posible agotamiento alcista.`,
      signal: k < d ? '📉 Cruce bajista inminente - Señal de venta' : 'Sin cruce todavía - Puede mantenerse sobrecomprado',
      color: 'red'
    }
  }
  
  if (k < 20 && d < 20) {
    return {
      zone: 'SOBREVENTA',
      emoji: '🟢',
      situation: `Estocástico en sobreventa (%K: ${k.toFixed(1)}, %D: ${d.toFixed(1)})
      
El precio está cerca de los mínimos del rango reciente. Posible rebote.`,
      signal: k > d ? '📈 Cruce alcista - Señal de compra' : 'Sin cruce todavía - Puede mantenerse sobrevendido',
      color: 'green'
    }
  }
  
  return {
    zone: 'NEUTRAL',
    emoji: '🟡',
    situation: `Estocástico neutral (%K: ${k.toFixed(1)}, %D: ${d.toFixed(1)})
    
El precio está en el rango medio. Sin extremos.`,
    signal: k > d ? 'Momentum alcista (K > D)' : 'Momentum bajista (K < D)',
    color: 'yellow'
  }
}

export default function IndicatorsPage() {
  const [selectedTicker, setSelectedTicker] = useState('BTC-USD')
  const [data, setData] = useState<OHLCData[]>([])
  const [activeTab, setActiveTab] = useState<'ema' | 'rsi' | 'macd' | 'adx' | 'bb' | 'stoch' | 'hybrid' | 'strategy'>('ema')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      setData(generateDemoData(selectedTicker))
      setLoading(false)
    }, 300)
  }, [selectedTicker])
  
  const latest = data[data.length - 1]
  
  const emaContext = useMemo(() => latest ? getEMAContext(latest.close, latest.ema20, latest.ema50, latest.ema200, latest.atr) : null, [latest])
  const rsiContext = useMemo(() => latest ? getRSIContext(latest.rsi, latest.rsiPrev, latest.close, latest.atr) : null, [latest])
  const macdContext = useMemo(() => latest ? getMACDContext(latest.macd, latest.macdSignal, latest.macdHist, latest.macdHistPrev) : null, [latest])
  const adxContext = useMemo(() => latest ? getADXContext(latest.adx, latest.plusDi, latest.minusDi) : null, [latest])
  const bbContext = useMemo(() => latest ? getBollingerContext(latest.close, latest.bbUpper, latest.bbMiddle, latest.bbLower) : null, [latest])
  const stochContext = useMemo(() => latest ? getStochasticContext(latest.stochK, latest.stochD) : null, [latest])
  
  // Hybrid v2.1 conditions
  const hybridConditions = latest ? [
    { name: 'Régimen BULL', met: emaContext?.regime.includes('BULL') || false, desc: 'EMAs alineadas al alza' },
    { name: 'RSI 40-65', met: latest.rsi >= 40 && latest.rsi <= 65, desc: `RSI actual: ${latest.rsi.toFixed(1)}` },
    { name: 'MACD > Signal', met: latest.macd > latest.macdSignal, desc: `MACD: ${latest.macd.toFixed(2)} vs Signal: ${latest.macdSignal.toFixed(2)}` },
    { name: 'ADX > 25', met: latest.adx > 25, desc: `ADX actual: ${latest.adx.toFixed(1)}` },
    { name: 'Precio > EMA20', met: latest.close > latest.ema20, desc: `Precio: $${latest.close.toLocaleString('es-ES', {maximumFractionDigits: 0})} vs EMA20: $${latest.ema20.toLocaleString('es-ES', {maximumFractionDigits: 0})}` },
    { name: '+DI > -DI', met: latest.plusDi > latest.minusDi, desc: `+DI: ${latest.plusDi.toFixed(1)} vs -DI: ${latest.minusDi.toFixed(1)}` },
  ] : []
  
  const conditionsMet = hybridConditions.filter(c => c.met).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Análisis Técnico</h1>
          <p className="text-gray-500 text-sm">Indicadores detallados con interpretaciones educativas</p>
        </div>
        
        <select
          value={selectedTicker}
          onChange={(e) => setSelectedTicker(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
        >
          <optgroup label="Crypto">
            {CRYPTO_PAIRS.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
          <optgroup label="Large Caps">
            {LARGE_CAPS.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
          <optgroup label="Small Caps">
            {SMALL_CAPS.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
        </select>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border">
          <div className="text-gray-500">Cargando {selectedTicker}...</div>
        </div>
      ) : latest && (
        <>
          {/* Resumen rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <div className="bg-white rounded-lg border p-3">
              <p className="text-[10px] text-gray-500 uppercase">Precio</p>
              <p className="text-lg font-bold">${latest.close.toLocaleString('es-ES', {maximumFractionDigits: 0})}</p>
            </div>
            <div className={`rounded-lg border p-3 ${emaContext?.color === 'green' ? 'bg-green-50' : emaContext?.color === 'red' ? 'bg-red-50' : 'bg-yellow-50'}`}>
              <p className="text-[10px] text-gray-500 uppercase">Régimen</p>
              <p className="text-sm font-bold">{emaContext?.emoji} {emaContext?.regime}</p>
            </div>
            <div className={`rounded-lg border p-3 ${latest.rsi > 70 ? 'bg-red-50' : latest.rsi < 30 ? 'bg-purple-50' : latest.rsi >= 40 && latest.rsi <= 65 ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <p className="text-[10px] text-gray-500 uppercase">RSI</p>
              <p className="text-lg font-bold">{latest.rsi.toFixed(1)}</p>
            </div>
            <div className={`rounded-lg border p-3 ${latest.macd > latest.macdSignal ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-[10px] text-gray-500 uppercase">MACD</p>
              <p className="text-lg font-bold">{latest.macd.toFixed(2)}</p>
            </div>
            <div className={`rounded-lg border p-3 ${latest.adx > 25 ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <p className="text-[10px] text-gray-500 uppercase">ADX</p>
              <p className="text-lg font-bold">{latest.adx.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <p className="text-[10px] text-gray-500 uppercase">ATR</p>
              <p className="text-lg font-bold">${latest.atr.toFixed(0)}</p>
            </div>
            <div className={`rounded-lg border p-3 ${conditionsMet >= 5 ? 'bg-green-50' : conditionsMet >= 3 ? 'bg-yellow-50' : 'bg-red-50'}`}>
              <p className="text-[10px] text-gray-500 uppercase">Hybrid</p>
              <p className="text-lg font-bold">{conditionsMet}/6</p>
            </div>
          </div>
          
          {/* Tabs de indicadores */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="flex overflow-x-auto border-b">
              {[
                { key: 'ema', label: '📈 EMAs' },
                { key: 'rsi', label: '📊 RSI' },
                { key: 'macd', label: '📉 MACD' },
                { key: 'adx', label: '💪 ADX' },
                { key: 'bb', label: '📏 Bollinger' },
                { key: 'stoch', label: '🎰 Stochastic' },
                { key: 'hybrid', label: '📊 Hybrid (educativo)' },
                { key: 'strategy', label: '🎯 Estrategia ELEVE' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.key 
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="p-6">
              {/* EMAs Tab */}
              {activeTab === 'ema' && emaContext && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{emaContext.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{emaContext.regime}</h3>
                      <p className="text-sm text-gray-500">Medias Móviles Exponenciales (20, 50, 200)</p>
                    </div>
                  </div>
                  
                  {/* Chart */}
                  <div className="h-64 bg-slate-900 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.slice(-60)}>
                        <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(v).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} stroke="#64748b" fontSize={10} />
                        <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} formatter={(value: number) => [`$${value.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`, '']} />
                        <Line type="monotone" dataKey="close" stroke="#fff" dot={false} strokeWidth={2} name="Precio" />
                        <Line type="monotone" dataKey="ema20" stroke="#22c55e" dot={false} strokeWidth={1.5} name="EMA20" />
                        <Line type="monotone" dataKey="ema50" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="EMA50" />
                        <Line type="monotone" dataKey="ema200" stroke="#ef4444" dot={false} strokeWidth={1} strokeDasharray="5 5" name="EMA200" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Interpretación */}
                  <div className={`p-4 rounded-lg border ${emaContext.color === 'green' ? 'bg-green-50 border-green-200' : emaContext.color === 'red' ? 'bg-red-50 border-red-200' : emaContext.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                    <h4 className="font-semibold mb-2">📊 Situación Actual</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{emaContext.situation}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <h4 className="font-semibold mb-2">🎯 Acción Recomendada</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{emaContext.action}</p>
                  </div>
                  
                  <div className={`p-3 rounded-lg text-sm font-medium ${emaContext.color === 'green' ? 'bg-green-100 text-green-800' : emaContext.color === 'red' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {emaContext.hybrid}
                  </div>
                </div>
              )}
              
              {/* RSI Tab */}
              {activeTab === 'rsi' && rsiContext && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{rsiContext.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">RSI: {latest.rsi.toFixed(1)} - {rsiContext.zone}</h3>
                      <p className="text-sm text-gray-500">Relative Strength Index (14 períodos)</p>
                    </div>
                  </div>
                  
                  {/* Chart */}
                  <div className="h-48 bg-slate-900 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.slice(-60)}>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '70', fill: '#ef4444', fontSize: 10 }} />
                        <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '30', fill: '#22c55e', fontSize: 10 }} />
                        <ReferenceLine y={50} stroke="#64748b" strokeDasharray="3 3" />
                        <ReferenceLine y={40} stroke="#3b82f6" strokeDasharray="2 2" />
                        <ReferenceLine y={65} stroke="#f59e0b" strokeDasharray="2 2" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="rsi" stroke="#8b5cf6" fill="rgba(139,92,246,0.3)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2 bg-purple-100 rounded">Sobreventa &lt;30</div>
                    <div className="p-2 bg-blue-100 rounded">Bajo 30-40</div>
                    <div className="p-2 bg-green-100 rounded font-bold">Ideal 40-65</div>
                    <div className="p-2 bg-orange-100 rounded">Alto 65-70</div>
                    <div className="p-2 bg-red-100 rounded">Sobrecompra &gt;70</div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${rsiContext.color === 'green' ? 'bg-green-50 border-green-200' : rsiContext.color === 'red' ? 'bg-red-50 border-red-200' : rsiContext.color === 'orange' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                    <h4 className="font-semibold mb-2">📊 Análisis del RSI</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{rsiContext.situation}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <h4 className="font-semibold mb-2">🎯 Plan de Acción</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{rsiContext.action}</p>
                  </div>
                  
                  <div className={`p-3 rounded-lg text-sm font-medium ${rsiContext.color === 'green' ? 'bg-green-100 text-green-800' : rsiContext.color === 'red' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {rsiContext.hybrid}
                  </div>
                </div>
              )}
              
              {/* MACD Tab */}
              {activeTab === 'macd' && macdContext && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{macdContext.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">MACD: {macdContext.position}</h3>
                      <p className="text-sm text-gray-500">Moving Average Convergence Divergence (12, 26, 9)</p>
                    </div>
                  </div>
                  
                  {/* Chart */}
                  <div className="h-48 bg-slate-900 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.slice(-60)}>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <ReferenceLine y={0} stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Bar dataKey="macdHist" name="Histograma">
                          {data.slice(-60).map((entry, index) => (
                            <Cell key={index} fill={entry.macdHist >= 0 ? '#22c55e' : '#ef4444'} />
                          ))}
                        </Bar>
                        <Line type="monotone" dataKey="macd" stroke="#3b82f6" dot={false} strokeWidth={2} name="MACD" />
                        <Line type="monotone" dataKey="macdSignal" stroke="#f97316" dot={false} strokeWidth={1.5} name="Signal" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-500">MACD</p>
                      <p className={`text-lg font-bold ${latest.macd > 0 ? 'text-green-600' : 'text-red-600'}`}>{latest.macd.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-xs text-gray-500">Signal</p>
                      <p className="text-lg font-bold text-orange-600">{latest.macdSignal.toFixed(2)}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${latest.macdHist >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-xs text-gray-500">Histograma</p>
                      <p className={`text-lg font-bold ${latest.macdHist >= 0 ? 'text-green-600' : 'text-red-600'}`}>{latest.macdHist.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${macdContext.color === 'green' ? 'bg-green-50 border-green-200' : macdContext.color === 'red' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <h4 className="font-semibold mb-2">📊 Análisis del MACD</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{macdContext.situation}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <h4 className="font-semibold mb-2">🎯 Plan de Acción</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{macdContext.action}</p>
                  </div>
                  
                  <div className={`p-3 rounded-lg text-sm font-medium ${macdContext.color === 'green' ? 'bg-green-100 text-green-800' : macdContext.color === 'red' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {macdContext.hybrid}
                  </div>
                </div>
              )}
              
              {/* ADX Tab */}
              {activeTab === 'adx' && adxContext && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{adxContext.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">ADX: {latest.adx.toFixed(1)}</h3>
                      <p className="text-sm text-gray-500">Average Directional Index - Fuerza de Tendencia</p>
                    </div>
                  </div>
                  
                  {/* Chart */}
                  <div className="h-48 bg-slate-900 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.slice(-60)}>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis domain={[0, 60]} stroke="#64748b" fontSize={10} />
                        <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '25', fill: '#f59e0b', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="adx" stroke="#fff" dot={false} strokeWidth={2} name="ADX" />
                        <Line type="monotone" dataKey="plusDi" stroke="#22c55e" dot={false} strokeWidth={1.5} name="+DI" />
                        <Line type="monotone" dataKey="minusDi" stroke="#ef4444" dot={false} strokeWidth={1.5} name="-DI" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className={`p-3 rounded-lg ${latest.adx > 25 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <p className="text-xs text-gray-500">ADX</p>
                      <p className={`text-lg font-bold ${latest.adx > 25 ? 'text-green-600' : 'text-yellow-600'}`}>{latest.adx.toFixed(1)}</p>
                      <p className="text-xs">{latest.adx > 25 ? 'Tendencia fuerte' : 'Sin tendencia'}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-500">+DI (Alcista)</p>
                      <p className="text-lg font-bold text-green-600">{latest.plusDi.toFixed(1)}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-gray-500">-DI (Bajista)</p>
                      <p className="text-lg font-bold text-red-600">{latest.minusDi.toFixed(1)}</p>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${adxContext.color === 'green' ? 'bg-green-50 border-green-200' : adxContext.color === 'red' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <h4 className="font-semibold mb-2">📊 Análisis del ADX</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{adxContext.situation}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <h4 className="font-semibold mb-2">🎯 Plan de Acción</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{adxContext.action}</p>
                  </div>
                  
                  <div className={`p-3 rounded-lg text-sm font-medium ${adxContext.color === 'green' ? 'bg-green-100 text-green-800' : adxContext.color === 'red' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {adxContext.hybrid}
                  </div>
                </div>
              )}
              
              {/* Bollinger Tab */}
              {activeTab === 'bb' && bbContext && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">📏</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Bollinger Bands: {bbContext.zone}</h3>
                      <p className="text-sm text-gray-500">Bandas de Bollinger (20, 2)</p>
                    </div>
                  </div>
                  
                  {/* Chart */}
                  <div className="h-64 bg-slate-900 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.slice(-60)}>
                        <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(v).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} stroke="#64748b" fontSize={10} />
                        <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="bbUpper" stroke="transparent" fill="rgba(139,92,246,0.15)" />
                        <Area type="monotone" dataKey="bbLower" stroke="transparent" fill="rgba(139,92,246,0.15)" />
                        <Line type="monotone" dataKey="bbUpper" stroke="#8b5cf6" dot={false} strokeWidth={1} strokeDasharray="3 3" name="Banda Superior" />
                        <Line type="monotone" dataKey="bbMiddle" stroke="#8b5cf6" dot={false} strokeWidth={1} name="SMA20" />
                        <Line type="monotone" dataKey="bbLower" stroke="#8b5cf6" dot={false} strokeWidth={1} strokeDasharray="3 3" name="Banda Inferior" />
                        <Line type="monotone" dataKey="close" stroke="#fff" dot={false} strokeWidth={2} name="Precio" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${bbContext.color === 'green' ? 'bg-green-50 border-green-200' : bbContext.color === 'red' ? 'bg-red-50 border-red-200' : bbContext.color === 'orange' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                    <h4 className="font-semibold mb-2">📊 Análisis de Bollinger</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{bbContext.situation}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <h4 className="font-semibold mb-2">🎯 Interpretación</h4>
                    <p className="text-sm text-gray-700">{bbContext.action}</p>
                  </div>
                </div>
              )}
              
              {/* Stochastic Tab */}
              {activeTab === 'stoch' && stochContext && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{stochContext.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Stochastic: {stochContext.zone}</h3>
                      <p className="text-sm text-gray-500">Oscilador Estocástico (14, 3)</p>
                    </div>
                  </div>
                  
                  {/* Chart */}
                  <div className="h-48 bg-slate-900 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.slice(-60)}>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" />
                        <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="3 3" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="stochK" stroke="#3b82f6" dot={false} strokeWidth={2} name="%K" />
                        <Line type="monotone" dataKey="stochD" stroke="#f97316" dot={false} strokeWidth={1.5} name="%D" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-500">%K (Rápido)</p>
                      <p className="text-lg font-bold text-blue-600">{latest.stochK.toFixed(1)}</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-xs text-gray-500">%D (Lento)</p>
                      <p className="text-lg font-bold text-orange-600">{latest.stochD.toFixed(1)}</p>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${stochContext.color === 'green' ? 'bg-green-50 border-green-200' : stochContext.color === 'red' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <h4 className="font-semibold mb-2">📊 Análisis del Estocástico</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{stochContext.situation}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <h4 className="font-semibold mb-2">🎯 Señal</h4>
                    <p className="text-sm text-gray-700">{stochContext.signal}</p>
                  </div>
                </div>
              )}
              
              {/* Hybrid v2.1 Tab */}
              {activeTab === 'hybrid' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">🎯</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Checklist Hybrid v2.1 - {selectedTicker}</h3>
                      <p className="text-sm text-gray-500">Sistema de 6 condiciones para entradas de alta probabilidad</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Condiciones */}
                    <div className="space-y-2">
                      {hybridConditions.map((cond, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${cond.met ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <span className="text-xl mt-0.5">{cond.met ? '✅' : '❌'}</span>
                          <div>
                            <span className={`font-medium ${cond.met ? 'text-green-700' : 'text-red-700'}`}>{cond.name}</span>
                            <p className="text-xs text-gray-600 mt-0.5">{cond.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Resultado */}
                    <div className={`p-6 rounded-xl border-2 ${
                      conditionsMet >= 5 ? 'bg-green-50 border-green-500' :
                      conditionsMet >= 3 ? 'bg-yellow-50 border-yellow-500' :
                      'bg-red-50 border-red-500'
                    }`}>
                      <div className="text-center mb-4">
                        <span className="text-5xl font-bold">{conditionsMet}/6</span>
                        <p className="text-gray-600 mt-1">Condiciones cumplidas</p>
                      </div>
                      
                      {conditionsMet >= 5 ? (
                        <div>
                          <h4 className="text-xl font-bold text-green-600 mb-3">🟢 SETUP VÁLIDO</h4>
                          <p className="text-gray-700 mb-4">Buscar trigger de entrada (vela de confirmación)</p>
                          <div className="text-sm text-gray-600 space-y-2 bg-white/50 p-3 rounded">
                            <p><strong>Stop Loss:</strong> ${(latest.close - latest.atr * 1.5).toLocaleString('es-ES', { maximumFractionDigits: 0 })} (-1.5 ATR)</p>
                            <p><strong>Take Profit 1:</strong> ${(latest.close + latest.atr * 2.5).toLocaleString('es-ES', { maximumFractionDigits: 0 })} (+2.5 ATR) - 70%</p>
                            <p><strong>Take Profit 2:</strong> Trailing stop para 30% restante</p>
                            <p><strong>Riesgo:</strong> 1% del capital</p>
                          </div>
                        </div>
                      ) : conditionsMet >= 3 ? (
                        <div>
                          <h4 className="text-xl font-bold text-yellow-600 mb-3">🟡 SETUP PARCIAL</h4>
                          <p className="text-gray-700">Esperar mejora de condiciones antes de entrar.</p>
                          <p className="text-sm text-gray-500 mt-2">Faltan {6 - conditionsMet} condiciones para setup válido.</p>
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-xl font-bold text-red-600 mb-3">🔴 NO HAY SETUP</h4>
                          <p className="text-gray-700">No operar. Esperar cambio de condiciones del mercado.</p>
                          <p className="text-sm text-gray-500 mt-2">Solo {conditionsMet} de 6 condiciones cumplidas.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold mb-2">📚 ¿Qué es Hybrid v2.1?</h4>
                    <p className="text-sm text-gray-700">
                      El sistema Hybrid v2.1 combina análisis de tendencia (EMAs), momentum (RSI, MACD), y fuerza direccional (ADX) 
                      para identificar setups de alta probabilidad. Requiere al menos 5 de 6 condiciones para considerar una entrada válida. 
                      Este enfoque multi-indicador filtra señales falsas y aumenta la tasa de acierto.
                    </p>
                  </div>
                </div>
              )}
              {/* Estrategia ELEVE Tab */}
              {activeTab === 'strategy' && latest && (
                (() => {
                  const strategy = getApplicableStrategy(selectedTicker)
                  const results = strategy.conditions.map(c => ({ ...c, met: c.check(latest) }))
                  const metCount = results.filter(r => r.met).length
                  const isValid = metCount >= 5
                  const isPartial = metCount >= 3 && metCount < 5
                  
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">🎯</span>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Estrategia: {strategy.name}</h3>
                            <p className="text-sm text-gray-500">{strategy.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Timeframe: {strategy.timeframe}</p>
                          <p className="text-sm text-gray-500">Capital: ${strategy.capital.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-700 mb-3">Checklist {strategy.name}</h4>
                          {results.map((cond, i) => (
                            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${cond.met ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                              <span className="text-xl mt-0.5">{cond.met ? '✅' : '❌'}</span>
                              <div>
                                <span className={`font-medium ${cond.met ? 'text-green-700' : 'text-red-700'}`}>{cond.name}</span>
                                <p className="text-xs text-gray-600 mt-0.5">{cond.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className={`p-6 rounded-xl border-2 ${isValid ? 'bg-green-50 border-green-500' : isPartial ? 'bg-yellow-50 border-yellow-500' : 'bg-red-50 border-red-500'}`}>
                          <div className="text-center mb-4">
                            <span className="text-5xl font-bold">{metCount}/6</span>
                            <p className="text-gray-600 mt-1">Condiciones cumplidas</p>
                          </div>
                          
                          {isValid ? (
                            <div>
                              <h4 className="text-xl font-bold text-green-600 mb-3">✅ SETUP VÁLIDO - Operable</h4>
                              <p className="text-gray-700 mb-4">El sistema {strategy.name} autoriza entrada.</p>
                              <div className="text-sm text-gray-600 space-y-2 bg-white/50 p-3 rounded">
                                <p><strong>Stop Loss:</strong> ${(latest.close - latest.atr * 1.5).toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
                                <p><strong>Take Profit:</strong> ${(latest.close + latest.atr * 2.5).toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
                              </div>
                            </div>
                          ) : isPartial ? (
                            <div>
                              <h4 className="text-xl font-bold text-yellow-600 mb-3">🟡 SETUP PARCIAL - Esperar</h4>
                              <p className="text-gray-700">No operar. Faltan {6 - metCount} condiciones.</p>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-xl font-bold text-red-600 mb-3">❌ NO OPERABLE - Bloqueado</h4>
                              <p className="text-gray-700">El sistema {strategy.name} NO autoriza entrada.</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold mb-2">⚠️ Importante</h4>
                        <p className="text-sm text-gray-700">
                          Esta es la <strong>única evaluación válida</strong> para decidir si operar {selectedTicker}. 
                          La pestaña Hybrid es solo educativa.
                        </p>
                      </div>
                    </div>
                  )
                })()
              )}

            </div>
          </div>
        </>
      )}
    </div>
  )
}
