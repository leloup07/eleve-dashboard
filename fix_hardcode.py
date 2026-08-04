import re

def replace_unique(path, old, new, label):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    count = content.count(old)
    if count == 0:
        print(f"❌ NO ENCONTRADO: {label} en {path}")
        return False
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ {label}: {count} reemplazo(s) en {path}")
    return True

BASE = "."

replace_unique(
    f"{BASE}/src/types/index.ts",
    "  status: StrategyStatus\n  description: string\n  capital: number\n  riskPerTrade: number\n  maxPositions: number\n  mode: TradingMode",
    "  status: StrategyStatus\n  description: string\n  capital: number | null\n  riskPerTrade: number | null\n  maxPositions: number | null\n  mode: TradingMode",
    "StrategyConfig -> nullable"
)

replace_unique(
    f"{BASE}/src/types/index.ts",
    "export interface IntradayConfig {\n  enabled: boolean\n  mode: 'paper' | 'live'\n  capital: number\n  riskPerTrade: number\n  maxPositions: number\n  maxDailyLoss: number",
    "export interface IntradayConfig {\n  enabled: boolean\n  mode: 'paper' | 'live'\n  capital: number | null\n  riskPerTrade: number | null\n  maxPositions: number | null\n  maxDailyLoss: number",
    "IntradayConfig -> nullable"
)

replace_unique(
    f"{BASE}/src/types/index.ts",
    "export interface Intraday1PctConfig {\n  enabled: boolean\n  mode: 'paper' | 'live'\n  capital: number\n  riskPerTrade: number\n  maxPositions: number\n  maxDailyLoss: number",
    "export interface Intraday1PctConfig {\n  enabled: boolean\n  mode: 'paper' | 'live'\n  capital: number | null\n  riskPerTrade: number | null\n  maxPositions: number | null\n  maxDailyLoss: number",
    "Intraday1PctConfig -> nullable"
)

replace_unique(
    f"{BASE}/src/stores/tradingStore.ts",
    "const INITIAL_INTRADAY_CONFIG: IntradayConfig = {\n  enabled: true,\n  mode: 'paper',\n  capital: 0,\n  riskPerTrade: 0,\n  maxPositions: 0,",
    "const INITIAL_INTRADAY_CONFIG: IntradayConfig = {\n  enabled: true,\n  mode: 'paper',\n  capital: null,\n  riskPerTrade: null,\n  maxPositions: null,",
    "INITIAL_INTRADAY_CONFIG sin hardcode"
)

replace_unique(
    f"{BASE}/src/stores/tradingStore.ts",
    "const INITIAL_INTRADAY_1PCT_CONFIG: Intraday1PctConfig = {\n  enabled: true,\n  mode: 'paper',\n  capital: 0,\n  riskPerTrade: 0,\n  maxPositions: 0,",
    "const INITIAL_INTRADAY_1PCT_CONFIG: Intraday1PctConfig = {\n  enabled: true,\n  mode: 'paper',\n  capital: null,\n  riskPerTrade: null,\n  maxPositions: null,",
    "INITIAL_INTRADAY_1PCT_CONFIG sin hardcode"
)

swing_combos = [
    ("    capital: 7500,\n    riskPerTrade: 0.01,\n    maxPositions: 2,\n", "crypto_core"),
    ("    capital: 7500,\n    riskPerTrade: 0.01,\n    maxPositions: 3,\n", "crypto_aggressive"),
    ("    capital: 7500,\n    riskPerTrade: 0.01,\n    maxPositions: 4,\n", "large_caps"),
    ("    capital: 7500,\n    riskPerTrade: 0.015,\n    maxPositions: 4,\n", "small_caps"),
]
for old_combo, name in swing_combos:
    replace_unique(
        f"{BASE}/src/stores/tradingStore.ts",
        old_combo,
        "    capital: null,\n    riskPerTrade: null,\n    maxPositions: null,\n",
        f"{name} sin hardcode"
    )

replace_unique(
    f"{BASE}/src/stores/tradingStore.ts",
    "    key: 'vwap_reversion',\n    name: 'VWAP Reversion',\n    version: 'v5.0',\n    status: 'ACTIVE',\n    description: 'Estrategia intraday mean-reversion. Opera fake breaks del rango asiático (00:00-08:00 UTC) que revierten al VWAP. Busca sobre-extensiones de más de 1 ATR respecto al VWAP en BTC y ETH. SL a 1.2x ATR, TP a 1.5x ATR. Límites diarios: -1% pérdida máxima, +1.5% target. Sin trailing, filosofía cobrar y fuera. USA IRG COMO GATEKEEPER.',\n    capital: 0,\n    riskPerTrade: 0,\n    maxPositions: 0,",
    "    key: 'vwap_reversion',\n    name: 'VWAP Reversion',\n    version: 'v5.0',\n    status: 'ACTIVE',\n    description: 'Estrategia intraday mean-reversion. Opera fake breaks del rango asiático (00:00-08:00 UTC) que revierten al VWAP. Busca sobre-extensiones de más de 1 ATR respecto al VWAP en BTC y ETH. SL a 1.2x ATR, TP a 1.5x ATR. Límites diarios: -1% pérdida máxima, +1.5% target. Sin trailing, filosofía cobrar y fuera. USA IRG COMO GATEKEEPER.',\n    capital: null,\n    riskPerTrade: null,\n    maxPositions: null,",
    "vwap_reversion sin hardcode"
)

