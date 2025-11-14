<<<<<<< Updated upstream
import { isGeminiEnabled } from './gemini.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 10000);
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// AI ile haber analizi yap
export async function analyzeNewsWithAI(item) {
  if (!isGeminiEnabled) {
    return {
      importance: 5, // Varsayılan orta önem
      category: null, // Mevcut kategoriyi kullan
      tags: [],
      shouldPublish: true
    };
  }

  const title = item.title || '';
  const description = item.description || item.summary || item.preview || '';
  const text = `${title}\n\n${description}`.slice(0, 1500);

  const prompt = `Sen bir haber editörüsün. Aşağıdaki haberi analiz et ve JSON formatında cevap ver:

Haber:
${text}

Görevlerin:
1. Önem skoru: 1-10 arası (10 = çok önemli, 1 = önemsiz)
2. Kategori: gündem, spor, ekonomi, teknoloji, sağlık, siyaset, kültür, dünya (sadece bir tane)
3. Etiketler: Haberin konusuyla ilgili 2-4 kelime (örnek: "dolar", "borsa", "enflasyon")
4. Yayınla mı: true/false (spam, tekrar, önemsiz haberler için false)

SADECE JSON döndür, başka açıklama yapma:
{
  "importance": 7,
  "category": "ekonomi",
  "tags": ["dolar", "enflasyon"],
  "shouldPublish": true
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`API hatası: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    
    // JSON'u çıkar (markdown code block içinde olabilir)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        importance: Math.max(1, Math.min(10, result.importance || 5)),
        category: result.category || null,
        tags: Array.isArray(result.tags) ? result.tags : [],
        shouldPublish: result.shouldPublish !== false
      };
    }
  } catch (error) {
    console.warn('AI analiz hatası:', error.message);
  } finally {
    clearTimeout(timeout);
  }

  // Hata durumunda varsayılan değerler
  return {
    importance: 5,
    category: null,
    tags: [],
    shouldPublish: true
  };
}

// Toplu haber analizi (performans için)
export async function analyzeNewsBatch(items, maxItems = 20) {
  if (!isGeminiEnabled || items.length === 0) {
    return items.map(item => ({ ...item, aiAnalysis: null }));
  }

  // Önemli haberleri önce analiz et (limit ile)
  const itemsToAnalyze = items.slice(0, maxItems);
  const analyzed = [];

  // Paralel analiz (ama rate limit için kontrollü)
  for (const item of itemsToAnalyze) {
    try {
      const analysis = await analyzeNewsWithAI(item);
      analyzed.push({
        ...item,
        aiAnalysis: analysis,
        // AI'nın önerdiği kategoriyi kullan
        category: analysis.category || item.category,
        // Önem skorunu ekle
        importance: analysis.importance,
        // Etiketleri ekle
        tags: analysis.tags,
        // Yayınlanacak mı?
        _shouldPublish: analysis.shouldPublish
      });
      
      // Rate limit için kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.warn(`Haber analiz hatası (${item.title?.slice(0, 30)}):`, error.message);
      analyzed.push({ ...item, aiAnalysis: null });
    }
  }

  // Analiz edilmeyen haberleri ekle
  const remaining = items.slice(maxItems).map(item => ({ ...item, aiAnalysis: null }));
  
  return [...analyzed, ...remaining];
}

// Haberleri önem skoruna göre sırala
export function sortByImportance(items) {
  return [...items].sort((a, b) => {
    const importanceA = a.importance || a.aiAnalysis?.importance || 5;
    const importanceB = b.importance || b.aiAnalysis?.importance || 5;
    return importanceB - importanceA;
  });
}

// Yayınlanacak haberleri filtrele
export function filterPublishable(items) {
  return items.filter(item => {
    const analysis = item.aiAnalysis;
    if (analysis && analysis.shouldPublish === false) {
      return false;
    }
    return true;
  });
}

=======
import { isGeminiEnabled } from './gemini.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 10000);
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// AI ile haber analizi yap
export async function analyzeNewsWithAI(item) {
  if (!isGeminiEnabled) {
    return {
      importance: 5, // Varsayılan orta önem
      category: null, // Mevcut kategoriyi kullan
      tags: [],
      shouldPublish: true
    };
  }

  const title = item.title || '';
  const description = item.description || item.summary || item.preview || '';
  const text = `${title}\n\n${description}`.slice(0, 1500);

  const prompt = `Sen bir haber editörüsün. Aşağıdaki haberi analiz et ve JSON formatında cevap ver:

Haber:
${text}

Görevlerin:
1. Önem skoru: 1-10 arası (10 = çok önemli, 1 = önemsiz)
2. Kategori: gündem, spor, ekonomi, teknoloji, sağlık, siyaset, kültür, dünya (sadece bir tane)
3. Etiketler: Haberin konusuyla ilgili 2-4 kelime (örnek: "dolar", "borsa", "enflasyon")
4. Yayınla mı: true/false (spam, tekrar, önemsiz haberler için false)

SADECE JSON döndür, başka açıklama yapma:
{
  "importance": 7,
  "category": "ekonomi",
  "tags": ["dolar", "enflasyon"],
  "shouldPublish": true
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`API hatası: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    
    // JSON'u çıkar (markdown code block içinde olabilir)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        importance: Math.max(1, Math.min(10, result.importance || 5)),
        category: result.category || null,
        tags: Array.isArray(result.tags) ? result.tags : [],
        shouldPublish: result.shouldPublish !== false
      };
    }
  } catch (error) {
    console.warn('AI analiz hatası:', error.message);
  } finally {
    clearTimeout(timeout);
  }

  // Hata durumunda varsayılan değerler
  return {
    importance: 5,
    category: null,
    tags: [],
    shouldPublish: true
  };
}

// Toplu haber analizi (performans için)
export async function analyzeNewsBatch(items, maxItems = 20) {
  if (!isGeminiEnabled || items.length === 0) {
    return items.map(item => ({ ...item, aiAnalysis: null }));
  }

  // Önemli haberleri önce analiz et (limit ile)
  const itemsToAnalyze = items.slice(0, maxItems);
  const analyzed = [];

  // Paralel analiz (ama rate limit için kontrollü)
  for (const item of itemsToAnalyze) {
    try {
      const analysis = await analyzeNewsWithAI(item);
      analyzed.push({
        ...item,
        aiAnalysis: analysis,
        // AI'nın önerdiği kategoriyi kullan
        category: analysis.category || item.category,
        // Önem skorunu ekle
        importance: analysis.importance,
        // Etiketleri ekle
        tags: analysis.tags,
        // Yayınlanacak mı?
        _shouldPublish: analysis.shouldPublish
      });
      
      // Rate limit için kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.warn(`Haber analiz hatası (${item.title?.slice(0, 30)}):`, error.message);
      analyzed.push({ ...item, aiAnalysis: null });
    }
  }

  // Analiz edilmeyen haberleri ekle
  const remaining = items.slice(maxItems).map(item => ({ ...item, aiAnalysis: null }));
  
  return [...analyzed, ...remaining];
}

// Haberleri önem skoruna göre sırala
export function sortByImportance(items) {
  return [...items].sort((a, b) => {
    const importanceA = a.importance || a.aiAnalysis?.importance || 5;
    const importanceB = b.importance || b.aiAnalysis?.importance || 5;
    return importanceB - importanceA;
  });
}

// Yayınlanacak haberleri filtrele
export function filterPublishable(items) {
  return items.filter(item => {
    const analysis = item.aiAnalysis;
    if (analysis && analysis.shouldPublish === false) {
      return false;
    }
    return true;
  });
}

>>>>>>> Stashed changes
