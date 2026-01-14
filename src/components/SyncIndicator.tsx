'use client'

import { useTradingStore } from '@/stores/tradingStore'
import { clsx } from 'clsx'

/**
 * Indicador de sincronización
 * Muestra si los cambios de configuración se sincronizaron con el backend
 */
export function SyncIndicator() {
  const syncStatus = useTradingStore(state => state.syncStatus)
  
  if (syncStatus.isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        Sincronizando...
      </div>
    )
  }
  
  if (syncStatus.syncError) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs cursor-help"
        title={`Error: ${syncStatus.syncError}`}
      >
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Error de sync
      </div>
    )
  }
  
  if (syncStatus.lastSync) {
    const lastSyncDate = new Date(syncStatus.lastSync)
    const timeSinceSync = Date.now() - lastSyncDate.getTime()
    const isRecent = timeSinceSync < 60000 // Menos de 1 minuto
    
    return (
      <div 
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-help',
          isRecent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        )}
        title={`Última sincronización: ${lastSyncDate.toLocaleString('es-ES')}`}
      >
        <span className={clsx(
          'w-2 h-2 rounded-full',
          isRecent ? 'bg-green-500' : 'bg-gray-400'
        )} />
        {isRecent ? 'Sincronizado ✓' : `Sync ${lastSyncDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs">
      <span className="w-2 h-2 rounded-full bg-gray-400" />
      Sin sincronizar
    </div>
  )
}

/**
 * Banner de aviso cuando hay error de sincronización
 */
export function SyncErrorBanner() {
  const syncStatus = useTradingStore(state => state.syncStatus)
  
  if (!syncStatus.syncError) return null
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div>
          <h4 className="font-semibold text-red-700">Error de sincronización</h4>
          <p className="text-sm text-red-600 mt-1">
            Los cambios no se han guardado en el servidor. El bot seguirá usando la configuración anterior.
          </p>
          <p className="text-xs text-red-500 mt-2 font-mono">
            {syncStatus.syncError}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Verifica que UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN estén configurados en Railway.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook para mostrar estado de sync en console (debug)
 */
export function useSyncDebug() {
  const syncStatus = useTradingStore(state => state.syncStatus)
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[SYNC DEBUG]', syncStatus)
  }
  
  return syncStatus
}
