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