replace_unique(
    f"{BASE}/src/stores/tradingStore.ts",
    "    key: 'one_percent_spot',\n    name: '1% Spot',\n    version: 'v5.0',\n    status: 'ACTIVE',\n    description: 'Estrategia intraday trend-following. Busca +1% rápidos en altcoins con momentum limpio. Filtros: market cap >$300M, volumen 24h >$50M, ratio vol/mcap >0.15, ADX >20, RSI 40-55. TP fijo +1%, SL -0.5% (R:R 2:1). Mueve a BE en +0.6%. Límites diarios: -1.5% pérdida, +3% target. USA IRG COMO GATEKEEPER.',\n    capital: 0,\n    riskPerTrade: 0,\n    maxPositions: 0,",
    "    key: 'one_percent_spot',\n    name: '1% Spot',\n    version: 'v5.0',\n    status: 'ACTIVE',\n    description: 'Estrategia intraday trend-following. Busca +1% rápidos en altcoins con momentum limpio. Filtros: market cap >$300M, volumen 24h >$50M, ratio vol/mcap >0.15, ADX >20, RSI 40-55. TP fijo +1%, SL -0.5% (R:R 2:1). Mueve a BE en +0.6%. Límites diarios: -1.5% pérdida, +3% target. USA IRG COMO GATEKEEPER.',\n    capital: null,\n    riskPerTrade: null,\n    maxPositions: null,",
    "one_percent_spot sin hardcode"
)

replace_unique(
    f"{BASE}/src/stores/tradingStore.ts",
    "sum + s.capital, 0)",
    "sum + (s.capital || 0), 0)",
    "getDashboardStats sumas null-safe"
)

replace_unique(
    f"{BASE}/src/hooks/useRealTradingData.ts",
    "        if (configJson.data?.strategies) {\n          Object.entries(configJson.data.strategies).forEach(([key, config]: [string, any]) => {\n            if (config.capital) {\n              const store = useTradingStore.getState()\n              store.updateStrategy(key, { capital: config.capital })\n            }\n          })\n        }",
    "        if (configJson.data?.strategies) {\n          Object.entries(configJson.data.strategies).forEach(([key, config]: [string, any]) => {\n            const updates: any = {}\n            if (config.capital !== undefined) updates.capital = config.capital\n            if (config.riskPerTrade !== undefined) updates.riskPerTrade = config.riskPerTrade\n            if (config.maxPositions !== undefined) updates.maxPositions = config.maxPositions\n            if (Object.keys(updates).length > 0) {\n              const store = useTradingStore.getState()\n              store.updateStrategy(key, updates)\n            }\n          })\n        }",
    "sincronizar riskPerTrade y maxPositions ademas de capital"
)

replace_unique(
    f"{BASE}/src/components/StrategyCard.tsx",
    "  const rrRatio = strategy.stops.tpAtrMult / strategy.stops.slAtrMult\n  \n  // Calcular equity: capital inicial + PnL realizado\n  const currentEquity = performance.currentEquity\n  const totalPnL = performance.pnl + performance.unrealizedPnL\n  const pnlPercent = strategy.capital > 0 ? (totalPnL / strategy.capital) * 100 : 0",
    "  const rrRatio = strategy.stops.tpAtrMult / strategy.stops.slAtrMult\n  \n  // Calcular equity: capital inicial + PnL realizado\n  const currentEquity = performance.currentEquity\n  const totalPnL = performance.pnl + performance.unrealizedPnL\n  const pnlPercent = strategy.capital && strategy.capital > 0 ? (totalPnL / strategy.capital) * 100 : 0\n  const isLoadingCapital = strategy.capital === null || strategy.capital === undefined",
    "pnlPercent null-safe + isLoadingCapital"
)

replace_unique(
    f"{BASE}/src/components/StrategyCard.tsx",
    '            <span className="text-xs text-gray-500 uppercase block">Equity Actual</span>\n            <p className="text-xl font-bold text-gray-900">{formatCurrency(currentEquity, 0)}</p>',
    '            <span className="text-xs text-gray-500 uppercase block">Equity Actual</span>\n            <p className="text-xl font-bold text-gray-900">{isLoadingCapital ? \'Cargando...\' : formatCurrency(currentEquity, 0)}</p>',
    "Equity Actual con estado de carga"
)

replace_unique(
    f"{BASE}/src/components/StrategyCard.tsx",
    '''        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Inicial</span>
          <p className="text-sm font-medium text-gray-600">{formatCurrency(strategy.capital, 0)}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Max</span>
          <p className="text-sm font-bold text-gray-900">{strategy.maxPositions}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">R:R</span>
          <p className="text-sm font-bold text-gray-900">{formatRatio(rrRatio)}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Pos</span>
          <p className="text-sm font-bold text-gray-900">
            <span className={positions.length > 0 ? 'text-blue-600' : ''}>{positions.length}</span>
            <span className="text-gray-400">/{strategy.maxPositions}</span>
          </p>
        </div>''',
    '''        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Inicial</span>
          <p className="text-sm font-medium text-gray-600">{isLoadingCapital ? '...' : formatCurrency(strategy.capital, 0)}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Max</span>
          <p className="text-sm font-bold text-gray-900">{strategy.maxPositions ?? '...'}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">R:R</span>
          <p className="text-sm font-bold text-gray-900">{formatRatio(rrRatio)}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Pos</span>
          <p className="text-sm font-bold text-gray-900">
            <span className={positions.length > 0 ? 'text-blue-600' : ''}>{positions.length}</span>
            <span className="text-gray-400">/{strategy.maxPositions ?? '...'}</span>
          </p>
        </div>''',
    "Inicial/Max/Pos con estado de carga"
)

print("\n--- HECHO ---")
