# Incidencias abiertas

## HID-1 · Fallo de hidratación de React en el build de producción

**Estado**: abierto · **Impacto**: solo lectura, no afecta a estado de trading
**Detectado**: 2026-08-28 · **Commit**: 8c785cc

### Síntoma

El build de producción lanza errores de React #418, #423 y #425 (desajuste de
hidratación) al cargar cualquier página. React descarta el HTML del servidor y
vuelve a renderizar la raíz en cliente.

### Consecuencia medida

El árbol se monta de nuevo, así que **los efectos se ejecutan dos veces**. En una
carga limpia de `/riesgo` se observan 7-8 peticiones a `/api/config` en lugar de
las 2-3 que corresponderían a sus tres consumidores (Sidebar, Checkpoint y
useRealTradingData).

Todas son GET. No hay ninguna escritura implicada, así que **no puede alterar
parámetros, posiciones ni specs**: el único coste es tráfico y lecturas de Redis
duplicadas. En reposo no hay bucle: 0 peticiones en una ventana de 10 s.

### Reproducción

```bash
npm run build                      # sin | head: trunca la salida y aborta el build
PORT=3111 REDIS_URL=... npm start
# abrir http://localhost:3111/ y mirar la consola
```

No se reproduce con `next dev`, ni con el mismo build en un origen sin
`localStorage` previo — ahí bajan de 4 a 2 avisos, así que el estado persistido
es una parte de la causa pero no toda. La parte identificada y ya corregida era
la rehidratación del store durante el primer render (resuelta con
`skipHydration`); queda un resto sin atribuir.

### Por qué no se ha cerrado todavía

Cerrarlo exige aislar qué nodo de texto difiere en el build minificado, donde
React no da el detalle. La vía razonable es sembrar el `localStorage` real en un
servidor de desarrollo para que el overlay muestre el diff exacto.

Se mantiene abierto a propósito: es de presentación y de tráfico, no de
correctitud de trading, y no debería bloquear la validación.

### Trabajo adyacente que probablemente lo mitigue

`/api/config` tiene tres consumidores independientes que lo piden por separado al
montar. Unificarlos en un único proveedor reduciría las peticiones aunque el
desajuste siguiera, y es un cambio acotado.
