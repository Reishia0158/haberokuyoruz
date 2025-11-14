<<<<<<< Updated upstream
# Haber Okuyoruz

Basit Node.js tabanlı bir RSS toplayıcı. TRT Haber, Habertürk, Sözcü ve NTV kaynaklarından başlıkları çekip tek sayfada listeler, aynı zamanda otomatik (kurallı) özet üretir ve kelime araması sağlar.

## Özellikler

- ✨ **13+ haber kaynağı** - TRT, Habertürk, Sözcü, NTV ve daha fazlasından RSS çekme
- 🤖 **AI destekli özetler** - Google Gemini API ile otomatik haber özetleri
- 🔍 **Gelişmiş arama** - Kelime arama ve kaynak filtreleme
- 📄 **Sayfalama** - 12 haber/sayfa ile kolay gezinme
- ⭐ **Favoriler** - İstediğiniz haberleri kaydedin
- 🌙 **Karanlık tema** - Göz dostu karanlık/aydınlık tema seçeneği
- 📱 **PWA desteği** - Mobil cihazlara yüklenebilir, offline çalışabilir
- ⚡ **Hızlı yükleme** - Loading skeleton ekranları ile daha iyi UX
- 💾 **5 dakikalık cache** - Aynı isteklerde hız kazanır

## Kurulum

1. Bilgisayarında Node.js (18+) kurulu olduğundan emin ol.
2. Dizine girip bağımlılık olmadığı için doğrudan çalıştır:

```bash
npm start
```

3. Tarayıcıdan `http://localhost:3000` adresini aç.

> Not: Sunucu ayağa kalkınca ilk `/api/news` isteğinde kaynaklar okunur. RSS sağlayıcıları erişime kapalıysa veya ağ kısıtlıysa liste boş dönebilir.

## Yapay zeka özetleri (Gemini)

Google Gemini API'si için ücretsiz kotanı kullanarak haber başına 1-2 cümlelik kısa özetler alabilirsin.

