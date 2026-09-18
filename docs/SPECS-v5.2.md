# ELEVE v5.2 — Especialización por clase de activo

Estado: **propuesta** (2026-09-18). Ninguna de estas specs corre todavía: la
implementación vive en el repo del worker (`core/domain.py` + `scripts/backtest.py`)
y cada una debe pasar los criterios de aceptación en backtest ANTES de un solo
trade en papel.

## Por qué v5.2

El diagnóstico del 2026-09-18 (20 trades cerrados en papel + backtests v5.1)
dejó tres conclusiones:

1. **4 de 5 estrategias v5.1 pierden en su propio backtest** (crypto_swing PF
   0.93, large_caps 0.68, small_caps 0.69, one_percent_spot WR 7.9%). El papel
   solo confirmó lo que el backtest ya decía.
2. **crypto_breakout es la única con edge demostrable**: PF 2.62, y PF 2.13
   con el mejor trade excluido, mitad reciente en positivo. Pero en papel
   entró 3 veces sobreextendida (RSI 91, 91, 71) y salió 3 veces por SL.
3. Las cinco estrategias v5.1 eran **la misma anatomía con la talla cambiada**
   (señal + stop ATR + trailing). v5.2 cambia el enfoque: cada clase de activo
   explota una ineficiencia propia de esa clase.

Evidencia transversal del papel (n=20, indicativa, no concluyente):
- RSI de entrada: perdedoras 57 de media vs 41 las ganadoras → **filtro de
  sobreextensión obligatorio**.
- Stops de acciones a 0.6–0.8×ATR: 4 de 14 perdedoras tocaron ≥+1R antes de
  morir en SL → **stop mínimo 1.5×ATR en acciones**.
- Trailing tacaño: ganadoras tocaron +2.1/+3.1R y cerraron a +0.0/+0.9R →
  **parcial a +1R + trailing holgado**.

## Criterios de aceptación (comunes, fijados antes de mirar resultados)

Los evalúa automáticamente `scripts/vigia-backtest.js` (Routine diaria):

| # | Criterio | Umbral |
|---|----------|--------|
| 1 | Muestra | ≥ 30 trades |
| 2 | Robustez | PF > 1.5 **con el mejor trade excluido** |
| 3 | Recencia | PnL > 0 en la mitad más reciente de los trades |
| 4 | Vigencia | el backtest corresponde a la spec activa |

Solo lo que pasa los cuatro entra en papel; el papel tiene criterio de salida
prefijado (30 trades o 3 meses, lo que llegue antes) y después decide capital.

## Specs propuestas

### 1. `crypto_breakout` v5.2 — la superviviente, corregida

La única v5.1 que pasa los criterios en backtest. Cambios quirúrgicos (los que
piden los datos, nada más):

- **Filtro nuevo**: no entrar con RSI(14, 1D) > 75. Sus tres SL en papel
  entraron a RSI 91/91/71.
- **Gestión de salida**: cerrar 50% de la posición a +1R (el SL del resto a
  breakeven); trailing del resto más holgado (p. ej. 2.5×ATR en vez del
  actual) para no devolver el recorrido.
- Sin tocar: universo (BTC, ETH, SOL, XRP, AVAX, LINK), señal de ruptura 20d,
  stop inicial 1.5×ATR, gatekeeper de régimen BTC.

### 2. `crypto_overnight` — momentum nocturno cripto (nueva)

Ineficiencia objetivo: continuación del momentum diurno fuera del horario de
riesgo US, con funding y liquidez conocidos.

- Universo: BTC, ETH, SOL (solo las más líquidas: el edge nocturno muere con
  el spread de las alts).
- Entrada: 21:00 UTC si el retorno del día (00:00→21:00 UTC) > +1% y
  RSI(14, 4H) < 75.
- Salida: 09:00 UTC del día siguiente, o SL 1×ATR(4H). Sin trailing: es una
  ventana fija, no una tendencia.
- Riesgo por trade: mismo % que el resto (definido en config del worker).

### 3. `stocks_pead` — post-earnings drift (nueva, sustituye a large/small caps)

Ineficiencia objetivo: deriva post-resultados documentada — el precio sigue
ajustándose días después de una sorpresa de beneficios.

- Universo: acciones US con earnings en los últimos 2 días, sorpresa de BPA
  > +5% y gap-up que aguanta el primer día (cierre > apertura).
- Entrada: apertura del día siguiente a confirmar el gap. Filtro RSI(14, 1D)
  < 75 (lección v5.1: no perseguir lo ya sobreextendido).
- Stop: 1.5×ATR(1D) — nunca los 0.6–0.8×ATR que mataban a large/small caps.
- Gestión: 50% a +1R con SL a breakeven; resto trailing 2.5×ATR; salida por
  tiempo a los 20 días de mercado.
- Necesita fuente de datos de earnings en el worker (no existe hoy: es el
  mayor coste de implementación de las tres).

### 4. `index_reversion` — reversión a la media en índices (nueva)

Ineficiencia objetivo: sobreventa a corto plazo en índices con tendencia
alcista de fondo revierte en días (efecto Connors RSI-2, robusto en SPY
durante décadas).

- Universo: SPY, QQQ.
- Entrada: RSI(2, 1D) < 10 y cierre > EMA200(1D) (solo compras a favor de la
  tendencia de fondo).
- Salida: RSI(2, 1D) > 65 o 5 días de mercado, lo primero que llegue.
- Stop: 2×ATR(1D) de emergencia (la reversión necesita aire; un stop ceñido
  la convierte en la máquina de SL que ya conocemos).
- Nota: es contra-tendencia a corto plazo — deliberadamente descorrelacionada
  del momentum de las otras tres.

## Qué se archiva

`crypto_swing`, `large_caps`, `small_caps`, `one_percent_spot` (y
`vwap_reversion`, ya archivada): ninguna vuelve a correr tal cual. Si una idea
suya reaparece, lo hace como spec nueva pasando los mismos criterios.

## Orden de implementación (en el repo del worker)

1. Cerrar formalmente el experimento `v5.1-validation` (desbloquea /config).
2. `crypto_breakout` v5.2: es un delta pequeño sobre código que ya existe →
   backtest → si pasa, papel.
3. `index_reversion`: datos ya disponibles (SPY/QQQ diario) → backtest.
4. `crypto_overnight`: necesita velas 4H y ejecución a hora fija.
5. `stocks_pead`: la última — necesita pipeline de earnings.

Cada paso publica su backtest en Redis (`eleve:backtest:*`) y el vigía diario
avisa cuando alguno pase los cuatro criterios.
