'use client'

import { useEffect } from 'react'

import { useTradingStore } from '@/stores/tradingStore'

/**
 * Rehidrata el store desde localStorage DESPUÉS de montar (v5.1).
 *
 * El store usa skipHydration para que el primer render del cliente sea idéntico
 * al del servidor. Alguien tiene que disparar la rehidratación, y tiene que ser
 * en un efecto: hacerlo durante el render devolvería el problema que
 * skipHydration resuelve.
 */
export function RehidratarStore() {
  useEffect(() => {
    useTradingStore.persist.rehydrate()
  }, [])
  return null
}
