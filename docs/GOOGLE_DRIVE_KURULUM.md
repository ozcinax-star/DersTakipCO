# Google Drive ile Aktarım: Kurulum

DersTakipCO, kullanıcının isteğe bağlı olarak verilerini kendi Google Drive hesabına yükleyip başka bir bilgisayarda çekmesine izin verir. Bu özelliğin çalışması için uygulamanın bir **Google Cloud OAuth istemcisi** ile derlenmesi gerekir. Bu adımlar bir kez yapılır.

## Nasıl çalışır

- İzin: `https://www.googleapis.com/auth/drive.appdata`. Uygulama yalnızca Drive'daki kendine ait gizli klasöre erişir; kullanıcının diğer dosyalarını göremez. Bu izin Google'ın "hassas olmayan" sınıfındadır, uygulama doğrulaması gerektirmez.
- Giriş: sistem tarayıcısında Google girişi, `127.0.0.1` geri dönüş adresi ve PKCE.
- Anahtar: Windows kullanıcı hesabına bağlı olarak şifrelenir (`safeStorage` / DPAPI).
- Dosya: Drive'ın gizli uygulama klasöründe `derstakipco-veriler.json` (tüm profiller, v3 tam yedek biçimi).
- **Drive'a Yükle** Drive'daki kopyanın yerine koyar. Başka bir bilgisayar daha yeni veri yüklediyse önce uyarır.
- **Drive'dan Verileri Çek** bu bilgisayardaki tüm verilerin yerine koyar. Önce onay ister ve mevcut verinin kopyasını `Belgeler\DersTakipCO Yedekler\drive-oncesi-*.json` olarak kaydeder.
- Kullanıcı Drive'daki kopyayı silmek isterse: drive.google.com → Ayarlar → Uygulamaları yönet → DersTakipCO → Gizli uygulama verilerini sil.

## Google Cloud adımları

1. https://console.cloud.google.com adresinde yeni bir proje oluşturun (ör. **DersTakipCO**).
2. **API'ler ve Hizmetler → Kitaplık** bölümünde **Google Drive API**'yi etkinleştirin.
3. **Google Auth Platform → Markalama** bölümünde uygulama adını (**DersTakipCO**) ve destek e-postasını girin.
4. **Kitle (Audience)** bölümünde kullanıcı türünü **Harici (External)** seçin.
5. **Veri erişimi (Data access)** bölümünde **Kapsam ekle** ile `.../auth/drive.appdata` iznini ekleyin.
6. **Kitle** bölümünde **Uygulamayı yayınla → Üretimde (In production)** seçin.
   - "Test" durumunda kalırsa yalnızca elle eklenen en fazla 100 test kullanıcısı bağlanabilir ve bağlantılar **7 günde bir** düşer.
7. **İstemciler (Clients) → İstemci oluştur** ile uygulama türü olarak **Masaüstü uygulaması (Desktop app)** seçin. Oluşan JSON'u indirin.
8. İndirdiğiniz dosyayı `electron/google-oauth.json` olarak kaydedin (biçim için `electron/google-oauth.example.json` dosyasına bakın).
   Bu dosya `.gitignore` içindedir; **repoya eklemeyin**.
9. `npm run dist` ile yeniden derleyin. Dosya kurulum paketine dahil edilir ve Ayarlar'da **Google Drive ile Aktarım** kartı görünür.

`google-oauth.json` yoksa özellik tamamen gizlenir; uygulamanın geri kalanı etkilenmez.

## Test

Geliştirme sırasında gerçek Google yerine yerel bir sahte sunucu kullanılabilir. Adresler ortam değişkenleriyle değiştirilebilir:

| Değişken | Varsayılan |
| --- | --- |
| `DERSTAKIP_GOOGLE_CLIENT_ID` / `DERSTAKIP_GOOGLE_CLIENT_SECRET` | `electron/google-oauth.json` |
| `DERSTAKIP_GOOGLE_AUTH_URL` | `https://accounts.google.com/o/oauth2/v2/auth` |
| `DERSTAKIP_GOOGLE_TOKEN_URL` | `https://oauth2.googleapis.com/token` |
| `DERSTAKIP_GOOGLE_REVOKE_URL` | `https://oauth2.googleapis.com/revoke` |
| `DERSTAKIP_DRIVE_API_URL` | `https://www.googleapis.com/drive/v3` |
| `DERSTAKIP_DRIVE_UPLOAD_URL` | `https://www.googleapis.com/upload/drive/v3` |
| `DERSTAKIP_OAUTH_OPEN=fetch` | Yalnızca otomatik testler: tarayıcı açmak yerine yönlendirmeyi doğrudan izler |
