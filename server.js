import './lib/env.js';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeWithGemini, isGeminiEnabled } from './lib/gemini.js';

const PORT = process.env.PORT || 3000;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RESULTS = 60;

const RSS_SOURCES = [
  { name: 'TRT Haber', url: 'https://www.trthaber.com/manset.rss' },
  { name: 'Mynet Haber', url: 'https://www.mynet.com/haber/rss/kategori/gundem' },
  { name: 'SonDakika.com', url: 'https://www.sondakika.com/rss/' },
  { name: 'NTV', url: 'https://www.ntv.com.tr/gundem.rss' },
  { name: 'Karaman Gündem', url: 'https://www.karamangundem.com/rss' },
  { name: 'Karaman Haber', url: 'https://www.karamanhaber.com/feed/' },
  { name: 'Karamandan', url: 'https://www.karamandan.com/rss' },
  { name: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel' },
  { name: 'En Son Haber', url: 'https://www.ensonhaber.com/rss/ensonhaber.xml' },
  { name: 'Habertürk', url: 'https://www.haberturk.com/rss/manset.xml' },
  { name: 'Sabah', url: 'https://www.sabah.com.tr/rss/gundem.xml' },
  { name: 'Sözcü', url: 'https://www.sozcu.com.tr/rss/anasayfa.xml' }
];

const STOP_WORDS = new Set([
  've',
  'veya',
  'ile',
  'ama',
  'fakat',
  'ancak',
  'ise',
  'için',
  'bir',
  'birkaç',
  'daha',
  'çok',
  'az',
  'bu',
  'şu',
  'o',
  'da',
  'de',
  'ki',
  'mi',
  'ne',
  'nasıl',
  'niçin',
  'neden',
  'yada',
  'olarak',
  'üzere',
  'gibi',
  'hem',
  'her',
  'tüm',
  'artık',
  'zaten',
  'ise'
]);

const GEMINI_SUMMARY_MAX_ITEMS = Number(process.env.GEMINI_SUMMARY_MAX_ITEMS || 20);

const cache = {
  timestamp: 0,
  items: []
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/news') {
    await handleNewsEndpoint(url, res);
    return;
  }

  // Render uyku modu önleme endpoint'i
  if (url.pathname === '/api/ping' || url.pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Sunucu aktif'
    }));
    return;
  }

  await serveStaticFile(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`Haber Okuyoruz ayakta: http://localhost:${PORT}`);
});

async function handleNewsEndpoint(url, res) {
  try {
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();
    const sourceFilter = url.searchParams.get('source') || '';
    const items = await getNewsItems();

    const filtered = items.filter((item) => {
      const matchesSource = sourceFilter ? item.source === sourceFilter : true;
      if (!query) {
        return matchesSource;
      }
      const haystack = `${item.title} ${item.summary} ${item.description}`.toLowerCase();
      return matchesSource && haystack.includes(query);
    });

    const payload = {
      updatedAt: new Date(cache.timestamp).toISOString(),
      total: filtered.length,
      sources: RSS_SOURCES.map((s) => s.name),
      items: filtered.slice(0, MAX_RESULTS)
    };

    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
  } catch (error) {
    console.error('API hatası:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Haberlere ulaşılamadı. Lütfen daha sonra tekrar deneyin.' }));
  }
}

async function serveStaticFile(requestPath, res) {
  try {
    const safePath = requestPath === '/' ? '/index.html' : requestPath;
    const filePath = path.join(PUBLIC_DIR, safePath);

    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      'Content-Type': getContentType(ext),
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=600'
    });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Sayfa bulunamadı');
  }
}

function getContentType(ext) {
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    default:
      return 'text/plain; charset=utf-8';
  }
}

async function getNewsItems() {
  const now = Date.now();
  if (cache.items.length && now - cache.timestamp < CACHE_TTL) {
    return cache.items;
  }

  const responses = await Promise.allSettled(RSS_SOURCES.map(fetchSource));
  const collected = [];

  for (const result of responses) {
    if (result.status === 'fulfilled') {
      collected.push(...result.value);
    } else {
      console.warn('Kaynak alınamadı:', result.reason?.message || result.reason);
    }
  }

  const deduped = dedupeItems(collected);
  deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  await attachGeminiSummaries(deduped);

  cache.items = deduped;
  cache.timestamp = now;
  return deduped;
}

