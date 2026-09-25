'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useTradingStore } from '@/stores/tradingStore'
import { formatCapitalShort } from '@/lib/formatters'
import { Checkpoint } from '@/components/Checkpoint'
import { useHidratado } from '@/hooks/useHidratado'

// Enlaces por estrategia swing. La sección (activa vs retirada) se decide en
// tiempo de render según executionEnabled, no aquí.
const STRAT_LINKS: Record<string, { name: string; href: string; icon: string }> = {
  crypto_breakout: { name: 'Crypto Breakout', href: '/strategies/crypto-breakout', icon: '🚀' },
  crypto_swing: { name: 'Crypto Swing', href: '/strategies/crypto-swing', icon: '🪙' },
  large_caps: { name: 'Large Caps', href: '/strategies/large-caps', icon: '📈' },
  small_caps: { name: 'Small Caps', href: '/strategies/small-caps', icon: '🎯' },
}
const SWING_KEYS = ['crypto_breakout', 'crypto_swing', 'large_caps', 'small_caps']
// VWAP y 1% Spot: research cerrado, siempre retiradas.
const INTRADAY_RETIRADAS = [
  { name: 'VWAP Reversion', href: '/strategies/intraday', icon: '⚡' },
  { name: '1% Spot', href: '/strategies/intraday-1pct', icon: '💯' },
]
const ANALISIS = [
  { name: 'Indicadores', href: '/indicators', icon: '📊' },
  { name: 'Backtesting', href: '/backtest', icon: '📈' },
  { name: 'Riesgo', href: '/riesgo', icon: '🛡️' },
  { name: 'Proyecciones', href: '/projections', icon: '🔮' },
  { name: 'Noticias', href: '/news', icon: '📰' },
]
const HERRAMIENTAS = [
  { name: 'Educación', href: '/education', icon: '📚' },
  { name: 'Trading Journal', href: '/journal', icon: '📔' },
  { name: 'Configuración', href: '/config', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const strategies = useTradingStore(state => state.strategies)
  const globalMode = useTradingStore(state => state.getGlobalTradingMode())
  // El capital depende de config persistida en localStorage: pintarlo en el
  // primer render rompe la hidratación (servidor $0 vs cliente $15K).
  const hidratado = useHidratado()
  const configCargada = useTradingStore(state => state.configCargada)

  // El capital y el estado (executionEnabled) de cada estrategia viven en Redis.
  // La barra lateral se pinta en TODAS las páginas, pero el hook que hidrata la
  // configuración solo corre en algunas; sin esta hidratación local, en /backtest
  // o /journal las cifras salían a 0 y no se sabía qué estaba retirado.
  useEffect(() => {
    let vivo = true
    fetch('/api/config')
      .then((r) => r.json())
      .then((json) => {
        if (!vivo || !json?.data?.strategies) return
        useTradingStore.getState().setConfigCargada(true)
        useTradingStore.setState((state) => ({
          strategies: state.strategies.map((s) => {
            const cfg = json.data.strategies[s.key]
            if (!cfg) return s
            return {
              ...s,
              capital: cfg.capital ?? s.capital,
              riskPerTrade: cfg.riskPerTrade ?? s.riskPerTrade,
              maxPositions: cfg.maxPositions ?? s.maxPositions,
              enabled: cfg.enabled ?? s.enabled,
              executionEnabled: cfg.executionEnabled ?? s.executionEnabled,
            }
          }),
        }))
      })
      .catch((e) => console.error('[Sidebar] no se pudo leer la config:', e))
    return () => { vivo = false }
  }, [])

  const byKey = Object.fromEntries(strategies.map(s => [s.key, s]))
  const esRetirada = (key: string) => byKey[key]?.executionEnabled === false
  const activas = SWING_KEYS.filter(k => STRAT_LINKS[k] && !esRetirada(k))
  const retiradas = SWING_KEYS.filter(k => STRAT_LINKS[k] && esRetirada(k))
  const nActivas = activas.length
  // Solo el capital de estrategias ACTIVAS (las retiradas ya no operan).
  const capitalActivo = activas.reduce((sum, k) => sum + (byKey[k]?.capital || 0), 0)

  type NavItem = { type?: 'divider'; label?: string; name?: string; href?: string; icon?: string }
  const navigation: NavItem[] = [
    { name: 'Home', href: '/', icon: '🏠' },
    { type: 'divider', label: nActivas === 1 ? 'Estrategia activa' : 'Estrategias activas' },
    ...activas.map(k => STRAT_LINKS[k]),
    { type: 'divider', label: 'Análisis' }, ...ANALISIS,
    { type: 'divider', label: 'Herramientas' }, ...HERRAMIENTAS,
    { type: 'divider', label: 'Retiradas' },
    ...retiradas.map(k => STRAT_LINKS[k]),
    ...INTRADAY_RETIRADAS,
  ]

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold">🚀 ELEVE</h1>
        {/* Solo las que ejecutan. Las retiradas (executionEnabled:false) no
            cuentan: están en su propia sección más abajo. */}
        <p className="text-xs text-white/60 mt-1">
          {nActivas} {nActivas === 1 ? 'estrategia activa' : 'estrategias activas'}
        </p>
      </div>

      {/* Navegación */}
      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-0.5">
          {navigation.map((item, idx) => {
            if (item.type === 'divider') {
              return (
                <div key={idx} className="my-2 pt-2 border-t border-white/10">
                  {item.label && (
                    <span className="text-[10px] uppercase tracking-wider text-white/40 px-3">
                      {item.label}
                    </span>
                  )}
                </div>
              )
            }
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer - Capital (solo estrategias activas) */}
      <div className="p-3 border-t border-white/10 bg-blue-900/80">
        <div className="mb-2">
          <span className="text-[10px] text-white/50 block">Capital activo</span>
          <span className="text-sm font-bold">
            {hidratado && configCargada ? formatCapitalShort(capitalActivo) : '…'}
          </span>
        </div>

        <div className={clsx(
          'flex items-center gap-2 px-2 py-1.5 rounded text-xs',
          globalMode === 'live' ? 'bg-red-500/20' : 'bg-blue-500/20'
        )}>
          <span className={clsx(
            'w-2 h-2 rounded-full',
            globalMode === 'live' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
          )} />
          <span>{globalMode === 'live' ? '🔴 LIVE' : '📝 PAPER'}</span>
        </div>

        {/* Qué combinación exacta está corriendo. Sin esto, comprobar si el
            despliegue está al día exigía buscar cadenas en JavaScript minificado. */}
        <div className="mt-2">
          <Checkpoint />
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* MOBILE: Hamburger button - always visible on mobile */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-3 bg-blue-600 text-white rounded-lg shadow-lg text-xl"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* MOBILE: Overlay when menu is open */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* MOBILE: Slide-out sidebar */}
      <aside
        className={clsx(
          'md:hidden fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-900 to-blue-700 text-white flex flex-col z-50 transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* DESKTOP: Fixed sidebar - always visible */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-blue-900 to-blue-700 text-white flex-col z-40">
        <SidebarContent />
      </aside>
    </>
  )
}
