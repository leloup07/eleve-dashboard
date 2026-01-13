'use client'

import { formatCurrency, formatPercent, formatNumber, getValueColorClass } from '@/lib/formatters'
import { clsx } from 'clsx'

interface MetricCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  format?: 'currency' | 'percent' | 'number' | 'none'
  decimals?: number
  icon?: React.ReactNode
  className?: string
}

export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  format = 'none',
  decimals = 0,
  icon,
  className
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    switch (format) {
      case 'currency':
        return formatCurrency(val, decimals)
      case 'percent':
        return formatPercent(val, decimals)
      case 'number':
        return formatNumber(val, decimals)
      default:
        return String(val)
    }
  }

  return (
    <div className={clsx('card', className)}>
      <div className="flex items-center justify-between">
        <span className="metric-label">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="mt-2">
        <span className="metric-value">{formatValue(value)}</span>
        {delta !== undefined && (
          <span className={clsx('ml-2', getValueColorClass(delta))}>
            {delta >= 0 ? '+' : ''}{formatNumber(delta, 1)}%
            {deltaLabel && <span className="text-gray-500 text-xs ml-1">{deltaLabel}</span>}
          </span>
        )}
      </div>
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string | number
  format?: 'currency' | 'percent' | 'number' | 'none'
  decimals?: number
  valueClassName?: string
}

export function MetricRow({ label, value, format = 'none', decimals = 0, valueClassName }: MetricRowProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    switch (format) {
      case 'currency':
        return formatCurrency(val, decimals)
      case 'percent':
        return formatPercent(val, decimals)
      case 'number':
        return formatNumber(val, decimals)
      default:
        return String(val)
    }
  }

  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={clsx('font-medium', valueClassName)}>{formatValue(value)}</span>
    </div>
  )
}
