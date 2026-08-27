'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/formatters'

// Lo que había aquí antes generaba las operaciones así:
//
//     const isWin = Math.random() < (baseWinRate + regimeWinBonus)
//
// Una moneda cargada con un win rate escrito a mano. El resultado no dependía
// de la estrategia, así que no podía decir nada sobre ella: cambiar los filtros
// de entrada no movía el gráfico, solo cambiaba la semilla del azar.
//
// Ahora esta página no calcula nada. Muestra los resultados de
// scripts/backtest.py, que recorre velas reales llamando a las mismas funciones
// que ejecuta el worker en producción (core/domain.py). Desde P0-2 solo existe
// una implementación de las reglas, así que el backtest no "coincide" con lo
// que se opera: es literalmente el mismo código.

interface Metricas {
  trades: number
  win_rate?: number
  r_medio?: number
  pnl_neto?: number
  pnl_bruto?: number
  costes?: number
  profit_factor?: number | null
  max_drawdown?: number
  retorno_pct?: number
  dias_medios?: number
}

interface Trade {
  ticker: string
  entrada: number
  salida: number
  abierta: string
  cerrada: string
  dias: number
  r: number
  pnl_bruto: number
  pnl: number
  costes: number
  trailing: boolean
}

interface Resultado {
  estrategia: string
  spec_id: string
  desde: string
  hasta: string
  generado: string
  metricas: Metricas
  trades: Trade[]
  equity: { fecha: string; cerrado: number; abiertas: number }[]
  rechazos: Record<string, number>
  limitaciones: string[]
}

const NOMBRES: Record<string, string> = {
  crypto_swing: 'Crypto Swing',
  crypto_breakout: 'Crypto Breakout',
  large_caps: 'Large Caps',
  small_caps: 'Small Caps',
}

