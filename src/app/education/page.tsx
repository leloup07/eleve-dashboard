'use client'

import { useState, useMemo } from 'react'

// Contenido educativo indexado para búsqueda
const educationContent = {
  // Indicadores Técnicos
  rsi: {
    title: "RSI (Relative Strength Index)",
    category: "Indicadores",
    content: `RSI mide el momentum del precio en una escala de 0-100.
    
**Interpretación:**
- RSI > 70: Sobrecompra (posible reversión bajista)
- RSI < 30: Sobreventa (posible reversión alcista)
- RSI 40-60: Zona neutral

**Cómo lo usa ELEVE:**
- Crypto Swing: RSI 30-75 para entradas
- VWAP Reversion: RSI 20-80 (más amplio para intraday)
- Crypto Breakout: no usa RSI (entra por ruptura, no por momentum)
- 1% Spot: RSI 40-55 (más restrictivo)

**Fórmula:**
RSI = 100 - (100 / (1 + RS))
RS = Media de ganancias / Media de pérdidas (14 períodos típicamente)`
  },
  
  atr: {
    title: "ATR (Average True Range)",
    category: "Indicadores",
    content: `ATR mide la volatilidad del mercado. Es fundamental para calcular stops dinámicos y position sizing.

**¿Qué es el True Range?**
El True Range de cada vela es el MAYOR de estos tres valores:
1. High actual - Low actual
2. |High actual - Close anterior|
3. |Low actual - Close anterior|

Esto captura gaps entre velas que el rango simple (High-Low) no detecta.

**Cálculo del ATR:**
ATR = Media móvil del True Range (típicamente 14 períodos)

**Ejemplo práctico:**
- BTC precio: $100,000
- ATR(14) diario: $3,000 (3% de volatilidad)
- Stop Loss 2x ATR = $6,000 de distancia
- Entry: $100,000 → SL: $94,000

**¿Por qué usamos ATR para los stops?**
1. **Adaptativo:** En volatilidad alta, stops más amplios; en baja, más ajustados
2. **Objetivo:** No depende de opiniones, es matemático
3. **Evita ruido:** Un stop de 2x ATR filtra el ruido normal del mercado

**ATR en cada estrategia ELEVE:**

| Estrategia | SL (ATR) | TP (ATR) | Por qué |
|------------|----------|----------|---------|
| Crypto Swing | 1.5x ATR(1D) | sin TP | Diario: el ATR horario dejaba stops del 1,1% |
| Crypto Breakout | 1.5x ATR(1D) | sin TP | Misma gestión que Crypto Swing |
| Large Caps | 2.0x ATR(1H) | sin TP | Aguantan 4-5 días sin saltar |
| Small Caps | 2.0x ATR(1H) | sin TP | Momentum, busca extensiones |
| VWAP Reversion | 1.2x | 1.5x | Intraday, movimientos cortos |
| 1% Spot | 0.5x | 1.0x | Scalping, stops muy ajustados |

**Interpretación del ATR:**
- ATR creciente: Volatilidad aumentando (breakouts, noticias)
- ATR decreciente: Volatilidad bajando (consolidación)
- ATR históricamente alto: Mercado nervioso, cuidado
- ATR históricamente bajo: Posible explosión próxima

**Position Sizing con ATR:**
Cantidad = (Capital × Riesgo%) / (ATR × Multiplicador)

Ejemplo:
- Capital: $50,000
- Riesgo: 1% = $500
- ATR: $3,000
- Multiplicador SL: 2x
- Distancia SL: $6,000
- Cantidad = $500 / $6,000 = 0.0833 BTC`
  },

  donchian: {
    title: "Canal de Donchian",
    category: "Indicadores",
    content: `El canal de Donchian es el máximo y el mínimo de las últimas N sesiones. Es el indicador más simple que existe: no promedia ni suaviza nada, solo pregunta "¿el precio de ahora es el más alto de las últimas N velas?".

**Cómo se calcula:**
- Banda superior = máximo de los máximos de las N velas previas
- Banda inferior = mínimo de los mínimos de las N velas previas
- N típico: 20 sesiones (aprox. un mes de mercado)

**Por qué importa que sea "previas":**
En ELEVE la banda superior se calcula SIN incluir la vela actual. Si la incluyeras, el precio nunca podría superar su propio máximo y la señal no existiría. Al excluirla, cuando el precio cruza la línea en el gráfico, eso ES la señal.

**Qué significa una ruptura:**
Un máximo de 20 sesiones quiere decir que nadie que haya comprado en el último mes está en pérdidas. No queda nadie esperando "salir cuando recupere", que es la oferta que frena las subidas. Por eso las rupturas tienden a extenderse.

**Su punto débil:**
Los amagos. El precio asoma la cabeza por encima del máximo, no aparece nadie detrás y vuelve al rango. Por eso ELEVE exige además volumen (ver Volumen relativo).

**Uso en ELEVE:**
- Crypto Breakout: ruptura del máximo de 20 sesiones + volumen ≥ 1,2× su media
- Es el disparador OPUESTO al de Crypto Swing, que compra retrocesos a la EMA20

**Por qué se eligió:**
Medido sobre 6 meses de los seis activos crypto: 138 días con señal de pullback y 23 con señal de ruptura, con CERO coincidencias. Una exige que el precio esté cerca de su media; la otra, que esté en máximos. Son incompatibles por construcción, que es justamente lo que se busca al combinar estrategias: que no compren lo mismo el mismo día.`
  },

  volumen_relativo: {
    title: "Volumen relativo",
    category: "Indicadores",
    content: `El volumen relativo compara el volumen de la vela actual con su propia media reciente. No mide cuánto se negocia en términos absolutos, sino si HOY se negocia más de lo habitual para ese activo.

**Cómo se calcula:**
Volumen relativo = volumen de la vela / media del volumen de las últimas 20 velas

**Interpretación:**
- 1,0×: volumen normal, un día cualquiera
- 1,2× - 1,5×: hay interés por encima de lo habitual
- 2,0× o más: algo está pasando (noticia, ruptura real, capitulación)
- Por debajo de 0,7×: desinterés, movimientos poco fiables

**Por qué es útil junto a la ruptura:**
El precio dice QUÉ pasa; el volumen dice CUÁNTA gente está de acuerdo. Una ruptura con volumen bajo suele ser un amago: el precio supera el máximo porque no había vendedores en ese momento concreto, no porque haya entrado dinero nuevo. Cuando el volumen acompaña, hay convicción detrás.

**Ojo con compararlo entre activos:**
Es relativo a sí mismo a propósito. BTC mueve órdenes de magnitud más que AVAX en términos absolutos, así que el volumen bruto no sirve para comparar. El ratio sí: un 2× es un 2× en los dos.

**Uso en ELEVE:**
- Crypto Breakout: exige ≥ 1,2× para aceptar una ruptura
- Se puede desactivar poniendo volumeMult a 0 en la configuración

**Un apunte:**
El volumen se calculaba y se guardaba en cada operación de ELEVE desde el principio, pero no filtraba nada. Crypto Breakout es la primera estrategia que lo usa para decidir.`
  },

  adx: {
    title: "ADX (Average Directional Index)",
    category: "Indicadores",
    content: `ADX mide la FUERZA de la tendencia (no la dirección).

**Interpretación:**
- ADX < 20: Sin tendencia clara (rango)
- ADX 20-25: Tendencia emergente
- ADX 25-40: Tendencia fuerte
- ADX > 40: Tendencia muy fuerte

**Componentes:**
- +DI: Movimiento direccional positivo
- -DI: Movimiento direccional negativo
- ADX: Fuerza absoluta (sin dirección)

**Señales:**
- +DI > -DI + ADX > 25: Tendencia alcista fuerte
- -DI > +DI + ADX > 25: Tendencia bajista fuerte
- ADX < 20: No operar tendencia (usar mean-reversion)

**Uso en ELEVE:**
- Crypto Swing: ADX ≥ 15 para confirmar tendencia
- Small Caps: ADX > 25 (más exigente, busca momentum)
- 1% Spot: ADX > 20 + (+DI > -DI) para confirmar dirección`
  },

  ema: {
    title: "EMA (Exponential Moving Average)",
    category: "Indicadores",
    content: `EMA es una media móvil que da más peso a los precios recientes.

**Diferencia con SMA:**
- SMA: Todos los precios pesan igual
- EMA: Precios recientes pesan más (reacciona más rápido)

**EMAs más usadas:**
- EMA 9/12: Muy rápida (scalping)
- EMA 20: Rápida (swing corto)
- EMA 50: Media (tendencia intermedia)
- EMA 200: Lenta (tendencia principal)

**Señales de cruce:**
- EMA rápida cruza ARRIBA de lenta: Señal alcista
- EMA rápida cruza ABAJO de lenta: Señal bajista

**Régimen de mercado:**
- EMA 50 > EMA 200: Régimen BULL
- EMA 50 < EMA 200: Régimen BEAR
- EMAs entrelazadas: Régimen RANGE

**Uso como soporte/resistencia:**
- En tendencia alcista, EMA 20 actúa como soporte dinámico
- El precio tiende a rebotar en EMAs durante pullbacks`
  },

  vwap: {
    title: "VWAP (Volume Weighted Average Price)",
    category: "Indicadores",
    content: `VWAP es el precio promedio ponderado por volumen del día.

**¿Qué representa?**
El precio "justo" según el volumen negociado. Es donde los institucionales miden su ejecución.

**Cálculo:**
VWAP = Σ(Precio × Volumen) / Σ(Volumen)

**Interpretación:**
- Precio > VWAP: Compradores en control
- Precio < VWAP: Vendedores en control
- Precio = VWAP: Equilibrio

**Uso en trading:**
1. **Mean-reversion:** Precio se aleja del VWAP → tiende a volver
2. **Soporte/Resistencia:** VWAP actúa como imán
3. **Ejecución institucional:** Benchmark para evaluar fills

**Estrategia VWAP Reversion:**
- Busca sobre-extensiones >1 ATR del VWAP
- Entra en dirección de retorno al VWAP
- TP: VWAP o 1.5x ATR`
  },

  macd: {
    title: "MACD (Moving Average Convergence Divergence)",
    category: "Indicadores",
    content: `MACD muestra momentum y posibles cambios de tendencia.

**Componentes:**
- Línea MACD: EMA 12 - EMA 26
- Línea Señal: EMA 9 del MACD
- Histograma: MACD - Señal

**Señales:**
- MACD cruza ARRIBA de señal: Alcista
- MACD cruza ABAJO de señal: Bajista
- Histograma creciente: Momentum aumentando
- Divergencia: Precio vs MACD en direcciones opuestas

**Divergencias:**
- Divergencia alcista: Precio hace LL, MACD hace HL
- Divergencia bajista: Precio hace HH, MACD hace LH`
  },

  fibonacci: {
    title: "Fibonacci",
    category: "Indicadores",
    content: `Fibonacci identifica zonas de soporte/resistencia basadas en proporciones matemáticas.

**Niveles clave:**
- 23.6%: Retroceso superficial
- 38.2%: Retroceso normal
- 50.0%: Retroceso medio
- 61.8%: Golden Ratio (el más importante)
- 78.6%: Retroceso profundo

**Uso:**
1. Identificar swing high y swing low
2. Trazar Fibonacci entre ellos
3. Buscar entradas en niveles 38.2%-61.8%

**Confluencia:**
Los niveles Fib son más fuertes cuando coinciden con:
- EMAs
- Soportes/resistencias previos
- Order blocks
- Números redondos`
  },

  // Gestión de Riesgo
  positionSizing: {
    title: "Position Sizing",
    category: "Riesgo",
    content: `Position Sizing determina cuánto capital asignar a cada trade.

**Fórmula básica:**
Cantidad = (Capital × Riesgo%) / (Entrada - Stop Loss)

**Ejemplo:**
- Capital: $50,000
- Riesgo: 1% = $500
- Precio entrada BTC: $100,000
- Stop Loss: $97,000
- Diferencia: $3,000

Cantidad = $500 / $3,000 = 0.167 BTC
Valor posición = 0.167 × $100,000 = $16,700

**Reglas de ELEVE:**
- Máximo 1% por trade en swing
- Máximo 0.3-0.5% en intraday
- Nunca más del 5% del capital en una posición`
  },

  stopLoss: {
    title: "Stop Loss",
    category: "Riesgo",
    content: `Stop Loss cierra automáticamente una posición para limitar pérdidas.

**Tipos de Stop Loss:**
1. **Fijo en %:** Siempre X% debajo de entrada
2. **Basado en ATR:** Dinámico según volatilidad
3. **Estructural:** Debajo de soporte/swing low
4. **Temporal:** Time-stop si no se mueve

**ELEVE usa ATR para stops:**
- Más volatilidad = stop más amplio
- Menos volatilidad = stop más ajustado
- Evita ser sacado por ruido normal

**Errores comunes:**
- Stop muy ajustado: Sacado por ruido
- Stop muy amplio: Pérdidas innecesarias
- Mover el stop en contra: NUNCA`
  },

  takeProfit: {
    title: "Take Profit",
    category: "Riesgo",
    content: `Take Profit cierra posición al alcanzar objetivo de ganancia.

**Estrategias de TP:**
1. **TP único:** Todo al mismo precio
2. **TP escalonado:** 50%-30%-20% en niveles
3. **Sin TP fijo:** Solo trailing stop

**ELEVE usa salidas escalonadas:**
- TP1: Cerrar 50% a 2-2.5x ATR
- Mover SL a breakeven
- TP2: Resto con trailing stop

**Risk/Reward:**
- Mínimo 1.5:1 para swing
- Mínimo 2:1 para intraday
- Si R:R < 1:1, no tomar el trade`
  },

  trailingStop: {
    title: "Trailing Stop",
    category: "Riesgo",
    content: `Trailing Stop sigue al precio cuando va a tu favor.

**Funcionamiento:**
1. Precio sube → trailing se mueve arriba
2. Precio baja → trailing NO se mueve
3. Precio toca trailing → se cierra posición

**Tipos:**
- % fijo: Siempre X% debajo del máximo
- ATR: Basado en volatilidad actual
- Por estructura: Se mueve a soportes

**Ejemplo:**
- Compra BTC: $100,000
- Trailing: 2 ATR ($4,000)
- BTC sube a $108,000 → Trailing: $104,000
- BTC baja a $104,000 → Se vende
- Ganancia: +4% (en vez de potencial pérdida)`
  },

  breakeven: {
    title: "Breakeven",
    category: "Riesgo",
    content: `Breakeven es mover el Stop Loss al precio de entrada.

**¿Cuándo mover a BE?**
- Después de alcanzar TP1
- Cuando ganas +1-1.5 ATR
- NUNCA antes de tiempo

**Ventajas:**
- Elimina riesgo de pérdida
- Trade "gratis" - solo puedes ganar
- Paz mental

**Riesgos:**
- Mover demasiado pronto = salir en pullback normal
- El precio puede tocar BE y luego subir mucho`
  },

  riskReward: {
    title: "Risk/Reward Ratio",
    category: "Riesgo",
    content: `Risk/Reward compara pérdida potencial vs ganancia potencial.

**Cálculo:**
R:R = (Take Profit - Entrada) / (Entrada - Stop Loss)

**Ejemplo:**
- Entrada: $100,000
- Stop Loss: $97,000 (riesgo $3,000)
- Take Profit: $109,000 (ganancia $9,000)
- R:R = $9,000 / $3,000 = 3:1

**¿Por qué importa?**
Con R:R de 2:1, puedes ganar con solo 40% win rate:
- 100 trades
- 40 ganadores × $200 = $8,000
- 60 perdedores × $100 = $6,000
- Profit: $2,000

**Mínimos de ELEVE:**
- Swing: R:R ≥ 1.5:1
- Intraday: R:R ≥ 2:1`
  },

  drawdown: {
    title: "Drawdown",
    category: "Riesgo",
    content: `Drawdown es la caída desde el punto más alto de tu cuenta.

**Cálculo:**
DD% = (Máximo histórico - Valor actual) / Máximo histórico × 100

**Ejemplo:**
- Cuenta llegó a $60,000 (máximo)
- Ahora tiene $51,000
- DD = ($60,000 - $51,000) / $60,000 = 15%

**Matemática de recuperación:**
| Pérdida | Para recuperar |
|---------|---------------|
| 10% | 11.1% |
| 20% | 25% |
| 30% | 43% |
| 50% | 100% |
| 70% | 233% |
| 90% | 900% |

**Límites de ELEVE:**
- Max DD por estrategia: 8-20%
- Max DD portfolio: 15%
- Si DD > límite: Reducir riesgo o pausar`
  },

  // Estructura de Mercado
  regimen: {
    title: "Régimen de Mercado",
    category: "Estructura",
    content: `El régimen define el estado general del mercado.

**Tipos:**
- **BULL:** Tendencia alcista (EMA50 > EMA200, HH-HL)
- **BEAR:** Tendencia bajista (EMA50 < EMA200, LH-LL)
- **RANGE:** Lateral, sin tendencia clara

**Cómo determinar régimen:**
1. EMAs: 50 vs 200
2. Estructura: HH-HL o LH-LL
3. ADX: >25 tendencia, <20 rango

**Trading por régimen:**
- BULL: Buscar longs en pullbacks
- BEAR: Buscar shorts o no operar
- RANGE: Mean-reversion, comprar soporte, vender resistencia

**ELEVE en cada régimen:**
- Swing strategies: Solo operan en BULL
- Intraday: Pueden operar en RANGE también`
  },

  pullback: {
    title: "Pullback",
    category: "Estructura",
    content: `Pullback es un retroceso temporal dentro de una tendencia.

**Características:**
- Movimiento CONTRA la tendencia principal
- Volumen generalmente menor que el impulso
- No rompe estructura (mantiene HH-HL en alcista)

**¿Por qué entrar en pullback?**
1. Mejor precio de entrada
2. Stop loss más cercano = mejor R:R
3. Confirma que hay demanda en niveles bajos

**Cómo identificar buen pullback:**
- Retroceso 38.2%-61.8% Fibonacci
- RSI baja a 40-60 (no sobreventa extrema)
- Toca EMA 20 o 50
- Vela de rechazo (mecha inferior)

**Error común:**
Comprar en la cima del impulso en vez de esperar pullback.`
  },

  hh_hl: {
    title: "Higher Highs - Higher Lows (HH-HL)",
    category: "Estructura",
    content: `HH-HL define estructura alcista.

**Definición:**
- Higher High (HH): Máximo más alto que el anterior
- Higher Low (HL): Mínimo más alto que el anterior

**Estructura alcista válida:**
Precio hace HH → retrocede → hace HL → hace nuevo HH

**Señal de debilidad:**
- HH pero HL no se mantiene (rompe mínimo anterior)
- Esto puede indicar cambio de tendencia (CHoCH)

**Uso en ELEVE:**
- Verificar HH-HL en 4H antes de buscar entrada
- Si estructura se rompe, no operar hasta nueva confirmación`
  },

  bos: {
    title: "Break of Structure (BOS)",
    category: "Estructura",
    content: `BOS confirma CONTINUACIÓN de la tendencia.

**BOS alcista:**
- Precio rompe el último HH
- Confirma que la tendencia alcista continúa

**BOS bajista:**
- Precio rompe el último LL
- Confirma que la tendencia bajista continúa

**Trading con BOS:**
1. Identificar tendencia con HH-HL o LH-LL
2. Esperar BOS (rotura del último extremo)
3. Entrar en pullback después del BOS`
  },

  choch: {
    title: "Change of Character (CHoCH)",
    category: "Estructura",
    content: `CHoCH señala posible CAMBIO de tendencia.

**CHoCH alcista → bajista:**
- En tendencia alcista (HH-HL)
- Precio rompe el último HL
- Primera señal de debilidad

**CHoCH bajista → alcista:**
- En tendencia bajista (LH-LL)
- Precio rompe el último LH
- Primera señal de reversión

**Diferencia con BOS:**
- BOS: Continuación (rompe extremo a favor)
- CHoCH: Reversión (rompe extremo en contra)

**Trading:**
- CHoCH no es señal de entrada inmediata
- Esperar confirmación con nuevo BOS en dirección contraria`
  },

  orderBlock: {
    title: "Order Block",
    category: "Estructura",
    content: `Order Block es zona donde institucionales acumularon posiciones.

**Identificación:**
- Última vela OPUESTA antes de un movimiento fuerte
- Antes de impulso alcista: Última vela bajista
- Antes de impulso bajista: Última vela alcista

**¿Por qué funciona?**
Los institucionales dejan órdenes pendientes en estas zonas.
Cuando el precio vuelve, estas órdenes se activan.

**Trading:**
1. Identificar impulso fuerte
2. Marcar última vela opuesta
3. Esperar que precio vuelva a esa zona
4. Entrar con confirmación (vela de rechazo)`
  },

  fvg: {
    title: "FVG (Fair Value Gap)",
    category: "Estructura",
    content: `FVG es un gap de precio donde no hubo negociación.

**Identificación:**
Gap entre el high de vela 1 y el low de vela 3.
La vela 2 no "rellena" ese espacio.

**¿Por qué funciona?**
- Representa desequilibrio entre oferta y demanda
- El precio tiende a volver a "rellenar" estos gaps
- Los institucionales usan FVGs como targets

**Trading:**
- Identificar FVG en dirección de la tendencia
- Esperar que precio vuelva a rellenar
- Entrar cuando toque el FVG con confirmación`
  },

  liquidez: {
    title: "Liquidez",
    category: "Estructura",
    content: `Liquidez son zonas donde hay stops acumulados.

**Zonas de liquidez:**
- Por encima de máximos obvios (stops de shorts)
- Por debajo de mínimos obvios (stops de longs)
- Números redondos ($100,000, $50,000)

**Liquidity Sweep:**
El precio "barre" estas zonas para activar stops antes de moverse en la dirección real.

**Trading:**
- No poner stops en zonas obvias
- Esperar el sweep antes de entrar
- Los sweeps pueden ser oportunidades de entrada`
  },

  // Psicología
  fomo: {
    title: "FOMO (Fear Of Missing Out)",
    category: "Psicología",
    content: `FOMO es el miedo a perderse un movimiento.

**Síntomas:**
- "El precio está subiendo, tengo que entrar YA"
- Entrar sin esperar setup válido
- Aumentar tamaño para "compensar"

**Resultado:**
- Compras en la cima
- Stops amplios (mal R:R)
- Pérdidas evitables

**Solución:**
- Seguir el sistema SIEMPRE
- Aceptar que habrá oportunidades perdidas
- Mejor perder un trade que perder capital`
  },

  revenge: {
    title: "Revenge Trading",
    category: "Psicología",
    content: `Revenge trading es intentar recuperar pérdidas inmediatamente.

**Síntomas:**
- "Acabo de perder, voy a recuperarlo"
- Aumentar tamaño de posición
- Bajar estándares de entrada
- Operar más frecuentemente

**Resultado:**
- Pérdidas mayores
- Spiral descendente
- Account blow-up

**Solución:**
- Mantener riesgo FIJO (1%)
- Después de pérdida, tomar descanso
- Revisar el trade perdedor objetivamente
- El sistema recuperará las pérdidas a largo plazo`
  },

  discipline: {
    title: "Disciplina",
    category: "Psicología",
    content: `La disciplina es más importante que la estrategia.

**Componentes:**
1. Seguir reglas sin excepciones
2. Respetar stops SIEMPRE
3. No operar sin setup válido
4. Mantener journal

**Por qué es difícil:**
- Las emociones son fuertes
- Cada trade parece "especial"
- El mercado tienta constantemente

**Cómo desarrollarla:**
- Automatizar lo posible (ELEVE)
- Tener checklist pre-trade
- Revisar trades semanalmente
- Celebrar seguir las reglas, no solo ganar`
  },

  // Tipos de Órdenes
  marketOrder: {
    title: "Market Order",
    category: "Órdenes",
    content: `Market Order se ejecuta inmediatamente al mejor precio disponible.

**Características:**
- ✅ Ejecución garantizada (si hay liquidez)
- ❌ Precio no garantizado (slippage posible)
- ⚡ Velocidad máxima

**Cuándo usar:**
- Emergencias (cerrar posición urgente)
- Mercados muy líquidos
- Cuando el tiempo importa más que el precio

**Riesgo:**
En volatilidad alta, slippage puede ser significativo.`
  },

  limitOrder: {
    title: "Limit Order",
    category: "Órdenes",
    content: `Limit Order se ejecuta solo al precio especificado o mejor.

**Buy Limit:** Comprar a precio igual o MENOR
**Sell Limit:** Vender a precio igual o MAYOR

**Características:**
- ✅ Precio garantizado (o mejor)
- ❌ Ejecución no garantizada
- 📈 Sin slippage

**Cuándo usar:**
- Entradas en pullback
- Tomar ganancias en niveles específicos
- Cuando no hay prisa

**Riesgo:**
Puede no ejecutarse si el precio no llega.`
  },

  stopOrder: {
    title: "Stop Order",
    category: "Órdenes",
    content: `Stop Order se activa al alcanzar un precio, luego ejecuta como market.

**Stop Loss:**
- Protege de pérdidas mayores
- Se activa cuando precio CAE a nivel

**Buy Stop:**
- Para entrar en breakouts
- Se activa cuando precio SUBE a nivel

**Características:**
- ✅ Protección automática 24/7
- ❌ Puede tener slippage
- ⚠️ Puede ser "barrido" por liquidez

**Riesgo:**
En gaps o volatilidad extrema, ejecución puede ser peor de lo esperado.`
  },

  oco: {
    title: "OCO (One Cancels Other)",
    category: "Órdenes",
    content: `OCO son dos órdenes vinculadas: ejecutar una cancela la otra.

**Uso típico: SL + TP**
- Sell Limit (TP): $104,000
- Sell Stop (SL): $97,000

Si ejecuta TP → cancela SL
Si ejecuta SL → cancela TP

**Ventajas:**
- Gestión automática
- No vigilar 24/7
- Evita órdenes huérfanas`
  },

  // ========== PATRONES DE VELAS ==========
  
  hammer: {
    title: "Hammer / Martillo",
    category: "Patrones",
    content: `El Hammer es un patrón de reversión alcista que aparece en tendencias bajistas.

**Características:**
- Cuerpo pequeño en la parte SUPERIOR
- Mecha inferior larga (2-3x el cuerpo)
- Poca o ninguna mecha superior
- Color del cuerpo no importa (verde es más fuerte)

**Interpretación:**
Los vendedores empujaron el precio abajo, pero los compradores lo recuperaron.
Señal de que la presión vendedora se está agotando.

**Confirmación:**
- Siguiente vela debe cerrar por encima del hammer
- Mejor si viene con aumento de volumen
- Más fuerte en zonas de soporte

**Variante: Inverted Hammer**
- Igual pero invertido (mecha larga arriba)
- También es alcista en tendencia bajista
- Indica intento de reversión`
  },

  hangingMan: {
    title: "Hanging Man / Hombre Colgado",
    category: "Patrones",
    content: `El Hanging Man es un patrón de reversión bajista en tendencias alcistas.

**Características:**
- Idéntico visualmente al Hammer
- Cuerpo pequeño arriba, mecha larga abajo
- LA DIFERENCIA: aparece en tendencia ALCISTA

**Interpretación:**
Aunque el precio recuperó, hubo presión vendedora significativa.
Primera señal de debilidad en la tendencia alcista.

**Confirmación:**
- Necesita confirmación con vela bajista siguiente
- Más fiable si el cuerpo es rojo/negro
- Más fuerte en zonas de resistencia`
  },

  doji: {
    title: "Doji",
    category: "Patrones",
    content: `Doji indica indecisión - apertura y cierre casi iguales.

**Tipos de Doji:**

**Standard Doji:**
- Cuerpo casi inexistente
- Mechas arriba y abajo similares
- Indecisión total

**Dragonfly Doji:**
- Cuerpo arriba, mecha larga abajo
- Similar al Hammer
- Potencialmente alcista

**Gravestone Doji:**
- Cuerpo abajo, mecha larga arriba
- Similar a Shooting Star
- Potencialmente bajista

**Long-legged Doji:**
- Mechas muy largas en ambas direcciones
- Mucha volatilidad pero sin dirección
- Precede movimientos fuertes

**Interpretación:**
- Doji después de tendencia fuerte = posible reversión
- Doji en rango = continuación de indecisión
- Siempre esperar confirmación`
  },

  engulfing: {
    title: "Engulfing / Envolvente",
    category: "Patrones",
    content: `Engulfing es uno de los patrones más fuertes de reversión.

**Bullish Engulfing (Alcista):**
- Vela 1: Roja/bajista pequeña
- Vela 2: Verde/alcista que ENVUELVE completamente la vela 1
- Aparece en tendencia bajista
- Señal de reversión alcista fuerte

**Bearish Engulfing (Bajista):**
- Vela 1: Verde/alcista pequeña
- Vela 2: Roja/bajista que ENVUELVE completamente la vela 1
- Aparece en tendencia alcista
- Señal de reversión bajista fuerte

**Qué hace fuerte un Engulfing:**
- Mayor diferencia de tamaño entre velas
- Volumen alto en la vela envolvente
- En zona de soporte/resistencia
- Después de tendencia extendida

**Uso en ELEVE:**
Engulfing en zona de pullback = confirmación de entrada`
  },

  morningStar: {
    title: "Morning Star / Estrella de la Mañana",
    category: "Patrones",
    content: `Morning Star es un patrón de reversión alcista de 3 velas.

**Estructura:**
1. Vela 1: Roja/bajista grande (tendencia)
2. Vela 2: Cuerpo pequeño (indecisión) - puede ser doji
3. Vela 3: Verde/alcista grande (reversión)

**Características:**
- Gap entre vela 1 y 2 (ideal pero no obligatorio en crypto)
- Gap entre vela 2 y 3 (ideal pero no obligatorio)
- Vela 3 debe cerrar al menos 50% del cuerpo de vela 1

**Variante: Evening Star**
- Patrón inverso (reversión bajista)
- Vela 1 verde, vela 2 pequeña, vela 3 roja

**Fiabilidad:**
Muy alto cuando aparece en:
- Zonas de soporte fuerte
- Después de tendencia bajista extendida
- Con volumen creciente en vela 3`
  },

  shootingStar: {
    title: "Shooting Star / Estrella Fugaz",
    category: "Patrones",
    content: `Shooting Star es patrón de reversión bajista en tendencia alcista.

**Características:**
- Cuerpo pequeño en la parte INFERIOR
- Mecha superior larga (2-3x el cuerpo)
- Poca o ninguna mecha inferior
- Mejor si el cuerpo es rojo

**Interpretación:**
Los compradores empujaron arriba pero los vendedores rechazaron.
El precio cerró cerca de donde abrió = debilidad.

**Confirmación:**
- Siguiente vela debe cerrar por debajo
- Mejor en zona de resistencia
- Más fuerte con volumen alto

**Diferencia con Inverted Hammer:**
- Shooting Star: en tendencia ALCISTA (bajista)
- Inverted Hammer: en tendencia BAJISTA (alcista)`
  },

  threeWhiteSoldiers: {
    title: "Three White Soldiers / Tres Soldados Blancos",
    category: "Patrones",
    content: `Tres Soldados Blancos es patrón de continuación/reversión alcista fuerte.

**Estructura:**
- 3 velas verdes/alcistas consecutivas
- Cada vela abre DENTRO del cuerpo de la anterior
- Cada vela cierra MÁS ALTO que la anterior
- Mechas pequeñas (cuerpos dominan)

**Interpretación:**
Presión compradora consistente durante 3 períodos.
Los alcistas tienen control total.

**Variante: Three Black Crows**
- 3 velas rojas/bajistas consecutivas
- Patrón bajista equivalente

**Precaución:**
- Después de 3 velas fuertes, puede haber pullback
- No perseguir - esperar retroceso para entrar
- Validar que no esté en resistencia importante`
  },

  pinBar: {
    title: "Pin Bar",
    category: "Patrones",
    content: `Pin Bar es uno de los patrones más usados en price action.

**Características:**
- Mecha larga en una dirección (la "nariz")
- Cuerpo pequeño en el extremo opuesto
- Mecha corta o inexistente en el lado del cuerpo

**Pin Bar Alcista:**
- Mecha larga hacia ABAJO
- Cuerpo arriba
- Rechaza precios bajos
- Señal de compra

**Pin Bar Bajista:**
- Mecha larga hacia ARRIBA
- Cuerpo abajo
- Rechaza precios altos
- Señal de venta

**Dónde buscar Pin Bars:**
- En soportes/resistencias clave
- En niveles Fibonacci
- En EMAs (20, 50)
- En Order Blocks

**Entrada:**
- Entrada agresiva: al cierre del Pin Bar
- Entrada conservadora: al romper el extremo del cuerpo`
  },

  insideBar: {
    title: "Inside Bar",
    category: "Patrones",
    content: `Inside Bar indica consolidación y potencial breakout.

**Definición:**
- Vela 2 está COMPLETAMENTE dentro del rango de vela 1
- High de vela 2 < High de vela 1
- Low de vela 2 > Low de vela 1

**Interpretación:**
- Pausa en el movimiento
- Acumulación de energía
- Breakout inminente

**Trading:**
- Esperar rotura del high o low de la vela madre
- Rotura arriba = long
- Rotura abajo = short
- Stop loss al otro extremo de la vela madre

**Múltiples Inside Bars:**
Varios inside bars seguidos = compresión extrema.
El breakout suele ser muy fuerte.`
  },

  // ========== PATRONES CHARTISTAS ==========

  doubleTop: {
    title: "Double Top / Doble Techo",
    category: "Patrones",
    content: `Double Top es patrón de reversión bajista.

**Estructura:**
1. Precio sube a resistencia (primer techo)
2. Retrocede formando un valle (neckline)
3. Vuelve a subir al MISMO nivel (segundo techo)
4. No puede superar y cae

**Confirmación:**
- Rotura del neckline (mínimo entre los dos techos)
- Idealmente con aumento de volumen

**Objetivo de precio:**
Distancia entre techos y neckline, proyectada hacia abajo.

**Variante: Double Bottom**
- Patrón inverso (reversión alcista)
- Dos mínimos al mismo nivel
- Rotura del máximo entre los dos mínimos`
  },

  headShoulders: {
    title: "Head & Shoulders / Cabeza y Hombros",
    category: "Patrones",
    content: `Head & Shoulders es uno de los patrones de reversión más fiables.

**Estructura:**
1. Hombro izquierdo: máximo
2. Cabeza: máximo MÁS ALTO
3. Hombro derecho: máximo IGUAL al hombro izquierdo
4. Neckline: línea que conecta los mínimos

**Confirmación:**
- Rotura del neckline con volumen
- Pullback al neckline (no siempre ocurre)

**Objetivo:**
Distancia de la cabeza al neckline, proyectada desde el punto de rotura.

**Variante: Inverse Head & Shoulders**
- Patrón invertido (reversión alcista)
- Aparece en tendencias bajistas
- Muy fiable en soportes fuertes`
  },

  triangle: {
    title: "Triángulos",
    category: "Patrones",
    content: `Los triángulos son patrones de continuación (generalmente).

**Triángulo Simétrico:**
- Máximos descendentes + mínimos ascendentes
- Convergencia hacia un punto
- Rompe en dirección de la tendencia previa (70%)
- Puede romper en cualquier dirección

**Triángulo Ascendente:**
- Máximos horizontales (resistencia)
- Mínimos ascendentes
- Sesgo ALCISTA
- Rompe arriba 75% de las veces

**Triángulo Descendente:**
- Mínimos horizontales (soporte)
- Máximos descendentes
- Sesgo BAJISTA
- Rompe abajo 75% de las veces

**Trading:**
- Esperar rotura con volumen
- Entrada en pullback a la línea rota
- Stop al otro lado del triángulo
- Target: altura del triángulo proyectada`
  },

  flag: {
    title: "Flag / Bandera",
    category: "Patrones",
    content: `Flag es patrón de continuación muy fiable.

**Estructura:**
1. Mástil: Movimiento fuerte y rápido (impulso)
2. Bandera: Consolidación en contra de la tendencia
3. Rotura: Continúa en dirección del mástil

**Bull Flag (Alcista):**
- Impulso alcista (mástil)
- Consolidación bajista/lateral (bandera)
- Rotura alcista

**Bear Flag (Bajista):**
- Impulso bajista (mástil)
- Consolidación alcista/lateral (bandera)
- Rotura bajista

**Características de buena Flag:**
- Mástil con volumen alto
- Bandera con volumen decreciente
- Bandera retrocede 38-50% del mástil
- Duración: pocos días/velas

**Target:**
Altura del mástil proyectada desde el punto de rotura.`
  },

  wedge: {
    title: "Wedge / Cuña",
    category: "Patrones",
    content: `Las cuñas son patrones de reversión.

**Rising Wedge (Cuña Ascendente):**
- Máximos y mínimos ASCENDENTES
- Pero convergiendo (perdiendo momentum)
- Patrón BAJISTA (rompe abajo)
- Común al final de tendencias alcistas

**Falling Wedge (Cuña Descendente):**
- Máximos y mínimos DESCENDENTES
- Pero convergiendo
- Patrón ALCISTA (rompe arriba)
- Común al final de tendencias bajistas

**Diferencia con Triángulos:**
- Triángulo: una línea horizontal
- Cuña: ambas líneas inclinadas en la misma dirección

**Trading:**
- Esperar rotura de la línea de tendencia
- Confirmar con volumen
- Target: inicio de la cuña`
  },

  cup: {
    title: "Cup & Handle / Taza con Asa",
    category: "Patrones",
    content: `Cup & Handle es patrón alcista de continuación.

**Estructura:**
1. Copa: Forma de "U" redondeada (no "V")
2. Asa: Pequeño retroceso/consolidación
3. Rotura: Por encima del borde de la copa

**Características ideales:**
- Copa dura semanas/meses (no días)
- Profundidad: 12-35% del movimiento previo
- Asa retrocede 10-20% de la copa
- Asa tiene forma de flag o triángulo pequeño

**Confirmación:**
- Rotura del borde de la copa con volumen
- Pullback al borde (no siempre)

**Target:**
Profundidad de la copa proyectada desde el punto de rotura.

**Precaución:**
Patrón lento de formar - no forzar identificación.`
  },

  supportResistance: {
    title: "Soporte y Resistencia",
    category: "Patrones",
    content: `Soporte y Resistencia son los conceptos más básicos del análisis técnico.

**Soporte:**
- Nivel donde el precio DEJA DE BAJAR
- Compradores entran en ese nivel
- Cuantas más veces testado, más fuerte

**Resistencia:**
- Nivel donde el precio DEJA DE SUBIR
- Vendedores entran en ese nivel
- Cuantas más veces testado, más fuerte

**Principio de polaridad:**
Soporte roto se convierte en resistencia (y viceversa).

**Tipos de niveles:**
1. Horizontales: máximos/mínimos previos
2. Dinámicos: EMAs, líneas de tendencia
3. Psicológicos: números redondos ($100K, $50K)
4. Fibonacci: 38.2%, 50%, 61.8%

**Trading:**
- Comprar en soporte (con confirmación)
- Vender en resistencia (con confirmación)
- Rotura de nivel = trade en dirección de la rotura`
  },

  trendline: {
    title: "Líneas de Tendencia",
    category: "Patrones",
    content: `Las líneas de tendencia conectan máximos o mínimos sucesivos.

**Línea de tendencia alcista:**
- Conecta mínimos ascendentes (HL)
- Se traza por DEBAJO del precio
- Actúa como soporte dinámico

**Línea de tendencia bajista:**
- Conecta máximos descendentes (LH)
- Se traza por ENCIMA del precio
- Actúa como resistencia dinámica

**Validez:**
- Mínimo 2 toques (3+ es más fiable)
- Más toques = más fuerte
- Más tiempo = más significativa

**Trading:**
- En alcista: comprar en toque de línea
- En bajista: vender en toque de línea
- Rotura de línea = posible cambio de tendencia

**Error común:**
Forzar líneas que no existen. Si no es obvia, no la traces.`
  }
}

