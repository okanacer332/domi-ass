# Domizan Proje Durumu ve Devam Notları

Bu dosya yaşayan proje özetidir. Repo üzerinde çalışan herkes, anlamlı bir geliştirme yaptıktan sonra bu dosyayı güncellemelidir.

## 1. Ürün Özeti

Domizan, mali müşavir ofisleri için geliştirilen yapay zeka destekli masaüstü operasyon platformudur.

Ana hedefler:

- mükellef takibini kolaylaştırmak
- ortak belge akışını düzenlemek
- klasör yapısını korumak
- çalışanların belge toplama işini sadeleştirmek
- mali müşavire Telegram üzerinden bilgi, brif ve hatırlatma sunmak
- Windows ve macOS üzerinde premium masaüstü deneyimi vermek

Net kullanım kurgusu:

- Belgeler önce ofise gelir.
- Çalışanlar bunları `Desktop/Domizan/GelenKutusu` alanına bırakır.
- Domizan belgeyi anlar, tasnif eder, doğru mükellef klasörüne taşır ve takibe alır.
- Telegram belge giriş kanalı değildir.
- Telegram sadece mali müşavirin kişisel bilgi ve brif kanalıdır.

## 2. Mevcut Mimari

Desktop uygulama:

- `Electron + React + TypeScript + electron-vite`
- local-first mimari
- yerel veritabanı: `sql.js + Drizzle`

Backend:

- ayrı `backend/` servisi
- `Node.js + Express + TypeScript`
- Cloud Run üzerinde çalışıyor
- Lemon lisans aktivasyon, doğrulama ve webhook kabul katmanı burada

## 3. Masaüstü Klasör Yapısı

İlk açılışta masaüstünde şu yapı oluşturulur:

- `Desktop/Domizan`
- `Desktop/Domizan/Mukellefler`
- `Desktop/Domizan/GelenKutusu`
- `Desktop/Domizan/Veri`
- `Desktop/Domizan/Raporlar`
- `Desktop/Domizan/Sablonlar`
- `Desktop/Domizan/_Sistem`

Her mükellef için standart alt klasörler açılır:

- `01-Gelen Belgeler`
- `02-Beyanname`
- `03-Faturalar`
- `04-Banka`
- `05-Personel`
- `06-Resmi Evrak`
- `99-Diger`

Her mükellef klasöründe ayrıca `Bilgi.txt` üretilir.

## 4. Tamamlanan Büyük Parçalar

### 4.1. Desktop Temeli

- Electron uygulama iskeleti kuruldu.
- main / preload / renderer ayrımı yapıldı.
- premium tasarım dili kuruldu.
- sidebar sticky hale getirildi.
- maskot sağ altta sabit varlık olarak konumlandı.
- `npm run build` başarılı.

### 4.2. Mükellef Yönetimi

Hazır:

- mükellef listeleme
- yeni mükellef ekleme
- düzenleme
- aktif / pasif geçişi
- mükellef klasörünü doğrudan açma
- standart mükellef klasörü üretme

### 4.3. Kimlik Modeli

Bu konu kesin karardır.

Aktif model:

- `identityType`: `vkn | tckn`
- `identityNumber`

Kurallar:

- T.C. kimlikte checksum zorunlu
- VKN’de checksum zorunlu
- geçersiz numara kayda alınmaz
- import sırasında da sıkı doğrulama uygulanır

### 4.4. Bilgi.txt

Hazır:

- her mükellef klasörüne `Bilgi.txt` oluşturuluyor
- ad, kimlik, vergi dairesi, yetkili, telefon, e-posta, adres, notlar ve durum yazılıyor
- yeni kayıt, düzenleme ve durum değişimlerinde güncelleniyor

### 4.5. Excel / CSV İçe Aktarma

Hazır:

- `.xlsx` ve `.csv` ön izleme
- otomatik kolon eşleme önerisi
- kullanıcı onaylı import
- satır bazlı uyarılar
- upsert mantığı

- `.xlsm`, `.xltx` ve `.xltm` desteÄŸi
- boÅŸ olmayan en doÄŸru sayfayÄ± otomatik seÃ§me
- formÃ¼l, rich text ve birleÅŸik hÃ¼creleri daha toleranslÄ± okuma

Kararlar:

