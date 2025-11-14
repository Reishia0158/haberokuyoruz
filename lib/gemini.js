const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-001';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 8000);

const ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;
const SYSTEM_PROMPT =
  'Türkçe haber özetleyicisi. 1-2 cümle, tarafsız, sadece gerçekler.';

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
  const bodyText = trimText(item.description || item.summary || item.preview || '', 800);
  const title = trimText(item.title || '', 150);

  const userPrompt = `${title}\n\n${bodyText || ''}\n\nÖzet:`;

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
      temperature: 0.2,
      maxOutputTokens: 120
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
