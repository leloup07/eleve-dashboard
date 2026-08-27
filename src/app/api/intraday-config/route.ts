import { NextResponse } from 'next/server'
import Redis from 'ioredis'

// Datos en vivo desde Redis: Next 14 cachea por defecto los route handlers GET,
// asi que sin esto la ruta se sirve como un snapshot congelado del momento del build.
export const dynamic = 'force-dynamic'
export const revalidate = 0


const REDIS_KEY = 'eleve:intraday:config'

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('REDIS_URL no configurada')
  }
  return new Redis(redisUrl)
}

// GET: Leer configuración actual de Redis
export async function GET() {
  let redis: Redis | null = null
  
  try {
    redis = getRedisClient()
    const raw = await redis.get(REDIS_KEY)
    await redis.quit()
    
    if (raw) {
      return NextResponse.json({
        success: true,
        data: JSON.parse(raw)
      })
    }
    
    return NextResponse.json({
      success: true,
      data: null
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

// POST: Guardar configuración en Redis
export async function POST(request: Request) {
  let redis: Redis | null = null
  
  try {
    const config = await request.json()
    
    redis = getRedisClient()
    await redis.set(REDIS_KEY, JSON.stringify(config))
    await redis.quit()
    
    return NextResponse.json({
      success: true,
      message: 'Configuración guardada en Redis'
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
