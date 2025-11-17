import '../lib/env.js';
import { refreshSourcesWithAI } from '../lib/source-manager.js';
import { isGeminiEnabled } from '../lib/gemini.js';

async function main() {
  if (!isGeminiEnabled) {
    console.error('Gemini anahtari bulunamadi. Lutfen GEMINI_API_KEY degiskenini ayarlayin.');
    process.exit(1);
  }

  console.log('AI destekli kaynak keşfi başlıyor...');
  const result = await refreshSourcesWithAI();

  console.log(`Yeni eklenen kaynak sayısı: ${result.added}`);
  console.log(`Toplam aktif kaynak: ${result.total}`);
  result.sources.slice(0, 10).forEach((s) => {
    console.log(`- ${s.name}: ${s.url}`);
  });
}

main().catch((err) => {
  console.error('Kesif hatasi:', err);
  process.exit(1);
});
