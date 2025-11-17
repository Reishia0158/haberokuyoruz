import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isGeminiEnabled } from './gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const SOURCES_PATH = path.join(DATA_DIR, 'sources.json');
const MAX_AI_SOURCES = 20;
const FETCH_TIMEOUT_MS = Number(process.env.SOURCE_FETCH_TIMEOUT_MS || 8000);

// Varsayılan çekirdek RSS listesi (AI başarısız olursa geri düşmek için)
const DEFAULT_SOURCES = [
  { name: 'TRT Haber', url: 'https://www.trthaber.com/manset.rss', category: 'gundem' },
  { name: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel', category: 'gundem' },
  { name: 'Haberturk', url: 'https://www.haberturk.com/rss/manset.xml', category: 'gundem' },
  { name: 'NTV', url: 'https://www.ntv.com.tr/gundem.rss', category: 'gundem' },
  { name: 'Sözcü', url: 'https://www.sozcu.com.tr/rss/anasayfa.xml', category: 'gundem' },
  { name: 'Sabah', url: 'https://www.sabah.com.tr/rss/gundem.xml', category: 'gundem' },
  { name: 'Hurriyet', url: 'https://www.hurriyet.com.tr/rss/gundem', category: 'gundem' },
  { name: 'Milliyet', url: 'https://www.milliyet.com.tr/rss/rssNew/gundemRSS.xml', category: 'gundem' },
  { name: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/rss/son_dakika.xml', category: 'gundem' },
  { name: 'CNN Turk', url: 'https://www.cnnturk.com/feed/rss/turkiye/news', category: 'gundem' },
  { name: 'TRT Spor', url: 'https://www.trthaber.com/spor.rss', category: 'spor' },
  { name: 'Fanatik', url: 'https://www.fanatik.com.tr/rss/spor.xml', category: 'spor' },
  { name: 'NTV Spor', url: 'https://www.ntv.com.tr/spor.rss', category: 'spor' },
  { name: 'TRT Ekonomi', url: 'https://www.trthaber.com/ekonomi.rss', category: 'ekonomi' },
  { name: 'NTV Teknoloji', url: 'https://www.ntv.com.tr/teknoloji.rss', category: 'teknoloji' }
];

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadSourcesFile() {
  try {
    const raw = await fs.readFile(SOURCES_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveSourcesFile(sources) {
  await ensureDir();
  await fs.writeFile(SOURCES_PATH, JSON.stringify(sources, null, 2), 'utf-8');
}

function dedupeSources(list = []) {
  const seen = new Map();
  for (const item of list) {
    const url = (item.url || '').trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      name: item.name || extractDomain(url),
      url,
      homepage: item.homepage || null,
      category: normalizeCategory(item.category),
      type: item.type || 'rss',
      addedBy: item.addedBy || 'default',
      lastChecked: item.lastChecked || null,
      lastStatus: item.lastStatus || null
    });
  }
  return Array.from(seen.values());
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Bilinmeyen kaynak';
  }
}

function normalizeCategory(category) {
  if (!category) return 'gundem';
  const c = category.toLowerCase();
  if (c.includes('ekonomi')) return 'ekonomi';
  if (c.includes('spor')) return 'spor';
  if (c.includes('teknoloji')) return 'teknoloji';
  if (c.includes('dunya')) return 'dunya';
  if (c.includes('saglik')) return 'saglik';
  if (c.includes('kultur') || c.includes('sanat')) return 'kultur';
  return 'gundem';
}

export async function getSources(options = {}) {
  const stored = await loadSourcesFile();
  const merged = options.includeDefaults === false ? stored : [...DEFAULT_SOURCES, ...stored];
  return dedupeSources(merged);
}

export async function warmupSources() {
  const stored = await loadSourcesFile();
  if (stored.length === 0) {
    await saveSourcesFile(DEFAULT_SOURCES);
    return DEFAULT_SOURCES;
  }
  const deduped = dedupeSources(stored);
  if (deduped.length !== stored.length) {
    await saveSourcesFile(deduped);
  }
  return deduped;
}

export async function refreshSourcesWithAI() {
  if (!isGeminiEnabled) {
    throw new Error('Gemini API anahtarı gerekli (GEMINI_API_KEY).');
  }

  const current = await getSources({ includeDefaults: true });
  const suggestions = await askGeminiForSources();
  const verified = [];

  for (const suggestion of suggestions.slice(0, MAX_AI_SOURCES)) {
    const feedUrl = (suggestion.rss || suggestion.feed || suggestion.url || '').trim();
    if (!feedUrl || !isValidUrl(feedUrl)) continue;

    const check = await verifyRss(feedUrl);
    if (!check.ok) continue;

    verified.push({
      name: suggestion.name || extractDomain(feedUrl),
      url: feedUrl,
      homepage: suggestion.homepage || suggestion.site || null,
      category: normalizeCategory(suggestion.category),
      type: 'rss',
      addedBy: 'ai',
      lastChecked: new Date().toISOString(),
      lastStatus: 'ok'
    });
  }

  const merged = dedupeSources([...current, ...verified]);
  await saveSourcesFile(merged.filter((s) => !DEFAULT_SOURCES.some((d) => d.url === s.url)));

  return { added: verified.length, total: merged.length, sources: merged };
}

async function verifyRss(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'HaberOkuyoruzBot/1.0 (+https://github.com/)' },
      signal: controller.signal
    });
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    const text = await response.text();
    const looksLikeRss = /<rss|<feed|<channel/i.test(text);
    return { ok: looksLikeRss, status: response.status };
  } catch {
    return { ok: false, status: 'network' };
  } finally {
    clearTimeout(timeout);
  }
}

async function askGeminiForSources() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
  const ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

  const prompt = `Türkçe haber okuyucu için güvenilir ve erişilebilir RSS kaynakları listesi oluştur.
- Türkiye merkezli veya Türkçe yayın yapan global kaynaklar olsun.
- Aşırı yerel/mini blog, paywall veya sürekli 403 veren siteleri ekleme.
- JSON array olarak ver. Her eleman: {"name": "...", "homepage": "...", "rss": "...", "category": "gundem|ekonomi|spor|teknoloji|dunya|saglik|kultur"}.
- En fazla ${MAX_AI_SOURCES} kaynak.`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
  };

  const response = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new Error(body?.error?.message || `Gemini ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() || '';
  const jsonBlock = extractJsonArray(text);
  if (!jsonBlock) return [];

  try {
    const parsed = JSON.parse(jsonBlock);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractJsonArray(text) {
  const match = text.match(/\[[\s\S]*\]/);
  return match ? match[0] : null;
}

function isValidUrl(str) {
  try {
    const parsed = new URL(str);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
