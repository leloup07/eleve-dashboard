'use client'

import { useEffect, useState } from 'react'

/**
 * Qué combinación exacta está corriendo (v5.1 · P0-1).
 *
 *     Dashboard bc85342 · Workers ba17fca · Specs 6 · Experiment LOCKED
 *
 * Responder a «¿está desplegado lo último?» exigía hasta ahora buscar cadenas
 * dentro de JavaScript minificado, porque los workers sellaban su commit y el
 * dashboard no. Eso no es una comprobación, es arqueología.
 *
 * No se exige que dashboard y workers compartan commit: son artefactos con
 * despliegues independientes y es normal que difieran. Lo que sí se exige es
 * que ambos estén identificados sin ambigüedad, y que cualquier estado
 * anómalo —un worker rezagado, specs incompletas, el experimento abierto— se
 * vea sin tener que ir a buscarlo.
 */
interface Estado {
  dashboardCommit: string | null
  workerCommits: Record<string, string | null>
  specs: Record<string, string | null>
  experiment: { active?: boolean; name?: string } | null
}

export function Checkpoint({ compacto = false }: { compacto?: boolean }) {
  const [e, setEstado] = useState<Estado | null>(null)

  useEffect(() => {
    let vivo = true
    const cargar = () =>
      fetch('/api/config')
        .then((r) => r.json())
        .then((j) => { if (vivo && j?.data) setEstado(j.data) })
        .catch((err) => console.error('[Checkpoint] no se pudo leer el estado:', err))
    cargar()
    const t = setInterval(cargar, 60000)
    return () => { vivo = false; clearInterval(t) }
  }, [])

  if (!e) return null

  const workers = Object.values(e.workerCommits || {}).filter(Boolean) as string[]
  const distintos = workers.filter((c, i) => workers.indexOf(c) === i)
  const specs = Object.values(e.specs || {}).filter(Boolean)
  const bloqueado = !!e.experiment?.active

  // Cada incidencia se nombra: un checkpoint que solo dice "algo va mal" no
  // ahorra el trabajo de averiguar qué.
  const incidencias: string[] = []
  if (!e.dashboardCommit) incidencias.push('el dashboard no lleva sello de commit')
  if (!workers.length) incidencias.push('ningún worker ha publicado su commit')
  else if (distintos.length > 1) {
    const detalle = Object.entries(e.workerCommits)
      .map(([n, c]) => `${n}=${c ?? '—'}`).join(' ')
    incidencias.push(`los workers ejecutan commits distintos: ${detalle}`)
  }
  if (specs.length !== 6) incidencias.push(`${specs.length} de 6 specs activas`)
  if (!bloqueado) incidencias.push('no hay experimento activo: los parámetros NO están congelados')

  const workersTexto = distintos.length === 1 ? distintos[0]
    : distintos.length ? `${distintos.length} versiones` : '—'

  const linea = `Dashboard ${e.dashboardCommit || '—'} · Workers ${workersTexto} · `
    + `Specs ${specs.length}/6 · Experiment ${bloqueado ? 'LOCKED' : 'OPEN'}`

  const tono = incidencias.length
    ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
    : 'text-white/45 border-white/10 bg-white/5'

  return (
    <div className={`rounded border px-2 py-1.5 font-mono text-[10px] leading-relaxed ${tono}`}>
      <p className="break-words">{incidencias.length ? '⚠️ ' : ''}{linea}</p>
      {!compacto && incidencias.map((i) => (
        <p key={i} className="mt-0.5 text-amber-300/90">· {i}</p>
      ))}
      {!compacto && !incidencias.length && specs.length > 0 && (
        <p className="mt-0.5 text-white/30 break-all">{specs.join(' ')}</p>
      )}
    </div>
  )
}
