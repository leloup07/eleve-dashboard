/**
 * ELEVE v4.3 - API Route para sincronización de configuración
 * ARREGLADO: Usa ioredis (igual que workers) en lugar de Upstash
 */

import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('REDIS_URL no configurada')
  }
  return new Redis(redisUrl)
}

const REDIS_KEYS = {
  strategies: 'eleve:config:strategies',
  intraday: 'eleve:intraday:config',
  intraday1pct: 'eleve:intraday1pct:config',
  irg: 'eleve:irg:config'
}

export async function GET(request: NextRequest) {
  let redis: Redis | null = null
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    redis = getRedisClient()
    
    if (type === 'strategies') {
      const config = await redis.get(REDIS_KEYS.strategies)
      await redis.quit()
      return NextResponse.json({ success: true, data: config ? JSON.parse(config) : {} })
    }
    if (type === 'intraday') {
      const config = await redis.get(REDIS_KEYS.intraday)
      await redis.quit()
      return NextResponse.json({ success: true, data: config ? JSON.parse(config) : {} })
    }
    if (type === 'intraday1pct') {
      const config = await redis.get(REDIS_KEYS.intraday1pct)
      await redis.quit()
      return NextResponse.json({ success: true, data: config ? JSON.parse(config) : {} })
    }
    if (type === 'irg') {
      const config = await redis.get(REDIS_KEYS.irg)
      await redis.quit()
      return NextResponse.json({ success: true, data: config ? JSON.parse(config) : {} })
    }
    
    const [strategies, intraday, intraday1pct, irg] = await Promise.all([
      redis.get(REDIS_KEYS.strategies),
      redis.get(REDIS_KEYS.intraday),
      redis.get(REDIS_KEYS.intraday1pct),
      redis.get(REDIS_KEYS.irg),
    ])
    await redis.quit()
    
    return NextResponse.json({
      success: true,
      data: {
        strategies: strategies ? JSON.parse(strategies) : {},
        intraday: intraday ? JSON.parse(intraday) : {},
        intraday1pct: intraday1pct ? JSON.parse(intraday1pct) : {},
        irg: irg ? JSON.parse(irg) : {},
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    if (redis) { try { await redis.quit() } catch {} }
    return NextResponse.json({ error: 'Failed to fetch config', details: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let redis: Redis | null = null
  try {
    const body = await request.json()
    const { type, key, config, fullConfig } = body
    redis = getRedisClient()
    
    if (type === 'strategy' && key && config) {
      const raw = await redis.get(REDIS_KEYS.strategies)
      let current: Record<string, unknown> = {}
      if (raw) { try { current = JSON.parse(raw) } catch {} }
      current[key] = { ...(current[key] as Record<string, unknown> || {}), ...config, lastUpdated: new Date().toISOString() }
      await redis.set(REDIS_KEYS.strategies, JSON.stringify(current))
      await redis.quit()
      return NextResponse.json({ success: true, message: `Strategy ${key} updated` })
    }
    
    if (type === 'intraday' && config) {
      const raw = await redis.get(REDIS_KEYS.intraday)
      let current: Record<string, unknown> = {}
      if (raw) { try { current = JSON.parse(raw) } catch {} }
      await redis.set(REDIS_KEYS.intraday, JSON.stringify({ ...current, ...config, lastUpdated: new Date().toISOString() }))
      await redis.quit()
      return NextResponse.json({ success: true, message: 'Intraday config updated' })
    }
    
    if (type === 'intraday1pct' && config) {
      const raw = await redis.get(REDIS_KEYS.intraday1pct)
      let current: Record<string, unknown> = {}
      if (raw) { try { current = JSON.parse(raw) } catch {} }
      await redis.set(REDIS_KEYS.intraday1pct, JSON.stringify({ ...current, ...config, lastUpdated: new Date().toISOString() }))
      await redis.quit()
      return NextResponse.json({ success: true, message: 'Intraday 1% config updated' })
    }
    
    if (type === 'irg' && config) {
      await redis.set(REDIS_KEYS.irg, JSON.stringify({ ...config, lastUpdated: new Date().toISOString() }))
      await redis.quit()
      return NextResponse.json({ success: true, message: 'IRG config updated' })
    }
    
    if (fullConfig) {
      if (fullConfig.strategies) await redis.set(REDIS_KEYS.strategies, JSON.stringify(fullConfig.strategies))
      if (fullConfig.intraday) await redis.set(REDIS_KEYS.intraday, JSON.stringify(fullConfig.intraday))
      if (fullConfig.intraday1pct) await redis.set(REDIS_KEYS.intraday1pct, JSON.stringify(fullConfig.intraday1pct))
      if (fullConfig.irg) await redis.set(REDIS_KEYS.irg, JSON.stringify(fullConfig.irg))
      await redis.quit()
      return NextResponse.json({ success: true, message: 'Full config updated' })
    }
    
    await redis.quit()
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    if (redis) { try { await redis.quit() } catch {} }
    return NextResponse.json({ error: 'Failed to update config', details: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  let redis: Redis | null = null
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    redis = getRedisClient()
    
    if (type === 'strategies') await redis.del(REDIS_KEYS.strategies)
    else if (type === 'intraday') await redis.del(REDIS_KEYS.intraday)
    else if (type === 'intraday1pct') await redis.del(REDIS_KEYS.intraday1pct)
    else if (type === 'irg') await redis.del(REDIS_KEYS.irg)
    else await Promise.all([redis.del(REDIS_KEYS.strategies), redis.del(REDIS_KEYS.intraday), redis.del(REDIS_KEYS.intraday1pct), redis.del(REDIS_KEYS.irg)])
    
    await redis.quit()
    return NextResponse.json({ success: true, message: `Config ${type || 'all'} reset` })
  } catch (error) {
    if (redis) { try { await redis.quit() } catch {} }
    return NextResponse.json({ error: 'Failed to delete config', details: String(error) }, { status: 500 })
  }
}
