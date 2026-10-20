import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'

type FeedConfig = {
  url: string
  sourceName: string
  language: 'en' | 'ha'
  countryCode?: string
}

const RSS_FEEDS: FeedConfig[] = [
  // BBC English
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', sourceName: 'BBC News', language: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', sourceName: 'BBC Technology', language: 'en' },

  // BBC Hausa
  { url: 'https://feeds.bbci.co.uk/hausa/rss.xml', sourceName: 'BBC Hausa', language: 'ha' },

  // Nigerian news
  { url: 'https://www.premiumtimesng.com/feed', sourceName: 'Premium Times', language: 'en', countryCode: 'NG' },
  { url: 'https://punchng.com/feed/', sourceName: 'Punch Newspapers', language: 'en', countryCode: 'NG' },
  { url: 'https://www.channelstv.com/feed/', sourceName: 'Channels TV', language: 'en', countryCode: 'NG' },

  // Technology and AI
  { url: 'https://news.google.com/rss/search?q=technology+AI+programming+software+development&hl=en-US&gl=US&ceid=US:en', sourceName: 'Google News Technology', language: 'en' },
  { url: 'https://news.google.com/rss/search?q=tech+startups+innovation+entrepreneurship&hl=en-US&gl=US&ceid=US:en', sourceName: 'Google News Startups', language: 'en' },
  { url: 'https://news.google.com/rss/search?q=artificial+intelligence+machine+learning&hl=en-US&gl=US&ceid=US:en', sourceName: 'Google News AI', language: 'en' },
  { url: 'https://feeds.feedburner.com/TechCrunch', sourceName: 'TechCrunch', language: 'en' },
  { url: 'https://www.wired.com/feed/rss', sourceName: 'Wired', language: 'en' },
  { url: 'https://www.theverge.com/rss/index.xml', sourceName: 'The Verge', language: 'en' },
  { url: 'https://arstechnica.com/feed/', sourceName: 'Ars Technica', language: 'en' },
]

function decodeEntities(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
}

function stripHtml(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function extractImage(value: string): string | null {
  return value.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null
}

function canonicalUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key)
    }
    url.hash = ''
    return url.toString()
  } catch {
    return rawUrl.trim()
  }
}

// UUID-shaped, deterministic ID from the canonical article URL.
// The same URL always produces the same ID, even after refreshes.
function stableArticleId(articleUrl: string): string {
  const hex = createHash('sha256').update(articleUrl).digest('hex').slice(0, 32).split('')
  hex[12] = '5'
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20).join('')}`
}

async function fetchRSSFeed(feed: FeedConfig): Promise<any[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(feed.url, {
      headers: { 'User-Agent': 'FleexNews/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: controller.signal,
      next: { revalidate: 120 },
    })
    clearTimeout(timeoutId)
    if (!response.ok) return []

    const xml = await response.text()
    const articles: any[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let match: RegExpExecArray | null

    while ((match = itemRegex.exec(xml)) && articles.length < 20) {
      const item = match[1]
      const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || item.match(/<title>([\s\S]*?)<\/title>/i)
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i) || item.match(/<link\s+href=["']([^"']+)["']/i)
      const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description>([\s\S]*?)<\/description>/i)
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)
      if (!titleMatch || !linkMatch) continue

      const url = canonicalUrl(decodeEntities(linkMatch[1].trim()))
      const rawTitle = stripHtml(titleMatch[1])
      const titleParts = rawTitle.split(' - ')
      const title = titleParts.length > 1 ? titleParts.slice(0, -1).join(' - ') : rawTitle
      const parsedDate = dateMatch ? new Date(stripHtml(dateMatch[1])) : new Date()

      articles.push({
        id: stableArticleId(url),
        external_id: createHash('sha256').update(url).digest('hex'),
        title,
        description: stripHtml(descMatch?.[1] ?? '').slice(0, 500),
        url,
        urlToImage: extractImage(descMatch?.[1] ?? ''),
        source: { name: feed.sourceName },
        sourceLanguage: feed.language,
        countryCode: feed.countryCode ?? null,
        publishedAt: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
      })
    }
    return articles
  } catch (error) {
    console.error(`[News API] Failed to fetch ${feed.sourceName}:`, error)
    return []
  }
}

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: Request) {
  const startedAt = Date.now()
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 150)
  const refresh = url.searchParams.get('refresh') === 'true'

  const results = await Promise.allSettled(RSS_FEEDS.map(fetchRSSFeed))
  const articlesByUrl = new Map<string, any>()
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const article of result.value) if (!articlesByUrl.has(article.url)) articlesByUrl.set(article.url, article)
    }
  }

  let articles = [...articlesByUrl.values()].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, limit)
  if (refresh) articles = articles.sort(() => Math.random() - 0.5)

  return NextResponse.json({ articles, count: articles.length, sources: RSS_FEEDS.length, lastUpdated: new Date().toISOString(), duration: `${Date.now() - startedAt}ms` }, { headers: { 'Cache-Control': refresh ? 'no-store' : 'public, s-maxage=120, stale-while-revalidate=300' } })
}
