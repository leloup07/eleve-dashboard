/**
 * Diagnóstico de rendimiento ELEVE — SOLO LECTURA (SCAN/GET, ningún write).
 *
 * Dos modos:
 *   REDIS_URL=redis://... node diagnostico.js       → lee Redis directo
 *   DASH_URL=https://...  node diagnostico.js       → lee /api/trading, /api/config, /api/backtest
 *
 * Salidas en el mismo directorio: trades_export.json, trades_export.csv, diagnostico.md
 */
const fs = require('fs')
const path = require('path')
const OUT = __dirname

// ---------- utilidades ----------
const num = v => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0)

function rMultiple(t) {
  const entry = num(t.entry)
  const sl = num(t.original_sl) || num(t.sl)
  const size = num(t.size)
  const risk = (entry - sl) * size
  return risk > 0 ? num(t.pnl) / risk : null
}

function stats(trades) {
  const rs = trades.map(t => ({ ...t, r: t.r_multiple ?? rMultiple(t) }))
  const wins = rs.filter(t => num(t.pnl) > 0)
  const losses = rs.filter(t => num(t.pnl) < 0)
  const grossWin = wins.reduce((s, t) => s + num(t.pnl), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + num(t.pnl), 0))
  const avg = arr => (arr.length ? arr.reduce((s, t) => s + (t.r ?? 0), 0) / arr.length : null)
  const exits = {}
  for (const t of rs) {
    const reason = t.result || t.exit_reason || 'desconocido'
    exits[reason] = (exits[reason] || 0) + 1
  }
  return {
    n: rs.length,
    winRate: rs.length ? (100 * wins.length) / rs.length : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : null),
    pnlTotal: rs.reduce((s, t) => s + num(t.pnl), 0),
    avgRGanadoras: avg(wins),
    avgRPerdedoras: avg(losses),
    exits,
    trades: rs,
  }
}

// ---------- fuentes de datos ----------
async function fromRedis(url) {
  const Redis = require('ioredis')
  const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 })
  await redis.connect()

  // inventario completo de claves eleve:* (SCAN, no KEYS, por si la lista es grande)
  const keys = []
  let cursor = '0'
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', 'eleve:*', 'COUNT', 200)
    cursor = next
    keys.push(...batch)
  } while (cursor !== '0')

  const getJson = async k => {
    try { const v = await redis.get(k); return v ? JSON.parse(v) : null } catch { return null }
  }

  const data = { keys: keys.sort(), tradeSources: {}, positions: {}, config: {}, specs: {}, worker: {} }

  // trades: la clave única y cualquier eleve:trades:* por categoría si existe
  for (const k of keys.filter(k => k === 'eleve:trades' || k.startsWith('eleve:trades:')
      || k === 'eleve:intraday:trades' || k === 'eleve:intraday1pct:trades')) {
    const v = await getJson(k)
    if (Array.isArray(v)) data.tradeSources[k] = v
  }
  for (const k of keys.filter(k => k.startsWith('eleve:positions:')
      || k === 'eleve:intraday:positions' || k === 'eleve:intraday1pct:positions')) {
    const v = await getJson(k)
    if (Array.isArray(v)) data.positions[k] = v
  }
  for (const k of ['eleve:config:strategies', 'eleve:intraday:config', 'eleve:intraday1pct:config',
      'eleve:irg:config', 'eleve:experiment']) {
    if (keys.includes(k)) data.config[k] = await getJson(k)
  }
  for (const k of keys.filter(k => k.startsWith('eleve:spec:'))) data.specs[k] = await getJson(k)
  for (const k of keys.filter(k => k.endsWith(':worker') || k === 'eleve:worker')) data.worker[k] = await getJson(k)

  await redis.quit()
  return data
}

async function fromDashboard(base) {
  const get = async p => {
    const r = await fetch(base.replace(/\/$/, '') + p)
    if (!r.ok) throw new Error(`${p} -> HTTP ${r.status}`)
    return r.json()
  }
  const trading = await get('/api/trading')
  const config = await get('/api/config').catch(e => ({ error: String(e) }))
  const backtest = await get('/api/backtest').catch(e => ({ error: String(e) }))
  const d = trading.data || {}
  return {
    keys: ['(via dashboard API — sin inventario de claves)'],
    tradeSources: {
      'eleve:trades': d.trades || [],
      'eleve:intraday:trades': d.intradayTrades || [],
      'eleve:intraday1pct:trades': d.intraday1PctTrades || [],
    },
    positions: { 'positions(all)': d.positions || [] },
    config,
    specs: { specsActivas: backtest.specsActivas || null, backtests: backtest.resultados || null },
    worker: { 'eleve:worker': d.worker || null },
  }
}

// ---------- análisis ----------
function porEstrategia(all) {
  const grupos = {}
  for (const t of all) {
    const s = t.strategy || t.category || 'desconocida'
    ;(grupos[s] = grupos[s] || []).push(t)
  }
  return Object.fromEntries(Object.entries(grupos).map(([k, v]) => [k, stats(v)]))
}

