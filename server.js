import './lib/env.js';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeWithGemini, isGeminiEnabled } from './lib/gemini.js';
import { 
  saveNewsItems, 
  getAllNewsFromDB, 
  cleanOldNewsFromDB,
  getTotalNewsCount 
} from './lib/database.js';
import { 
  analyzeNewsBatch, 
  sortByImportance, 
  filterPublishable 
} from './lib/ai-news-manager.js';
import { 
  researchAndGenerateNews, 
  searchAndGenerateNews,
  generateTrendingNews 
} from './lib/ai-researcher.js';

const PORT = process.env.PORT || 3000;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes (daha sÄ±k gÃ¼ncelleme)
const MAX_RESULTS = 200;
const DISABLE_RSS = (process.env.DISABLE_RSS || 'false').toLowerCase() === 'true';

const RSS_SOURCES = [
  { name: 'TRT Haber', url: 'https://www.trthaber.com/manset.rss', category: 'gÃ¼ndem' },
  { name: 'Anadolu AjansÄ±', url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel', category: 'gÃ¼ndem' },
  { name: 'HabertÃ¼rk', url: 'https://www.haberturk.com/rss/manset.xml', category: 'gÃ¼ndem' },
  { name: 'NTV', url: 'https://www.ntv.com.tr/gundem.rss', category: 'gÃ¼ndem' },
  { name: 'SÃ¶zcÃ¼', url: 'https://www.sozcu.com.tr/rss/anasayfa.xml', category: 'gÃ¼ndem' },
  { name: 'Sabah', url: 'https://www.sabah.com.tr/rss/gundem.xml', category: 'gÃ¼ndem' },
  { name: 'HÃ¼rriyet', url: 'https://www.hurriyet.com.tr/rss/gundem', category: 'gÃ¼ndem' },
  { name: 'Milliyet', url: 'https://www.milliyet.com.tr/rss/rssNew/gundemRSS.xml', category: 'gÃ¼ndem' },
  { name: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/rss/son_dakika.xml', category: 'gÃ¼ndem' },
  { name: 'Yeni Åafak', url: 'https://www.yenisafak.com/rss/gundem.xml', category: 'gÃ¼ndem' },
  { name: 'Takvim', url: 'https://www.takvim.com.tr/rss/guncel.xml', category: 'gÃ¼ndem' },
  { name: 'Star', url: 'https://www.star.com.tr/rss/gundem.xml', category: 'gÃ¼ndem' },
  { name: 'Mynet Haber', url: 'https://www.mynet.com/haber/rss/kategori/gundem', category: 'gÃ¼ndem' },
  { name: 'SonDakika.com', url: 'https://www.sondakika.com/rss/', category: 'gÃ¼ndem' },
  { name: 'En Son Haber', url: 'https://www.ensonhaber.com/rss/ensonhaber.xml', category: 'gÃ¼ndem' },
  { name: 'CNN TÃ¼rk', url: 'https://www.cnnturk.com/feed/rss/turkiye/news', category: 'gÃ¼ndem' },
  { name: 'TRT Spor', url: 'https://www.trthaber.com/spor.rss', category: 'spor' },
  { name: 'Fanatik', url: 'https://www.fanatik.com.tr/rss/spor.xml', category: 'spor' },
  { name: 'NTV Spor', url: 'https://www.ntv.com.tr/spor.rss', category: 'spor' },
  { name: 'Sabah Spor', url: 'https://www.sabah.com.tr/rss/spor.xml', category: 'spor' },
  { name: 'HÃ¼rriyet Spor', url: 'https://www.hurriyet.com.tr/rss/spor', category: 'spor' },
  { name: 'TRT Ekonomi', url: 'https://www.trthaber.com/ekonomi.rss', category: 'ekonomi' },
  { name: 'Sabah Ekonomi', url: 'https://www.sabah.com.tr/rss/ekonomi.xml', category: 'ekonomi' },
  { name: 'HÃ¼rriyet Ekonomi', url: 'https://www.hurriyet.com.tr/rss/ekonomi', category: 'ekonomi' },
  { name: 'NTV Teknoloji', url: 'https://www.ntv.com.tr/teknoloji.rss', category: 'teknoloji' },
  { name: 'TRT Teknoloji', url: 'https://www.trthaber.com/teknoloji.rss', category: 'teknoloji' },
  { name: 'Karaman GÃ¼ndem', url: 'https://www.karamangundem.com/rss', category: 'karaman' },
  { name: 'Karaman Haber', url: 'https://www.karamanhaber.com/feed/', category: 'karaman' },
  { name: 'Karamandan', url: 'https://www.karamandan.com/rss', category: 'karaman' },
  { name: 'Karaman PostasÄ±', url: 'https://www.karamanpostasi.com/rss', category: 'karaman' },
  { name: 'Karaman ManÅŸet', url: 'https://www.karamanmanset.com/rss', category: 'karaman' }
];

const STOP_WORDS = new Set([
  've',
  'veya',
  'ile',
  'ama',
  'fakat',
  'ancak',
  'ise',
  'iÃ§in',
  'bir',
  'birkaÃ§',
  'daha',
  'Ã§ok',
  'az',
  'bu',
  'ÅŸu',
  'o',
  'da',
  'de',
  'ki',
  'mi',
  'ne',
  'nasÄ±l',
  'niÃ§in',
  'neden',
  'yada',
  'olarak',
  'Ã¼zere',
  'gibi',
  'hem',
  'her',
  'tÃ¼m',
  'artÄ±k',
  'zaten',
  'ise'
]);

const GEMINI_SUMMARY_MAX_ITEMS = Number(process.env.GEMINI_SUMMARY_MAX_ITEMS || 10);

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

  // AI AraÅŸtÄ±rma Endpoint
  if (url.pathname === '/api/ai-research') {
    await handleAIResearchEndpoint(req, res);
    return;
  }

  // PopÃ¼ler haberler (AI ile otomatik Ã¼retim)
  if (url.pathname === '/api/trending') {
    await handleTrendingEndpoint(res);
    return;
  }

  // Render uyku modu Ã¶nleme endpoint'i
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
    const categoryFilter = url.searchParams.get('category') || '';
    const sortBy = url.searchParams.get('sort') || 'importance'; // importance, newest, oldest
    const dateFilter = url.searchParams.get('date') || ''; // today, week, month
    const importanceMin = Number(url.searchParams.get('importanceMin') || 0);
    const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') || MAX_RESULTS), MAX_RESULTS));
    const items = await getNewsItems();

    const importanceScore = (item) => {
      const aiImportance = item.importance ?? item.aiAnalysis?.importance;
      if (typeof aiImportance === 'number') return aiImportance;
      return 0;
    };

    let filtered = items.filter((item) => {
      const matchesSource = sourceFilter ? item.source === sourceFilter : true;
      const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
      const matchesImportance = importanceScore(item) >= importanceMin;
      
      // Tarih filtresi
      let matchesDate = true;
      if (dateFilter) {
        const itemDate = new Date(item.publishedAt);
        const now = new Date();
        const diffMs = now - itemDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (dateFilter === 'today' && diffDays > 1) matchesDate = false;
        else if (dateFilter === 'week' && diffDays > 7) matchesDate = false;
        else if (dateFilter === 'month' && diffDays > 30) matchesDate = false;
      }
      
      if (!query) {
        return matchesSource && matchesCategory && matchesDate && matchesImportance;
      }
      const haystack = `${item.title} ${item.summary} ${item.description}`.toLowerCase();
      return matchesSource && matchesCategory && matchesDate && matchesImportance && haystack.includes(query);
    });

    // Sıralama
    if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
    } else if (sortBy === 'importance') {
      filtered.sort((a, b) => {
        const diff = importanceScore(b) - importanceScore(a);
        return diff !== 0 ? diff : new Date(b.publishedAt) - new Date(a.publishedAt);
      });
    } else {
      filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }

    const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort();

    const payload = {
      updatedAt: new Date(cache.timestamp).toISOString(),
      total: filtered.length,
      sources: RSS_SOURCES.map((s) => s.name),
      categories,
      items: filtered.slice(0, limit)
    };

    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
  } catch (error) {
    console.error('API hatası:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Haberlere ulaşılamadı. Lütfen daha sonra tekrar deneyin.' }));
  }
}// AI AraÅŸtÄ±rma Endpoint Handler
async function handleAIResearchEndpoint(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
    }

    const { query } = JSON.parse(body || '{}');

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Arama sorgusu en az 3 karakter olmalı' }));
      return;
    }

    console.log(`AI araştırma isteği: "${query}"`);

    // Gemini yoksa veritabanında ara ve dön
    if (!isGeminiEnabled) {
      const all = await getAllNewsFromDB();
      const hay = query.trim().toLowerCase();
      const matched = all
        .filter((item) => {
          const text = `${item.title || ''} ${item.summary || ''} ${item.description || ''}`.toLowerCase();
          return text.includes(hay);
        })
        .slice(0, 50);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({
        success: true,
        query: query.trim(),
        articles: matched,
        count: matched.length,
        generatedAt: new Date().toISOString(),
        fallback: 'db-search'
      }));
      return;
    }

    // AI ile haber araştır ve üret
    const articles = await searchAndGenerateNews(query.trim());

    // Veritabanına kaydet
    if (articles.length > 0) {
      try {
        await saveNewsItems(articles);
        console.log(${articles.length} AI üretilen haber kaydedildi);
      } catch (dbError) {
        console.warn('Veritabanı kayıt hatası:', dbError.message);
      }
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      success: true,
      query: query.trim(),
      articles: articles,
      count: articles.length,
      generatedAt: new Date().toISOString()
    }));

  } catch (error) {
    console.error('AI araştırma hatası:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: error.message || 'AI araştırma yapılamadı. Lütfen daha sonra tekrar deneyin.'
    }));
  }
}
async function handleTrendingEndpoint(res) {
  try {
    console.log('ğŸ“ˆ PopÃ¼ler haberler Ã¼retiliyor...');
    
    const articles = await generateTrendingNews();
    
    // VeritabanÄ±na kaydet
    if (articles.length > 0) {
      try {
        await saveNewsItems(articles);
        console.log(`âœ… ${articles.length} popÃ¼ler haber kaydedildi`);
      } catch (dbError) {
        console.warn('VeritabanÄ± kayÄ±t hatasÄ±:', dbError.message);
      }
    }

    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      success: true,
      articles: articles,
      count: articles.length,
      generatedAt: new Date().toISOString()
    }));

  } catch (error) {
    console.error('PopÃ¼ler haberler hatasÄ±:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: error.message || 'PopÃ¼ler haberler Ã¼retilemedi.' 
    }));
  }
}

