import { isGeminiEnabled } from './gemini.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000); // Araştırma için daha uzun timeout
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * AI ile konu bazlı haber araştırması ve üretimi
 */
export async function researchAndGenerateNews(topic, options = {}) {
  if (!isGeminiEnabled) {
    throw new Error('Gemini API anahtarı gerekli');
  }

  const {
    maxArticles = 5, // Kaç haber üretilecek
    category = null, // Kategori (opsiyonel)
    language = 'tr' // Dil
  } = options;

  console.log(`🔍 AI araştırma başlatılıyor: "${topic}"`);

  try {
    const articles = [];
    
    // Her haber için ayrı araştırma yap
    for (let i = 0; i < maxArticles; i++) {
      try {
        const article = await generateSingleNewsArticle(topic, category, i + 1, maxArticles);
        if (article) {
          articles.push(article);
        }
        
        // Rate limit için bekleme
        if (i < maxArticles - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`Haber ${i + 1} üretilemedi:`, error.message);
      }
    }

    console.log(`✅ ${articles.length} haber üretildi`);
    return articles;
  } catch (error) {
    console.error('AI araştırma hatası:', error);
    throw error;
  }
}

/**
 * Tek bir haber makalesi üret
 */
async function generateSingleNewsArticle(topic, category, index, total) {
  const prompt = `Sen profesyonel bir haber editörüsün. Aşağıdaki konu hakkında güncel, doğru ve objektif bir haber makalesi yaz.

KONU: ${topic}
${category ? `KATEGORİ: ${category}` : ''}

Görevlerin:
1. Bu konu hakkında güncel bilgileri araştır (2024-2025 yılı güncel olayları)
2. Objektif ve tarafsız bir haber yaz
3. Haberin başlığını oluştur (çekici ama sansasyonel değil)
4. Haberin içeriğini yaz (300-500 kelime)
5. Kategori belirle: gündem, spor, ekonomi, teknoloji, sağlık, siyaset, kültür, dünya
6. Önem skoru ver (1-10 arası)
7. 3-5 etiket oluştur

SADECE JSON formatında cevap ver, başka açıklama yapma:
{
  "title": "Haber başlığı",
  "content": "Haber içeriği (300-500 kelime, paragraflar halinde)",
  "summary": "Kısa özet (2-3 cümle)",
  "category": "gündem",
  "importance": 7,
  "tags": ["etiket1", "etiket2", "etiket3"],
  "publishedAt": "${new Date().toISOString()}",
  "source": "AI Araştırma"
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
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`API hatası: ${response.status} - ${errorBody?.error?.message || 'bilinmeyen hata'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();

    // JSON'u çıkar (markdown code block içinde olabilir)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON formatı bulunamadı');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Haber objesini oluştur
    const article = {
      id: `ai-${Date.now()}-${index}`,
      title: result.title || topic,
      content: result.content || '',
      summary: result.summary || result.content?.slice(0, 200) || '',
      description: result.content || '',
      category: result.category || category || 'gündem',
      importance: result.importance || 5,
      tags: result.tags || [],
      publishedAt: result.publishedAt || new Date().toISOString(),
      source: result.source || 'AI Araştırma',
      link: `#ai-${Date.now()}-${index}`, // İç link
      aiGenerated: true,
      researchTopic: topic
    };

    return article;
  } catch (error) {
    console.warn(`Haber üretim hatası (${topic}):`, error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Popüler konular için otomatik haber üretimi
 */
export async function generateTrendingNews(topics = []) {
  const defaultTopics = [
    'Türkiye gündemi',
    'Ekonomi haberleri',
    'Teknoloji gelişmeleri',
    'Spor haberleri',
    'Sağlık gündemi'
  ];

  const topicsToUse = topics.length > 0 ? topics : defaultTopics;
  const allArticles = [];

  for (const topic of topicsToUse) {
    try {
      const articles = await researchAndGenerateNews(topic, { maxArticles: 2 });
      allArticles.push(...articles);
      
      // Rate limit için bekleme
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.warn(`Konu "${topic}" için haber üretilemedi:`, error.message);
    }
  }

  // Önem skoruna göre sırala
  allArticles.sort((a, b) => (b.importance || 5) - (a.importance || 5));

  return allArticles;
}

/**
 * Kullanıcı sorgusu için haber araştırması
 */
export async function searchAndGenerateNews(query) {
  if (!query || query.trim().length < 3) {
    throw new Error('Arama sorgusu en az 3 karakter olmalı');
  }

  console.log(`🔍 Kullanıcı araması: "${query}"`);

  try {
    const articles = await researchAndGenerateNews(query, {
      maxArticles: 5,
      category: null // AI kendisi belirlesin
    });

    return articles;
  } catch (error) {
    console.error('Arama hatası:', error);
    throw error;
  }
}

