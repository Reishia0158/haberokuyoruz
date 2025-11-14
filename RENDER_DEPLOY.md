<<<<<<< Updated upstream
# Render'a Deploy Etme Rehberi

## Adım 1: GitHub'a Yükleme (Önerilen)

1. GitHub'da yeni bir repository oluşturun
2. Projeyi GitHub'a yükleyin:

```bash
cd C:\Users\EymenAlp\Desktop\Website
git init
git add .
git commit -m "İlk commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/haberokuyoruz.git
git push -u origin main
```

## Adım 2: Render'da Web Service Oluşturma

1. [Render.com](https://render.com) sitesine giriş yapın
2. Dashboard'da **"New +"** butonuna tıklayın
3. **"Web Service"** seçeneğini seçin
4. GitHub repository'nizi bağlayın veya direkt deploy edin
5. Ayarları yapılandırın:

### Render Ayarları:

- **Name**: `haberokuyoruz` (veya istediğiniz isim)
- **Environment**: `Node`
- **Build Command**: (boş bırakın - gerek yok)
- **Start Command**: `node server.js`
- **Plan**: Free (veya istediğiniz plan)

### Environment Variables (Ortam Değişkenleri):

Eğer Gemini API kullanıyorsanız:

- **Key**: `GEMINI_API_KEY`
- **Value**: Gemini API anahtarınız

Opsiyonel:
- **Key**: `PORT`
- **Value**: `10000` (Render otomatik atar, ama belirtebilirsiniz)

## Adım 3: Domain Bağlama (Opsiyonel)

1. Render dashboard'da servisinize tıklayın
2. **"Settings"** sekmesine gidin
3. **"Custom Domain"** bölümüne gidin
4. `haberokuyoruz.com` domain'inizi ekleyin
5. GoDaddy'de DNS ayarlarını yapın:
   - **Type**: CNAME
   - **Name**: @ (veya www)
   - **Value**: Render'ın verdiği CNAME değeri

## Adım 4: UptimeRobot'u Yapılandırma

Deploy tamamlandıktan sonra:

1. UptimeRobot'da monitor'ünüzü düzenleyin
2. URL'yi güncelleyin:
   - Render URL: `https://haberokuyoruz.onrender.com/api/ping`
   - VEYA custom domain: `https://haberokuyoruz.com/api/ping`
3. Test edin: Tarayıcıda URL'yi açın, `{"status":"ok"}` yanıtını görmelisiniz

## Adım 5: Test

Deploy tamamlandıktan sonra:

1. Render'ın verdiği URL'yi açın (örn: `https://haberokuyoruz.onrender.com`)
2. `/api/ping` endpoint'ini test edin
3. UptimeRobot'un çalıştığını kontrol edin

## Sorun Giderme

### "Application Error" görüyorsanız:
- Render logs'u kontrol edin
- Environment variables'ı kontrol edin
- `server.js` dosyasının doğru olduğundan emin olun

### UptimeRobot çalışmıyorsa:
- URL'nin doğru olduğundan emin olun
- Render servisinin aktif olduğundan emin olun
- `/api/ping` endpoint'ini tarayıcıda test edin

=======
# Render'a Deploy Etme Rehberi

## Adım 1: GitHub'a Yükleme (Önerilen)

1. GitHub'da yeni bir repository oluşturun
2. Projeyi GitHub'a yükleyin:

```bash
cd C:\Users\EymenAlp\Desktop\Website
git init
git add .
git commit -m "İlk commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/haberokuyoruz.git
git push -u origin main
```

## Adım 2: Render'da Web Service Oluşturma

1. [Render.com](https://render.com) sitesine giriş yapın
2. Dashboard'da **"New +"** butonuna tıklayın
3. **"Web Service"** seçeneğini seçin
4. GitHub repository'nizi bağlayın veya direkt deploy edin
5. Ayarları yapılandırın:

### Render Ayarları:

- **Name**: `haberokuyoruz` (veya istediğiniz isim)
- **Environment**: `Node`
- **Build Command**: (boş bırakın - gerek yok)
- **Start Command**: `node server.js`
- **Plan**: Free (veya istediğiniz plan)

### Environment Variables (Ortam Değişkenleri):

Eğer Gemini API kullanıyorsanız:

- **Key**: `GEMINI_API_KEY`
- **Value**: Gemini API anahtarınız

Opsiyonel:
- **Key**: `PORT`
- **Value**: `10000` (Render otomatik atar, ama belirtebilirsiniz)

## Adım 3: Domain Bağlama (Opsiyonel)

1. Render dashboard'da servisinize tıklayın
2. **"Settings"** sekmesine gidin
3. **"Custom Domain"** bölümüne gidin
4. `haberokuyoruz.com` domain'inizi ekleyin
5. GoDaddy'de DNS ayarlarını yapın:
   - **Type**: CNAME
   - **Name**: @ (veya www)
   - **Value**: Render'ın verdiği CNAME değeri

## Adım 4: UptimeRobot'u Yapılandırma

Deploy tamamlandıktan sonra:

1. UptimeRobot'da monitor'ünüzü düzenleyin
2. URL'yi güncelleyin:
   - Render URL: `https://haberokuyoruz.onrender.com/api/ping`
   - VEYA custom domain: `https://haberokuyoruz.com/api/ping`
3. Test edin: Tarayıcıda URL'yi açın, `{"status":"ok"}` yanıtını görmelisiniz

## Adım 5: Test

Deploy tamamlandıktan sonra:

1. Render'ın verdiği URL'yi açın (örn: `https://haberokuyoruz.onrender.com`)
2. `/api/ping` endpoint'ini test edin
3. UptimeRobot'un çalıştığını kontrol edin

## Sorun Giderme

### "Application Error" görüyorsanız:
- Render logs'u kontrol edin
- Environment variables'ı kontrol edin
- `server.js` dosyasının doğru olduğundan emin olun

### UptimeRobot çalışmıyorsa:
- URL'nin doğru olduğundan emin olun
- Render servisinin aktif olduğundan emin olun
- `/api/ping` endpoint'ini tarayıcıda test edin

>>>>>>> Stashed changes