1. [Google AI Studio](https://aistudio.google.com/) üzerinden bir API anahtarı oluştur.
2. Anahtarı `.env` dosyasına ya da kabuğunda ortam değişkeni olarak tanımla:

   ```bash
   # .env dosyası (aynı klasöre kaydet)
   GEMINI_API_KEY="AI...senin_anahtarın..."
   GEMINI_MODEL="gemini-1.5-flash"          # opsiyonel
   GEMINI_SUMMARY_MAX_ITEMS=20              # opsiyonel, özetlenecek haber sayısı

   # veya tek seferlik terminalden
   export GEMINI_API_KEY="AI...senin_anahtarın..."
   npm start
   ```

3. Anahtar tanımlı değilse uygulama eski otomatik (kurallı) özetleme ile devam eder.

## Yapı

- `server.js`: RSS çekme, önbellek, özetleme ve statik dosya servisi.
- `lib/gemini.js`: Gemini API üzerinden kısa AI özetleri.
- `public/`: HTML, CSS ve tarayıcı tarafı JS.

## Özelleştirme

- Yeni kaynak eklemek için `server.js` içindeki `RSS_SOURCES` listesine `{ name, url }` objesi ekle.
- Özet cümle sayısını `summarize` fonksiyonundaki `sentenceCount` parametresi ile yükselt/azalt.
- Tasarımı değiştirmek için `public/styles.css` dosyasını düzenle.

## Dağıtım

Godaddy üzerinde aldığın domain için herhangi bir VPS/PaaS servisine Node.js uygulaması olarak dağıtabilir ya da Vercel/Render gibi servislerde kolayca yayınlayabilirsin. Uygulama sadece Node çekirdeğine ihtiyaç duyar.

### Render Uyku Modu Çözümü

Render'ın ücretsiz planında uygulamalar 15 dakika hareketsizlikten sonra uyku moduna geçer. Bu sorunu çözmek için:

1. `/api/ping` endpoint'i eklendi
2. [UptimeRobot](https://uptimerobot.com) veya [cron-job.org](https://cron-job.org) gibi bir servis kullanarak bu endpoint'i her 5-10 dakikada bir çağırın
3. Detaylı talimatlar için `RENDER_UYKU_MODU.md` dosyasına bakın

## Yeni Özellikler (v0.3.0)

- ✅ Sayfalama sistemi (12 haber/sayfa)
- ✅ Loading skeleton ekranları
- ✅ Karanlık/aydınlık tema seçeneği (localStorage ile kaydedilir)
- ✅ Favorilere ekleme özelliği
- ✅ PWA desteği (manifest.json + service worker)
- ✅ Render uyku modu önleme endpoint'i
- ✅ **AI Destekli Otomatik Haber Yönetimi** 🤖
  - Önem skoru analizi (1-10)
  - Akıllı kategorizasyon
  - Otomatik etiketleme
  - Spam/önemsiz haber filtreleme
  - Önceliklendirme
- ✅ **Otomatik Veritabanı Sistemi** 💾
  - JSON tabanlı veritabanı
  - RSS kesilse bile içerikler korunur
  - Otomatik temizlik (30 günden eski haberler)

## 🚀 Yayına Alma

Hızlı başlangıç için `HIZLI_BASLANGIC.md` dosyasına bakın.

Detaylı rehber için `YAYINA_ALMA_REHBERI.md` dosyasına bakın.
=======
# Haber Okuyoruz

Basit Node.js tabanlı bir RSS toplayıcı. TRT Haber, Habertürk, Sözcü ve NTV kaynaklarından başlıkları çekip tek sayfada listeler, aynı zamanda otomatik (kurallı) özet üretir ve kelime araması sağlar.

## Özellikler

- ✨ **13+ haber kaynağı** - TRT, Habertürk, Sözcü, NTV ve daha fazlasından RSS çekme
- 🤖 **AI destekli özetler** - Google Gemini API ile otomatik haber özetleri
- 🔍 **Gelişmiş arama** - Kelime arama ve kaynak filtreleme
- 📄 **Sayfalama** - 12 haber/sayfa ile kolay gezinme
- ⭐ **Favoriler** - İstediğiniz haberleri kaydedin
- 🌙 **Karanlık tema** - Göz dostu karanlık/aydınlık tema seçeneği
- 📱 **PWA desteği** - Mobil cihazlara yüklenebilir, offline çalışabilir
- ⚡ **Hızlı yükleme** - Loading skeleton ekranları ile daha iyi UX
- 💾 **5 dakikalık cache** - Aynı isteklerde hız kazanır

## Kurulum

1. Bilgisayarında Node.js (18+) kurulu olduğundan emin ol.
2. Dizine girip bağımlılık olmadığı için doğrudan çalıştır:

```bash
npm start
```

3. Tarayıcıdan `http://localhost:3000` adresini aç.

> Not: Sunucu ayağa kalkınca ilk `/api/news` isteğinde kaynaklar okunur. RSS sağlayıcıları erişime kapalıysa veya ağ kısıtlıysa liste boş dönebilir.

## Yapay zeka özetleri (Gemini)

Google Gemini API'si için ücretsiz kotanı kullanarak haber başına 1-2 cümlelik kısa özetler alabilirsin.

1. [Google AI Studio](https://aistudio.google.com/) üzerinden bir API anahtarı oluştur.
2. Anahtarı `.env` dosyasına ya da kabuğunda ortam değişkeni olarak tanımla:

   ```bash
   # .env dosyası (aynı klasöre kaydet)
   GEMINI_API_KEY="AI...senin_anahtarın..."
   GEMINI_MODEL="gemini-1.5-flash"          # opsiyonel
   GEMINI_SUMMARY_MAX_ITEMS=20              # opsiyonel, özetlenecek haber sayısı

   # veya tek seferlik terminalden
   export GEMINI_API_KEY="AI...senin_anahtarın..."
   npm start
   ```

3. Anahtar tanımlı değilse uygulama eski otomatik (kurallı) özetleme ile devam eder.

## Yapı

- `server.js`: RSS çekme, önbellek, özetleme ve statik dosya servisi.
- `lib/gemini.js`: Gemini API üzerinden kısa AI özetleri.
- `public/`: HTML, CSS ve tarayıcı tarafı JS.

## Özelleştirme

- Yeni kaynak eklemek için `server.js` içindeki `RSS_SOURCES` listesine `{ name, url }` objesi ekle.
- Özet cümle sayısını `summarize` fonksiyonundaki `sentenceCount` parametresi ile yükselt/azalt.
- Tasarımı değiştirmek için `public/styles.css` dosyasını düzenle.

## Dağıtım

Godaddy üzerinde aldığın domain için herhangi bir VPS/PaaS servisine Node.js uygulaması olarak dağıtabilir ya da Vercel/Render gibi servislerde kolayca yayınlayabilirsin. Uygulama sadece Node çekirdeğine ihtiyaç duyar.

### Render Uyku Modu Çözümü

Render'ın ücretsiz planında uygulamalar 15 dakika hareketsizlikten sonra uyku moduna geçer. Bu sorunu çözmek için:

1. `/api/ping` endpoint'i eklendi
2. [UptimeRobot](https://uptimerobot.com) veya [cron-job.org](https://cron-job.org) gibi bir servis kullanarak bu endpoint'i her 5-10 dakikada bir çağırın
3. Detaylı talimatlar için `RENDER_UYKU_MODU.md` dosyasına bakın

## Yeni Özellikler (v0.3.0)

- ✅ Sayfalama sistemi (12 haber/sayfa)
- ✅ Loading skeleton ekranları
- ✅ Karanlık/aydınlık tema seçeneği (localStorage ile kaydedilir)
- ✅ Favorilere ekleme özelliği
- ✅ PWA desteği (manifest.json + service worker)
- ✅ Render uyku modu önleme endpoint'i
- ✅ **AI Destekli Otomatik Haber Yönetimi** 🤖
  - Önem skoru analizi (1-10)
  - Akıllı kategorizasyon
  - Otomatik etiketleme
  - Spam/önemsiz haber filtreleme
  - Önceliklendirme
- ✅ **Otomatik Veritabanı Sistemi** 💾
  - JSON tabanlı veritabanı
  - RSS kesilse bile içerikler korunur
  - Otomatik temizlik (30 günden eski haberler)

## 🚀 Yayına Alma

Hızlı başlangıç için `HIZLI_BASLANGIC.md` dosyasına bakın.

Detaylı rehber için `YAYINA_ALMA_REHBERI.md` dosyasına bakın.
>>>>>>> Stashed changes
