/**
 * Vigía de backtest ELEVE — SOLO LECTURA (un GET a /api/backtest, nada más).
 *
 * Evalúa cada backtest publicado por el worker contra los criterios de
 * aceptación fijados ANTES de mirar los resultados (v5.2). Una estrategia
 * solo "funciona" cuando pasa TODOS:
 *
 *   1. Muestra: >= 30 trades.
 *   2. Robustez: profit factor > 1.5 CON EL MEJOR TRADE EXCLUIDO
 *      (un PF que depende de un solo trade no es un sistema, es una anécdota).
 *   3. Recencia: PnL positivo en la mitad más reciente de los trades
 *      (que no viva solo del rally del principio del periodo).
 *   4. Vigencia: el backtest corresponde a la spec activa ahora mismo
 *      (un backtest de una spec que ya no corre no valida nada).
 *
 * Uso:  DASH_URL=https://... node scripts/vigia-backtest.js
 * Salida: tabla por estrategia + veredicto. Exit 0 siempre (es informativo);
 * imprime la línea "PASA:" por cada estrategia aprobada, para que quien lo
 * ejecute (humano o Routine) sepa si hay algo que celebrar.
 */

const DASH_URL = process.env.DASH_URL || 'https://elevev2-production.up.railway.app'

const MIN_TRADES = 30
const MIN_PF_SIN_MEJOR = 1.5

const num = v => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0)

function profitFactor(trades) {
  const ganado = trades.filter(t => num(t.pnl) > 0).reduce((s, t) => s + num(t.pnl), 0)
  const perdido = Math.abs(trades.filter(t => num(t.pnl) < 0).reduce((s, t) => s + num(t.pnl), 0))
  return perdido > 0 ? ganado / perdido : ganado > 0 ? Infinity : null
}

function evaluar(bt, specsActivas) {
  const trades = Array.isArray(bt.trades) ? bt.trades : []
  const motivos = []

  // 1. Muestra
  if (trades.length < MIN_TRADES) motivos.push(`muestra insuficiente (${trades.length} < ${MIN_TRADES})`)

  // 2. PF sin el mejor trade
  let pfSinMejor = null
  if (trades.length > 1) {
    const mejor = trades.reduce((a, b) => (num(b.pnl) > num(a.pnl) ? b : a))
    pfSinMejor = profitFactor(trades.filter(t => t !== mejor))
    if (pfSinMejor === null || pfSinMejor <= MIN_PF_SIN_MEJOR) {
      motivos.push(`PF sin el mejor trade = ${pfSinMejor === null ? '—' : pfSinMejor.toFixed(2)} (se exige > ${MIN_PF_SIN_MEJOR})`)
    }
  } else {
    motivos.push('sin trades suficientes para excluir el mejor')
  }

  // 3. Mitad reciente en positivo
  let pnlMitadReciente = null
  if (trades.length >= 2) {
    const ordenados = [...trades].sort((a, b) =>
      new Date(a.cerrada || a.close_date || 0) - new Date(b.cerrada || b.close_date || 0))
    const mitad = ordenados.slice(Math.floor(ordenados.length / 2))
    pnlMitadReciente = mitad.reduce((s, t) => s + num(t.pnl), 0)
    if (pnlMitadReciente <= 0) motivos.push(`mitad reciente en negativo (${pnlMitadReciente.toFixed(2)})`)
  }

  // 4. Spec vigente
  const specActiva = specsActivas[bt.estrategia]
  if (specActiva && bt.spec_id && specActiva !== bt.spec_id) {
    motivos.push(`backtest de spec ${bt.spec_id}, pero la activa es ${specActiva}`)
  }

  return {
    estrategia: bt.estrategia,
    modelo: bt.modelo,
    spec_id: bt.spec_id,
    generado: bt.generado,
    trades: trades.length,
    metricas: bt.metricas || {},
    pfSinMejor,
    pnlMitadReciente,
    pasa: motivos.length === 0,
    motivos,
  }
}

async function main() {
  const res = await fetch(`${DASH_URL}/api/backtest`)
  if (!res.ok) throw new Error(`GET /api/backtest -> HTTP ${res.status}`)
  const data = await res.json()
  if (!data.success) throw new Error(`API sin éxito: ${data.error || 'desconocido'}`)

  const resultados = (data.resultados || []).map(bt => evaluar(bt, data.specsActivas || {}))

  console.log(`Vigía de backtest ELEVE — ${new Date().toISOString()}`)
  console.log(`Backtests publicados: ${resultados.length}\n`)

  for (const r of resultados) {
    const m = r.metricas
    console.log(`--- ${r.estrategia} (${r.modelo || '?'}, spec ${r.spec_id || '?'}, generado ${r.generado || '?'})`)
    console.log(`    trades=${r.trades} WR=${m.win_rate ?? '—'}% PF=${m.profit_factor ?? '—'} ` +
      `PF_sin_mejor=${r.pfSinMejor === null ? '—' : r.pfSinMejor === Infinity ? '∞' : r.pfSinMejor.toFixed(2)} ` +
      `PnL=${m.pnl_neto ?? '—'} mitad_reciente=${r.pnlMitadReciente === null ? '—' : r.pnlMitadReciente.toFixed(2)}`)
    if (r.pasa) {
      console.log(`    PASA: ${r.estrategia} cumple todos los criterios de aceptación ✅`)
    } else {
      console.log(`    no pasa: ${r.motivos.join(' | ')}`)
    }
  }

  const aprobadas = resultados.filter(r => r.pasa)
  console.log(`\nResumen: ${aprobadas.length}/${resultados.length} estrategias pasan los criterios.`)
  if (aprobadas.length === 0) console.log('Sin novedades: ninguna estrategia lista para paper todavía.')
}

main().catch(err => {
  console.error(`Vigía: error — ${err.message}`)
  process.exit(1)
})