// ¿Cuántas perdedoras NO habrían pasado un filtro RSI/ADX con los valores de config?
function simulaFiltros(all, cfg) {
  const strategies = cfg?.['eleve:config:strategies']?.strategies || cfg?.['eleve:config:strategies'] || null
  const out = []
  for (const t of all) {
    if (num(t.pnl) >= 0) continue
    const s = t.strategy || t.category
    const c = strategies?.[s] || strategies?.find?.(x => x.key === s) || null
    const rsi = t.rsi ?? null, adx = t.adx ?? null
    out.push({
      ticker: t.ticker, strategy: s, pnl: num(t.pnl), rsi, adx,
      rsiMin: c?.entryFilters?.rsiMin ?? c?.rsi_min ?? null,
      rsiMax: c?.entryFilters?.rsiMax ?? c?.rsi_max ?? null,
      adxMin: c?.entryFilters?.adxMin ?? c?.adx_min ?? null,
      bloqueadaPorRsi: rsi != null && ((c?.entryFilters?.rsiMin ?? c?.rsi_min) > rsi || (c?.entryFilters?.rsiMax ?? c?.rsi_max) < rsi) || false,
      bloqueadaPorAdx: adx != null && (c?.entryFilters?.adxMin ?? c?.adx_min) > adx || false,
    })
  }
  return out
}

// Multiplicador de ATR real: (entry - original_sl) / atr de cada trade y posición
function atrMultReal(items) {
  return items.map(t => {
    const entry = num(t.entry), sl = num(t.original_sl) || num(t.sl), atr = num(t.atr)
    return {
      ticker: t.ticker, strategy: t.strategy || t.category,
      atr, riskPerUnit: entry - sl,
      multImplied: atr > 0 ? +(((entry - sl) / atr).toFixed(2)) : null,
    }
  })
}

// Modo archivo: FILES_DIR con trading.json (obligatorio), config.json y backtest.json (opcionales),
// tal como los devuelven /api/trading, /api/config y /api/backtest.
function fromFiles(dir) {
  const read = f => {
    const p = path.join(dir, f)
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
  }
  const trading = read('trading.json')
  if (!trading) throw new Error(`No existe ${dir}/trading.json`)
  const config = read('config.json') || {}
  const backtest = read('backtest.json') || {}
  const d = trading.data || trading
  return {
    keys: ['(via archivos locales)'],
    tradeSources: {
      'eleve:trades': d.trades || [],
      'eleve:intraday:trades': d.intradayTrades || [],
      'eleve:intraday1pct:trades': d.intraday1PctTrades || [],
    },
    positions: { 'positions(all)': d.positions || [] },
    config,
    specs: { specsActivas: backtest.specsActivas || null, backtests: backtest.resultados || null },
    worker: { 'eleve:worker': d.worker || null },
  }
}

// Comparativa RSI/ADX de entrada: ganadoras vs perdedoras, por estrategia
function indicadoresGanadorasVsPerdedoras(all) {
  const grupos = {}
  for (const t of all) {
    const s = t.strategy || t.category || 'desconocida'
    ;(grupos[s] = grupos[s] || { win: [], loss: [] })[num(t.pnl) > 0 ? 'win' : 'loss'].push(t)
  }
  const resumen = arr => ({
    n: arr.length,
    rsi: arr.filter(t => t.rsi != null).map(t => num(t.rsi)),
    adx: arr.filter(t => t.adx != null).map(t => num(t.adx)),
  })
  return Object.fromEntries(Object.entries(grupos).map(([k, g]) =>
    [k, { ganadoras: resumen(g.win), perdedoras: resumen(g.loss) }]))
}

// ---------- main ----------
;(async () => {
  const data = process.env.REDIS_URL ? await fromRedis(process.env.REDIS_URL)
    : process.env.DASH_URL ? await fromDashboard(process.env.DASH_URL)
    : process.env.FILES_DIR ? fromFiles(process.env.FILES_DIR)
    : (() => { throw new Error('Define REDIS_URL, DASH_URL o FILES_DIR') })()

  const allTrades = Object.entries(data.tradeSources)
    .flatMap(([src, arr]) => arr.map(t => {
      const { price_path, pricePath, ...rest } = t  // series de precio: pesan MB y no aportan al diagnóstico
      return { ...rest, _source: src }
    }))
  for (const arr of Object.values(data.positions)) {
    arr.forEach(p => { delete p.price_path; delete p.pricePath })
  }

  const informe = {
    generado: new Date().toISOString(),
    clavesRedis: data.keys,
    worker: data.worker,
    specs: data.specs,
    config: data.config,
    resumenPorEstrategia: Object.fromEntries(
      Object.entries(porEstrategia(allTrades)).map(([k, v]) => [k, { ...v, trades: undefined }])),
    simulacionFiltrosEnPerdedoras: simulaFiltros(allTrades, data.config),
    indicadoresGanadorasVsPerdedoras: indicadoresGanadorasVsPerdedoras(allTrades),
    atrMultRealTrades: atrMultReal(allTrades),
    atrMultRealPosiciones: atrMultReal(Object.values(data.positions).flat()),
    posiciones: data.positions,
  }

  fs.writeFileSync(path.join(OUT, 'trades_export.json'), JSON.stringify({ trades: allTrades }, null, 2))
  const cols = ['_source','strategy','ticker','mode','entry','exit','original_sl','sl','tp','size','pnl','result','timestamp','exit_time','rsi','adx','ema20','ema50','atr','volume','grade','reason']
  const csv = [cols.join(',')].concat(allTrades.map(t =>
    cols.map(c => JSON.stringify(t[c] ?? '')).join(','))).join('\n')
  fs.writeFileSync(path.join(OUT, 'trades_export.csv'), csv)
  fs.writeFileSync(path.join(OUT, 'diagnostico.json'), JSON.stringify(informe, null, 2))
  console.log(JSON.stringify(informe.resumenPorEstrategia, null, 2))
  console.log(`\nExportados ${allTrades.length} trades -> trades_export.{json,csv}, diagnostico.json`)
})().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
