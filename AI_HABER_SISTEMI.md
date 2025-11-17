# AI Destekli Otomatik Haber Yönetim Sistemi

## Bu Sistem Ne Yapıyor?

AI, internetten çekilen son haberleri analiz eder ve önceliklendirir:

1. **Önem Skoru (1-10)**: Her habere ağırlık verilir, en kritik olanlar öne çıkar.
2. **Akıllı Kategorizasyon**: Gündem, ekonomi, spor, teknoloji vb. doğru kategoriye yerleştirilir.
3. **Otomatik Etiketleme**: İlgili anahtar kelimeler eklenir.
4. **Spam/Önemsiz Filtreleme**: Tekrar veya düşük değerli haberler elenir.
5. **Önceliklendirilmiş Akış**: Önemli haberler ilk sırada gösterilir.

## Nasıl Çalışıyor?

### 1) RSS’ten Haber Toplama
- TRT Haber, AA, Hürriyet, Sözcü, NTV vb. 30+ kaynaktan RSS akışları otomatik çekilir.

### 2) AI Analizi (Gemini)
- Önem skoru belirlenir (1-10)
- Kategori tespit edilir
- Etiketler oluşturulur
- Yayınlanıp yayınlanmayacağına karar verilir

### 3) Otomatik İşlemler
- Önemli haberler önce listelenir
- Spam/önemsiz olanlar filtrelenir
- Özet ve ön izleme metni üretilir (Gemini özetleri)
- Veritabanına kaydedilir (JSON)

## Ortam Değişkenleri

`.env` dosyanıza ekleyin:

```bash
# Gemini API anahtarı (zorunlu)
GEMINI_API_KEY="AI...senin_anahtarın..."

# Analiz edilecek haber sayısı (varsayılan: 30)
AI_ANALYSIS_LIMIT=30

# Gemini model (varsayılan: gemini-1.5-flash-001)
GEMINI_MODEL="gemini-1.5-flash-001"
```

## AI Analiz Örneği

```jsonc
{
  "importance": 7,          // 1-10 arası önem skoru
  "category": "ekonomi",    // Kategori
  "tags": ["dolar", "enflasyon"], // Etiketler
  "shouldPublish": true     // Yayınlanacak mı?
}
```

## Avantajlar

1. **Sıfır Manuel İş**: AI toplar, analiz eder, sıralar.
2. **Akıllı Filtre**: Spam/önemsiz içerik otomatik elenir.
3. **Önceliklendirme**: En önemli haberler ilk gösterilir.
4. **Doğru Kategorizasyon**: Yanlış kategori riski düşer.
5. **Otomatik Etiketler**: Arama ve SEO için hazır.

## Örnek Akış

1. RSS’ten 50 haber çekilir
2. AI ilk 30 haberi analiz eder
3. 5 spam/önemsiz haber elenir
4. Kalan 25 haber önem skoruna göre sıralanır
5. En önemli haberler öne alınır, kategori ve etiketler eklenir
6. Özet üretilir ve veritabanına kaydedilir

## Notlar

- Gemini API anahtarı yoksa sistem temel (kurallı) özet ve sıralama ile çalışmaya devam eder.
- İlk 30 haber AI ile analiz edilir (performans için); limiti `AI_ANALYSIS_LIMIT` ile artırabilirsiniz.
- RSS erişiminde sorun olursa veritabanındaki son içerikler gösterilir.

## Gelişmiş Kullanım

### Daha Fazla Haber Analiz Etmek

```bash
# .env dosyasında
AI_ANALYSIS_LIMIT=50  # İlk 50 haberi analiz et
```

### AI Analizini Kapamak

```bash
# .env dosyasında GEMINI_API_KEY'i kaldır veya boş bırak
# Sistem temel akışla çalışmaya devam eder
```

---

Artık haberokuyoruz.com için AI, önemli haberleri bulup getiriyor.
