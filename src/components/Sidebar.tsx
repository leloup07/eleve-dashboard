'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useTradingStore } from '@/stores/tradingStore'
import { formatCapitalShort } from '@/lib/formatters'

const navigation = [
  { name: 'Home', href: '/', icon: '🏠' },
  { type: 'divider', label: 'Estrategias Swing' },
  { name: 'Crypto Core', href: '/strategies/crypto-core', icon: '💎' },
  { name: 'Crypto Aggressive', href: '/strategies/crypto-aggressive', icon: '⚡' },
  { name: 'Large Caps', href: '/strategies/large-caps', icon: '📈' },
  { name: 'Small Caps', href: '/strategies/small-caps', icon: '🎯' },
  { type: 'divider', label: 'Estrategias Intraday' },
  { name: 'VWAP Reversion', href: '/strategies/intraday', icon: '⚡' },
  { name: '1% Spot', href: '/strategies/intraday-1pct', icon: '💯' },
  { type: 'divider', label: 'Análisis' },
  { name: 'Indicadores', href: '/indicators', icon: '📊' },
  { name: 'Strategy Lab', href: '/strategy-lab', icon: '🔬' },
  { name: 'Backtesting', href: '/backtest', icon: '📈' },
  { name: 'Proyecciones', href: '/projections', icon: '🔮' },
  { name: 'Noticias', href: '/news', icon: '📰' },
  { type: 'divider', label: 'Herramientas' },
  { name: 'Educación', href: '/education', icon: '📚' },
  { name: 'Trading Journal', href: '/journal', icon: '📔' },
  { name: 'Configuración', href: '/config', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const strategies = useTradingStore(state => state.strategies)
  const globalMode = useTradingStore(state => state.getGlobalTradingMode())
  
  const intradayConfig = useTradingStore(state => state.intradayConfig)
  const intraday1PctConfig = useTradingStore(state => state.intraday1PctConfig)
  
  const cryptoCapital = (intradayConfig?.capital || 0) + (intraday1PctConfig?.capital || 0) + strategies
    .filter(s => s.key.includes('crypto'))
    .reduce((sum, s) => sum + s.capital, 0)
  const stocksCapital = strategies.filter(s => s.key.includes('caps'))
    .filter(s => !s.key.includes('crypto'))
    .reduce((sum, s) => sum + s.capital, 0)

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold">🚀 ELEVE v4.3</h1>
        <p className="text-xs text-white/60 mt-1">6 Estrategias Activas</p>
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
      
      {/* Footer - Capital */}
      <div className="p-3 border-t border-white/10 bg-blue-900/80">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <span className="text-[10px] text-white/50 block">Crypto</span>
            <span className="text-sm font-bold">{formatCapitalShort(cryptoCapital)}</span>
          </div>
          <div>
            <span className="text-[10px] text-white/50 block">Stocks</span>
            <span className="text-sm font-bold">{formatCapitalShort(stocksCapital)}</span>
          </div>
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
