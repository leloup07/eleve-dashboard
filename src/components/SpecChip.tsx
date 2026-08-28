import { clsx } from 'clsx'

/**
 * Identidad de una estrategia (v5.1 · P0-1).
 *
 * Antes cada sitio pintaba una etiqueta de versión escrita a mano, y llegaron a
 * convivir v5.0, v5.1, v2.1, v1.0, v5.3 y v5.4 — con la misma estrategia
 * mostrando una cosa en la home y otra en /config. Ninguna de esas etiquetas
 * estaba atada a nada: cambiar un umbral no las movía.
 *
 * El spec_id sí: es el hash del contenido completo de la spec, así que cambiar
 * un solo parámetro produce otro identificador, siempre.
 */
export function SpecChip({ specId, className, cargando = false }:
                         { specId?: string | null; className?: string; cargando?: boolean }) {
  // «Cargando» y «sin spec» significan cosas opuestas: la primera es que aún no
  // se sabe, la segunda que la estrategia opera sin parámetros congelados.
  // Mostrar la segunda mientras es la primera es una acusación falsa.
  if (cargando && !specId) {
    return <span className={clsx('text-xs text-gray-400 font-mono', className)}>spec …</span>
  }
  if (!specId) {
    return (
      <span className={clsx('text-xs text-amber-600 font-mono', className)}
            title="Esta estrategia no tiene una spec activa: sus parámetros no están congelados">
        ⚠️ sin spec
      </span>
    )
  }
  return (
    <span className={clsx('text-xs text-gray-500 font-mono', className)}
          title="Identificador de la especificación congelada bajo la que opera">
      🔒 spec {specId}
    </span>
  )
}

/**
 * Modo sombra de una estrategia (v5.1 · P0-4).
 *
 * Distinto del toggle Activa/Pausada: `enabled` es si la estrategia se observa,
 * `executionEnabled` es si puede abrir posiciones. Las dos intraday quedaron en
 * modo sombra tras encontrarse dos defectos de infraestructura —el 1% Spot
 * podía comprometer más capital del que tenía, y el motor de riesgo no las
 * veía—, y "Activa" sin matizar habría vuelto a esconder exactamente eso.
 */
export function ShadowBadge({ executionEnabled, reason }:
                            { executionEnabled?: boolean | null; reason?: string | null }) {
  if (executionEnabled !== false) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full ml-2"
          title={reason || 'Modo sombra: genera y registra señales, no ejecuta'}>
      🟡 SHADOW · señales sí · ejecución bloqueada
    </span>
  )
}
