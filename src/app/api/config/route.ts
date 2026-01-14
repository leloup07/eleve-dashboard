/**
 * ELEVE v4.3 - API Route para sincronización de configuración
 * 
 * Este endpoint permite que los cambios en la UI se sincronicen con el backend.
 * El bot Python puede leer esta configuración desde Redis o un archivo JSON.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Inicializar Redis (si está configurado)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

// Clave donde se guarda la configuración
const CONFIG_KEY = 'eleve:config:strategies'
const INTRADAY_CONFIG_KEY = 'eleve:config:intraday'
const IRG_CONFIG_KEY = 'eleve:config:irg'

// GET: Obtener configuración actual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    
    if (!redis) {
      return NextResponse.json(
        { error: 'Redis not configured', message: 'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN' },
        { status: 503 }
      )
    }
    
    if (type === 'strategies') {
      const config = await redis.get(CONFIG_KEY)
      return NextResponse.json({ success: true, data: config || {} })
    }
    
    if (type === 'intraday') {
      const config = await redis.get(INTRADAY_CONFIG_KEY)
      return NextResponse.json({ success: true, data: config || {} })
    }
    
    if (type === 'irg') {
      const config = await redis.get(IRG_CONFIG_KEY)
      return NextResponse.json({ success: true, data: config || {} })
    }
    
    // Obtener todo
    const [strategies, intraday, irg] = await Promise.all([
      redis.get(CONFIG_KEY),
      redis.get(INTRADAY_CONFIG_KEY),
      redis.get(IRG_CONFIG_KEY),
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        strategies: strategies || {},
        intraday: intraday || {},
        irg: irg || {},
      },
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Error fetching config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch config', details: String(error) },
      { status: 500 }
    )
  }
}

// POST: Actualizar configuración
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, key, config, fullConfig } = body
    
    if (!redis) {
      // Si no hay Redis, logueamos y simulamos éxito
      // En producción, podrías guardar en un archivo JSON
      console.log('[CONFIG] No Redis - would save:', { type, key, config })
      return NextResponse.json({ 
        success: true, 
        message: 'Config saved (local only - Redis not configured)',
        warning: 'Changes will not persist to backend without Redis'
      })
    }
    
    // Actualizar estrategia específica
    if (type === 'strategy' && key && config) {
      // Obtener config actual
      const current = await redis.get(CONFIG_KEY) as Record<string, unknown> || {}
      
      // Actualizar la estrategia específica
      current[key] = {
        ...(current[key] as Record<string, unknown> || {}),
        ...config,
        lastUpdated: new Date().toISOString(),
        updatedFrom: 'dashboard'
      }
      
      // Guardar
      await redis.set(CONFIG_KEY, current)
      
      // Publicar evento para que el bot lo detecte
      await redis.publish('eleve:config:updated', JSON.stringify({
        type: 'strategy',
        key,
        timestamp: new Date().toISOString()
      }))
      
      return NextResponse.json({ 
        success: true, 
        message: `Strategy ${key} updated`,
        key,
        timestamp: new Date().toISOString()
      })
    }
    
    // Actualizar configuración intraday
    if (type === 'intraday' && config) {
      const current = await redis.get(INTRADAY_CONFIG_KEY) as Record<string, unknown> || {}
      
      await redis.set(INTRADAY_CONFIG_KEY, {
        ...current,
        ...config,
        lastUpdated: new Date().toISOString(),
        updatedFrom: 'dashboard'
      })
      
      await redis.publish('eleve:config:updated', JSON.stringify({
        type: 'intraday',
        timestamp: new Date().toISOString()
      }))
      
      return NextResponse.json({ 
        success: true, 
        message: 'Intraday config updated',
        timestamp: new Date().toISOString()
      })
    }
    
    // Actualizar configuración IRG (v4.3)
    if (type === 'irg' && config) {
      await redis.set(IRG_CONFIG_KEY, {
        ...config,
        lastUpdated: new Date().toISOString(),
        updatedFrom: 'dashboard'
      })
      
      await redis.publish('eleve:config:updated', JSON.stringify({
        type: 'irg',
        timestamp: new Date().toISOString()
      }))
      
      return NextResponse.json({ 
        success: true, 
        message: 'IRG config updated',
        timestamp: new Date().toISOString()
      })
    }
    
    // Actualizar toda la configuración
    if (fullConfig) {
      if (fullConfig.strategies) {
        await redis.set(CONFIG_KEY, fullConfig.strategies)
      }
      if (fullConfig.intraday) {
        await redis.set(INTRADAY_CONFIG_KEY, fullConfig.intraday)
      }
      if (fullConfig.irg) {
        await redis.set(IRG_CONFIG_KEY, fullConfig.irg)
      }
      
      await redis.publish('eleve:config:updated', JSON.stringify({
        type: 'full',
        timestamp: new Date().toISOString()
      }))
      
      return NextResponse.json({ 
        success: true, 
        message: 'Full config updated',
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid request body', required: 'type, key, config OR fullConfig' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error updating config:', error)
    return NextResponse.json(
      { error: 'Failed to update config', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE: Reset configuración
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    if (!redis) {
      return NextResponse.json(
        { error: 'Redis not configured' },
        { status: 503 }
      )
    }
    
    if (type === 'strategies') {
      await redis.del(CONFIG_KEY)
    } else if (type === 'intraday') {
      await redis.del(INTRADAY_CONFIG_KEY)
    } else if (type === 'irg') {
      await redis.del(IRG_CONFIG_KEY)
    } else {
      // Reset todo
      await Promise.all([
        redis.del(CONFIG_KEY),
        redis.del(INTRADAY_CONFIG_KEY),
        redis.del(IRG_CONFIG_KEY),
      ])
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Config ${type || 'all'} reset`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error deleting config:', error)
    return NextResponse.json(
      { error: 'Failed to delete config', details: String(error) },
      { status: 500 }
    )
  }
}
