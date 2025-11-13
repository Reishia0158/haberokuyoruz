# Render Uyku Modu Çözümü

Render'ın ücretsiz planında uygulamalar 15 dakika hareketsizlikten sonra uyku moduna geçer. Bu sorunu çözmek için birkaç yöntem var:

## Yöntem 1: UptimeRobot (Önerilen - Ücretsiz)

1. [UptimeRobot.com](https://uptimerobot.com) sitesine kaydolun (ücretsiz)
2. "Add New Monitor" butonuna tıklayın
3. Ayarlar:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Haber Okuyoruz Ping
   - **URL**: `https://haberokuyoruz.com/api/ping` (kendi domain'inizi yazın)
   - **Monitoring Interval**: 5 dakika (ücretsiz plan)
4. Kaydedin

UptimeRobot her 5 dakikada bir `/api/ping` endpoint'ini çağırarak sunucunuzu aktif tutar.

## Yöntem 2: cron-job.org (Alternatif)

1. [cron-job.org](https://cron-job.org) sitesine kaydolun
2. Yeni bir cron job oluşturun:
   - **Title**: Haber Okuyoruz Keep-Alive
   - **Address**: `https://haberokuyoruz.com/api/ping`
   - **Schedule**: Her 10 dakikada bir
3. Kaydedin

## Yöntem 3: Render Cron Job (Ücretli Plan Gerekir)

Eğer Render'ın ücretli planına geçerseniz, Render'ın kendi cron job özelliğini kullanabilirsiniz.

## Test Etme

Endpoint'in çalıştığını test etmek için tarayıcınızdan şu adresi açın:
```
https://haberokuyoruz.com/api/ping
```

Şu şekilde bir yanıt almalısınız:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "Sunucu aktif"
}
```

## Notlar

- UptimeRobot ücretsiz planında 50 monitor limiti var (yeterli)
- Monitoring interval'i 5 dakikadan kısa olamaz (ücretsiz planda)
- Bu yöntemler sunucunuzu aktif tutar, ancak ilk istek hala biraz yavaş olabilir (cold start)
- Render'ın ücretli planına geçerseniz uyku modu sorunu tamamen ortadan kalkar

