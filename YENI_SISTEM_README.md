# 🤖 AI Destekli Haber Araştırma Sistemi

## 🎯 Yeni Özellikler

### Tamamen Yeni Tasarım
- Modern, gradient hero section
- Temiz ve kullanıcı dostu arayüz
- Dark/Light tema desteği
- Responsive tasarım (mobil uyumlu)

### AI Araştırma Motoru
- **Kendi kendine araştırma**: Kullanıcı konu girer, AI haber üretir
- **RSS bağımlılığı yok**: Artık RSS feed'lere bağımlı değil
- **Otomatik içerik üretimi**: Gemini AI ile haber yazma
- **Çoklu kaynak sentezi**: AI farklı kaynaklardan bilgi toplar

## 📁 Yeni Dosyalar

1. **`lib/ai-researcher.js`** - AI araştırma motoru
2. **`public/index-new.html`** - Yeni tasarım HTML
3. **`public/styles-new.css`** - Yeni modern CSS
4. **`public/app-new.js`** - Yeni frontend JavaScript

## 🚀 Kullanım

### Yerel Test

```bash
# Sunucuyu başlat
npm start

# Tarayıcıda aç
http://localhost:3000
```

### Nasıl Çalışır?

1. **Arama Kutusu**: İstediğiniz konuyu yazın (örn: "Türkiye ekonomisi")
2. **Hızlı Konular**: Önceden tanımlı konulara tıklayın
3. **AI Araştırma**: Sistem Gemini AI ile araştırma yapar
4. **Haber Üretimi**: AI size 5 adet haber üretir
5. **Okuma**: Haberlere tıklayarak tam içeriği okuyun

## 🔧 API Endpoint'leri

### POST `/api/ai-research`
AI ile haber araştırması yapar.

**Request:**
```json
{
  "query": "Türkiye ekonomisi"
}
```

**Response:**
```json
{
  "success": true,
  "query": "Türkiye ekonomisi",
  "articles": [...],
  "count": 5,
  "generatedAt": "2024-..."
}
```

### GET `/api/trending`
Popüler konular için otomatik haber üretir.

## ⚙️ Yapılandırma

### Environment Variables

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_TIMEOUT_MS=30000
```

### Özelleştirme

- **Haber sayısı**: `lib/ai-researcher.js` içinde `maxArticles` değiştirin
- **Popüler konular**: `lib/ai-researcher.js` içinde `defaultTopics` düzenleyin
- **Tasarım**: `public/styles-new.css` dosyasını düzenleyin

## 📊 Veritabanı

AI üretilen haberler otomatik olarak `data/news.json` dosyasına kaydedilir:
- `content`: Tam haber içeriği
- `aiGenerated`: AI üretilen mi? (true/false)
- `importance`: Önem skoru (1-10)
- `tags`: Etiketler array
- `researchTopic`: Araştırma konusu

## 🎨 Tasarım Özellikleri

- **Gradient Hero**: Modern görünüm
- **Card Tasarımı**: Her haber kart şeklinde
- **Modal**: Tam haber okuma için popup
- **Favoriler**: Haberleri favorilere ekleme
- **Kategori Badge'leri**: Renkli kategori etiketleri

## 🔄 Eski Sistem

Eski RSS tabanlı sisteme erişmek için:
- URL: `http://localhost:3000/old`
- Veya: `http://localhost:3000/index-old.html`

## ⚠️ Önemli Notlar

1. **Gemini API Key Gerekli**: AI özellikleri için `GEMINI_API_KEY` gerekli
2. **İlk Araştırma Yavaş**: İlk araştırma 30-60 saniye sürebilir
3. **Rate Limiting**: Gemini API rate limit'i var, çok fazla istek yapmayın
4. **İnternet Bağlantısı**: AI araştırma için internet gerekli

## 🐛 Sorun Giderme

### AI araştırma çalışmıyor
- `GEMINI_API_KEY` kontrol edin
- Console logları kontrol edin
- API limit kontrolü yapın

### Haberler görünmüyor
- Browser console'u kontrol edin
- Network tab'ında API isteklerini kontrol edin
- Server loglarını kontrol edin

## 📝 Gelecek Geliştirmeler

- [ ] Web scraping entegrasyonu
- [ ] Çoklu dil desteği
- [ ] Haber kaydetme/export
- [ ] RSS feed'lerden de haber çekme (hibrit sistem)
- [ ] Kullanıcı profili ve geçmiş

---

**Not**: Bu sistem tamamen AI destekli ve RSS feed'lere bağımlı değildir. Tüm haberler Gemini AI tarafından üretilir.

