import { NextResponse } from 'next/server'
import Redis from 'ioredis'

const REDIS_KEY = 'eleve:intraday1pct:config'

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('REDIS_URL no configurada')
  }
  return new Redis(redisUrl)
}

export async function GET() {
  let redis: Redis | null = null
  
  try {
    redis = getRedisClient()
    const raw = await redis.get(REDIS_KEY)
    await redis.quit()
    
    return NextResponse.json({
      success: true,
      data: raw ? JSON.parse(raw) : null
    })
    
  } catch (error) {
    if (redis) {
      try { await redis.quit() } catch {}
    }
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let redis: Redis | null = null
  
  try {
    const config = await request.json()
    
    redis = getRedisClient()
    await redis.set(REDIS_KEY, JSON.stringify(config))
    await redis.quit()
    
    return NextResponse.json({
      success: true,
      message: 'Configuración 1% guardada en Redis'
    })
    
  } catch (error) {
    if (redis) {
      try { await redis.quit() } catch {}
    }
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
