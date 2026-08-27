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

export function buildStrategySpec(s: StrategyConfig): string[] {
  const spec: string[] = []
  const f = s.entryFilters
  const stops = s.stops

  if (f) {
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
