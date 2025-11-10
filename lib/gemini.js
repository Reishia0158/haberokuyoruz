const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 8000);

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const SYSTEM_PROMPT =
  'Sen Türkçe yazan kısa haber özetleyicisisin. 2 cümleyi geçme, yorumsuz ve tarafsız kal, en önemli bilgileri sırala.';

export const isGeminiEnabled = Boolean(GEMINI_API_KEY);

export async function summarizeWithGemini(item) {
  if (!isGeminiEnabled) return null;
  const payload = buildPayload(item);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await safeJson(response);
      throw new Error(`Gemini ${response.status}: ${errorBody?.error?.message || 'bilinmeyen hata'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    return text || null;
  } catch (error) {
    console.warn('Gemini özeti alınamadı:', error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildPayload(item) {
  const bodyText = trimText(item.description || item.summary || item.preview || '', 1200);
  const title = trimText(item.title || '', 200);
  const source = item.source || 'Bilinmeyen kaynak';

  const userPrompt = [
    `Kaynak: ${source}`,
    `Başlık: ${title}`,
    `Haber içeriği: ${bodyText || 'Metin bulunamadı.'}`,
    '',
    'Çıktı formatı:',
    '- En az 1 en fazla 2 cümlelik net özet.',
    '- Gereksiz süsleme yapma, yorum katma.'
  ].join('\n');

  return {
    contents: [
      {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT },
          { text: userPrompt }
        ]
      }
    ],
    generationConfig: {
      temperature: Number(process.env.GEMINI_TEMPERATURE ?? 0.25),
      maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 160)
    }
  };
}

function trimText(text, limit) {
  if (!text) return '';
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 3)}...`;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