export default function BacktestPage() {
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [specsActivas, setSpecsActivas] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seleccionada, setSeleccionada] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/backtest')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || 'No se pudieron leer los resultados')
        setResultados(d.resultados || [])
        setSpecsActivas(d.specsActivas || {})
        if (d.resultados?.length) setSeleccionada(d.resultados[0].estrategia)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  const actual = resultados.find((r) => r.estrategia === seleccionada)
  const desfasada = actual && specsActivas[actual.estrategia] && specsActivas[actual.estrategia] !== actual.spec_id

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white">Backtesting</h1>
      <p className="text-gray-400 mt-1">
        Resultado de ejecutar las reglas reales sobre velas históricas
      </p>

      {cargando && <p className="text-gray-500 mt-8">Cargando resultados…</p>}
      {error && (
        <div className="mt-8 bg-red-950/40 border border-red-800 rounded-lg p-4">
          <p className="text-red-300">No se pudieron cargar los resultados: {error}</p>
        </div>
      )}

      {!cargando && !error && resultados.length === 0 && (
        <div className="mt-8 bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-white font-semibold">Todavía no hay ningún backtest guardado</h2>
          <p className="text-gray-400 mt-2 text-sm">
            Esta página ya no simula operaciones. Los resultados los genera el worker
            recorriendo velas reales con las mismas reglas que opera:
          </p>
          <pre className="mt-3 bg-black/50 rounded p-3 text-xs text-gray-300 overflow-x-auto">
            python3 scripts/backtest.py --todas --guardar
          </pre>
        </div>
      )}

      {actual && (
        <>
          <div className="flex flex-wrap gap-2 mt-6">
            {resultados.map((r) => (
              <button
                key={r.estrategia}
                onClick={() => setSeleccionada(r.estrategia)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  r.estrategia === seleccionada
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {NOMBRES[r.estrategia] || r.estrategia}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
            <span>spec <code className="text-gray-400">{actual.spec_id}</code></span>
            <span>{actual.desde} → {actual.hasta}</span>
            <span>generado {new Date(actual.generado).toLocaleString('es-ES')}</span>
          </div>

          {desfasada && (
            <div className="mt-4 bg-amber-950/40 border border-amber-700 rounded-lg p-4">
              <p className="text-amber-200 text-sm">
                <strong>Este backtest es de otra versión de la estrategia.</strong> Se ejecutó con la
                spec <code>{actual.spec_id}</code> y la activa ahora es{' '}
                <code>{specsActivas[actual.estrategia]}</code>. Vuelve a lanzarlo antes de sacar
                conclusiones.
              </p>
            </div>
          )}

          <Metricas m={actual.metricas} />

          {actual.equity.length > 0 && (
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
              <h2 className="text-white font-semibold mb-1">Resultado acumulado, neto de costes</h2>
              <p className="text-xs text-gray-500 mb-4">
                Solo operaciones cerradas: las posiciones abiertas no cuentan hasta que cierran.
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={actual.equity}>
                  <XAxis dataKey="fecha" stroke="#6b7280" fontSize={11} minTickGap={60} />
                  <YAxis stroke="#6b7280" fontSize={11}
                         tickFormatter={(v) => formatCurrency(v as number)} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                    formatter={(v) => [formatCurrency(v as number), 'Acumulado']}
                  />
                  <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="cerrado" stroke="#3b82f6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <Rechazos rechazos={actual.rechazos} />
          <Operaciones trades={actual.trades} />
          <Limitaciones limitaciones={actual.limitaciones} />
        </>
      )}
    </div>
  )
}

function Metricas({ m }: { m: Metricas }) {
  if (!m.trades) {
    return (
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
        <p className="text-gray-400">Sin operaciones cerradas en el periodo evaluado.</p>
      </div>
    )
  }
  const neto = m.pnl_neto ?? 0
  const celdas: { etiqueta: string; valor: string; tono?: string; nota?: string }[] = [
    { etiqueta: 'Operaciones', valor: formatNumber(m.trades) },
    { etiqueta: 'Aciertos', valor: `${formatNumber(m.win_rate, 1)}%` },
    { etiqueta: 'R medio', valor: formatNumber(m.r_medio, 2),
      tono: (m.r_medio ?? 0) > 0 ? 'text-green-400' : 'text-red-400' },
    { etiqueta: 'Profit factor', valor: m.profit_factor == null ? '—' : formatNumber(m.profit_factor, 2),
      tono: (m.profit_factor ?? 0) >= 1 ? 'text-green-400' : 'text-red-400' },
    { etiqueta: 'Resultado neto', valor: formatCurrency(neto),
      tono: neto >= 0 ? 'text-green-400' : 'text-red-400',
      nota: `${formatNumber(m.retorno_pct, 2)}% del capital` },
    { etiqueta: 'Costes', valor: formatCurrency(m.costes ?? 0), tono: 'text-amber-400',
      nota: `bruto ${formatCurrency(m.pnl_bruto ?? 0)}` },
    { etiqueta: 'Peor racha', valor: formatCurrency(m.max_drawdown ?? 0), tono: 'text-red-400' },
    { etiqueta: 'Duración media', valor: `${formatNumber(m.dias_medios, 1)} días` },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
      {celdas.map((c) => (
        <div key={c.etiqueta} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{c.etiqueta}</p>
          <p className={`text-xl font-semibold mt-1 tabular-nums ${c.tono || 'text-white'}`}>{c.valor}</p>
          {c.nota && <p className="text-xs text-gray-500 mt-1">{c.nota}</p>}
        </div>
      ))}
    </div>
  )
}

function Rechazos({ rechazos }: { rechazos: Record<string, number> }) {
  const filas = Object.entries(rechazos || {}).sort((a, b) => b[1] - a[1])
  if (!filas.length) return null
  return (
    <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-white font-semibold">Señales válidas que no se ejecutaron</h2>
      <p className="text-xs text-gray-500 mt-1 mb-3">
        La estrategia dijo que sí y el sistema no operó. Los filtros de régimen son
        intencionales; el capital insuficiente y el tope de posiciones son límites
        de la cartera, no opiniones sobre el activo.
      </p>
      <div className="space-y-1">
        {filas.map(([motivo, n]) => (
          <div key={motivo} className="flex justify-between text-sm border-b border-gray-800/70 py-1.5">
            <span className="text-gray-300">{motivo}</span>
            <span className="text-gray-400 tabular-nums">{formatNumber(n)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Operaciones({ trades }: { trades: Trade[] }) {
  const [todas, setTodas] = useState(false)
  if (!trades?.length) return null
  const visibles = todas ? trades : trades.slice(0, 15)
  return (
    <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold">Operaciones ({formatNumber(trades.length)})</h2>
        {trades.length > 15 && (
          <button onClick={() => setTodas(!todas)} className="text-sm text-blue-400 hover:text-blue-300">
            {todas ? 'Ver solo las primeras' : 'Ver todas'}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 font-medium">Activo</th>
              <th className="text-right py-2 font-medium">Entrada</th>
              <th className="text-right py-2 font-medium">Salida</th>
              <th className="text-right py-2 font-medium">Días</th>
              <th className="text-right py-2 font-medium">R</th>
              <th className="text-right py-2 font-medium">Costes</th>
              <th className="text-right py-2 font-medium">Neto</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((t, i) => (
              <tr key={i} className="border-b border-gray-800/60">
                <td className="py-2 text-gray-200">
                  {t.ticker}
                  {t.trailing && <span className="ml-2 text-xs text-blue-400">trailing</span>}
                </td>
                <td className="py-2 text-right text-gray-400 tabular-nums">{formatCurrency(t.entrada)}</td>
                <td className="py-2 text-right text-gray-400 tabular-nums">{formatCurrency(t.salida)}</td>
                <td className="py-2 text-right text-gray-400 tabular-nums">{t.dias}</td>
                <td className={`py-2 text-right tabular-nums ${t.r >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatNumber(t.r, 2)}
                </td>
                <td className="py-2 text-right text-amber-400/80 tabular-nums">{formatCurrency(t.costes)}</td>
                <td className={`py-2 text-right tabular-nums ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(t.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Limitaciones({ limitaciones }: { limitaciones: string[] }) {
  if (!limitaciones?.length) return null
  return (
    <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-5">
      <h2 className="text-white font-semibold">Qué NO demuestra este backtest</h2>
      <ul className="mt-3 space-y-2">
        {limitaciones.map((l) => (
          <li key={l} className="text-sm text-gray-400 flex gap-2">
            <span className="text-gray-600">·</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