async function fetchSource(source) {
  const response = await fetch(source.url, { headers: { 'User-Agent': 'HaberOkuyoruzBot/1.0 (+https://haberokuyoruz.com)' } });
  if (!response.ok) {
    throw new Error(`${source.name} kaynak hatası: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parseRss(xml).map((item) => ({
    ...item,
    source: source.name
  }));

  return parsed;
}

function parseRss(xml) {
  const items = [];
  const parts = xml.split(/<item[\s>]/i).slice(1);

  for (const part of parts) {
    const itemBlock = part.split(/<\/item>/i)[0];
    if (!itemBlock) continue;

    const title = getTagValue(itemBlock, 'title');
    const link = getTagValue(itemBlock, 'link');
    const pubDate = new Date(getTagValue(itemBlock, 'pubDate') || getTagValue(itemBlock, 'dc:date') || Date.now()).toISOString();
    const rawDescription = getTagValue(itemBlock, 'description') || getTagValue(itemBlock, 'content:encoded') || '';
    const description = stripHtml(rawDescription);
    const summary = summarize(description || title);
    const preview = createPreview(summary || description || title);

    items.push({
      id: link || `${title}-${pubDate}`,
      title: decodeEntities(title),
      link,
      publishedAt: pubDate,
      description,
      summary,
      preview
    });
  }

  return items;
}

function getTagValue(block, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(regex);
  return match ? decodeEntities(match[1].trim()) : '';
}

function stripHtml(input = '') {
  return input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(x?[0-9a-fA-F]+);/g, (_, code) => {
      const value = code.startsWith('x') ? parseInt(code.slice(1), 16) : parseInt(code, 10);
      return String.fromCharCode(value);
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function summarize(text = '', sentenceCount = 2) {
  const clean = stripHtml(text);
  if (!clean) {
    return '';
  }

  const sentences = clean.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) || [];
  if (sentences.length <= sentenceCount) {
    return clean;
  }

  const words = clean
    .toLowerCase()
    .match(/[a-z\u00c0-\u024fığüşöçİĞÜŞÖÇ]+/g)
    ?.filter((word) => !STOP_WORDS.has(word)) || [];

  const frequencies = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  const sentenceScores = sentences.map((sentence, index) => {
    const sentenceWords =
      sentence
        .toLowerCase()
        .match(/[a-z\u00c0-\u024fığüşöçİĞÜŞÖÇ]+/g)
        ?.filter((word) => !STOP_WORDS.has(word)) || [];

    const score = sentenceWords.reduce((total, word) => total + (frequencies[word] || 0), 0);
    return { sentence, score, index };
  });

  const selected = sentenceScores
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, sentenceCount)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  return selected.join(' ');
}

function createPreview(text = '', limit = 220) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit).trim()}…`;
}

function dedupeItems(items = []) {
  const map = new Map();

  for (const item of items) {
    const key = normalizeKey(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, sources: [item.source] });
      continue;
    }

    if (!existing.sources.includes(item.source)) {
      existing.sources.push(item.source);
    }

    if (new Date(item.publishedAt) < new Date(existing.publishedAt)) {
      existing.publishedAt = item.publishedAt;
    }

    if (!existing.description && item.description) existing.description = item.description;
    if (!existing.summary && item.summary) existing.summary = item.summary;
    if (!existing.preview && item.preview) existing.preview = item.preview;
    if (!existing.link && item.link) existing.link = item.link;
  }

  return Array.from(map.values()).map((item) => ({
    ...item,
    source: item.sources[0],
    sources: item.sources
  }));
}

function normalizeKey(item) {
  const base = item.link || item.title;
  return (base || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function attachGeminiSummaries(items) {
  if (!isGeminiEnabled) return;

  const limit = Math.min(GEMINI_SUMMARY_MAX_ITEMS, items.length);
  for (let index = 0; index < limit; index += 1) {
    const item = items[index];
    if (!item || item.aiSummary || !item.description) {
      continue;
    }

    const summary = await summarizeWithGemini(item);
    if (summary) {
      item.aiSummary = summary;
    }
  }
}
