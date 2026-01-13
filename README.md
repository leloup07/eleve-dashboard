# 🚀 ELEVE Trading Dashboard v3.0

Plataforma de trading automatizado Next.js con 4 estrategias activas.

## ✨ Características

### 📊 Dashboard Principal (Home)
- **Actualización en tiempo real** cada 30 segundos
- Estado del sistema (Redis, Bot, Posiciones)
- Régimen de mercado (BTC/SPY) con indicadores visuales
- Resumen de todas las estrategias
- Capital total por categoría
- Posiciones abiertas con PnL en tiempo real
- Últimos trades

### 📔 Trading Journal Detallado
- **Importe invertido** en cada trade
- Razón de entrada con indicadores
- Razón de salida detallada
- Explicación completa de la estrategia
- Lecciones aprendidas
- R-Multiple y métricas de rendimiento

### ⚙️ Configuración de Estrategias
- Edición en tiempo real de parámetros
- Cambios reflejados inmediatamente
- Modo Paper/Live
- Capital, riesgo, stops configurables

### 🔢 Formato Español para Números
- Miles con punto (.) → 1.234.567
- Decimales con coma (,) → 1.234,56
- Consistente en toda la aplicación

## 🛠️ Instalación

```bash
# Entrar al directorio
cd eleve-nextjs

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en: http://localhost:3000

## 📁 Estructura del Proyecto

```
eleve-nextjs/
├── src/
│   ├── app/                    # Páginas Next.js (App Router)
│   │   ├── page.tsx           # Home Dashboard
│   │   ├── journal/           # Trading Journal
│   │   ├── config/            # Configuración
│   │   └── strategies/        # Páginas de estrategias
│   ├── components/            # Componentes React
│   │   ├── MetricCard.tsx
│   │   ├── StrategyCard.tsx
│   │   ├── OpenPositions.tsx
│   │   ├── TradingJournal.tsx
│   │   └── Sidebar.tsx
│   ├── lib/                   # Utilidades
│   │   └── formatters.ts      # Formateo español
│   ├── stores/                # Zustand state
│   │   └── tradingStore.ts
│   └── types/                 # TypeScript types
│       └── index.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 📱 Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard principal con métricas |
| `/journal` | Trading journal con análisis detallado |
| `/config` | Configuración de estrategias |
| `/strategies/crypto-core` | Estrategia Crypto Core |
| `/strategies/crypto-aggressive` | Estrategia Crypto Aggressive |
| `/strategies/large-caps` | Estrategia Large Caps |
| `/strategies/small-caps` | Estrategia Small Caps |

## 🎨 Tecnologías

- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Zustand** - Estado global con persistencia
- **Recharts** - Gráficos (preparado)

## 📝 Formato de Números

La aplicación usa formato español:
- `formatCurrency(15000)` → `$15.000`
- `formatCurrency(1234.56, 2)` → `$1.234,56`
- `formatPercent(12.5)` → `12,5%`
- `formatNumber(1234567)` → `1.234.567`

## 🔄 Actualización Automática

El Home se actualiza automáticamente cada 30 segundos. 
También puedes usar el botón "Actualizar" manualmente.

## 📊 Datos de Demo

El proyecto incluye datos de demostración:
- 2 posiciones abiertas
- 3 trades históricos con análisis completo
- 4 estrategias configuradas

Para conectar con datos reales, implementa las APIs en `/src/lib/api.ts`.

## 🚀 Despliegue

```bash
# Build para producción
npm run build

# Iniciar servidor de producción
npm start
```

Recomendado desplegar en: Vercel, Railway, o cualquier plataforma compatible con Next.js.

---

**ELEVE v3.0** - Trading con inteligencia 📈
