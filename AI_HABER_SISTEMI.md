# 🤖 AI Destekli Otomatik Haber Yönetim Sistemi

## ✨ Ne Yapıyor?

AI artık **sizin yerinize** haberleri yönetiyor:

1. **📊 Önem Analizi**: Her habere 1-10 arası önem skoru veriyor
2. **🏷️ Akıllı Kategorizasyon**: Haberleri doğru kategoriye yerleştiriyor
3. **🔖 Otomatik Etiketleme**: Haberlerle ilgili etiketler ekliyor
4. **🚫 Spam Filtreleme**: Önemsiz/tekrar/spam haberleri otomatik filtreliyor
5. **⭐ Önceliklendirme**: Önemli haberler önce gösteriliyor

## 🎯 Nasıl Çalışıyor?

### 1. RSS'den Haberler Çekilir
- Tüm RSS kaynaklarından haberler otomatik çekilir

### 2. AI Analiz Yapar
- Her haber AI tarafından analiz edilir
- Önem skoru belirlenir (1-10)
- Kategori tespit edilir
- Etiketler eklenir
- Yayınlanacak mı kararı verilir

### 3. Otomatik İşlemler
- Önemli haberler önce gösterilir
- Spam/önemsiz haberler filtrelenir
- Veritabanına kaydedilir
- AI özetleri oluşturulur

## ⚙️ Ayarlar

`.env` dosyasında:

```bash
# Gemini API anahtarı (zorunlu)
GEMINI_API_KEY="AI...senin_anahtarın..."

# Analiz edilecek haber sayısı (varsayılan: 30)
AI_ANALYSIS_LIMIT=30

# Gemini model (varsayılan: gemini-1.5-flash)
GEMINI_MODEL="gemini-1.5-flash"
```

## 📊 AI Analiz Sonuçları

Her haber için AI şunları sağlar:

```javascript
{
  importance: 7,        // 1-10 arası önem skoru
  category: "ekonomi",  // Kategori
  tags: ["dolar", "enflasyon"], // Etiketler
  shouldPublish: true   // Yayınlanacak mı?
}
```

## 🚀 Avantajlar

1. **Sıfır Manuel İş**: AI her şeyi otomatik yapıyor
2. **Akıllı Filtreleme**: Spam/önemsiz haberler otomatik filtreleniyor
3. **Önceliklendirme**: Önemli haberler önce gösteriliyor
4. **Doğru Kategorizasyon**: AI kategorileri daha doğru belirliyor
5. **Etiketleme**: Haberler otomatik etiketleniyor

## 💡 Örnek Senaryo

1. RSS'den 50 haber çekilir
2. AI ilk 30 haberi analiz eder
3. 5 haber spam/önemsiz olarak işaretlenir → Filtrelenir
4. Kalan 25 haber önem skoruna göre sıralanır
5. En önemli haberler önce gösterilir
6. Her haber doğru kategoriye yerleştirilir
7. Etiketler eklenir
8. Veritabanına kaydedilir

## ⚠️ Notlar

- AI analizi için Gemini API anahtarı gereklidir
- İlk 30 haber analiz edilir (performans için)
- Analiz edilmeyen haberler de yayınlanır (varsayılan değerlerle)
- AI hata verirse sistem normal çalışmaya devam eder

## 🔧 Gelişmiş Kullanım

### Daha Fazla Haber Analiz Etmek İçin:

```bash
# .env dosyasında
AI_ANALYSIS_LIMIT=50  # İlk 50 haberi analiz et
```

### AI Analizini Kapatmak İçin:

```bash
# .env dosyasında GEMINI_API_KEY'i kaldır veya boş bırak
# Sistem normal çalışmaya devam eder
```

---

**Artık AI sizin yerinize haberleri yönetiyor! 🎉**
