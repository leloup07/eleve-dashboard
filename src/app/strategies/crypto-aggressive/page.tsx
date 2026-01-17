'use client'

import { useRealTradingData } from '@/hooks/useRealTradingData'

import { StrategyPage } from '@/components/StrategyPage'

export default function CryptoAggressivePage() {
  useRealTradingData(0)
  return <StrategyPage strategyKey="crypto_aggressive" />
}
