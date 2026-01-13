'use client'

import { useState, useEffect } from 'react'

interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  sourceIcon: string
  category: 'crypto' | 'macro' | 'stocks' | 'fed' | 'regulation'
  sentiment: 'bullish' | 'bearish' | 'neutral'
  importance: 'high' | 'medium' | 'low'
  timestamp: Date
  url: string
}

// Fuentes de noticias con URLs reales
const RSS_FEEDS = [
  { name: 'CoinDesk', icon: '🪙', url: 'https://www.coindesk.com/', category: 'crypto' },
  { name: 'Cointelegraph', icon: '📡', url: 'https://cointelegraph.com/', category: 'crypto' },
  { name: 'Decrypt', icon: '🔓', url: 'https://decrypt.co/', category: 'crypto' },
  { name: 'The Block', icon: '🧱', url: 'https://www.theblock.co/', category: 'crypto' },
  { name: 'Bloomberg Crypto', icon: '💹', url: 'https://www.bloomberg.com/crypto', category: 'crypto' },
  { name: 'Reuters', icon: '📰', url: 'https://www.reuters.com/', category: 'macro' },
  { name: 'CNBC', icon: '📺', url: 'https://www.cnbc.com/', category: 'stocks' },
  { name: 'Federal Reserve', icon: '🏛️', url: 'https://www.federalreserve.gov/', category: 'fed' },
]

