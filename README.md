# Haber Okuyoruz

Basit Node.js tabanlı bir RSS toplayıcı. TRT Haber, Habertürk, Sözcü ve NTV kaynaklarından başlıkları çekip tek sayfada listeler, aynı zamanda otomatik (kurallı) özet üretir ve kelime araması sağlar.

## Özellikler

- Çoklu haber kaynağından (RSS) verileri çekip tek listede birleştirir.
- 5 dakikalık bellek içi önbellek ile aynı isteklerde hız kazanır.
- Kısa özetleri TF-IDF benzeri kelime skoru ile otomatik çıkarır.
- Arama kutusu ve kaynak filtresi ile hızlı süzme.
- Basit, mobil uyumlu arayüz.

## Kurulum

1. Bilgisayarında Node.js (18+) kurulu olduğundan emin ol.
2. Dizine girip bağımlılık olmadığı için doğrudan çalıştır:

```bash
npm start
```

3. Tarayıcıdan `http://localhost:3000` adresini aç.

> Not: Sunucu ayağa kalkınca ilk `/api/news` isteğinde kaynaklar okunur. RSS sağlayıcıları erişime kapalıysa veya ağ kısıtlıysa liste boş dönebilir.

## Yapı

- `server.js`: RSS çekme, önbellek, özetleme ve statik dosya servisi.
- `public/`: HTML, CSS ve tarayıcı tarafı JS.

## Özelleştirme

- Yeni kaynak eklemek için `server.js` içindeki `RSS_SOURCES` listesine `{ name, url }` objesi ekle.
- Özet cümle sayısını `summarize` fonksiyonundaki `sentenceCount` parametresi ile yükselt/azalt.
- Tasarımı değiştirmek için `public/styles.css` dosyasını düzenle.

## Dağıtım

Godaddy üzerinde aldığın domain için herhangi bir VPS/PaaS servisine Node.js uygulaması olarak dağıtabilir ya da Vercel/Render gibi servislerde kolayca yayınlayabilirsin. Uygulama sadece Node çekirdeğine ihtiyaç duyar.
