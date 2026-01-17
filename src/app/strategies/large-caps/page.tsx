'use client'

import { useRealTradingData } from '@/hooks/useRealTradingData'

import { StrategyPage } from '@/components/StrategyPage'

export default function LargeCapsPage() {
  useRealTradingData(0)
  return <StrategyPage strategyKey="large_caps" />
}