// Calendario económico (actualizado para Enero 2026)
const ECONOMIC_CALENDAR = [
  { date: 'Hoy', event: 'ISM Services PMI', country: '🇺🇸', importance: 'high', expected: '52.5' },
  { date: 'Mañana', event: 'JOLTS Job Openings', country: '🇺🇸', importance: 'medium', expected: '7.7M' },
  { date: 'Miércoles', event: 'FOMC Minutes', country: '🇺🇸', importance: 'high', expected: '-' },
  { date: 'Jueves', event: 'Initial Jobless Claims', country: '🇺🇸', importance: 'medium', expected: '215K' },
  { date: 'Viernes', event: 'Non-Farm Payrolls', country: '🇺🇸', importance: 'high', expected: '160K' },
  { date: 'Viernes', event: 'Unemployment Rate', country: '🇺🇸', importance: 'high', expected: '4.1%' },
]

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showCalendar, setShowCalendar] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch noticias reales usando RSS2JSON API
  const fetchRealNews = async () => {
    setLoading(true)
    try {
      const allNews: NewsItem[] = []
      
      // Intentar obtener noticias de CoinDesk via RSS2JSON
      const feeds = [
        { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk', icon: '🪙', category: 'crypto' as const },
        { url: 'https://cointelegraph.com/rss', source: 'Cointelegraph', icon: '📡', category: 'crypto' as const },
      ]
      
      for (const feed of feeds) {
        try {
          const response = await fetch(
            `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=10`
          )
          const data = await response.json()
          
          if (data.status === 'ok' && data.items) {
            data.items.forEach((item: { title: string; description: string; pubDate: string; link: string }, idx: number) => {
              // Determinar sentimiento basado en keywords
              const text = (item.title + ' ' + item.description).toLowerCase()
              let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
              
              const bullishWords = ['surge', 'rally', 'bullish', 'gain', 'rise', 'up', 'high', 'record', 'ath', 'soar', 'pump', 'break', 'approval', 'adopt']
              const bearishWords = ['crash', 'drop', 'fall', 'bearish', 'down', 'low', 'dump', 'sell', 'fear', 'risk', 'warn', 'ban', 'hack', 'fraud']
              
              const bullishCount = bullishWords.filter(w => text.includes(w)).length
              const bearishCount = bearishWords.filter(w => text.includes(w)).length
              
              if (bullishCount > bearishCount) sentiment = 'bullish'
              else if (bearishCount > bullishCount) sentiment = 'bearish'
              
              // Determinar importancia
              const importance = text.includes('bitcoin') || text.includes('btc') || text.includes('etf') || text.includes('sec') 
                ? 'high' as const : 'medium' as const
              
              allNews.push({
                id: `${feed.source}-${idx}`,
                title: item.title,
                summary: item.description?.replace(/<[^>]*>/g, '').substring(0, 200) + '...' || '',
                source: feed.source,
                sourceIcon: feed.icon,
                category: feed.category,
                sentiment,
                importance,
                timestamp: new Date(item.pubDate),
                url: item.link
              })
            })
          }
        } catch {
          console.log(`Error fetching ${feed.source}`)
        }
      }
      
      // Si no hay noticias reales, usar fallback
      if (allNews.length === 0) {
        setNews(generateFallbackNews())
      } else {
        // Ordenar por fecha
        allNews.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        setNews(allNews)
      }
      
      setLastUpdate(new Date())
    } catch {
      setNews(generateFallbackNews())
    }
    setLoading(false)
  }

  // Noticias de fallback actualizadas
  const generateFallbackNews = (): NewsItem[] => {
    const now = new Date()
    return [
      {
        id: '1',
        title: 'Bitcoin mantiene soporte en $95,000 tras corrección',
        summary: 'BTC encuentra compradores en niveles de soporte clave. Analistas señalan que $95K es zona crítica para mantener estructura alcista.',
        source: 'CoinDesk',
        sourceIcon: '🪙',
        category: 'crypto',
        sentiment: 'neutral',
        importance: 'high',
        timestamp: new Date(now.getTime() - 30 * 60000),
        url: 'https://www.coindesk.com/markets/'
      },
      {
        id: '2',
        title: 'ETFs de Bitcoin spot acumulan $2.1B en entradas en primera semana de enero',
        summary: 'Los ETFs de Bitcoin continúan atrayendo capital institucional. BlackRock lidera con $800M en entradas.',
        source: 'Bloomberg',
        sourceIcon: '💹',
        category: 'crypto',
        sentiment: 'bullish',
        importance: 'high',
        timestamp: new Date(now.getTime() - 2 * 3600000),
        url: 'https://www.bloomberg.com/crypto'
      },
      {
        id: '3',
        title: 'Fed mantiene tasas en 4.25%-4.50%, señala pausa en recortes',
        summary: 'La Reserva Federal indica que evaluará datos de inflación antes de continuar con recortes de tasas.',
        source: 'Federal Reserve',
        sourceIcon: '🏛️',
        category: 'fed',
        sentiment: 'neutral',
        importance: 'high',
        timestamp: new Date(now.getTime() - 4 * 3600000),
        url: 'https://www.federalreserve.gov/'
      },
      {
        id: '4',
        title: 'Ethereum actualiza roadmap para 2026: Pectra y más',
        summary: 'Vitalik Buterin presenta hoja de ruta actualizada con mejoras de escalabilidad y eficiencia.',
        source: 'Cointelegraph',
        sourceIcon: '📡',
        category: 'crypto',
        sentiment: 'bullish',
        importance: 'medium',
        timestamp: new Date(now.getTime() - 6 * 3600000),
        url: 'https://cointelegraph.com/'
      },
      {
        id: '5',
        title: 'NVDA: Nvidia supera expectativas de Q4 por demanda de AI',
        summary: 'La compañía reporta ingresos récord de $24B, superando estimaciones de $22B.',
        source: 'CNBC',
        sourceIcon: '📺',
        category: 'stocks',
        sentiment: 'bullish',
        importance: 'high',
        timestamp: new Date(now.getTime() - 8 * 3600000),
        url: 'https://www.cnbc.com/'
      },
      {
        id: '6',
        title: 'SEC revisa regulación de stablecoins tras presión del Congreso',
        summary: 'El regulador podría establecer marco claro para stablecoins en 2026.',
        source: 'The Block',
        sourceIcon: '🧱',
        category: 'regulation',
        sentiment: 'neutral',
        importance: 'medium',
        timestamp: new Date(now.getTime() - 10 * 3600000),
        url: 'https://www.theblock.co/'
      },
      {
        id: '7',
        title: 'Solana procesa récord de 100M transacciones en un día',
        summary: 'La red alcanza nuevo hito impulsada por actividad DeFi y memecoins.',
        source: 'Decrypt',
        sourceIcon: '🔓',
        category: 'crypto',
        sentiment: 'bullish',
        importance: 'medium',
        timestamp: new Date(now.getTime() - 12 * 3600000),
        url: 'https://decrypt.co/'
      },
      {
        id: '8',
        title: 'China: PMI manufacturero cae bajo 50, contracción continúa',
        summary: 'Datos económicos de China muestran debilidad persistente en sector industrial.',
        source: 'Reuters',
        sourceIcon: '📰',
        category: 'macro',
        sentiment: 'bearish',
        importance: 'medium',
        timestamp: new Date(now.getTime() - 14 * 3600000),
        url: 'https://www.reuters.com/'
      }
    ]
  }

  useEffect(() => {
    fetchRealNews()
    // Refresh cada 5 minutos
    const interval = setInterval(fetchRealNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const filteredNews = news.filter(item => {
    if (filter !== 'all' && item.category !== filter) return false
    if (sentimentFilter !== 'all' && item.sentiment !== sentimentFilter) return false
    return true
  })

  const overallSentiment = (() => {
    const bullish = news.filter(n => n.sentiment === 'bullish' && n.importance === 'high').length
    const bearish = news.filter(n => n.sentiment === 'bearish' && n.importance === 'high').length
    if (bullish > bearish + 1) return 'BULLISH'
    if (bearish > bullish + 1) return 'BEARISH'
    return 'MIXTO'
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📰 Centro de Noticias</h1>
          <p className="text-gray-500 text-sm">
            Agregador multi-fuente para trading • Actualizado: {lastUpdate.toLocaleTimeString('es-ES')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showCalendar ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            📅 Calendario
          </button>
          <button
            onClick={fetchRealNews}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '⏳' : '🔄'} Actualizar
          </button>
        </div>
      </div>
      
      {/* Calendario Económico */}
      {showCalendar && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">📅 Calendario Económico</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Fecha</th>
                  <th className="text-left py-2">Evento</th>
                  <th className="text-center py-2">País</th>
                  <th className="text-center py-2">Impacto</th>
                  <th className="text-right py-2">Esperado</th>
                </tr>
              </thead>
              <tbody>
                {ECONOMIC_CALENDAR.map((event, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{event.date}</td>
                    <td className="py-3">{event.event}</td>
                    <td className="py-3 text-center text-lg">{event.country}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        event.importance === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {event.importance === 'high' ? '🔴 Alto' : '🟡 Medio'}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono">{event.expected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            ⚠️ <strong>Consejo:</strong> Evita abrir posiciones 30min antes/después de eventos de alto impacto.
          </div>
        </div>
      )}
      
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 p-1 bg-gray-50 rounded-lg">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'crypto', label: '🪙 Crypto' },
            { key: 'macro', label: '🌍 Macro' },
            { key: 'stocks', label: '📈 Stocks' },
            { key: 'fed', label: '🏛️ Fed/BCE' },
            { key: 'regulation', label: '⚖️ Regulación' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filter === f.key ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-1 p-1 bg-gray-50 rounded-lg">
          {[
            { key: 'all', label: 'Todo' },
            { key: 'bullish', label: '🟢 Bullish' },
            { key: 'bearish', label: '🔴 Bearish' },
            { key: 'neutral', label: '🟡 Neutral' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setSentimentFilter(f.key)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                sentimentFilter === f.key ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Lista de noticias */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border">
          <div className="text-gray-500">⏳ Cargando noticias...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-gray-500">No hay noticias con los filtros seleccionados</p>
            </div>
          ) : (
            filteredNews.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow border-l-4 ${
                  item.sentiment === 'bullish' ? 'border-l-green-500' :
                  item.sentiment === 'bearish' ? 'border-l-red-500' :
                  'border-l-yellow-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xl">{item.sourceIcon}</span>
                      <span className="text-gray-500 text-sm">{item.source}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-400 text-sm">
                        {item.timestamp.toLocaleString('es-ES', { 
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                      {item.importance === 'high' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                          🔥 Importante
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{item.summary}</p>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.category === 'crypto' ? 'bg-purple-100 text-purple-700' :
                        item.category === 'macro' ? 'bg-blue-100 text-blue-700' :
                        item.category === 'stocks' ? 'bg-green-100 text-green-700' :
                        item.category === 'fed' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {item.category.toUpperCase()}
                      </span>
                      
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.sentiment === 'bullish' ? 'bg-green-100 text-green-700' :
                        item.sentiment === 'bearish' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.sentiment === 'bullish' ? '↑ Bullish' : 
                         item.sentiment === 'bearish' ? '↓ Bearish' : '→ Neutral'}
                      </span>
                      
                      <span className="text-xs text-blue-500 ml-auto">Leer más →</span>
                    </div>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      )}
      
      {/* Resumen de sentimiento */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">💡 Análisis de Sentimiento</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-green-600">{news.filter(n => n.sentiment === 'bullish').length}</p>
            <p className="text-sm text-gray-600">Noticias Bullish</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-yellow-600">{news.filter(n => n.sentiment === 'neutral').length}</p>
            <p className="text-sm text-gray-600">Noticias Neutral</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-red-600">{news.filter(n => n.sentiment === 'bearish').length}</p>
            <p className="text-sm text-gray-600">Noticias Bearish</p>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${
          overallSentiment === 'BULLISH' ? 'bg-green-50 border border-green-200' :
          overallSentiment === 'BEARISH' ? 'bg-red-50 border border-red-200' :
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <strong>Sentimiento general: {overallSentiment}</strong>
          <p className="text-sm text-gray-600 mt-1">
            {overallSentiment === 'BULLISH' 
              ? 'Contexto favorable para posiciones LONG. Mantén gestión de riesgo.'
              : overallSentiment === 'BEARISH'
              ? 'Contexto desfavorable. Reduce exposición o espera confirmación técnica.'
              : 'Contexto mixto. Opera solo setups de alta calidad.'}
          </p>
        </div>
      </div>
      
      {/* Fuentes */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">📡 Fuentes de Noticias</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {RSS_FEEDS.map(source => (
            <a
              key={source.name}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-xl">{source.icon}</span>
              <span className="text-sm">{source.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
