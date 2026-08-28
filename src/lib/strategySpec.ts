import type { StrategyConfig } from '@/types'

/**
 * Ficha técnica generada A PARTIR DE LA CONFIG REAL.
 *
 * Las descripciones escritas a mano se desincronizaban del código en cuanto se
 * tocaba un umbral: la ficha llegó a prometer SL 1.8x ATR mientras el worker
 * operaba a 2.0x, y filtros de ADX que llevaban meses desactivados. Todo lo que
 * lleve un número sale de aquí, de los mismos valores de Redis que lee el
 * worker, para que no pueda mentir.
 */

const pct = (v: number, dec = 2) =>
  `${(v * 100).toFixed(dec).replace('.', ',').replace(/,0+$/, '')}%`

const num = (v: number) => String(v).replace('.', ',')

/**
 * Cómo se describe el stop de una estrategia. Único sitio donde se decide, para
 * que la ficha, la página de estrategia y /config no puedan contradecirse: el
 * 1% Spot tiene stops en porcentaje fijo y se estaba pintando como "0,5× ATR".
 */
export function describeStop(s: StrategyConfig): string {
  const st = s.stops
  if (st?.slPercent) return `−${pct(st.slPercent)}${st.tpPercent ? ` · TP +${pct(st.tpPercent)}` : ''}`
  if (st?.slAtrMult) return `${num(st.slAtrMult)}× ATR(${(st.atrTimeframe ?? '1h').toUpperCase()})`
  return 'sin definir'
}

/** Salida de la estrategia: R:R solo tiene sentido si existe un TP. */
export function describeExit(s: StrategyConfig): string {
  const st = s.stops
  if (st?.tpPercent && st?.slPercent) return `R:R ${num(Number((st.tpPercent / st.slPercent).toFixed(2)))}:1`
  if (st?.tpAtrMult && st?.slAtrMult) return `R:R ${num(Number((st.tpAtrMult / st.slAtrMult).toFixed(2)))}:1`
  return st?.trailing ?? 'Trailing (n−1)R desde +2R'
}

export function buildStrategySpec(s: StrategyConfig): string[] {
  const spec: string[] = []
  const f = s.entryFilters
  const stops = s.stops

  if (f?.donchianPeriod) {
    // Estrategia de ruptura: su disparador no son RSI/ADX sino el canal y el volumen
    spec.push(`ruptura del máximo de ${f.donchianPeriod}d`)
    spec.push(f.volumeMult ? `volumen ≥ ${num(f.volumeMult)}× media 20` : 'sin filtro de volumen')
  } else if (f) {
    spec.push(f.rsiMin != null && f.rsiMax != null ? `RSI ${f.rsiMin}-${f.rsiMax}` : 'RSI sin filtro')
    spec.push(f.adxMin ? `ADX ≥ ${f.adxMin}` : 'sin filtro ADX')
    spec.push(
      f.pullbackAtr
        ? `pullback ≤ ${num(f.pullbackAtr)}× ATR a EMA${f.emaFast ?? 20}`
        : 'sin filtro de pullback'
    )
  }

  if (stops?.slPercent) {
    // Estrategias con TP/SL fijos en porcentaje (no en ATR)
    spec.push(`SL −${pct(stops.slPercent)}`)
    if (stops.tpPercent) spec.push(`TP +${pct(stops.tpPercent)}`)
  } else if (stops?.slAtrMult) {
    const tf = (stops.atrTimeframe ?? '1h').toUpperCase()
    spec.push(`SL ${num(stops.slAtrMult)}× ATR(${tf})`)
    if (stops.tpAtrMult && s.horizon === 'INTRADAY') spec.push(`TP ${num(stops.tpAtrMult)}× ATR`)
  }

  if (s.horizon !== 'INTRADAY') {
    spec.push(stops?.trailing ? `sin TP · ${stops.trailing}` : 'sin TP · trailing (n−1)R desde +2R')
  }

  const c = s.costs
  if (c && (c.commissionPct || c.slippagePct)) {
    const partes: string[] = []
    if (c.commissionPct) partes.push(`comisión ${pct(c.commissionPct)}`)
    if (c.slippagePct) partes.push(`slippage ${pct(c.slippagePct)}`)
    spec.push(`${partes.join(' + ')} por lado`)
  } else {
    spec.push('sin costes modelados')
  }

  if (s.capital != null && s.riskPerTrade != null) {
    spec.push(`${s.capital.toLocaleString('es-ES')} $ · riesgo ${pct(s.riskPerTrade)}/trade`)
  }
  if (s.maxPositions != null) spec.push(`máx. ${s.maxPositions} posiciones`)

  return spec
}

