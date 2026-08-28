import { NextResponse } from 'next/server'
import Redis from 'ioredis'

// Datos en vivo desde Redis: sin esto Next 14 sirve un snapshot del build.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Riesgo de cartera publicado por el worker (v5.1 · P0-4). El calor es
// cross-estrategia por definición: ninguna estrategia puede verlo por sí sola.
export async function GET() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return NextResponse.json({ success: false, error: 'REDIS_URL no configurada' }, { status: 500 })
  }

  let redis: Redis | null = null
  try {
    redis = new Redis(redisUrl)
    const [calorRaw, rechazosRaw] = await Promise.all([
      redis.get('eleve:riesgo:calor'),
      redis.lrange('eleve:riesgo:rechazos', 0, 49),
    ])
    await redis.quit()

    let calor = null
    try {
      calor = calorRaw ? JSON.parse(calorRaw) : null
    } catch (e) {
      console.error('[api/riesgo] eleve:riesgo:calor no es JSON válido:', e)
    }

    const rechazos = []
    for (const linea of rechazosRaw || []) {
      try {
        rechazos.push(JSON.parse(linea))
      } catch (e) {
        console.error('[api/riesgo] rechazo ilegible:', e)
      }
    }

    return NextResponse.json({ success: true, calor, rechazos })
  } catch (error) {
    if (redis) { try { await redis.quit() } catch {} }
    console.error('[api/riesgo] error leyendo el riesgo de cartera:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 })
  }
}
