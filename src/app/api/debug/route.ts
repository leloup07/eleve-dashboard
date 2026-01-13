import { NextResponse } from 'next/server'
import Redis from 'ioredis'

// Endpoint de debug para ver el contenido crudo de Redis
export async function GET() {
  let redis: Redis | null = null
  
  try {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error('REDIS_URL no configurada')
    }
    
    redis = new Redis(redisUrl)
    
    // Obtener todas las keys
    const allKeys = await redis.keys('*')
    
    // Obtener el valor de cada key
    const data: Record<string, any> = {}
    
    for (const key of allKeys) {
      const keyStr = key.toString()
      const type = await redis.type(keyStr)
      
      try {
        if (type === 'string') {
          const value = await redis.get(keyStr)
          // Intentar parsear JSON
          try {
            data[keyStr] = { type, value: JSON.parse(value || '') }
          } catch {
            data[keyStr] = { type, value }
          }
        } else if (type === 'hash') {
          const value = await redis.hgetall(keyStr)
          // Intentar parsear cada valor como JSON
          const parsed: Record<string, any> = {}
          for (const [k, v] of Object.entries(value)) {
            try {
              parsed[k] = JSON.parse(v)
            } catch {
              parsed[k] = v
            }
          }
          data[keyStr] = { type, value: parsed, count: Object.keys(value).length }
        } else if (type === 'list') {
          const value = await redis.lrange(keyStr, 0, -1)
          const parsed = value.map(v => {
            try {
              return JSON.parse(v)
            } catch {
              return v
            }
          })
          data[keyStr] = { type, value: parsed, count: value.length }
        } else if (type === 'set') {
          const value = await redis.smembers(keyStr)
          data[keyStr] = { type, value, count: value.length }
        } else if (type === 'zset') {
          const value = await redis.zrange(keyStr, 0, -1, 'WITHSCORES')
          data[keyStr] = { type, value, count: value.length / 2 }
        } else {
          data[keyStr] = { type, value: 'unsupported type' }
        }
      } catch (err) {
        data[keyStr] = { type, error: String(err) }
      }
    }
    
    await redis.quit()
    
    return NextResponse.json({
      success: true,
      keysCount: allKeys.length,
      data
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
