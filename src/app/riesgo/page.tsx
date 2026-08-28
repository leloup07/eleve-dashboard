'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/formatters'

// Riesgo de CARTERA (v5.1 · P0-4). Hasta ahora cada estrategia vigilaba su
// propio bolsillo y nadie miraba el conjunto. Faltaban dos cosas que solo se ven
// mirando la cartera entera:
//
//   - Las posiciones de crypto no son posiciones distintas: correlación media
//     medida de 0,85, así que ocho abiertas a la vez son ~1,1 apuestas.
//   - El stop no es el suelo de la pérdida: cuando salta con hueco, en acciones
//     se pierde de media 2,04R en vez de 1R.

interface PorFactor {
  pct: number
  posiciones: number
  apuestas_efectivas: number
  tickers: string[]
}

interface CalorCartera {
  actualizado: string
  capital: number
  calor_pct: number
  calor_al_stop_pct: number
  calor_usd: number
  posiciones: number
  por_factor: Record<string, PorFactor>
  limites: Record<string, number>
  caida_pct: number
  perdidas_consecutivas: number
  operativa_detenida: boolean
  motivo_detencion: string | null
}

interface PuntoEquity {
  fecha: string
  equity: number
  capital: number
  realizado: number
  no_realizado: number
  posiciones_abiertas: number
  precios_obsoletos: number
}

interface Rechazo {
  fecha: string
  ticker: string
  estrategia: string
  motivo: string
  detalle: Record<string, unknown>
}

const NOMBRE_FACTOR: Record<string, string> = { crypto: 'Crypto', equity: 'Acciones' }

