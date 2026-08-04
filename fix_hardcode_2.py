def replace_all(path, old, new, label):
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

CFG = "./src/app/config/page.tsx"

# Inputs de edicion (3 sitios identicos: strategy card, intraday, intraday1pct)
replace_all(CFG, "value={localConfig.capital}", "value={localConfig.capital ?? ''}", "input capital null-safe")
replace_all(CFG, "value={localConfig.maxPositions}", "value={localConfig.maxPositions ?? ''}", "input maxPositions null-safe")
replace_all(CFG, "value={localConfig.riskPerTrade}", "value={localConfig.riskPerTrade ?? ''}", "input riskPerTrade null-safe (raw)")

# Sitios unicos con multiplicacion/display
replace_all(CFG, "value={(localConfig.riskPerTrade * 100).toFixed(2)}",
                  "value={((localConfig.riskPerTrade ?? 0) * 100).toFixed(2)}",
                  "input riskPerTrade*100 null-safe")
replace_all(CFG, "{(strategy.riskPerTrade * 100).toFixed(2)}%",
                  "{((strategy.riskPerTrade ?? 0) * 100).toFixed(2)}%",
                  "display strategy.riskPerTrade null-safe")
replace_all(CFG, "${intradayConfig.capital.toLocaleString()}",
                  "${(intradayConfig.capital ?? 0).toLocaleString()}",
                  "display intradayConfig.capital null-safe")
replace_all(CFG, "{(intradayConfig.riskPerTrade * 100).toFixed(1)}%",
                  "{((intradayConfig.riskPerTrade ?? 0) * 100).toFixed(1)}%",
                  "display intradayConfig.riskPerTrade null-safe")
replace_all(CFG, "${config.capital.toLocaleString()}",
                  "${(config.capital ?? 0).toLocaleString()}",
                  "display config.capital null-safe (intraday1pct block)")
replace_all(CFG, "{(config.riskPerTrade * 100).toFixed(1)}%",
                  "{((config.riskPerTrade ?? 0) * 100).toFixed(1)}%",
                  "display config.riskPerTrade null-safe (intraday1pct block)")

# strategies/intraday-1pct/page.tsx
I1PCT = "./src/app/strategies/intraday-1pct/page.tsx"
replace_all(I1PCT, "${config.capital.toLocaleString()}",
                    "${(config.capital ?? 0).toLocaleString()}",
                    "display config.capital null-safe")

# Sidebar.tsx (2 reduces identicos)
SIDEBAR = "./src/components/Sidebar.tsx"
replace_all(SIDEBAR, "sum + s.capital, 0)", "sum + (s.capital || 0), 0)", "reduces capital null-safe")

# StrategyPage.tsx
SPAGE = "./src/components/StrategyPage.tsx"
replace_all(SPAGE, "formatPercent(strategy.riskPerTrade * 100, 2)",
                    "formatPercent((strategy.riskPerTrade ?? 0) * 100, 2)",
                    "formatPercent riskPerTrade null-safe")

print("\n--- HECHO ---")
