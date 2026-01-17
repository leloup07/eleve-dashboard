'use client'

import { useRealTradingData } from '@/hooks/useRealTradingData'

import { StrategyPage } from '@/components/StrategyPage'

export default function SmallCapsPage() {
  useRealTradingData(0)
  return <StrategyPage strategyKey="small_caps" />
}
