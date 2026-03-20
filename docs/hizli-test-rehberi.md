# Domizan Hızlı Test Rehberi

Bu doküman, şu ana kadar tamamlanan parçaları en hızlı ve en net şekilde test etmek için hazırlanmıştır.

## 1. Bugünkü Sonuç

Şu anki doğrulanmış durum:

- repo public
- Windows installer üretilebiliyor
- kurulu uygulama açılıyor
- onboarding, trial, lisans ve mükellef akışları test edilebilir durumda
- updater arayüzü bağlı

Şu anki tek net blokaj:

- GitHub tarafında henüz yayınlanmış bir release yok
- bu yüzden updater `releases.atom` veya yayın metadata kaynağını bulamıyor
- sonuç olarak `Güncellemeyi denetle` sırasında 404 almak şu anda normal

Kaynak doğrulama:

- GitHub repo sayfası public görünüyor
- aynı sayfada `No releases published` yazıyor

## 2. Nereden Test Edeceğiz

### A. Geliştirme Modu

Konum:

- [domizan-test-baslat.bat](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-test-baslat.bat)
- [domizan-test-baslat.command](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-test-baslat.command)

Amaç:

- onboarding
- trial
- lisans aktivasyonu
- mükellef yönetimi
- Excel / CSV import
- klasör yapısı
- `Bilgi.txt`

Not:

- geliştirme modunda updater test edilmez

### B. Kurulu Windows Uygulaması

Konum:

- [Domizan-0.1.0-win-x64.exe](C:/Users/acero/Documents/GitHub/domi-ass/release/Domizan-0.1.0-win-x64.exe)

Amaç:

- çift tıkla kurulum
- kurulu sürüm davranışı
- updater görünürlüğü
- gerçek update testi

### C. Kurulu macOS Uygulaması

Amaç:

- `.dmg` ile kurulum
- Intel ve Apple Silicon ayrı build doğrulaması

Not:

- bu makinede macOS build’i çalıştırıp test etmedik
- hedefler tanımlı ama gerçek doğrulama mac üzerinde yapılmalı

## 3. Hızlı Smoke Sırası

Bu sırayı uygularsan en hızlı sonuca varırız:

1. tam sıfırdan başla
2. onboarding test et
3. 7 günlük trial test et
4. uygulamayı kapatıp aç
5. Lemon satın alma ve lisans aktivasyonunu test et
6. mükellef oluştur
7. import test et
8. kurulu Windows sürümünde updater görünümünü test et
9. ilk gerçek GitHub release sonrası updater’ı tekrar test et

## 4. Sıfırdan Başlatma

Tam temizlik:

- Windows: [domizan-sifirla.bat](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-sifirla.bat)
- macOS: [domizan-sifirla.command](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-sifirla.command)

Bu işlem şunları temizler:

- masaüstü `Domizan` klasörü
- Electron user data
- local database
- shared machine security kayıtları

## 5. Erişim ve Lisans Test Kısayolları

Sadece lisansı temizlemek:

- Windows: [domizan-lisansi-kaldir.bat](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-lisansi-kaldir.bat)
- macOS: [domizan-lisansi-kaldir.command](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-lisansi-kaldir.command)

Denemeyi anında bitirmek:

- Windows: [domizan-denemeyi-bitir.bat](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-denemeyi-bitir.bat)
- macOS: [domizan-denemeyi-bitir.command](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-denemeyi-bitir.command)

Durum görmek:

```bash
node tools/domizan-access-tool.cjs status
```

Bu araç şunları gösterir:

- local DB var mı
- shared access dosyası var mı
- machine binding dosyası var mı
- lisans durumu
- deneme durumu

## 6. Onboarding ve Trial Hızlı Testi

Adımlar:

1. sıfırlama scriptini çalıştır
2. geliştirme modunda uygulamayı aç
3. ofis adı, yetkili adı, e-posta gir
4. `7 günlük denemeyi başlat`
5. uygulamayı kapatıp yeniden aç

Beklenen:

- onboarding tekrar istemez
- trial aktif görünür
- erişim açık kalır

## 7. Lemon Lisans Hızlı Testi

Adımlar:

1. onboarding erişim ekranında `Satın alma sayfasını aç`
2. Lemon test checkout üzerinden siparişi tamamla
3. lisans anahtarını al
4. uygulamada lisans anahtarı ve sipariş e-postası ile aktivasyon yap
5. ardından `Kayıtlı lisansı doğrula`

Beklenen:

- lisans aktif olur
- trial yerine `licensed` görünür
- shared machine lisans durumu yazılır

## 8. Mükellef ve Import Hızlı Testi

Adımlar:

1. yeni mükellef oluştur
2. klasörü aç
3. `Bilgi.txt` oluştuğunu doğrula
4. düzenleme yap
5. `Bilgi.txt` güncellendiğini doğrula
6. Türkçe karakterli `.csv` içe aktar
7. farklı kolon sıralı `.xlsx` içe aktar

Beklenen:

- klasör yapısı açılır
- `Bilgi.txt` oluşur ve güncellenir
- Türkçe karakter bozulmaz
- kolon eşleme kullanıcı onayıyla ilerler

## 9. Windows Installer Hızlı Testi

Adımlar:

1. [Domizan-0.1.0-win-x64.exe](C:/Users/acero/Documents/GitHub/domi-ass/release/Domizan-0.1.0-win-x64.exe) dosyasına çift tıkla
2. kurulumu tamamla
3. uygulamayı başlat
4. lisanslı veya trial durumda açıldığını doğrula

Beklenen:

- kurulum tamamlanır
- uygulama normal açılır
- updater kartı görünür

## 10. Update Testi Şu An Neden Tam Geçmiyor

Sebep:

- updater, GitHub Releases akışından yayın metadata bekler
- şu anda GitHub repo public olsa da release yayımlanmış değil

Yani şu an:

- updater kartının görünmesi doğru
- `Güncellemeyi denetle` deyince hata gelmesi de doğru

Bu hata şu an bug değil, eksik release sonucudur.

## 11. Update Testini Gerçekten Nasıl Geçireceğiz

Gerçek test akışı:

1. mevcut kurulu sürüm `0.1.0` olarak kalsın
2. repo içinde sürümü `0.1.1` yap
3. commit ve push et
4. `v0.1.1` tag oluştur ve push et
5. GitHub Actions release workflow artefaktları yayınlasın
6. GitHub repo `Releases` bölümünde yeni release görünür hale gelsin
7. kurulu `0.1.0` uygulamada `Güncellemeyi denetle`

Beklenen:

- yeni sürüm algılanır
- indirme başlar
- `Şimdi kur` aktif olur

## 12. Sonuca Nasıl Varmalıyız

Bugün için doğru sonuç matrisi:

- onboarding: test edilmeli
- trial: test edilmeli
- lisans aktivasyonu: test edilmeli
- mükellef yönetimi: test edilmeli
- import: test edilmeli
- installer: geçti
- updater UI: geçti
- updater download/install: ilk gerçek GitHub release sonrası tekrar test edilmeli

## 13. Bir Sonraki Net Adım

Updatersız kısım artık yeterince hazır.

Şimdi en mantıklı kısa yol:

1. `0.1.1` sürümünü çıkaralım
2. tag basalım
3. GitHub release oluşsun
4. kurulu `0.1.0` üzerinden gerçek update testini tamamlayalım