export default function RiesgoPage() {
  const [calor, setCalor] = useState<CalorCartera | null>(null)
  const [rechazos, setRechazos] = useState<Rechazo[]>([])
  const [equity, setEquity] = useState<PuntoEquity[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = () =>
      fetch('/api/riesgo')
        .then((r) => r.json())
        .then((d) => {
          if (!d.success) throw new Error(d.error || 'No se pudo leer el riesgo')
          setCalor(d.calor)
          setRechazos(d.rechazos || [])
          setEquity(d.equity || [])
          setError(null)
        })
        .catch((e) => setError(e.message))
        .finally(() => setCargando(false))
    cargar()
    const t = setInterval(cargar, 60000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white">Riesgo de cartera</h1>
      <p className="text-gray-400 mt-1">
        Lo que se pierde si todos los stops saltan a la vez
      </p>

      {cargando && <p className="text-gray-500 mt-8">Cargando…</p>}
      {error && (
        <div className="mt-8 bg-red-950/40 border border-red-800 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {!cargando && !error && !calor && (
        <div className="mt-8 bg-gray-900 border border-gray-700 rounded-lg p-6">
          <p className="text-gray-300">
            El worker todavía no ha publicado ninguna medición de riesgo. Aparecerá en su
            próximo ciclo.
          </p>
        </div>
      )}

      {calor && (
        <>
          {calor.operativa_detenida && (
            <div className="mt-6 bg-red-950/50 border-2 border-red-700 rounded-lg p-4">
              <p className="text-red-200 font-semibold">
                🛑 Operativa detenida — {calor.motivo_detencion}
              </p>
              <p className="text-sm text-red-300/90 mt-1">
                No se abren posiciones nuevas. Las que ya están abiertas se siguen
                gestionando con normalidad: un interruptor que las dejara sin vigilancia
                sería peor que no tenerlo.
              </p>
            </div>
          )}

          <Resumen calor={calor} />
          <CurvaEquity puntos={equity} />
          <Factores calor={calor} />
          <Limites calor={calor} />
          <Rechazados rechazos={rechazos} />

          <p className="text-xs text-gray-600 mt-6">
            Actualizado {new Date(calor.actualizado).toLocaleString('es-ES')}
          </p>
        </>
      )}
    </div>
  )
}

function Resumen({ calor }: { calor: CalorCartera }) {
  const celdas = [
    { etiqueta: 'Riesgo abierto', valor: `${formatNumber(calor.calor_pct * 100, 2)}%`,
      nota: formatCurrency(calor.calor_usd) },
    { etiqueta: 'Medido al stop', valor: `${formatNumber(calor.calor_al_stop_pct * 100, 2)}%`,
      nota: 'sin contar huecos' },
    { etiqueta: 'Posiciones', valor: formatNumber(calor.posiciones) },
    { etiqueta: 'Caída desde el máximo', valor: `${formatNumber(calor.caida_pct * 100, 2)}%`,
      nota: `límite ${formatNumber((calor.limites.caidaMaximaPct || 0) * 100, 0)}%` },
  ]
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {celdas.map((c) => (
          <div key={c.etiqueta} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{c.etiqueta}</p>
            <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{c.valor}</p>
            {c.nota && <p className="text-xs text-gray-500 mt-1">{c.nota}</p>}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        La diferencia entre las dos primeras cifras no es cosmética: un stop no garantiza el
        precio de salida. Cuando salta con el mercado ya abierto al otro lado, en acciones se
        pierde de media <strong className="text-gray-400">2,04R</strong> en lugar de 1R, y eso
        pasa en un tercio de las salidas.
      </p>
    </>
  )
}

function CurvaEquity({ puntos }: { puntos: PuntoEquity[] }) {
  if (!puntos?.length) return null
  const ultimo = puntos[puntos.length - 1]
  const capital = ultimo.capital || 0
  const obsoletos = puntos.filter((p) => p.precios_obsoletos > 0).length
  return (
    <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-white font-semibold">Curva de equity</h2>
        <span className="text-sm text-gray-400 tabular-nums">
          {formatCurrency(ultimo.equity)}{' '}
          <span className={ultimo.equity >= capital ? 'text-green-400' : 'text-red-400'}>
            ({ultimo.equity >= capital ? '+' : ''}
            {formatNumber(((ultimo.equity - capital) / capital) * 100, 2)}%)
          </span>
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Capital + resultado realizado + posiciones abiertas marcadas a mercado, ya descontados
        los costes que tendría cerrarlas. Un punto por día; el de hoy se actualiza cada ciclo.
      </p>
      {puntos.length === 1 ? (
        <p className="text-sm text-gray-500">
          Solo hay un punto todavía. La curva empieza a tener forma con varios días.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={puntos}>
            <XAxis dataKey="fecha" stroke="#6b7280" fontSize={11} minTickGap={50} />
            <YAxis stroke="#6b7280" fontSize={11} domain={['auto', 'auto']}
                   tickFormatter={(v) => formatCurrency(v as number)} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              formatter={(v) => [formatCurrency(v as number), 'Equity']}
            />
            <ReferenceLine y={capital} stroke="#4b5563" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="equity" stroke="#3b82f6"
                  fill="#3b82f6" fillOpacity={0.12} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 mt-3">
        <span>realizado <span className="text-gray-300">{formatCurrency(ultimo.realizado)}</span></span>
        <span>abierto <span className="text-gray-300">{formatCurrency(ultimo.no_realizado)}</span></span>
        <span>la línea gris es el capital de partida</span>
        {obsoletos > 0 && (
          <span className="text-amber-400">
            {obsoletos} {obsoletos === 1 ? 'día calculado' : 'días calculados'} con precios sin actualizar
          </span>
        )}
      </div>
    </div>
  )
}

function Factores({ calor }: { calor: CalorCartera }) {
  const factores = Object.entries(calor.por_factor || {})
  if (!factores.length) {
    return (
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
        <p className="text-gray-400">No hay posiciones abiertas.</p>
      </div>
    )
  }
  const tope = calor.limites.calorMaximoPorFactorPct || 0
  return (
    <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-white font-semibold">Concentración por factor</h2>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Cuántas apuestas <em>independientes</em> hay de verdad. Medido sobre 249 sesiones: los
        activos de crypto se mueven juntos (correlación 0,85), las acciones no (0,16).
      </p>
      <div className="space-y-4">
        {factores.map(([nombre, d]) => (
          <div key={nombre}>
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-gray-200 font-medium">{NOMBRE_FACTOR[nombre] || nombre}</span>
              <span className="text-gray-400 tabular-nums">
                {formatNumber(d.pct * 100, 2)}%
                {tope > 0 && <span className="text-gray-600"> / {formatNumber(tope * 100, 0)}%</span>}
              </span>
            </div>
            {tope > 0 && (
              <div className="h-2 bg-gray-800 rounded mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded ${d.pct / tope > 0.8 ? 'bg-red-500' : d.pct / tope > 0.5 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (d.pct / tope) * 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1.5">
              {d.posiciones} {d.posiciones === 1 ? 'posición' : 'posiciones'} ={' '}
              <strong className="text-gray-300">{formatNumber(d.apuestas_efectivas, 2)}</strong>{' '}
              {d.apuestas_efectivas < 2 ? 'apuesta independiente' : 'apuestas independientes'}
              {d.tickers?.length > 0 && (
                <span className="text-gray-600"> · {d.tickers.join(', ')}</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Limites({ calor }: { calor: CalorCartera }) {
  const filas: [string, string][] = [
    ['Calor máximo de cartera', `${formatNumber((calor.limites.calorMaximoPct || 0) * 100, 1)}%`],
    ['Calor máximo por factor', `${formatNumber((calor.limites.calorMaximoPorFactorPct || 0) * 100, 1)}%`],
    ['Caída máxima antes de parar', `${formatNumber((calor.limites.caidaMaximaPct || 0) * 100, 0)}%`],
  ]
  return (
    <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-white font-semibold">Límites vigentes</h2>
      <p className="text-xs text-gray-500 mt-1 mb-3">
        Son cortacircuitos, no ajustes de rendimiento: están por encima de todo lo observado
        (calor máximo histórico 2,90%, peor caída 18,8%) para acotar estados que ELEVE no ha
        visto nunca. Elegirlos por lo que habría funcionado mejor en el único camino histórico
        que existe sería ajustar a la muestra — de hecho, un tope de calor del 2% empeoraba a
        la vez el resultado y la peor caída.
      </p>
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="flex justify-between text-sm border-b border-gray-800/70 py-2">
          <span className="text-gray-300">{etiqueta}</span>
          <span className="text-gray-400 tabular-nums">{valor}</span>
        </div>
      ))}
    </div>
  )
}

function Rechazados({ rechazos }: { rechazos: Rechazo[] }) {
  return (
    <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-white font-semibold">Señales bloqueadas por riesgo</h2>
      <p className="text-xs text-gray-500 mt-1 mb-3">
        Sin este registro, un límite es indistinguible de un fallo: no habría forma de saber si
        no se operó porque no había señal o porque algo la frenó.
      </p>
      {!rechazos.length ? (
        <p className="text-sm text-gray-500">
          Ninguna. El motor de riesgo no ha bloqueado nada todavía.
        </p>
      ) : (
        <div className="space-y-1">
          {rechazos.map((r, i) => (
            <div key={i} className="flex justify-between text-sm border-b border-gray-800/70 py-1.5">
              <span className="text-gray-300">
                {r.ticker} <span className="text-gray-600">· {r.estrategia}</span>
              </span>
              <span className="text-gray-400 text-right">
                {r.motivo}
                <span className="text-gray-600 block text-xs">
                  {new Date(r.fecha).toLocaleString('es-ES')}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
