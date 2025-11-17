# Haber Okuyoruz

Basit Node.js tabanlÄ± bir RSS toplayÄ±cÄ±. TRT Haber, HabertÃ¼rk, SÃ¶zcÃ¼ ve NTV kaynaklarÄ±ndan baÅŸlÄ±klarÄ± Ã§ekip tek sayfada listeler, aynÄ± zamanda otomatik (kurallÄ±) Ã¶zet Ã¼retir ve kelime aramasÄ± saÄŸlar.

## Ã–zellikler

- âœ¨ **40+ haber kaynaÄŸÄ±** - TRT, HabertÃ¼rk, SÃ¶zcÃ¼, NTV ve daha fazlasÄ±ndan RSS Ã§ekme
- ğŸ¤– **AI destekli Ã¶zetler** - Google Gemini API ile otomatik haber Ã¶zetleri
- ğŸ” **GeliÅŸmiÅŸ arama** - Kelime arama ve kaynak filtreleme
- ğŸ“„ **Sayfalama** - 12 haber/sayfa ile kolay gezinme
- â­ **Favoriler** - Ä°stediÄŸiniz haberleri kaydedin
- ğŸŒ™ **KaranlÄ±k tema** - GÃ¶z dostu karanlÄ±k/aydÄ±nlÄ±k tema seÃ§eneÄŸi
- ğŸ“± **PWA desteÄŸi** - Mobil cihazlara yÃ¼klenebilir, offline Ã§alÄ±ÅŸabilir
- âš¡ **HÄ±zlÄ± yÃ¼kleme** - Loading skeleton ekranlarÄ± ile daha iyi UX
- ğŸ’¾ **Otomatik veritabanÄ±** - JSON tabanlÄ±, RSS kesilse bile iÃ§erikler korunur

## Kurulum

1. BilgisayarÄ±nda Node.js (18+) kurulu olduÄŸundan emin ol.
2. Dizine girip baÄŸÄ±mlÄ±lÄ±k olmadÄ±ÄŸÄ± iÃ§in doÄŸrudan Ã§alÄ±ÅŸtÄ±r:

```bash
npm start
```

3. TarayÄ±cÄ±dan `http://localhost:3000` adresini aÃ§.

> Not: Sunucu ayaÄŸa kalkÄ±nca ilk `/api/news` isteÄŸinde kaynaklar okunur. RSS saÄŸlayÄ±cÄ±larÄ± eriÅŸime kapalÄ±ysa veya aÄŸ kÄ±sÄ±tlÄ±ysa liste boÅŸ dÃ¶nebilir.

## Kod yazmadan kaynak toplama (AI botu)

1. .env dosyasina GEMINI_API_KEY=... yaz (gerekirse GEMINI_MODEL=gemini-1.5-flash-latest).
2. Terminalde npm run discover:sources komutunu calistir. AI, guvenilir RSS adreslerini bulur ve data/sources.json dosyasina kaydeder.
3. Tarayicidan http://localhost:3000/api/sources ile listeyi gor. Tekrar kesif yapmak icin http://localhost:3000/api/sources/discover adresini ac (Gemini anahtari olmadan calismaz).
4. Uygulama yeniden basladiginda kaynak dosyasi otomatik yuklenir; RSS erisilemezse bile haberler data/news.json icinde kalir.

## Yapay zeka Ã¶zetleri (Gemini)

Google Gemini API'si iÃ§in Ã¼cretsiz kotanÄ± kullanarak haber baÅŸÄ±na 1-2 cÃ¼mlelik kÄ±sa Ã¶zetler alabilirsin.

