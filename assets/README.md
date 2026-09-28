# Assets Klasörü - Logo Dosyaları

Bu klasörde DersTakipCO uygulaması için gerekli tüm logo ve ikon dosyaları bulunmaktadır.

## 📁 Dosya Listesi

### Ana Logo Dosyaları
| Dosya | Boyut | Kullanım Yeri |
|-------|-------|---------------|
| `icon.svg` | 512x512 | Kaynak vektör dosyası (düzenleme için) |
| `icon.png` | 512x512 | Genel kullanım, web, dokümantasyon |
| `icon.ico` | Çoklu boyut | Windows uygulaması, görev çubuğu, masaüstü |

### Microsoft Store Logoları
| Dosya | Boyut | Kullanım Yeri |
|-------|-------|---------------|
| `Square44x44Logo.png` | 44x44 | Store küçük logo, uygulama listesi |
| `Square150x150Logo.png` | 150x150 | Başlat Menüsü orta boyut tile |
| `Wide310x150Logo.png` | 310x150 | Başlat Menüsü geniş tile |
| `StoreLogo.png` | 50x50 | Microsoft Store ürün sayfası |

### Manifest Dosyası
| Dosya | Kullanım |
|-------|----------|
| `AppxManifest.xml` | Microsoft Store APPX paketi yapılandırması |

## 🎨 Logo Tasarımı

### Renkler
- Ana renk: `#f97316` (Turuncu)
- Koyu ton: `#ea580c`
- Beyaz: `#ffffff`
- Gradient arka plan

### Öğeler
1. **Açık kitap** - Eğitim ve öğrenme
2. **Kalem** - Yazmak ve kaydetmek
3. **Onay işareti** - Takip ve tamamlama
4. **Yuvarlatılmış köşeler** - Modern ve dostça

### Boyutlar
- ICO formatı 6 farklı boyut içerir: 256, 128, 64, 48, 32, 16 piksel
- Tüm PNG dosyaları şeffaf arka plan değil, gradient ile
- Microsoft Store kurallarına uygun

## 🔄 Logo Güncelleme

Logoyu değiştirmek isterseniz:

1. `icon.svg` dosyasını düzenleyin
2. `create_icons.py` script'ini çalıştırın:
   ```bash
   python3 create_icons.py
   ```
3. Tüm formatlar otomatik oluşturulacak

## ✅ Sertifikasyon Kontrolü

Microsoft Store sertifikasyonu için:
- [x] Electron varsayılan logoları kaldırıldı
- [x] Tüm gerekli boyutlar mevcut
- [x] Şeffaf arka plan YOK (turuncu gradient ile)
- [x] Yüksek çözünürlük (pixelation yok)
- [x] Uygun renk kontrastı
- [x] Profesyonel görünüm

## 📝 Notlar

- Bu dosyaları manuel olarak değiştirmeyin
- Değişiklik için `create_icons.py` kullanın
- Microsoft Store submission öncesi `ls assets/` ile dosyaları kontrol edin
- Tüm dosyalar git'e commit edilmeli

---

**Oluşturulma Tarihi:** 22 Aralık 2024  
**Oluşturan:** DersTakipCO Build System
