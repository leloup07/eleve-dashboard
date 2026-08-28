'use client'

import { useEffect, useState } from 'react'

/**
 * Si el cliente ya ha montado (v5.1).
 *
 * El store persiste intradayConfig e intraday1PctConfig en localStorage, así que
 * el PRIMER render del cliente no parte del mismo estado que el del servidor:
 * el servidor renderiza con los valores iniciales y el cliente rehidrata desde
 * localStorage antes de pintar. Si algún texto sale de esos valores, los dos
 * árboles difieren y React aborta la hidratación (errores #418/#423/#425) y
 * vuelve a renderizar toda la raíz en cliente.
 *
 * Eso es justo lo que pasó: al dejar los parámetros iniciales en null (P0-7),
 * el servidor pintaba «$0» donde el cliente pintaba «$15K» desde localStorage.
 * Antes coincidían por casualidad, porque los valores escritos a mano
 * resultaban ser los mismos que estaban guardados.
 *
 * Todo lo que dependa del estado PERSISTIDO debe esperar a que esto sea true.
 */
export function useHidratado() {
  const [hidratado, setHidratado] = useState(false)
  useEffect(() => setHidratado(true), [])
  return hidratado
}