1. [Google AI Studio](https://aistudio.google.com/) Ã¼zerinden bir API anahtarÄ± oluÅŸtur.
2. AnahtarÄ± `.env` dosyasÄ±na ya da kabuÄŸunda ortam deÄŸiÅŸkeni olarak tanÄ±mla:

   ```bash
   # .env dosyasÄ± (aynÄ± klasÃ¶re kaydet)
   GEMINI_API_KEY="AI...senin_anahtarÄ±n..."
   GEMINI_MODEL="gemini-1.5-flash-001"      # opsiyonel (varsayÄ±lan)
   GEMINI_SUMMARY_MAX_ITEMS=20              # opsiyonel, Ã¶zetlenecek haber sayÄ±sÄ±
   AI_ANALYSIS_LIMIT=30                     # opsiyonel, AI analiz edilecek haber sayÄ±sÄ±

   # veya tek seferlik terminalden
   export GEMINI_API_KEY="AI...senin_anahtarÄ±n..."
   npm start
   ```

3. Anahtar tanÄ±mlÄ± deÄŸilse uygulama eski otomatik (kurallÄ±) Ã¶zetleme ile devam eder.

## YapÄ±

- `server.js`: RSS Ã§ekme, Ã¶nbellek, Ã¶zetleme ve statik dosya servisi.
- `lib/gemini.js`: Gemini API Ã¼zerinden kÄ±sa AI Ã¶zetleri.
- `lib/ai-news-manager.js`: AI destekli haber analiz ve yÃ¶netim sistemi.
- `lib/database.js`: JSON tabanlÄ± veritabanÄ± sistemi.
- `public/`: HTML, CSS ve tarayÄ±cÄ± tarafÄ± JS.

## Ã–zelleÅŸtirme

- Kaynak eklemek icin artik AI kesfi kullan: `npm run discover:sources` veya tarayicidan `/api/sources/discover` (Gemini anahtari gerekir).
- Ã–zet cÃ¼mle sayÄ±sÄ±nÄ± `summarize` fonksiyonundaki `sentenceCount` parametresi ile yÃ¼kselt/azalt.
- TasarÄ±mÄ± deÄŸiÅŸtirmek iÃ§in `public/styles.css` dosyasÄ±nÄ± dÃ¼zenle.

## DaÄŸÄ±tÄ±m

Godaddy Ã¼zerinde aldÄ±ÄŸÄ±n domain iÃ§in herhangi bir VPS/PaaS servisine Node.js uygulamasÄ± olarak daÄŸÄ±tabilir ya da Vercel/Render gibi servislerde kolayca yayÄ±nlayabilirsin. Uygulama sadece Node Ã§ekirdeÄŸine ihtiyaÃ§ duyar.

### Render Uyku Modu Ã‡Ã¶zÃ¼mÃ¼

Render'Ä±n Ã¼cretsiz planÄ±nda uygulamalar 15 dakika hareketsizlikten sonra uyku moduna geÃ§er. Bu sorunu Ã§Ã¶zmek iÃ§in:

1. `/api/ping` endpoint'i eklendi
2. [UptimeRobot](https://uptimerobot.com) veya [cron-job.org](https://cron-job.org) gibi bir servis kullanarak bu endpoint'i her 5-10 dakikada bir Ã§aÄŸÄ±rÄ±n

## Yeni Ã–zellikler (v0.3.0)

- âœ… Sayfalama sistemi (12 haber/sayfa)
- âœ… Loading skeleton ekranlarÄ±
- âœ… KaranlÄ±k/aydÄ±nlÄ±k tema seÃ§eneÄŸi (localStorage ile kaydedilir)
- âœ… Favorilere ekleme Ã¶zelliÄŸi
- âœ… PWA desteÄŸi (manifest.json + service worker)
- âœ… Render uyku modu Ã¶nleme endpoint'i
- âœ… **AI Destekli Otomatik Haber YÃ¶netimi** ğŸ¤–
  - Ã–nem skoru analizi (1-10)
  - AkÄ±llÄ± kategorizasyon
  - Otomatik etiketleme
  - Spam/Ã¶nemsiz haber filtreleme
  - Ã–nceliklendirme
- âœ… **Otomatik VeritabanÄ± Sistemi** ğŸ’¾
  - JSON tabanlÄ± veritabanÄ±
  - RSS kesilse bile iÃ§erikler korunur
  - Otomatik temizlik (30 gÃ¼nden eski haberler)

## ğŸ“š DokÃ¼mantasyon

- `AI_HABER_SISTEMI.md` - AI sistem detaylarÄ±











