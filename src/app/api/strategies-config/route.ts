import { NextResponse } from 'next/server'
import Redis from 'ioredis'

// Datos en vivo desde Redis: Next 14 cachea por defecto los route handlers GET,
// asi que sin esto la ruta se sirve como un snapshot congelado del momento del build.
export const dynamic = 'force-dynamic'
export const revalidate = 0


const REDIS_KEY = 'eleve:config:strategies'

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('REDIS_URL no configurada')
  }
  return new Redis(redisUrl)
}

// GET: Leer configuración de estrategias desde Redis
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

// POST: Guardar configuración de una estrategia en Redis
export async function POST(request: Request) {
  let redis: Redis | null = null
  
  try {
    const { key, config } = await request.json()
    
    if (!key || !config) {
      return NextResponse.json({
        success: false,
        error: 'Missing key or config'
      }, { status: 400 })
    }
    
    redis = getRedisClient()
    
    // Leer config existente
    const raw = await redis.get(REDIS_KEY)
    let allConfigs: Record<string, any> = {}
    if (raw) {
      try {
        allConfigs = JSON.parse(raw)
      } catch {}
    }
    
    // Actualizar la estrategia específica SIN destruir lo que no venga en el
    // formulario: antes esto reemplazaba el objeto entero, así que guardar una
    // ficha podía borrar campos que el worker sí lee (entryFilters, stops...).
    allConfigs[key] = {
      ...(allConfigs[key] as Record<string, unknown> || {}),
      ...config,
      updatedAt: new Date().toISOString()
    }
    
    // Guardar
    await redis.set(REDIS_KEY, JSON.stringify(allConfigs))
    await redis.quit()
    
    return NextResponse.json({
      success: true,
      message: `Configuración de ${key} guardada en Redis`
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
