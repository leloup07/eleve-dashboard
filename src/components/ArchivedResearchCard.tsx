import Link from 'next/link'
import { SpecChip } from '@/components/SpecChip'

/**
 * Ficha de una estrategia con research cerrado (RESEARCH_CLOSED / NO_EDGE_EVIDENCE).
 *
 * Distinta a propósito de una ficha operativa: no lleva capital, riesgo, SL/TP,
 * horarios, ni toggles de Activa/PAPER/LIVE, porque nada de eso se ejecuta.
 * Mostrarlos producía $0, 0.0% y NaN — no porque el dato estuviera mal, sino
 * porque no hay ninguna configuración ejecutable de la que leerlo. La ficha es
 * de solo lectura: enlaza al histórico (backtests, research v6, provenance),
 * nunca a un formulario.
 */
export function ArchivedResearchCard({ name, icon, href, specId, reason }: {
  name: string
  icon: string
  href: string
  specId?: string | null
  reason?: string | null
}) {
  return (
    <div className="card border-2 border-gray-200 bg-gray-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl grayscale opacity-70">{icon}</span>
          <div>
            <h3 className="text-lg font-bold text-gray-700">{name}</h3>
            <p className="text-sm text-gray-500">
              <SpecChip specId={specId} /> · histórico preservado, solo lectura
            </p>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-200 px-2.5 py-1 rounded-full">
          🗄️ RESEARCH_CLOSED / NO_EDGE_EVIDENCE
        </span>
      </div>

      {reason && (
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">{reason}</p>
      )}

      <div className="mt-4">
        <Link href={href} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Ver histórico y resultados →
        </Link>
      </div>
    </div>
  )
}
