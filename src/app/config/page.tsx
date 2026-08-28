'use client'

import { useRealTradingData } from '@/hooks/useRealTradingData'
import { SpecChip } from '@/components/SpecChip'

import { useState, useEffect } from 'react'
import { useTradingStore } from '@/stores/tradingStore'
import { formatCurrency, formatPercent, formatNumber, formatRatio } from '@/lib/formatters'
import { clsx } from 'clsx'
import type { StrategyConfig } from '@/types'
import { TRAILING_LABEL } from '@/config/version'
import { buildStrategySpecLine, describeStop } from '@/lib/strategySpec'

function StrategyEditor({ strategy }: { strategy: StrategyConfig }) {
  // v5.1 P0-1: con un experimento en curso los parámetros no se tocan
  const congelado = useTradingStore(state => state.experiment?.active ?? false)
  const updateStrategy = useTradingStore(state => state.updateStrategy)
  const [editing, setEditing] = useState(false)
  const [localConfig, setLocalConfig] = useState(strategy)
  const [activeTab, setActiveTab] = useState<'main' | 'filters' | 'performance'>('main')
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  
  // Sync to Redis
  const syncToRedis = async (config: StrategyConfig) => {
    try {
      const response = await fetch('/api/strategies-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: strategy.key, config })
      })
      return response.ok
    } catch (e) {
      console.error('Error syncing to Redis:', e)
      return false
    }
  }
  
  // Quick toggle Paper/Live (sin entrar en modo edición)
  const handleModeToggle = async () => {
    const newMode: 'live' | 'paper' = strategy.mode === 'paper' ? 'live' : 'paper'
    const newConfig = { ...strategy, mode: newMode }
    
    // Confirmar si cambia a LIVE
    if (newMode === 'live') {
      const confirm = window.confirm(
        `⚠️ ¿Activar modo LIVE para ${strategy.name}?\n\nEsto ejecutará órdenes REALES con dinero REAL.`
      )
      if (!confirm) return
    }
    
    setSyncing(true)
    updateStrategy(strategy.key, { mode: newMode })
    const success = await syncToRedis(newConfig)
    setSyncStatus(success ? 'success' : 'error')
    setTimeout(() => setSyncStatus('idle'), 3000)
    setSyncing(false)
  }
  
  // Quick toggle Enabled/Disabled
  const handleEnabledToggle = async () => {
    const newEnabled = !strategy.enabled
    const newConfig = { ...strategy, enabled: newEnabled }
    
    setSyncing(true)
    updateStrategy(strategy.key, { enabled: newEnabled })
    const success = await syncToRedis(newConfig)
    setSyncStatus(success ? 'success' : 'error')
    setTimeout(() => setSyncStatus('idle'), 3000)
    setSyncing(false)
  }
  
  const handleSave = async () => {
    updateStrategy(strategy.key, localConfig)
    setSyncing(true)
    const success = await syncToRedis(localConfig)
    setSyncStatus(success ? 'success' : 'error')
    setTimeout(() => setSyncStatus('idle'), 3000)
    setSyncing(false)
    setEditing(false)
  }
  
  const handleCancel = () => {
    setLocalConfig(strategy)
    setEditing(false)
  }
  
  const emoji = {
    crypto_swing: '🪙',
    crypto_breakout: '🚀',
    large_caps: '📈',
    small_caps: '🎯'
  }[strategy.key] || '📊'
  
  // Helper para actualizar entryFilters
  const updateFilter = (key: keyof typeof localConfig.entryFilters, value: number) => {
    setLocalConfig({
      ...localConfig,
      entryFilters: { ...localConfig.entryFilters, [key]: value }
    })
  }
  
  // Helper para actualizar timeframes
  const updateTimeframe = (key: keyof typeof localConfig.timeframes, value: string) => {
    setLocalConfig({
      ...localConfig,
      timeframes: { ...localConfig.timeframes, [key]: value }
    })
  }
  
  // Helper para actualizar expectedPerformance
  const updatePerformance = (key: keyof typeof localConfig.expectedPerformance, value: string) => {
    setLocalConfig({
      ...localConfig,
      expectedPerformance: { ...localConfig.expectedPerformance, [key]: value }
    })
  }
  
  return (
    <div className={clsx(
      'card',
      !strategy.enabled && 'opacity-60',
      strategy.mode === 'live' && 'border-2 border-red-300'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <h3 className="text-xl font-bold">{strategy.name}</h3>
            <p className="text-sm text-gray-500">
              <SpecChip specId={strategy.specId} /> • {strategy.description}
              <span className="block text-xs text-gray-400 mt-0.5">{buildStrategySpecLine(strategy)}</span>
              {syncStatus === 'success' && <span className="ml-2 text-green-600">✅ Sincronizado</span>}
              {syncStatus === 'error' && <span className="ml-2 text-red-600">❌ Error</span>}
            </p>
          </div>
        </div>
        
        {/* Quick Controls */}
        <div className="flex items-center gap-3">
          {/* Toggle Enabled */}
          <button
            onClick={handleEnabledToggle}
            disabled={syncing}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              strategy.enabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            {strategy.enabled ? '✅ Activa' : '⏸️ Pausada'}
          </button>
          
          {/* Toggle Paper/Live */}
          <button
            onClick={handleModeToggle}
            disabled={syncing}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              strategy.mode === 'live'
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            )}
          >
            {strategy.mode === 'live' ? '🔴 LIVE' : '📝 PAPER'}
          </button>
          
          {/* Edit Button */}
          {editing ? (
            <div className="flex gap-2">
              <button 
                onClick={handleSave} 
                disabled={syncing}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {syncing ? '⏳' : '💾'} Guardar
              </button>
              <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              disabled={congelado}
              title={congelado ? 'Parámetros congelados por un experimento en curso' : undefined}
              className={congelado
                ? 'px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed'
                : 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'}>
              {congelado ? '🔒 Congelado' : '✏️ Editar'}
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('main')}
          className={clsx(
            'px-4 py-2 font-medium border-b-2 -mb-px',
            activeTab === 'main' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          ⚙️ Principal
        </button>
        <button
          onClick={() => setActiveTab('filters')}
          className={clsx(
            'px-4 py-2 font-medium border-b-2 -mb-px',
            activeTab === 'filters' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          🔍 Filtros de Entrada
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={clsx(
            'px-4 py-2 font-medium border-b-2 -mb-px',
            activeTab === 'performance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          📈 Rendimiento
        </button>
      </div>
      
      {/* Tab: Principal */}
      {activeTab === 'main' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Columna izquierda - Configuración */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700 border-b pb-2">⚙️ Configuración</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Modo</label>
                {editing ? (
                  <select
                    value={localConfig.mode}
                    onChange={(e) => setLocalConfig({ ...localConfig, mode: e.target.value as 'live' | 'paper' })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="paper">📝 Paper</option>
                    <option value="live">🔴 Live</option>
                  </select>
                ) : (
                  <p className={clsx('font-medium', strategy.mode === 'live' ? 'text-red-600' : 'text-blue-600')}>
                    {strategy.mode === 'live' ? '🔴 Live' : '📝 Paper'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Estado</label>
                {editing ? (
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={localConfig.enabled}
                      onChange={(e) => setLocalConfig({ ...localConfig, enabled: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span>{localConfig.enabled ? 'Activa' : 'Desactivada'}</span>
                  </label>
                ) : (
                  <p className={clsx('font-medium', strategy.enabled ? 'text-green-600' : 'text-gray-500')}>
                    {strategy.enabled ? '✅ Activa' : '⚪ Desactivada'}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Capital ($)</label>
              {editing ? (
                <input
                  type="number"
                  value={localConfig.capital ?? ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, capital: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  step="1000"
                />
              ) : (
                <p className="font-medium text-lg">{strategy.capital == null ? <span className="text-gray-400 text-sm">Cargando…</span> : formatCurrency(strategy.capital)}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Riesgo/Trade (%)</label>
                {editing ? (
                  <input
                    type="number"
                    value={((localConfig.riskPerTrade ?? 0) * 100).toFixed(2)}
                    onChange={(e) => setLocalConfig({ ...localConfig, riskPerTrade: Number(e.target.value) / 100 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.25"
                    min="0.25"
                    max="5"
                  />
                ) : (
                  <p className="font-medium">{((strategy.riskPerTrade ?? 0) * 100).toFixed(2)}%</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Max Posiciones</label>
                {editing ? (
                  <input
                    type="number"
                    value={localConfig.maxPositions ?? ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, maxPositions: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                    max="10"
                  />
                ) : (
                  <p className="font-medium">{strategy.maxPositions}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Columna derecha - Stops y Timeframes */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700 border-b pb-2">🎯 Stops</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Stop Loss (ATR×)</label>
                {editing ? (
                  <input
                    type="number"
                    value={localConfig.stops.slAtrMult ?? ''}
                    onChange={(e) => setLocalConfig({ 
                      ...localConfig, 
                      stops: { ...localConfig.stops, slAtrMult: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.1"
                    min="0.5"
                    max="5"
                  />
                ) : (
                  <p className="font-medium">{describeStop(strategy)}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Gestión de salida</label>
                <p className="font-medium text-green-600">{TRAILING_LABEL}</p>
                <p className="text-xs text-gray-500 mt-1">Sin TP fijo. 100% trailing.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">R:R Objetivo</label>
              <p className="font-medium text-blue-600 text-lg">∞ (trailing)</p>
            </div>
            
            <h4 className="font-semibold text-gray-700 border-b pb-2 mt-6">📊 Timeframes</h4>
            
            <div className="grid grid-cols-3 gap-4">
              {(['context', 'trend', 'entry'] as const).map(tf => (
                <div key={tf}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">{tf}</label>
                  {editing ? (
                    <select
                      value={localConfig.timeframes[tf]}
                      onChange={(e) => updateTimeframe(tf, e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="1H">1H</option>
                      <option value="4H">4H</option>
                      <option value="1D">1D</option>
                      <option value="1W">1W</option>
                    </select>
                  ) : (
                    <p className="font-medium">{strategy.timeframes[tf]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Tab: Filtros de Entrada */}
      {activeTab === 'filters' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <strong>💡 Filtros de Entrada:</strong> Condiciones que debe cumplir un activo para generar señal de entrada.
            Los cambios aquí afectan la frecuencia y calidad de los trades.
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            {/* ADX */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">📊 ADX (Fuerza de tendencia)</h4>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">ADX Mínimo</label>
                {editing ? (
                  <input
                    type="number"
                    value={localConfig.entryFilters.adxMin ?? ''}
                    onChange={(e) => updateFilter('adxMin', Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="10"
                    max="40"
                  />
                ) : (
                  <p className="font-medium text-lg">{strategy.entryFilters.adxMin ?? "—"}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const v = (editing ? localConfig : strategy).entryFilters.adxMin
                    if (v == null) return '—'
                    return v < 18 ? '🔥 Agresivo' : v < 25 ? '⚖️ Moderado' : '🛡️ Conservador'
                  })()}
                </p>
              </div>
            </div>
            
            {/* RSI */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">📈 RSI (Momentum)</h4>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">RSI Mínimo</label>
                {editing ? (
                  <input
                    type="number"
                    value={localConfig.entryFilters.rsiMin ?? ''}
                    onChange={(e) => updateFilter('rsiMin', Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="20"
                    max="50"
                  />
                ) : (
                  <p className="font-medium">{strategy.entryFilters.rsiMin}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">RSI Máximo</label>
                {editing ? (
                  <input
                    type="number"
                    value={localConfig.entryFilters.rsiMax ?? ''}
                    onChange={(e) => updateFilter('rsiMax', Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="60"
                    max="85"
                  />
                ) : (
                  <p className="font-medium">{strategy.entryFilters.rsiMax}</p>
                )}
              </div>
            </div>
            
            {/* EMAs */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">〰️ EMAs (Tendencia)</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rápida</label>
                  {editing ? (
                    <input
                      type="number"
                      value={localConfig.entryFilters.emaFast ?? ''}
                      onChange={(e) => updateFilter('emaFast', Number(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="5"
                      max="30"
                    />
                  ) : (
                    <p className="font-medium">{strategy.entryFilters.emaFast}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Media</label>
                  {editing ? (
                    <input
                      type="number"
                      value={localConfig.entryFilters.emaMedium ?? ''}
                      onChange={(e) => updateFilter('emaMedium', Number(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="30"
                      max="100"
                    />
                  ) : (
                    <p className="font-medium">{strategy.entryFilters.emaMedium}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Lenta</label>
                  {editing ? (
                    <input
                      type="number"
                      value={localConfig.entryFilters.emaSlow ?? ''}
                      onChange={(e) => updateFilter('emaSlow', Number(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="100"
                      max="300"
                    />
                  ) : (
                    <p className="font-medium">{strategy.entryFilters.emaSlow}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Pullback */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 border-b pb-2">🎯 Pullback (ATR)</h4>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Pullback máx (ATR×)</label>
                {editing ? (
                  <input
                    type="number"
                    value={localConfig.entryFilters.pullbackAtr ?? ''}
                    onChange={(e) => updateFilter('pullbackAtr', Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.1"
                    min="0.2"
                    max="1.5"
                  />
                ) : (
                  <p className="font-medium">{strategy.entryFilters.pullbackAtr}x ATR</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Distancia máxima del precio a EMA rápida para entrar
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tab: Rendimiento */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
            <strong>📊 Rendimiento esperado:</strong> estas casillas están vacías a propósito.
            No hay ninguna cifra esperada porque todavía no hay evidencia que la sostenga:
            los primeros resultados reales están en <a href="/backtest" className="underline">Backtesting</a>,
            y son de un solo camino histórico.
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">📈 Métricas de Actividad</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Trades/mes</label>
                {editing ? (
                  <input
                    type="text"
                    value={localConfig.expectedPerformance.tradesPerMonth}
                    onChange={(e) => updatePerformance('tradesPerMonth', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ej: 8-15"
                  />
                ) : (
                  <p className="font-medium">{strategy.expectedPerformance.tradesPerMonth}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Win Rate esperado</label>
                {editing ? (
                  <input
                    type="text"
                    value={localConfig.expectedPerformance.winRate}
                    onChange={(e) => updatePerformance('winRate', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ej: 38-43%"
                  />
                ) : (
                  <p className="font-medium">{strategy.expectedPerformance.winRate}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">R:R esperado</label>
                {editing ? (
                  <input
                    type="text"
                    value={localConfig.expectedPerformance.riskReward}
                    onChange={(e) => updatePerformance('riskReward', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ej: 2.0:1"
                  />
                ) : (
                  <p className="font-medium">{strategy.expectedPerformance.riskReward}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">💰 Métricas de Retorno</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Retorno Anual esperado</label>
                {editing ? (
                  <input
                    type="text"
                    value={localConfig.expectedPerformance.annualReturn}
                    onChange={(e) => updatePerformance('annualReturn', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ej: 50-80%"
                  />
                ) : (
                  <p className="font-medium text-green-600">{strategy.expectedPerformance.annualReturn}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Max Drawdown esperado</label>
                {editing ? (
                  <input
                    type="text"
                    value={localConfig.expectedPerformance.maxDrawdown}
                    onChange={(e) => updatePerformance('maxDrawdown', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ej: -18%"
                  />
                ) : (
                  <p className="font-medium text-red-600">{strategy.expectedPerformance.maxDrawdown}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Assets - siempre visible */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="font-semibold text-gray-700 mb-2">🎯 Assets</h4>
        {editing ? (
          <div>
            <input
              type="text"
              value={localConfig.assets.join(', ')}
              onChange={(e) => setLocalConfig({ 
                ...localConfig, 
                assets: e.target.value.split(',').map(a => a.trim()).filter(a => a)
              })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="BTC, ETH, SOL..."
            />
            <p className="text-xs text-gray-500 mt-1">Separados por coma</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">{strategy.assetDescription}</p>
            <div className="flex flex-wrap gap-2">
              {strategy.assets.map(asset => (
                <span key={asset} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono">
                  {asset}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function IntradayEditor() {
  // v5.1 P0-1: con un experimento en curso los parámetros no se tocan
  const congelado = useTradingStore(state => state.experiment?.active ?? false)
  const intradayConfig = useTradingStore(state => state.intradayConfig)
  const updateIntradayConfig = useTradingStore(state => state.updateIntradayConfig)
  const [editing, setEditing] = useState(false)
  const [localConfig, setLocalConfig] = useState(intradayConfig)
  useEffect(() => { setLocalConfig(intradayConfig) }, [intradayConfig])
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  
  const syncToRedis = async (config: typeof intradayConfig) => {
    try {
      const response = await fetch('/api/intraday-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      return response.ok
    } catch (e) {
      console.error('Error saving to Redis:', e)
      return false
    }
  }
  
  // Quick toggle Paper/Live
  const handleModeToggle = async () => {
    const newMode = intradayConfig.mode === 'paper' ? 'live' : 'paper'
    const newConfig = { ...intradayConfig, mode: newMode as 'paper' | 'live' }
    
    if (newMode === 'live') {
      const confirm = window.confirm(
        `⚠️ ¿Activar modo LIVE para Intraday VWAP?\n\nEsto ejecutará órdenes REALES con dinero REAL.`
      )
      if (!confirm) return
    }
    
    setSyncing(true)
    updateIntradayConfig({ mode: newMode as 'paper' | 'live' })
    const success = await syncToRedis(newConfig)
    setSyncStatus(success ? 'success' : 'error')
    setTimeout(() => setSyncStatus('idle'), 3000)
    setSyncing(false)
  }
  
  // Quick toggle Enabled
  const handleEnabledToggle = async () => {
    const newEnabled = !intradayConfig.enabled
    const newConfig = { ...intradayConfig, enabled: newEnabled }
    
    setSyncing(true)
    updateIntradayConfig({ enabled: newEnabled })
    const success = await syncToRedis(newConfig)
    setSyncStatus(success ? 'success' : 'error')
    setTimeout(() => setSyncStatus('idle'), 3000)
    setSyncing(false)
  }
  
  const handleSave = async () => {
    updateIntradayConfig(localConfig)
    setSyncing(true)
    const success = await syncToRedis(localConfig)
    setSyncStatus(success ? 'success' : 'error')
    setTimeout(() => setSyncStatus('idle'), 3000)
    setSyncing(false)
    setEditing(false)
  }
  
  const handleCancel = () => {
    setLocalConfig(intradayConfig)
    setEditing(false)
  }
  
  return (
    <div className={clsx(
      'card border-2',
      !intradayConfig.enabled && 'opacity-60',
      intradayConfig.mode === 'live' ? 'border-red-300' : 'border-purple-200'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚡</span>
          <div>
            <h3 className="text-xl font-bold">VWAP Reversion (Intraday)</h3>
            <p className="text-sm text-gray-500">
              v2.1 • Mean-reversion tras fake breaks del rango asiático
              {syncStatus === 'success' && <span className="ml-2 text-green-600">✅ Sincronizado</span>}
              {syncStatus === 'error' && <span className="ml-2 text-red-600">❌ Error</span>}
            </p>
          </div>
        </div>
        
        {/* Quick Controls */}
        <div className="flex items-center gap-3">
          {/* Toggle Enabled */}
          <button
            onClick={handleEnabledToggle}
            disabled={syncing}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              intradayConfig.enabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            {intradayConfig.enabled ? '✅ Activa' : '⏸️ Pausada'}
          </button>
          
          {/* Toggle Paper/Live */}
          <button
            onClick={handleModeToggle}
            disabled={syncing}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              intradayConfig.mode === 'live'
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            )}
          >
            {intradayConfig.mode === 'live' ? '🔴 LIVE' : '📝 PAPER'}
          </button>
          
          {/* Edit Button */}
          {editing ? (
            <div className="flex gap-2">
              <button 
                onClick={handleSave}
                disabled={syncing}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {syncing ? '⏳' : '💾'} Guardar
              </button>
              <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} disabled={congelado} title={congelado ? "Parámetros congelados por un experimento en curso" : undefined} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
              {congelado ? "🔒 Congelado" : "✏️ Editar"}
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Capital y Riesgo */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">💰 Capital y Riesgo</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Capital</label>
              {editing ? (
                <input
                  type="number"
                  value={localConfig.capital ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, capital: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">${(intradayConfig.capital ?? 0).toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Riesgo/Trade</label>
              {editing ? (
                <input
                  type="number"
                  step="0.001"
                  value={localConfig.riskPerTrade ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, riskPerTrade: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{((intradayConfig.riskPerTrade ?? 0) * 100).toFixed(1)}%</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Max Posiciones</label>
              {editing ? (
                <input
                  type="number"
                  value={localConfig.maxPositions ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, maxPositions: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{intradayConfig.maxPositions}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Límites Diarios */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">🛡️ Límites Diarios</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Max Pérdida Diaria</label>
              {editing ? (
                <input
                  type="number"
                  step="0.001"
                  value={localConfig.maxDailyLoss ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, maxDailyLoss: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono text-red-600">-{((intradayConfig.maxDailyLoss ?? 0) * 100).toFixed(1)}%</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Target Diario</label>
              {editing ? (
                <input
                  type="number"
                  step="0.001"
                  value={localConfig.maxDailyProfit ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, maxDailyProfit: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono text-green-600">+{((intradayConfig.maxDailyProfit ?? 0) * 100).toFixed(1)}%</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Stops */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">🎯 SL / TP</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">SL (× ATR)</label>
              {editing ? (
                <input
                  type="number"
                  step="0.1"
                  value={localConfig.slAtrMult ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, slAtrMult: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{intradayConfig.slAtrMult}×</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">TP (× ATR)</label>
              {editing ? (
                <input
                  type="number"
                  step="0.1"
                  value={localConfig.tpAtrMult ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, tpAtrMult: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{intradayConfig.tpAtrMult ?? '—'}×</p>
              )}
            </div>
            <div className="pt-2">
              <span className="text-xs text-gray-400">
                R:R = {((intradayConfig.tpAtrMult ?? 0) / (intradayConfig.slAtrMult ?? 0)).toFixed(1)}:1
              </span>
            </div>
          </div>
        </div>
        
        {/* Horarios */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">⏰ Horarios (UTC)</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Fin Rango Asiático</label>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={localConfig.asiaEndHour ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, asiaEndHour: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{intradayConfig.asiaEndHour}:00 UTC</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Cierre Trading</label>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={localConfig.tradingEndHour ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, tradingEndHour: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{intradayConfig.tradingEndHour}:00 UTC</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Scan Interval */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">🔄 Escaneo</h4>
          <div>
            <label className="text-sm text-gray-500">Intervalo (segundos)</label>
            {editing ? (
              <input
                type="number"
                step="60"
                value={localConfig.scanInterval ?? ''}
                onChange={(e) => setLocalConfig({...localConfig, scanInterval: Number(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            ) : (
              <p className="font-mono">{intradayConfig.scanInterval}s ({(intradayConfig.scanInterval ?? 0) / 60} min)</p>
            )}
          </div>
        </div>
        
        {/* Activos */}
        <div className="lg:col-span-1">
          <h4 className="font-medium text-gray-700 mb-3">📊 Activos</h4>
          {editing ? (
            <div>
              <input
                type="text"
                value={localConfig.assets.join(', ')}
                onChange={(e) => setLocalConfig({
                  ...localConfig, 
                  assets: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                })}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Separados por coma (ej: BTC-USD, ETH-USD)</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {intradayConfig.assets.map(asset => (
                <span key={asset} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-mono">
                  {asset}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Info */}
      <div className="mt-6 p-4 bg-purple-50 rounded-lg">
        <p className="text-sm text-purple-700">
          <strong>💡 Filosofía:</strong> Mean-reversion alrededor de VWAP. Cobrar y fuera, sin trailing.
          El worker opera de {intradayConfig.asiaEndHour}:00 a {intradayConfig.tradingEndHour}:00 UTC. Sin fin de semana.
        </p>
      </div>
    </div>
  )
}

function Intraday1PctEditor() {
  // v5.1 P0-1: con un experimento en curso los parámetros no se tocan
  const congelado = useTradingStore(state => state.experiment?.active ?? false)
  const config = useTradingStore(state => state.intraday1PctConfig)
  const updateConfig = useTradingStore(state => state.updateIntraday1PctConfig)
  const [editing, setEditing] = useState(false)
  const [localConfig, setLocalConfig] = useState(config)
  useEffect(() => { setLocalConfig(config) }, [config])
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  
  const syncToRedis = async (cfg: typeof config) => {
    try {
      const response = await fetch('/api/intraday1pct-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      })
      return response.ok
    } catch (e) {
      console.error('Error saving to Redis:', e)
      return false
    }
  }
  
  const handleModeToggle = async () => {
    const newMode: 'live' | 'paper' = config.mode === 'paper' ? 'live' : 'paper'
    const newConfig = { ...config, mode: newMode }
    
    if (newMode === 'live') {
      const confirm = window.confirm(
        `⚠️ ¿Activar modo LIVE para Estrategia 1%?\n\nEsto ejecutará órdenes REALES con dinero REAL.`
      )
      if (!confirm) return
    }
    
    setSyncing(true)
    updateConfig({ mode: newMode })
    const success = await syncToRedis(newConfig)
    setSyncStatus(success ? 'success' : 'error')
    setTimeout(() => setSyncStatus('idle'), 3000)
    setSyncing(false)
  }
  
  const handleEnabledToggle = async () => {
    const newEnabled = !config.enabled
    const newConfig = { ...config, enabled: newEnabled }
    
    setSyncing(true)
    updateConfig({ enabled: newEnabled })
    const success = await syncToRedis(newConfig)
    setSyncStatus(success ? 'success' : 'error')
    setTimeout(() => setSyncStatus('idle'), 3000)
    setSyncing(false)
  }
  
  const handleSave = async () => {
    updateConfig(localConfig)
    setSyncing(true)
    const success = await syncToRedis(localConfig)
    setSyncStatus(success ? 'success' : 'error')
    setTimeout(() => setSyncStatus('idle'), 3000)
    setSyncing(false)
    setEditing(false)
  }
  
  const handleCancel = () => {
    setLocalConfig(config)
    setEditing(false)
  }
  
  return (
    <div className={clsx(
      'card border-2',
      !config.enabled && 'opacity-60',
      config.mode === 'live' ? 'border-red-300' : 'border-yellow-200'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💯</span>
          <div>
            <h3 className="text-xl font-bold">Estrategia 1% (Intraday)</h3>
            <p className="text-sm text-gray-500">
              v1.0 • Spot momentum con filtros estrictos de liquidez
              {syncStatus === 'success' && <span className="ml-2 text-green-600">✅ Sincronizado</span>}
              {syncStatus === 'error' && <span className="ml-2 text-red-600">❌ Error</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleEnabledToggle}
            disabled={syncing}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              config.enabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            {config.enabled ? '✅ Activa' : '⏸️ Pausada'}
          </button>
          
          <button
            onClick={handleModeToggle}
            disabled={syncing}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              config.mode === 'live'
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            )}
          >
            {config.mode === 'live' ? '🔴 LIVE' : '📝 PAPER'}
          </button>
          
          {editing ? (
            <div className="flex gap-2">
              <button 
                onClick={handleSave}
                disabled={syncing}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {syncing ? '⏳' : '💾'} Guardar
              </button>
              <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} disabled={congelado} title={congelado ? "Parámetros congelados por un experimento en curso" : undefined} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
              {congelado ? "🔒 Congelado" : "✏️ Editar"}
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Capital y Riesgo */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">💰 Capital y Riesgo</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Capital</label>
              {editing ? (
                <input
                  type="number"
                  value={localConfig.capital ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, capital: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">${(config.capital ?? 0).toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Riesgo/Trade</label>
              {editing ? (
                <input
                  type="number"
                  step="0.001"
                  value={localConfig.riskPerTrade ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, riskPerTrade: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{((config.riskPerTrade ?? 0) * 100).toFixed(1)}%</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Max Posiciones</label>
              {editing ? (
                <input
                  type="number"
                  value={localConfig.maxPositions ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, maxPositions: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{config.maxPositions}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* TP/SL */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">🎯 Objetivos</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Take Profit</label>
              {editing ? (
                <input
                  type="number"
                  step="0.001"
                  value={localConfig.tpPercent ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, tpPercent: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono text-green-600">+{((config.tpPercent ?? 0) * 100).toFixed(1)}%</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Stop Loss</label>
              {editing ? (
                <input
                  type="number"
                  step="0.001"
                  value={localConfig.slPercent ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, slPercent: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono text-red-600">-{((config.slPercent ?? 0) * 100).toFixed(1)}%</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Break-Even a</label>
              {editing ? (
                <input
                  type="number"
                  step="0.001"
                  value={localConfig.bePercent ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, bePercent: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">+{((config.bePercent ?? 0) * 100).toFixed(1)}%</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Filtros de Liquidez */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">💧 Filtros Liquidez</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Min Market Cap</label>
              {editing ? (
                <input
                  type="number"
                  value={localConfig.minMarketCap ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, minMarketCap: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">${((config.minMarketCap ?? 0) / 1e6).toFixed(0)}M</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Min Vol 24h</label>
              {editing ? (
                <input
                  type="number"
                  value={localConfig.minVolume24h ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, minVolume24h: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">${((config.minVolume24h ?? 0) / 1e6).toFixed(0)}M</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Min Vol/MC</label>
              {editing ? (
                <input
                  type="number"
                  step="0.01"
                  value={localConfig.minVolMcRatio ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, minVolMcRatio: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{config.minVolMcRatio}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Filtros Técnicos */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">📊 Filtros Técnicos</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Min ADX</label>
              {editing ? (
                <input
                  type="number"
                  value={localConfig.minAdx ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, minAdx: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{config.minAdx}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">BTC Min ADX</label>
              {editing ? (
                <input
                  type="number"
                  value={localConfig.btcMinAdx ?? ''}
                  onChange={(e) => setLocalConfig({...localConfig, btcMinAdx: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="font-mono">{config.btcMinAdx}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">RSI (min-max)</label>
              {editing ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={localConfig.rsiMin ?? ''}
                    onChange={(e) => setLocalConfig({...localConfig, rsiMin: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    value={localConfig.rsiMax ?? ''}
                    onChange={(e) => setLocalConfig({...localConfig, rsiMax: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              ) : (
                <p className="font-mono">{config.rsiMin} - {config.rsiMax}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Daily Limits */}
      <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-sm text-gray-500">Max Pérdida Diaria</label>
          {editing ? (
            <input
              type="number"
              step="0.001"
              value={localConfig.maxDailyLoss ?? ''}
              onChange={(e) => setLocalConfig({...localConfig, maxDailyLoss: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          ) : (
            <p className="font-mono text-red-600">-{((config.maxDailyLoss ?? 0) * 100).toFixed(1)}%</p>
          )}
        </div>
        <div>
          <label className="text-sm text-gray-500">Target Diario</label>
          {editing ? (
            <input
              type="number"
              step="0.001"
              value={localConfig.maxDailyProfit ?? ''}
              onChange={(e) => setLocalConfig({...localConfig, maxDailyProfit: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          ) : (
            <p className="font-mono text-green-600">+{((config.maxDailyProfit ?? 0) * 100).toFixed(1)}%</p>
          )}
        </div>
        <div>
          <label className="text-sm text-gray-500">Scan Interval</label>
          {editing ? (
            <input
              type="number"
              value={localConfig.scanInterval ?? ''}
              onChange={(e) => setLocalConfig({...localConfig, scanInterval: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          ) : (
            <p className="font-mono">{config.scanInterval}s</p>
          )}
        </div>
        <div>
          <label className="text-sm text-gray-500">R:R Ratio</label>
          <p className="font-mono text-blue-600">{((config.tpPercent ?? 0) / (config.slPercent ?? 0)).toFixed(1)}:1</p>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <p className="text-sm text-yellow-700">
          <strong>💡 Filosofía:</strong> El 1% diario viene de NO PERDER -1% nunca.
          Selección diaria de 10 activos por liquidez y momentum. Max 5 posiciones/día.
          No opera en fin de semana. Horario: 08:00-20:00 UTC.
        </p>
      </div>
    </div>
  )
}

export default function ConfigPage() {
  const experiment = useTradingStore(state => state.experiment)
  const { worker } = useRealTradingData(0) // Carga de Redis al iniciar, sin auto-refresh
  const strategies = useTradingStore(state => state.strategies)
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">⚙️ Configuración de Estrategias</h1>
        {/* El subtítulo decía "Edita todos los parámetros... los cambios se
            sincronizan automáticamente con el bot", justo encima del aviso de que
            están congelados. Desde fuera, una página que se contradice consigo
            misma es indistinguible de una que no ha congelado nada. */}
        <p className="text-gray-500 mt-1">
          {experiment?.active
            ? 'Parámetros de cada estrategia, en solo lectura mientras dure el experimento.'
            : 'Parámetros de cada estrategia. Los cambios se guardan en Redis y el bot los aplica en el próximo ciclo.'}
        </p>
      </div>
      
      {experiment?.active ? (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
          <p className="text-amber-900 font-semibold mb-1">
            🔒 Parámetros congelados — experimento «{experiment.name}» en curso
          </p>
          <p className="text-sm text-amber-800">
            Desde {new Date(experiment.started_at).toLocaleString('es-ES')}. Ningún cambio de parámetro
            puede llegar al worker mientras dure: editarlos invalidaría la evidencia que este experimento
            está produciendo. Para cambiar una regla hay que crear una especificación nueva y activarla
            de forma explícita.
          </p>
          {worker?.commit && (
            <p className="text-xs text-amber-700 mt-2 font-mono">
              workers ejecutando el commit {worker.commit}
              {worker.spec_ids && Object.keys(worker.spec_ids).length > 0 &&
                ` · specs ${Object.entries(worker.spec_ids).map(([k, v]) => `${k}=${v}`).join(' ')}`}
            </p>
          )}
          <p className="text-xs text-amber-700 mt-1">
            Qué regla se aplicó a una decisión depende de dos cosas: la spec (los parámetros) y el
            commit (el código que los interpreta). Sin las dos, un resultado no es reproducible.
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <span className="text-green-800">
            ✅ <strong>Sincronización automática:</strong> Los cambios guardados aquí se envían a Redis
            y el bot los aplica en el próximo scan (máx 5 minutos).
          </span>
        </div>
      )}
      
      {/* Con el experimento en curso, invitar a "ajustar ADX, RSI y EMAs" justo
          debajo del aviso de congelado es contradictorio: esos campos no se
          pueden guardar (el API devuelve 423). */}
      {!experiment?.active && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <span className="text-blue-800">
            💡 <strong>Tip:</strong> Usa la pestaña <strong>Filtros de Entrada</strong> para ajustar ADX, RSI y EMAs.
            Valores más bajos = más trades (agresivo). Valores más altos = menos trades (conservador).
          </span>
        </div>
      )}
      
      {/* Estrategias Intraday */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">⚡ Estrategias Intraday</h2>
        <div className="space-y-6">
          <IntradayEditor />
          <Intraday1PctEditor />
        </div>
      </div>
      
      {/* Estrategias Swing */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Estrategias Swing</h2>
        <div className="space-y-6">
          {strategies.filter(s => s.key !== "vwap_reversion" && s.key !== "one_percent_spot").map(strategy => (
            <StrategyEditor key={strategy.key} strategy={strategy} />
          ))}
        </div>
      </div>
    </div>
  )
}
