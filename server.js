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

const PORT = process.env.PORT || 3000;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes (daha sık güncelleme)
const MAX_RESULTS = 200;

const RSS_SOURCES = [
  { name: 'TRT Haber', url: 'https://www.trthaber.com/manset.rss', category: 'gündem' },
  { name: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel', category: 'gündem' },
  { name: 'Habertürk', url: 'https://www.haberturk.com/rss/manset.xml', category: 'gündem' },
  { name: 'NTV', url: 'https://www.ntv.com.tr/gundem.rss', category: 'gündem' },
  { name: 'Sözcü', url: 'https://www.sozcu.com.tr/rss/anasayfa.xml', category: 'gündem' },
  { name: 'Sabah', url: 'https://www.sabah.com.tr/rss/gundem.xml', category: 'gündem' },
  { name: 'Hürriyet', url: 'https://www.hurriyet.com.tr/rss/gundem', category: 'gündem' },
  { name: 'Milliyet', url: 'https://www.milliyet.com.tr/rss/rssNew/gundemRSS.xml', category: 'gündem' },
  { name: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/rss/son_dakika.xml', category: 'gündem' },
  { name: 'Yeni Şafak', url: 'https://www.yenisafak.com/rss/gundem.xml', category: 'gündem' },
  { name: 'Takvim', url: 'https://www.takvim.com.tr/rss/guncel.xml', category: 'gündem' },
  { name: 'Star', url: 'https://www.star.com.tr/rss/gundem.xml', category: 'gündem' },
  { name: 'Mynet Haber', url: 'https://www.mynet.com/haber/rss/kategori/gundem', category: 'gündem' },
  { name: 'SonDakika.com', url: 'https://www.sondakika.com/rss/', category: 'gündem' },
  { name: 'En Son Haber', url: 'https://www.ensonhaber.com/rss/ensonhaber.xml', category: 'gündem' },
  { name: 'CNN Türk', url: 'https://www.cnnturk.com/feed/rss/turkiye/news', category: 'gündem' },
  { name: 'TRT Spor', url: 'https://www.trthaber.com/spor.rss', category: 'spor' },
  { name: 'Fanatik', url: 'https://www.fanatik.com.tr/rss/spor.xml', category: 'spor' },
  { name: 'NTV Spor', url: 'https://www.ntv.com.tr/spor.rss', category: 'spor' },
  { name: 'Sabah Spor', url: 'https://www.sabah.com.tr/rss/spor.xml', category: 'spor' },
  { name: 'Hürriyet Spor', url: 'https://www.hurriyet.com.tr/rss/spor', category: 'spor' },
  { name: 'TRT Ekonomi', url: 'https://www.trthaber.com/ekonomi.rss', category: 'ekonomi' },
  { name: 'Sabah Ekonomi', url: 'https://www.sabah.com.tr/rss/ekonomi.xml', category: 'ekonomi' },
  { name: 'Hürriyet Ekonomi', url: 'https://www.hurriyet.com.tr/rss/ekonomi', category: 'ekonomi' },
  { name: 'NTV Teknoloji', url: 'https://www.ntv.com.tr/teknoloji.rss', category: 'teknoloji' },
  { name: 'TRT Teknoloji', url: 'https://www.trthaber.com/teknoloji.rss', category: 'teknoloji' },
  { name: 'Karaman Gündem', url: 'https://www.karamangundem.com/rss', category: 'karaman' },
  { name: 'Karaman Haber', url: 'https://www.karamanhaber.com/feed/', category: 'karaman' },
  { name: 'Karamandan', url: 'https://www.karamandan.com/rss', category: 'karaman' },
  { name: 'Karaman Postası', url: 'https://www.karamanpostasi.com/rss', category: 'karaman' },
  { name: 'Karaman Manşet', url: 'https://www.karamanmanset.com/rss', category: 'karaman' }
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
    const categoryFilter = url.searchParams.get('category') || '';
    const sortBy = url.searchParams.get('sort') || 'newest'; // newest, oldest
    const dateFilter = url.searchParams.get('date') || ''; // today, week, month
    const items = await getNewsItems();

    let filtered = items.filter((item) => {
      const matchesSource = sourceFilter ? item.source === sourceFilter : true;
      const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
      
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
        return matchesSource && matchesCategory && matchesDate;
      }
      const haystack = `${item.title} ${item.summary} ${item.description}`.toLowerCase();
      return matchesSource && matchesCategory && matchesDate && haystack.includes(query);
    });

    // Sıralama
    if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
    } else {
      filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }

    // Kategorileri topla
    const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort();

    const payload = {
      updatedAt: new Date(cache.timestamp).toISOString(),
      total: filtered.length,
      sources: RSS_SOURCES.map((s) => s.name),
      categories,
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
  try {
    const now = Date.now();
    
    // Cache kontrolü (hızlı yanıt için)
    if (cache.items.length && now - cache.timestamp < CACHE_TTL) {
      return cache.items;
    }

    // RSS'den yeni haberleri çek
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
    
    // 🤖 AI ile haber analizi (önem, kategori, etiketler, yayınla mı)
    console.log('🤖 AI haber analizi başlatılıyor...');
    const AI_ANALYSIS_LIMIT = Number(process.env.AI_ANALYSIS_LIMIT || 30); // İlk 30 haberi analiz et
    const analyzed = await analyzeNewsBatch(deduped, AI_ANALYSIS_LIMIT);
    
    // AI özetleri oluştur
    await attachGeminiSummaries(analyzed);
    
    // Önem skoruna göre sırala (AI'nın önerdiği önemli haberler önce)
    const sortedByImportance = sortByImportance(analyzed);
    
    // Yayınlanacak haberleri filtrele (AI spam/önemsiz haberleri filtreler)
    const publishable = filterPublishable(sortedByImportance);
    
    console.log(`🤖 AI: ${analyzed.length} haber analiz edildi, ${publishable.length} haber yayınlanacak`);

    // Veritabanına kaydet (otomatik)
    if (publishable.length > 0) {
      try {
        const saved = await saveNewsItems(publishable);
        console.log(`✅ ${saved} haber veritabanına kaydedildi`);
      } catch (dbError) {
        console.warn('Veritabanı kayıt hatası:', dbError.message);
      }
    }

    // Veritabanından tüm haberleri al (RSS kesilse bile içerik var)
    let dbNews = [];
    try {
      dbNews = await getAllNewsFromDB();
      console.log(`📊 Veritabanında ${dbNews.length} haber var`);
    } catch (dbError) {
      console.warn('Veritabanı okuma hatası:', dbError.message);
    }

    // RSS'den gelen yeni haberler + veritabanındaki eski haberler
    // Yeni haberler öncelikli, sonra veritabanından
    const allNews = [...publishable];
    const existingLinks = new Set(publishable.map(item => item.link));
    
    // Veritabanından sadece RSS'de olmayan haberleri ekle
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

    // Tarihe göre sırala
    allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Cache'i güncelle
    cache.items = allNews;
    cache.timestamp = now;

    // Eski haberleri temizle (30 günden eski, arka planda)
    setImmediate(async () => {
      try {
        const deleted = await cleanOldNewsFromDB();
        if (deleted.changes > 0) {
          console.log(`🧹 ${deleted.changes} eski haber temizlendi`);
        }
      } catch (err) {
        // Sessizce devam et
      }
    });

    return allNews;
  } catch (error) {
    console.error('getNewsItems hatası:', error);
    
    // Hata durumunda veritabanından oku
    try {
      const dbNews = await getAllNewsFromDB();
      if (dbNews.length > 0) {
        console.log('⚠️ RSS hatası, veritabanından haberler gösteriliyor');
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
      console.warn('Veritabanı yedek okuma hatası:', dbError.message);
    }
    
    return cache.items.length > 0 ? cache.items : [];
  }
}

async function fetchSource(source) {
  const response = await fetch(source.url, { headers: { 'User-Agent': 'HaberOkuyoruzBot/1.0 (+https://haberokuyoruz.com)' } });
  if (!response.ok) {
    throw new Error(`${source.name} kaynak hatası: ${response.status}`);
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


function detectCategory(item, sourceCategory) {
  // Özel kategorileri koru (karaman gibi)
  if (sourceCategory === 'karaman') {
    return 'karaman';
  }
  
  const text = `${item.title} ${item.description || ''}`.toLowerCase();
  
  // ÖNCE: Ekonomi OLMAYAN kelimeleri kontrol et (öncelikli)
  const ekonomiOlmayanKelime = [
    'şehit', 'şehid', 'asker', 'askeri', 'kaza', 'uçak', 'düşen', 'düştü', 'ölü', 'yaralı',
    'milli savunma', 'msb', 'tsk', 'silahlı kuvvetler', 'hava kuvvetleri', 'kara kuvvetleri',
    'cenaze', 'naaş', 'kahraman', 'vatan', 'bayrak', 'tören', 'anma', 'uğurlama', 'uğurluyoruz',
    'gürcistan', 'kafkasya', 'kara kutu', 'herkül', 'c-130', 'c130', 'c130 herkül',
    'deprem', 'sel', 'yangın', 'afet', 'doğal afet',
    'suç', 'cinayet', 'tutuklama', 'mahkeme', 'dava', 'polis', 'jandarma',
    'sağlık', 'hastane', 'doktor', 'tedavi', 'zehir', 'zehirlenme', 'entübe',
    'güzellik', 'botoks', 'dermatoloji', 'çocuk', 'çocuklar'
  ];
  
  const ekonomiOlmayanSkor = ekonomiOlmayanKelime.filter(kw => text.includes(kw)).length;
  
  // Eğer ekonomi olmayan kelimeler varsa, kesinlikle ekonomi değil (kaynak ne olursa olsun)
  if (ekonomiOlmayanSkor > 0) {
    // Eğer kaynak ekonomi ise ama içerik ekonomi değilse, gündem yap
    if (sourceCategory === 'ekonomi') {
      // Gündem kategorisine ait kelimeleri kontrol et
      const gundemKelime = ['gündem', 'haber', 'son dakika', 'güncel', 'olay', 'gelişme'];
      if (gundemKelime.some(kw => text.includes(kw))) {
        return 'gündem';
      }
      // Diğer kategorilere bak
      const categoryKeywords = {
        spor: ['spor', 'futbol', 'basketbol', 'tenis', 'voleybol', 'atletizm', 'takım', 'lig', 'maç', 'gol', 'şampiyon', 'futbolcu', 'antrenör'],
        teknoloji: ['teknoloji', 'yapay zeka', 'ai', 'yazılım', 'donanım', 'telefon', 'bilgisayar', 'internet', 'dijital', 'uygulama', 'app', 'siber'],
        sağlık: ['sağlık', 'hastane', 'doktor', 'tedavi', 'ilaç', 'virüs', 'hastalık', 'aşı', 'sağlık bakanlığı', 'ameliyat', 'zehir', 'zehirlenme', 'entübe', 'güzellik', 'botoks', 'dermatoloji'],
        siyaset: ['siyaset', 'parti', 'seçim', 'meclis', 'bakan', 'cumhurbaşkanı', 'başbakan', 'milletvekili', 'oy', 'seçmen'],
        kültür: ['kültür', 'sanat', 'sinema', 'müzik', 'kitap', 'tiyatro', 'sergi', 'konser', 'film', 'dizi'],
        dünya: ['dünya', 'uluslararası', 'abd', 'avrupa', 'rusya', 'çin', 'nato', 'bm', 'birleşmiş milletler', 'avrupa birliği']
      };
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          return category;
        }
      }
      
      return 'gündem';
    }
    // Kaynak ekonomi değilse, normal kategori tespitine devam et
  }
  
  // Kaynak kategorisini kullan (ama ekonomi için çok sıkı kontrol)
  if (sourceCategory && sourceCategory !== 'gündem') {
    if (sourceCategory === 'ekonomi') {
      const ekonomiKeywords = ['ekonomi', 'borsa', 'dolar', 'euro', 'tl', 'enflasyon', 'faiz', 'piyasa', 'şirket', 'yatırım', 'kredi', 'bütçe', 'maliye', 'finans', 'bankacılık', 'hisse', 'senedi', 'endeks', 'hisse senedi', 'döviz', 'altın', 'petrol', 'enerji', 'sanayi', 'üretim', 'ihracat', 'ithalat', 'gdp', 'gsyh', 'kara para', 'aklama', 'coino', 'kripto', 'bitcoin', 'kripto para'];
      const ekonomiKelimeSayisi = ekonomiKeywords.filter(kw => text.includes(kw)).length;
      
      // Başlıkta ekonomi kelimesi kontrolü
      const baslikEkonomi = item.title.toLowerCase().includes('ekonomi') || 
                           item.title.toLowerCase().includes('borsa') || 
                           item.title.toLowerCase().includes('dolar') ||
                           item.title.toLowerCase().includes('enflasyon') ||
                           item.title.toLowerCase().includes('faiz') ||
                           item.title.toLowerCase().includes('kara para') ||
                           item.title.toLowerCase().includes('aklama');
      
      // En az 2 ekonomi kelimesi olmalı VEYA başlıkta ekonomi kelimesi olmalı
      // Ayrıca ekonomi olmayan kelimeler olmamalı (yukarıda kontrol edildi)
      if (ekonomiKelimeSayisi < 2 && !baslikEkonomi) {
        return 'gündem';
      }
      
      // Eğer ekonomi kelimeleri varsa ama ekonomi olmayan kelimeler de varsa, gündem yap
      if (ekonomiOlmayanSkor > 0 && ekonomiKelimeSayisi < 3) {
        return 'gündem';
      }
    }
    return sourceCategory;
  }
  
  // Başlık ve içerikten kategori tespiti
  const categoryKeywords = {
    spor: ['spor', 'futbol', 'basketbol', 'tenis', 'voleybol', 'atletizm', 'takım', 'lig', 'maç', 'gol', 'şampiyon', 'futbolcu', 'antrenör'],
    ekonomi: ['ekonomi', 'borsa', 'dolar', 'euro', 'tl', 'enflasyon', 'faiz', 'piyasa', 'şirket', 'yatırım', 'kredi', 'bütçe', 'maliye', 'finans', 'bankacılık', 'hisse', 'senedi', 'endeks', 'döviz', 'altın', 'petrol'],
    teknoloji: ['teknoloji', 'yapay zeka', 'ai', 'yazılım', 'donanım', 'telefon', 'bilgisayar', 'internet', 'dijital', 'uygulama', 'app', 'siber'],
    sağlık: ['sağlık', 'hastane', 'doktor', 'tedavi', 'ilaç', 'virüs', 'hastalık', 'aşı', 'sağlık bakanlığı', 'ameliyat', 'tedavi'],
    siyaset: ['siyaset', 'parti', 'seçim', 'meclis', 'bakan', 'cumhurbaşkanı', 'başbakan', 'milletvekili', 'oy', 'seçmen'],
    kültür: ['kültür', 'sanat', 'sinema', 'müzik', 'kitap', 'tiyatro', 'sergi', 'konser', 'film', 'dizi'],
    dünya: ['dünya', 'uluslararası', 'abd', 'avrupa', 'rusya', 'çin', 'nato', 'bm', 'birleşmiş milletler', 'avrupa birliği']
  };
  
  // Her kategori için skor hesapla
  const categoryScores = {};
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter(keyword => text.includes(keyword)).length;
    if (score > 0) {
      categoryScores[category] = score;
    }
  }
  
  // En yüksek skora sahip kategoriyi döndür
  if (Object.keys(categoryScores).length > 0) {
    const bestCategory = Object.entries(categoryScores).sort((a, b) => b[1] - a[1])[0][0];
    return bestCategory;
  }
  
  return sourceCategory || 'gündem';
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

  // Sadece ilk 10 önemli haber için AI özeti (performans için)
  const limit = Math.min(10, items.length);
  const promises = [];
  
  for (let index = 0; index < limit; index += 1) {
    const item = items[index];
    if (!item || item.aiSummary || !item.description || item.description.length < 100) {
      continue;
    }

    // Paralel işlem için promise array'e ekle
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

  // Tüm AI isteklerini paralel çalıştır
  await Promise.allSettled(promises);
}