- `.xls` desteklenmiyor
- Türkiye öncelikli encoding desteği var
- kimlik numarası varsa önce ona göre eşleşme yapılır

### 4.6. Onboarding ve Deneme

Hazır:

- ilk açılış onboarding ekranı
- ofis adı, yetkili adı ve e-posta toplama
- 7 günlük deneme başlatma ekranı
- lisans anahtarı ile açma ekranı
- deneme dolduğunda kilitli erişim ekranı

### 4.7. Makineye Bağlı Kopya Koruması

Hazır:

- kurulum makine seviyesinde bağlanıyor
- Windows: `ProgramData/Domizan/Security`
- macOS: `/Users/Shared/Domizan/Security`
- `machine-binding.json` ile kurulum kimliği ve binding hash tutuluyor
- başka makineye kopyalanırsa erişim `mismatch` olarak kilitleniyor
- trial ve lisans durumu ortak makine seviyesinde de tutuluyor
- aynı bilgisayarda farklı kullanıcı profilleri yeni deneme açamıyor

### 4.8. Masaüstü Release ve Update Altyapısı

Hazır:

- Windows için `NSIS` installer hedefi tanımlandı
- macOS için `DMG + ZIP` hedefleri tanımlandı
- Intel ve Apple Silicon için ayrı macOS build hedefleri tanımlandı
- uygulama içi update state katmanı eklendi
- topbar üzerinde sürüm ve update durumu görünür hale geldi
- GitHub Releases tabanlı sıfır maliyetli yayın modeli kuruldu
- GitHub Actions release workflow eklendi

Canlı durum:

- `v0.1.0` GitHub release yayınlandı
- Windows installer canlı
- macOS Apple Silicon installer canlı
- `latest.yml` ve `latest-mac.yml` yayınlandı
- landing indirme sayfası release verisini canlı okuyor
- `macOS Intel` artefaktı bu ilk koşuda oluşmadı ve ayrı takip edilecek

### 4.9. Hızlı Erişim Test Araçları

Hazır:

- yerel lisansı temizleyen Windows ve macOS kısayolları eklendi
- denemeyi anında bitmiş hale getiren Windows ve macOS kısayolları eklendi
- erişim durumunu düzenleyen yardımcı araç `tools/domizan-access-tool.cjs` altında toplandı

## 5. Lisanslama Durumu

Bu alan artık ciddi ölçüde tamamlandı.

### 5.1. Lemon Bilgileri

- `LEMON_MODE=test`
- `LEMON_STORE_ID=321476`
- `LEMON_PRODUCT_ID=906701`
- `LEMON_VARIANT_ID=1426060`
- `LEMON_CHECKOUT_URL=https://domizan.lemonsqueezy.com/checkout/buy/628ec32c-e243-4be8-8722-08a863a9c827`
- aktivasyon limiti: `5`

### 5.2. Cloud Run Backend

Hazır:

- servis adı: `domizan-api`
- proje: `domizan`
- bölge: `europe-west1`
- canlı URL: `https://domizan-api-5jzmdzz6lq-ew.a.run.app`

Backend endpoint’leri:

- `GET /health`
- `POST /licenses/activate`
- `POST /licenses/validate`
- `POST /webhooks/lemon`

Desktop artık Lemon API’ye doğrudan gitmez.

Desktop ana süreç, public backend adresine gider ve API key sadece Cloud Run tarafında kalır.

### 5.3. Secret Manager

Oluşturuldu:

- `domizan-lemon-api-key`
- `domizan-lemon-webhook-secret`

Runtime service account:

- `domizan-api-run@domizan.iam.gserviceaccount.com`

Bu service account’a `Secret Manager Secret Accessor` yetkisi verildi.

### 5.4. Webhook

Aktif Lemon webhook ID:

- `82983`

Geçici çalışan callback:

- `https://domizan-api-5jzmdzz6lq-ew.a.run.app/webhooks/lemon`

Durum:

- webhook imza testi başarılı
- Cloud Run canlı
- Lemon webhook canlı adrese güncellendi

### 5.5. Custom Domain Durumu

Hedef:

- `https://api.domizan.com/webhooks/lemon`

Henüz tamamlanmayan tek neden:

- `domizan.com` Google tarafında verify görünmüyor

