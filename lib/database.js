import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'news.json');

// Veritabanı klasörünü oluştur (ilk kullanımda)
let dbInitialized = false;
async function ensureDBDir() {
  if (!dbInitialized) {
    try {
      await fs.mkdir(DB_DIR, { recursive: true });
      dbInitialized = true;
    } catch (err) {
      // Klasör zaten varsa sorun yok
      dbInitialized = true;
    }
  }
}

// Veritabanını yükle
async function loadDB() {
  await ensureDBDir();
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    // Dosya yoksa boş veritabanı döndür
    return { news: [], lastCleanup: null };
  }
}

// Veritabanını kaydet
async function saveDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Haber ekleme/güncelleme
export async function saveNewsItems(items) {
  const db = await loadDB();
  const newsMap = new Map();
  
  // Mevcut haberleri map'e ekle
  for (const item of db.news) {
    newsMap.set(item.link, item);
  }
  
  // Yeni haberleri ekle/güncelle
  let saved = 0;
  for (const item of items) {
    const id = item.id || item.link;
    const existing = newsMap.get(item.link);
    
    if (existing) {
      // Güncelle
      Object.assign(existing, {
        id,
        title: item.title || existing.title,
        link: item.link || existing.link,
        description: item.description || existing.description,
        summary: item.summary || existing.summary,
        preview: item.preview || existing.preview,
        source: item.source || existing.source,
        category: item.category || existing.category,
        publishedAt: item.publishedAt || existing.publishedAt,
        aiSummary: item.aiSummary || existing.aiSummary,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Yeni ekle
      newsMap.set(item.link, {
        id,
        title: item.title || '',
        link: item.link || '',
        description: item.description || null,
        summary: item.summary || null,
        preview: item.preview || null,
        source: item.source || 'Bilinmeyen',
        category: item.category || null,
        publishedAt: item.publishedAt || new Date().toISOString(),
        aiSummary: item.aiSummary || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      saved++;
    }
  }
  
  // Array'e çevir ve kaydet
  db.news = Array.from(newsMap.values());
  await saveDB(db);
  
  return saved;
}

// Tüm haberleri getir
export async function getAllNewsFromDB() {
  const db = await loadDB();
  // Tarihe göre sırala (en yeni önce)
  return db.news.sort((a, b) => 
    new Date(b.publishedAt) - new Date(a.publishedAt)
  );
}

// Haberleri getir (limit/offset ile)
export async function getNewsFromDB(limit = 200, offset = 0) {
  const allNews = await getAllNewsFromDB();
  return allNews.slice(offset, offset + limit);
}

// Kategorilere göre sayma
export async function getCategoriesFromDB() {
  const db = await loadDB();
  const counts = {};
  
  for (const item of db.news) {
    if (item.category) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
  }
  
  return Object.entries(counts).map(([category, count]) => ({ category, count }));
}

// Kaynaklara göre sayma
export async function getSourcesFromDB() {
  const db = await loadDB();
  const counts = {};
  
  for (const item of db.news) {
    const source = item.source || 'Bilinmeyen';
    counts[source] = (counts[source] || 0) + 1;
  }
  
  return Object.entries(counts).map(([source, count]) => ({ source, count }));
}

// Eski haberleri temizle (30 günden eski)
export async function cleanOldNewsFromDB() {
  const db = await loadDB();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const initialCount = db.news.length;
  db.news = db.news.filter(item => {
    const publishedDate = new Date(item.publishedAt);
    return publishedDate >= thirtyDaysAgo;
  });
  
  const deleted = initialCount - db.news.length;
  db.lastCleanup = new Date().toISOString();
  await saveDB(db);
  
  return { changes: deleted };
}

// Toplam haber sayısı
export async function getTotalNewsCount() {
  const db = await loadDB();
  return db.news.length;
}