// Categorías para filtrar
const categories = ['Todos', 'Indicadores', 'Riesgo', 'Estructura', 'Psicología', 'Órdenes', 'Patrones']

export default function EducationPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Filtrar contenido
  const filteredContent = useMemo(() => {
    return Object.entries(educationContent).filter(([key, item]) => {
      const matchesSearch = searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        key.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const expandAll = () => {
    setExpandedItems(Object.keys(educationContent))
  }

  const collapseAll = () => {
    setExpandedItems([])
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🎓 Centro Educativo</h1>
          <p className="text-gray-400">
            Aprende los conceptos fundamentales del trading y cómo los aplica ELEVE.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">🔎 Buscar concepto</label>
              <input
                type="text"
                placeholder="RSI, ATR, stop loss, pullback, fibonacci..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">📁 Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={expandAll}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Expandir todos
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Colapsar todos
            </button>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-400">
            {searchTerm && (
              <span>
                {filteredContent.length} resultado{filteredContent.length !== 1 ? 's' : ''} 
                {' '}para &quot;{searchTerm}&quot;
              </span>
            )}
          </div>
        </div>

        {/* ATR Highlight Section */}
        {(searchTerm === '' && selectedCategory === 'Todos') && (
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-3">📊 Destacado: ATR (Average True Range)</h2>
            <p className="text-gray-300 mb-4">
              El ATR es el indicador más importante en ELEVE. Define los stops, take profits y position sizing de todas las estrategias.
            </p>
            <button
              onClick={() => {
                setSearchTerm('atr')
                setExpandedItems(['atr'])
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium"
            >
              Aprender sobre ATR →
            </button>
          </div>
        )}

        {/* Content Grid */}
        <div className="space-y-4">
          {filteredContent.map(([key, item]) => (
            <div 
              key={key}
              className="bg-gray-900 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => toggleExpand(key)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{item.title}</span>
                  <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                    {item.category}
                  </span>
                </div>
                <span className="text-gray-400">
                  {expandedItems.includes(key) ? '▼' : '▶'}
                </span>
              </button>

              {/* Content */}
              {expandedItems.includes(key) && (
                <div className="px-4 pb-4 border-t border-gray-800">
                  <div className="pt-4 prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-gray-300 font-sans text-sm leading-relaxed">
                      {item.content}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredContent.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No se encontró &quot;{searchTerm}&quot;
            </p>
            <p className="text-gray-500 mt-2">
              Prueba con: RSI, ATR, stop loss, position sizing, fibonacci, pullback...
            </p>
          </div>
        )}

        {/* Footer Tips */}
        <div className="mt-8 bg-gray-900 rounded-lg p-4">
          <h3 className="font-semibold mb-2">💡 Consejos rápidos</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• La disciplina es más importante que la estrategia</li>
            <li>• Nunca arriesgues más del 1% por trade</li>
            <li>• Respeta tus stops SIEMPRE</li>
            <li>• El mercado siempre ofrece nuevas oportunidades</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