Şu an verify görünen domain:

- `olric.app`

Yani lisans backend’i çalışıyor, ancak custom domain mapping için domain verification adımı eksik.

## 6. Aktif Test Fazı

Şu an doğru odak, custom domain'i beklemeden ürünün çekirdek akışlarını gerçek kullanım gibi test etmektir.

Aktif test başlıkları:

- onboarding akışı
- 7 günlük deneme akışı
- shared machine kopya koruması
- Lemon test mode satın alma ve lisans aktivasyonu
- mükellef oluşturma ve `Bilgi.txt`
- Excel / CSV içe aktarma
- landing üzerinden gerçek Windows indirme testi
- kurulu sürümden `0.1.1` update testi

Test planı:

- [manual-test-plani.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/manual-test-plani.md)
- [hizli-test-rehberi.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/hizli-test-rehberi.md)

## 7. Açık Büyük Fazlar

Henüz sonraki fazda:

- ilk mükellef seti oluşturma sihirbazı
- GelenKutusu belge izleme
- AI ile belge sınıflandırma
- belgeyi doğru klasöre taşıma
- Telegram brif ve sorgu katmanı
- beyanname ve kritik tarih hatırlatmaları
- çok kullanıcılı ofis rolleri
- Lemon canlı moda geçiş ve domain mapping tamamlama
- macOS Intel release artefaktının da kararlı şekilde üretilmesi

## 8. Sonraki Doğru Adımlar

Önerilen sıra:

1. onboarding sonrası ilk mükellef kurulum sihirbazı
2. GelenKutusu izleme ve belge işleme çekirdeği
3. AI sınıflandırma ve klasör önerisi
4. `Bilgi.txt` ve mükellef kartını belge analiziyle zenginleştirme
5. Telegram bilgi ve günlük brif katmanı
6. `api.domizan.com` domain verification ve mapping
7. Lemon canlı mod

## 9. İlişkili Dosyalar

- [domizan-urun-vizyonu-ve-yolculugu.md](C:/Users/acero/Documents/GitHub/domi-ass/domizan-urun-vizyonu-ve-yolculugu.md)
- [teknik-mimari-ve-yol-haritasi.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/teknik-mimari-ve-yol-haritasi.md)
- [lemon-test-modu-kurulumu.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/lemon-test-modu-kurulumu.md)
- [cloud-run-lisans-backendi.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/cloud-run-lisans-backendi.md)
- [manual-test-plani.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/manual-test-plani.md)
- [hizli-test-rehberi.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/hizli-test-rehberi.md)
- [masaustu-release-ve-update.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/masaustu-release-ve-update.md)

## 10. Son Not

Domizan artık fikir aşamasında değildir.

Bugün itibarıyla:

- çalışan desktop iskeleti vardır
- mükellef yönetimi vardır
- kimlik ayrımı kesindir
- import çekirdeği vardır
- `Bilgi.txt` akışı vardır
- onboarding ve 7 günlük deneme vardır
- makineye bağlı lisans koruması vardır
- Cloud Run üzerinde canlı lisans backend’i vardır

Bir sonraki büyük kırılım belge operasyon çekirdeğidir.
## 11. 20 Mart 2026 GÃ¼ncellemesi

- trial sÃ¼resi bitince uygulama onboarding'e geri dÃ¶nmÃ¼yor; readonly gÃ¶rÃ¼ntÃ¼leme modunda aÃ§Ä±lÄ±yor
- readonly modda create / update / import / klasÃ¶r iÅŸlemleri renderer ve main process tarafÄ±nda birlikte kilitleniyor
- lisans satÄ±n alma ve lisans etkinleÅŸtirme CTA'larÄ± uygulama iÃ§inde gÃ¶rÃ¼nÃ¼r tutuldu
- Excel import tarafÄ±nda `.xlsx`, `.xlsm`, `.xltx`, `.xltm` okuma hattÄ± gÃ¼Ã§lendirildi
- boÅŸ olmayan en uygun worksheet seÃ§imi ve hÃ¼cre metni normalizasyonu geliÅŸtirildi
- saÄŸ alttaki maskot gelecekteki chatbot alanÄ± iÃ§in yaklaÅŸÄ±k 4x kÃ¼Ã§Ã¼ltÃ¼ldÃ¼
