# DersTakipCO

Özel ders veren öğretmenler için internet gerektirmeyen ders, öğrenci ve kazanç takip uygulaması (Windows).

- Ders oluşturma, takvim ve ders listesi
- Öğrenci kartları, veli kartı, şablonlar
- Akıllı haftalık planlama, aylık gelir hedefleri, öğrenci performans skorları
- Raporlar ve finans grafikleri
- Birden fazla öğretmen profili (Kurum Yönetimi)
- Yedekleme ve geri yükleme, günlük otomatik yedek
- İsteğe bağlı Google Drive ile bilgisayarlar arası veri aktarımı ([kurulum](docs/GOOGLE_DRIVE_KURULUM.md))

Veriler kullanıcının bilgisayarında saklanır. Kullanıcı Google Drive aktarımını açıkça kullanırsa, veriler yalnızca kendi Google Drive hesabındaki uygulamaya özel gizli klasöre yüklenir; başka hiçbir sunucuya gönderilmez.

## Microsoft Store sürümünden geçiş

Uygulama ilk açıldığında, bilgisayarda Microsoft Store'dan kurulmuş eski DersTakipCO (v2.x) varsa verilerini otomatik olarak bulur ve aktarır. Eski uygulamanın dosyalarına yazılmaz; veriler geçici bir kopyadan okunur.

Aranan konumlar:

- `%LOCALAPPDATA%\Packages\TEGAY.DersTakipCO_*\LocalCache\Roaming\DersTakipCO\Local Storage\leveldb`
- `%APPDATA%\DersTakipCO\Local Storage\leveldb`

Aktarım daha sonra **Ayarlar → Eski DersTakipCO Verileri** bölümünden tekrarlanabilir. Eski sürümde alınan `.json` yedekleri de **Ayarlar → Yedek Geri Yükle** ile açılabilir.

## Geliştirme

Gereksinimler: Node.js 20+ ve Windows.

```bash
npm install
npm run electron:dev   # Vite geliştirme sunucusu + Electron
npm run typecheck      # TypeScript kontrolü
npm run dist           # release/ altına kurulum (.exe) ve taşınabilir sürüm üretir
```

## Yapı

| Klasör / dosya | İçerik |
| --- | --- |
| `App.tsx`, `components/` | React arayüzü (Tailwind CSS, yerel olarak derlenir) |
| `services/db.ts` | localStorage veri katmanı, yedekleme, eski sürümden aktarım |
| `electron/main.js` | Pencere, menü, yedek kaydetme ve otomatik yedek |
| `electron/migration.js` | Eski Mağaza sürümünün verisini bulup okuma |
| `electron/googleDrive.js` | Google Drive girişi (OAuth + PKCE), yükleme ve çekme |
| `services/driveSync.ts`, `components/DriveSyncCard.tsx` | Drive aktarımı arayüzü |
| `tests/mock-google.js` | Testler için sahte Google OAuth/Drive sunucusu |
| `electron/preload.js` | Arayüz ile ana süreç arasındaki güvenli köprü |

## Veri formatı

localStorage anahtarları eski sürümle aynıdır: `derstakipco_teachers`, `derstakipco_students`, `derstakipco_lessons`, `derstakipco_groups`, `derstakipco_templates`, `derstakipco_default_pricing`.

Yedek dosyaları:

- **v3 (tam yedek):** `{ app, version, createdAt, teachers, students, lessons, groups, templates, defaultPricing }`
- **v2 (eski, tek profil):** `{ version, createdAt, teacher, students, lessons, groups }`

## Lisans

© 2025-2026 Çınar Öz. Destek: oz.cinar@hotmail.com
