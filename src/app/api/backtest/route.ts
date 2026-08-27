import { NextResponse } from 'next/server'
import Redis from 'ioredis'

// Datos en vivo desde Redis: Next 14 cachea por defecto los route handlers GET,
// así que sin esto la ruta se sirve como un snapshot congelado del build.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Resultados escritos por scripts/backtest.py, que replaya core/domain.py — el
// mismo código que ejecuta el worker— sobre velas históricas reales.
export async function GET() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return NextResponse.json({ success: false, error: 'REDIS_URL no configurada' }, { status: 500 })
  }

  let redis: Redis | null = null
  try {
    redis = new Redis(redisUrl)
    const keys = await redis.keys('eleve:backtest:*')
    const resultados = []

    for (const key of keys.sort()) {
      const raw = await redis.get(key)
      if (!raw) continue
      try {
        resultados.push(JSON.parse(raw))
      } catch (e) {
        console.error(`[api/backtest] ${key} no es JSON válido:`, e)
      }
    }

    // Qué spec está activa ahora, para poder avisar si el backtest se hizo con otra
    const activas: Record<string, string> = {}
    for (const k of await redis.keys('eleve:spec:active:*')) {
      const v = await redis.get(k)
      if (v) activas[k.split(':').pop() as string] = v
    }

    await redis.quit()
    return NextResponse.json({ success: true, resultados, specsActivas: activas })
  } catch (error) {
    if (redis) { try { await redis.quit() } catch {} }
    console.error('[api/backtest] error leyendo resultados:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 })
  }
}
