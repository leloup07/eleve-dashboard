import { NextResponse } from 'next/server'
import Redis from 'ioredis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Diario de decisiones (v5.1 · P0-6). Lo que el sistema evaluó cada día y por
// qué no operó, que es lo que pasa la mayoría de los días.
export async function GET() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return NextResponse.json({ success: false, error: 'REDIS_URL no configurada' }, { status: 500 })
  }

  let redis: Redis | null = null
  try {
    redis = new Redis(redisUrl)
    const fechas = ((await redis.smembers('eleve:journal:fechas')) || []).sort().slice(-30)

    const dias = []
    for (const fecha of fechas.reverse()) {
      const bruto = await redis.hgetall(`eleve:journal:${fecha}`)
      if (!bruto || !Object.keys(bruto).length) continue

      // El hash es plano: "crypto_swing:motivo:RSI fuera de banda" -> "96"
      const porEstrategia: Record<string, any> = {}
      for (const [clave, valor] of Object.entries(bruto)) {
        const n = parseInt(valor as string, 10)
        if (isNaN(n) || !clave.includes(':')) continue
        const [estrategia, ...resto] = clave.split(':')
        const campo = resto.join(':')
        const d = (porEstrategia[estrategia] ||= {
          evaluaciones: 0, senales: 0, abiertas: 0, cerradas: 0,
          regimen_bloqueado: 0, motivos: {} as Record<string, number>,
        })
        if (campo.startsWith('motivo:')) d.motivos[campo.slice('motivo:'.length)] = n
        else if (campo in d) d[campo] = n
      }
      dias.push({ fecha, porEstrategia })
    }

    await redis.quit()
    return NextResponse.json({ success: true, dias })
  } catch (error) {
    if (redis) { try { await redis.quit() } catch {} }
    console.error('[api/journal] error leyendo el diario:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 })
  }
}