async function serveStaticFile(requestPath, res) {
  try {
    // Yeni tasarÄ±m iÃ§in index-new.html'i varsayÄ±lan yap
    let safePath = requestPath === '/' ? '/index-new.html' : requestPath;
    
    // Eski index.html'e yÃ¶nlendirme (opsiyonel)
    if (requestPath === '/old' || requestPath === '/index-old.html') {
      safePath = '/index.html';
    }
    
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
    res.end('Sayfa bulunamadÄ±');
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
  try {
    const now = Date.now();
    if (DISABLE_RSS) {
      const dbNews = await getAllNewsFromDB();
      const sorted = dbNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      cache.items = sorted;
      cache.timestamp = now;
      return sorted;
    }
    // Cache kontrolÃ¼ (hÄ±zlÄ± yanÄ±t iÃ§in)
    if (cache.items.length && now - cache.timestamp < CACHE_TTL) {
      return cache.items;
    }

    // RSS'den yeni haberleri Ã§ek
    const responses = await Promise.allSettled(RSS_SOURCES.map(fetchSource));
    const collected = [];

    for (const result of responses) {
      if (result.status === 'fulfilled') {
        collected.push(...result.value);
      } else {
        console.warn('Kaynak alÄ±namadÄ±:', result.reason?.message || result.reason);
      }
    }

    const deduped = dedupeItems(collected);
    deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    // ğŸ¤– AI ile haber analizi (Ã¶nem, kategori, etiketler, yayÄ±nla mÄ±)
    console.log('ğŸ¤– AI haber analizi baÅŸlatÄ±lÄ±yor...');
    const AI_ANALYSIS_LIMIT = Number(process.env.AI_ANALYSIS_LIMIT || 30); // Ä°lk 30 haberi analiz et
    const analyzed = await analyzeNewsBatch(deduped, AI_ANALYSIS_LIMIT);
    // Gemini varsa özet ekle
    if (isGeminiEnabled) {
      await attachGeminiSummaries(analyzed);
    }
    
    // Ã–nem skoruna gÃ¶re sÄ±rala (AI'nÄ±n Ã¶nerdiÄŸi Ã¶nemli haberler Ã¶nce)
    const sortedByImportance = sortByImportance(analyzed);
    
    // YayÄ±nlanacak haberleri filtrele (AI spam/Ã¶nemsiz haberleri filtreler)
    const publishable = filterPublishable(sortedByImportance);
    
    console.log(`ğŸ¤– AI: ${analyzed.length} haber analiz edildi, ${publishable.length} haber yayÄ±nlanacak`);

    // VeritabanÄ±na kaydet (otomatik)
    if (publishable.length > 0) {
      try {
        const saved = await saveNewsItems(publishable);
        console.log(`âœ… ${saved} haber veritabanÄ±na kaydedildi`);
      } catch (dbError) {
        console.warn('VeritabanÄ± kayÄ±t hatasÄ±:', dbError.message);
      }
    }

    // VeritabanÄ±ndan tÃ¼m haberleri al (RSS kesilse bile iÃ§erik var)
    let dbNews = [];
    try {
      dbNews = await getAllNewsFromDB();
      console.log(`ğŸ“Š VeritabanÄ±nda ${dbNews.length} haber var`);
    } catch (dbError) {
      console.warn('VeritabanÄ± okuma hatasÄ±:', dbError.message);
    }

    // RSS'den gelen yeni haberler + veritabanÄ±ndaki eski haberler
    // Yeni haberler Ã¶ncelikli, sonra veritabanÄ±ndan
    const allNews = [...publishable];
    const existingLinks = new Set(publishable.map(item => item.link));
    
    // VeritabanÄ±ndan sadece RSS'de olmayan haberleri ekle
    for (const dbItem of dbNews) {
      if (!existingLinks.has(dbItem.link)) {
        allNews.push({
          id: dbItem.id,
          title: dbItem.title,
          link: dbItem.link,
          description: dbItem.description,
          summary: dbItem.summary,
          preview: dbItem.preview,
          source: dbItem.source,
          category: dbItem.category,
          publishedAt: dbItem.publishedAt,
          aiSummary: dbItem.aiSummary
        });
      }
    }

    // Tarihe gÃ¶re sÄ±rala
    allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Cache'i gÃ¼ncelle
    cache.items = allNews;
    cache.timestamp = now;

    // Eski haberleri temizle (30 gÃ¼nden eski, arka planda)
    setImmediate(async () => {
      try {
        const deleted = await cleanOldNewsFromDB();
        if (deleted.changes > 0) {
          console.log(`ğŸ§¹ ${deleted.changes} eski haber temizlendi`);
        }
      } catch (err) {
        // Sessizce devam et
      }
    });

    return allNews;
  } catch (error) {
    console.error('getNewsItems hatasÄ±:', error);
    
    // Hata durumunda veritabanÄ±ndan oku
    try {
      const dbNews = await getAllNewsFromDB();
      if (dbNews.length > 0) {
        console.log('âš ï¸ RSS hatasÄ±, veritabanÄ±ndan haberler gÃ¶steriliyor');
        return dbNews.map(item => ({
          id: item.id,
          title: item.title,
          link: item.link,
          description: item.description,
          summary: item.summary,
          preview: item.preview,
          source: item.source,
          category: item.category,
          publishedAt: item.publishedAt,
          aiSummary: item.aiSummary
        }));
      }
    } catch (dbError) {
      console.warn('VeritabanÄ± yedek okuma hatasÄ±:', dbError.message);
    }
    
    return cache.items.length > 0 ? cache.items : [];
  }
}

async function fetchSource(source) {
  const response = await fetch(source.url, { headers: { 'User-Agent': 'HaberOkuyoruzBot/1.0 (+https://haberokuyoruz.com)' } });
  if (!response.ok) {
    throw new Error(`${source.name} kaynak hatasÄ±: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parseRss(xml).map((item) => ({
    ...item,
    source: source.name,
    category: detectCategory(item, source.category)
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
    .match(/[a-z\u00c0-\u024fÄ±ÄŸÃ¼ÅŸÃ¶Ã§Ä°ÄÃœÅÃ–Ã‡]+/g)
    ?.filter((word) => !STOP_WORDS.has(word)) || [];

  const frequencies = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  const sentenceScores = sentences.map((sentence, index) => {
    const sentenceWords =
      sentence
        .toLowerCase()
        .match(/[a-z\u00c0-\u024fÄ±ÄŸÃ¼ÅŸÃ¶Ã§Ä°ÄÃœÅÃ–Ã‡]+/g)
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
  return `${trimmed.slice(0, limit).trim()}â€¦`;
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

  // Sadece ilk 10 Ã¶nemli haber iÃ§in AI Ã¶zeti (performans iÃ§in)
  const limit = Math.min(10, items.length);
  const promises = [];
  
  for (let index = 0; index < limit; index += 1) {
    const item = items[index];
    if (!item || item.aiSummary || !item.description || item.description.length < 100) {
      continue;
    }

    // Paralel iÅŸlem iÃ§in promise array'e ekle
    promises.push(
      summarizeWithGemini(item).then(summary => {
        if (summary) {
          item.aiSummary = summary;
        }
      }).catch(() => {
        // Hata durumunda sessizce devam et
      })
    );
  }

  // TÃ¼m AI isteklerini paralel Ã§alÄ±ÅŸtÄ±r
  await Promise.allSettled(promises);
}


// Override detectCategory with ASCII-safe keywords to avoid encoding issues
function detectCategory(item, sourceCategory) {
  if (sourceCategory === 'karaman') return 'karaman';

  const text = ((item.title || '') + ' ' + (item.description || '')).toLocaleLowerCase('tr-TR');

  const categoryKeywords = {
    ekonomi: ['ekonomi','borsa','dolar','euro','tl','enflasyon','faiz','piyasa','yatirim','kredi','butce','maliye','finans','bankacilik','hisse','senedi','endeks','doviz','altin','petrol','enerji','sanayi'],
    spor: ['spor','futbol','basketbol','tenis','voleybol','atletizm','takim','lig','mac','gol','sampiyon','futbolcu','antrenor'],
    teknoloji: ['teknoloji','yapay zeka','ai','yazilim','donanim','telefon','bilgisayar','internet','dijital','uygulama','siber'],
    saglik: ['saglik','hastane','doktor','tedavi','ilac','virus','hastalik','asi','saglik bakanligi','ameliyat'],
    siyaset: ['siyaset','parti','secim','meclis','bakan','cumhurbaskani','basbakan','milletvekili','oy','secmen'],
    kultur: ['kultur','sanat','sinema','muzik','kitap','tiyatro','sergi','konser','film','dizi'],
    dunya: ['dunya','uluslararasi','abd','avrupa','rusya','cin','nato','bm','birlesmis milletler','avrupa birligi']
  };

  const scores = {};
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    scores[category] = keywords.filter((kw) => text.includes(kw)).length;
  }

  let bestCategory = sourceCategory || 'gundem';
  let bestScore = scores[bestCategory] || 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestCategory : (sourceCategory || 'gundem');
}