/** Misma ficha en una línea, para tarjetas y cabeceras. */
export function buildStrategySpecLine(s: StrategyConfig): string {
  return buildStrategySpec(s).join(' · ')
}

// ---------------------------------------------------------------- estado del worker

/**
 * Cómo se lee el estado que publica un worker (v5.1 · P0-7).
 *
 * "Pausado" y "fuera de horario" no son lo mismo y la ficha del 1% Spot los
 * pintaba igual: cualquier estado que no fuera running ni weekend salía como
 * "⏸️ Pausado". Un worker sano y dormido a las tres de la mañana se leía como
 * una estrategia que alguien había desactivado.
 */
export function describeWorkerStatus(status?: string): { texto: string; tono: string } {
  switch (status) {
    case 'running':
      return { texto: '✅ Activo', tono: 'verde' }
    case 'outside_hours':
      return { texto: '🌙 Fuera de horario', tono: 'gris' }
    case 'weekend':
      return { texto: '🌴 Fin de semana', tono: 'gris' }
    case 'paused':
      return { texto: '⏸️ Pausado', tono: 'ambar' }
    default:
      return { texto: status ? `⚠️ ${status}` : '⚠️ Sin estado', tono: 'ambar' }
  }
}

interface ConfigIntraday {
  minAdx?: number
  btcMinAdx?: number
  rsiMin?: number
  rsiMax?: number
  minMarketCap?: number
  minVolume24h?: number
  minVolMcRatio?: number
  tpPercent?: number
  slPercent?: number
  bePercent?: number
  maxDailyLoss?: number
  maxDailyProfit?: number
  spreadPct?: number
  commissionPct?: number
  slippagePct?: number
}

const porcentaje = (v?: number, decimales = 1) =>
  v == null ? '?' : `${(v * 100).toFixed(decimales).replace('.', ',')}%`

const millones = (v?: number) => (v == null ? '?' : `$${Math.round(v / 1_000_000)}M`)

/**
 * Descripción del 1% Spot generada desde la configuración que el worker LEE.
 *
 * Estaba escrita a mano en la página y ya había divergido: anunciaba "ADX > 20"
 * cuando el worker filtra con 18. Un texto que describe la estrategia y no sale
 * de ella acaba describiendo otra, y no hay forma de notarlo mirando la pantalla.
 */
export function describeOnePercent(c: ConfigIntraday): string {
  if (!c) return 'Configuración no disponible.'
  const costeIdaVuelta =
    ((c.commissionPct || 0) + (c.spreadPct || 0) / 2 + (c.slippagePct || 0)) * 2
  return [
    'Estrategia intraday de momentum en spot: busca subidas rápidas de en torno al 1% en altcoins con tendencia limpia.',
    `Filtros de liquidez: capitalización > ${millones(c.minMarketCap)}, volumen 24h > ${millones(c.minVolume24h)}, ratio volumen/capitalización > ${c.minVolMcRatio ?? '?'}.`,
    `Filtros de entrada: ADX ≥ ${c.minAdx ?? '?'}, RSI entre ${c.rsiMin ?? '?'} y ${c.rsiMax ?? '?'}, con BTC en tendencia (ADX ≥ ${c.btcMinAdx ?? '?'}).`,
    `Salida: TP +${porcentaje(c.tpPercent)} y SL −${porcentaje(c.slPercent)}, con breakeven al +${porcentaje(c.bePercent)}.`,
    `Límites diarios: parar en −${porcentaje(c.maxDailyLoss)} o en +${porcentaje(c.maxDailyProfit)}.`,
    `Coste modelado de ida y vuelta: ${porcentaje(costeIdaVuelta, 2)} — sobre un objetivo del ${porcentaje(c.tpPercent)}, se lleva ${
      c.tpPercent ? Math.round((costeIdaVuelta / c.tpPercent) * 100) : '?'
    }% de la ventaja bruta.`,
  ].join(' ')
}
