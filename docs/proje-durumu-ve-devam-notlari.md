# Domizan Proje Durumu ve Devam Notları

Bu dosya Domizan projesinin yaşayan durum belgesidir.

Kural:

- Bu repo üzerinde çalışan herkes, anlamlı bir geliştirme yaptıktan sonra bu dosyayı güncellemelidir.
- Yeni özellik, mimari kararı, önemli bug fix, veri modeli değişikliği ve akış değişikliği burada yer almalıdır.
- Amaç, projeyi devralan kişinin 10 dakika içinde nerede olduğumuzu anlayabilmesidir.

## 1. Ürün Özeti

Domizan, mali müşavir ofisleri için geliştirilen yapay zeka destekli bir masaüstü operasyon platformudur.

Ana amaçlar:

- Mükellef takibini kolaylaştırmak
- Ortak gelen belge akışını düzenlemek
- Mükellef klasör yapısını korumak
- Ofis çalışanlarının belge toplama işini sadeleştirmek
- Mali müşavire Telegram üzerinden hızlı bilgi, günlük brif ve hatırlatma sunmak
- Windows ve macOS üzerinde çalışan premium bir masaüstü deneyimi vermek

Temel ürün fikri:

- Belgeler önce ofise gelir
- Çalışanlar bu belgeleri `Domizan/GelenKutusu` alanına toplar
- Domizan bu belgeleri anlamlandırır, tasnif eder, doğru klasöre yerleştirir ve takip eder
- Telegram tarafı belge giriş kanalı değildir
- Telegram yalnızca mali müşavirin kişisel bilgi ve brif kanalıdır

## 2. Ürünün Bugünkü Konumu

Şu anda Domizan bir Electron tabanlı desktop-first iskelet olarak kurulmuştur.

Teknik yön:

- `Electron + React + TypeScript + electron-vite`
- Local-first veri yaklaşımı
- Yerel veritabanı: `sql.js + Drizzle`
- Masaüstünde otomatik klasör yapısı
- Mükellef CRUD akışı hazır
- Excel/CSV içe aktarma çekirdeği hazır
- Yerel lisanslama iskeleti hazır

Tasarım yönü:

- Premium, sade, güven veren, ofis kullanımına uygun arayüz hedefleniyor
- Türkçe karakter ve Türkiye odaklı kullanım önceliklidir
- Sol panel sabit kalır
- Maskot sağ altta sabit bir chatbot varlığı gibi görünür

## 3. Mevcut Klasör ve Sistem Mantığı

Domizan ilk açılışta masaüstünde bu ana yapıyı üretir:

- `Desktop/Domizan`
- `Desktop/Domizan/Mukellefler`
- `Desktop/Domizan/GelenKutusu`
- `Desktop/Domizan/Veri`
- `Desktop/Domizan/Raporlar`
- `Desktop/Domizan/Sablonlar`
- `Desktop/Domizan/_Sistem`

Her mükellef için klasör açıldığında alt yapılar oluşturulur:

- `01-Gelen Belgeler`
- `02-Beyanname`
- `03-Faturalar`
- `04-Banka`
- `05-Personel`
- `06-Resmi Evrak`
- `99-Diger`

Ek olarak her mükellef klasöründe bir adet `Bilgi.txt` oluşturulur.

`Bilgi.txt` amacı:

- Mükellef hakkında hızlı okunabilir ofis özeti sunmak
- Telefon, yetkili, adres, kimlik bilgisi ve notları tek yerde toplamak
- Süreç içinde belge veya manuel veriyle zenginleşen hızlı referans dosyası olmak

## 4. Bugüne Kadar Yapılanlar

### 4.1. Temel Proje Kurulumu

- Electron uygulama iskeleti kuruldu
- Main, preload ve renderer ayrımı yapıldı
- React tabanlı arayüz altyapısı kuruldu
- Build pipeline çalışır durumda
- `npm run build` başarılı

### 4.2. Tasarım Temeli

- Marka varlıkları kullanıma alındı
- Logo ve maskot arayüze bağlandı
- Tema yapısı token bazlı düzenlendi
- Türkçe kullanım öncelikli font ve arayüz dili hedeflendi
- Sidebar sabit davranacak şekilde düzenlendi

### 4.3. Yerel Veri ve Klasör Omurgası

- Uygulama açılışında Domizan klasör yapısı hazırlanıyor
- Yerel veritabanı bootstrap akışı kuruldu
- Ayarlar, mükellefler, belgeler, hatırlatmalar ve lisans durumu tabloları tanımlandı

### 4.4. Mükellef Yönetimi

Hazır olanlar:

- Mükellef listeleme
- Yeni mükellef oluşturma
- Mükellef düzenleme
- Mükellefi pasife çekme / tekrar aktifleştirme
- Mükellef klasörünü doğrudan açma

Ek kararlar:

- Her mükellef için klasör slug mantığı var
- Aynı isim çakışmalarında benzersiz klasör adı üretiliyor
- Klasör yapısı mükellef kaydıyla birlikte açılıyor

### 4.5. Kimlik Modeli

Bu konu artık öneri değil, uygulanmış karardır.

Aktif veri modeli:

- `identityType`: `vkn | tckn`
- `identityNumber`: normalize edilmiş kimlik numarası

Uygulama davranışı:

- Formda kullanıcı kimlik türünü açıkça seçer
- Kimlik numarası buna göre doğrulanır
- T.C. kimlik için checksum doğrulaması aktiftir
- VKN için checksum doğrulaması aktiftir
- Geçersiz kimlik numarası kayda girmez
- İçe aktarmada kimlik numarası varsa sistem türü otomatik algılar ve sıkı doğrular
- Geçersiz kimlik numarası taşıyan satırlar içe alınmaz

Legacy uyumluluk:

- Eski `tax_id` kolonu geriye dönük uyumluluk için korunur
- Yeni `identity_type` ve `identity_number` alanlarına bootstrap sırasında otomatik geçiş yapılır

### 4.6. Bilgi.txt Akışı

Hazır olanlar:

- Her mükellef klasörüne `Bilgi.txt` oluşturuluyor
- Şu bilgiler yazılıyor:
  - Mükellef adı
  - Kimlik türü
  - Kimlik numarası
  - Vergi dairesi
  - Yetkili kişi
  - Telefon
  - E-posta
  - İl / ilçe
  - Açık adres
  - Notlar
  - Durum
  - Son güncelleme zamanı

Davranış:

- Yeni kayıt açılınca oluşur
- Düzenleme sonrası güncellenir
- Durum değişince güncellenir
- Eski kayıtlar listelenince eksikse oluşturulur

### 4.7. Excel / CSV İçe Aktarma

Hazır olanlar:

- Excel dosyası seçme
- Ön izleme
- Alan eşleme ekranı
- Kullanıcı onaylı içe aktarma
- Otomatik başlık tahmini
- Farklı kolon başlıklarına göre eşleme önerisi
- Satır bazlı doğrulama uyarıları
- Upsert mantığı

Destek:

- `.xlsx`
- `.csv`

Eski format kararı:

- `.xls` doğrudan desteklenmiyor
- Kullanıcıdan `.xlsx` veya `.csv` olarak yeniden kaydetmesi isteniyor

Encoding kararı:

- Türkiye öncelikli encoding desteği eklendi
- CSV tarafında şu adaylar deneniyor:
  - `utf8`
  - `windows-1254`
  - `iso-8859-9`

İçe aktarma davranışı:

- Önce otomatik alan eşleme önerilir
- Kullanıcı onaylamadan içe alınmaz
- `Mükellef adı` zorunlu alandır
- `Kimlik numarası` alanı varsa sistem bunu otomatik olarak `VKN` veya `T.C. Kimlik` olarak algılar
- Geçersiz kimlik numarası varsa ilgili satır atlanır
- Güncelleme eşleşmesinde kimlik numarası ilk önceliktir
- Kimlik numarası yoksa isim normalizasyonu fallback olarak kullanılır

### 4.8. Lisanslama ve Lemon Hazırlığı

Hazır olanlar:

- Lemon için env iskeleti hazır
- Hosted checkout açma altyapısı hazır
- Lisans aktivasyon ve doğrulama iskeleti hazır
- Yerelde lisans durumu saklama altyapısı hazır
- Test modu için ayrı kurulum dökümanı var

Henüz tamamlanmayanlar:

- Gerçek Lemon store/product/variant bağlanması
- Webhook tarafı
- Satın alma sonrası tam aktivasyon akışı

### 4.9. Hızlı Test Kısayolları

Hazır olanlar:

- Windows başlatma scripti
- macOS başlatma scripti
- Windows sıfırlama scripti
- macOS sıfırlama scripti

Not:

- Windows `.bat` dosyaları CRLF uyumlu hale getirildi
- Sıfırlama scriptleri kaynak kodu silmez
- Sadece yerel uygulama verisini ve masaüstü Domizan klasörünü temizler

## 5. Açık ve Planlanan Büyük Akışlar

Henüz çekirdeği tam bitmemiş veya sonraki faza bırakılmış alanlar:

- İlk açılış onboarding akışı
- 7 günlük deneme süreci
- Ofis bilgisi oluşturma
- İlk mükellef seti oluşturma sihirbazı
- GelenKutusu belge izleme ve belge işleme hattı
- AI ile belge sınıflandırma
- Belgeyi doğru mükellef klasörüne taşıma
- Telegram üzerinden günlük brif
- Telegram üzerinden mükellef bilgi sorgulama
- Beyanname ve kritik tarih hatırlatmaları
- Çok kullanıcılı ofis rolleri
- Lemon üzerinden tam satın alma ve lisans yönetimi

## 6. OpenClaw Kararı

OpenClaw ana ürün olmayacak.

Doğru konumu:

- Telegram ve dış kanal entegrasyon omurgası
- Otomasyon, cron ve webhook katmanı
- Gerekirse belge ön işleme yardımcı katmanı

Domizan’ın kendi sahipliği altında kalacak alanlar:

- Mükellef veri modeli
- Klasörleme mantığı
- Belge operasyon kuralları
- Lisans ve satın alma akışı
- Ofis içi kullanım mantığı

## 7. Kritik Ürün Kararları

### 7.1. Telegram

- Telegram belge toplama kanalı değildir
- Telegram yalnızca mali müşavirin kişisel kullanım kanalıdır
- Kullanım örnekleri:
  - Akşam hızlı mükellef durumu sorgulama
  - Günlük brif alma
  - Hatırlatma alma
  - Beyanname veya kritik iş uyarısı görme

### 7.2. GelenKutusu

- GelenKutusu ofis çalışanlarının kullandığı ortak operasyon alanıdır
- Dosyalar farklı kaynaklardan gelebilir
- Çalışanlar bunları `Domizan/GelenKutusu` içine bırakır
- Domizan bu noktadan sonra düzenleyici sistem rolünü üstlenir

### 7.3. Türkiye Önceliği

- Türkçe karakter desteği kritik
- Encoding dayanıklılığı kritik
- Türkiye muhasebe gerçeklerine göre veri modeli kurulmalı
- VKN, T.C. kimlik, adres ve ofis içi not mantığı ilk sınıf vatandaş olmalı

## 8. VKN ve T.C. Kimlik Ayrımı İçin Kesin Karar

Bu konu kapatılmıştır.

Karar:

- Sistem artık tek bir belirsiz `Vergi / T.C. no` mantığıyla çalışmaz
- Veri modeli açıkça `identityType` ve `identityNumber` kullanır
- Arayüzde kullanıcı `VKN` veya `T.C. Kimlik` türünü seçer
- Import ekranı numarayı algılar ve sıkı doğrular

Aktif doğrulama kuralları:

- `TCKN`
  - 11 haneli olmalı
  - İlk hane `0` olamaz
  - Checksum kontrolü geçmeli
- `VKN`
  - 10 haneli olmalı
  - Checksum kontrolü geçmeli

Eşleşme kararı:

- Upsert ve eşleşme `identityNumber` üzerinden yapılır
- İsim eşleşmesi yalnızca ikinci seviye fallback olarak kullanılır

Veri geçiş kararı:

- Eski kayıtlar uygulama açılışında migrate edilir
- Eski `tax_id` verisi varsa `identityType` ve `identityNumber` alanlarına taşınır

Not:

- GİB ekran ve kılavuzlarında bazı alanlarda gerçek kişiler için T.C. kimlik numarasının kullanılabildiği görülür
- Uygulama içinde ise bu bilgi artık tek alanda karışık tutulmaz; tür ayrımı zorunlu biçimde nettir

## 9. Sonraki En Doğru Adımlar

Önerilen öncelik sırası:

1. Onboarding ve 7 günlük deneme akışı
2. `Bilgi.txt` ve mükellef kartını belge analiziyle zenginleştirme
3. GelenKutusu izleme ve belge işleme çekirdeği
4. AI ile belge sınıflandırma ve klasör önerisi
5. Doğru klasöre taşıma akışı
6. Telegram bilgi ve brif katmanı
7. Lemon tam satın alma ve lisans yönetimi

## 10. Bu Dosya Güncellenirken Nelere Bakılmalı

Her güncellemede şu başlıklar kontrol edilmelidir:

- Yeni özellik ne eklendi
- Hangi dosya veya modül değişti
- Yeni ürün kararı alındı mı
- Yeni veri alanı eklendi mi
- Yeni klasör veya belge mantığı geldi mi
- Yeni bug fix yapıldı mı
- Sonraki adım değişti mi

## 11. Bu Belgenin İlişkili Olduğu Diğer Dosyalar

- [domizan-urun-vizyonu-ve-yolculugu.md](C:/Users/acero/Documents/GitHub/domi-ass/domizan-urun-vizyonu-ve-yolculugu.md)
- [teknik-mimari-ve-yol-haritasi.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/teknik-mimari-ve-yol-haritasi.md)
- [lemon-test-modu-kurulumu.md](C:/Users/acero/Documents/GitHub/domi-ass/docs/lemon-test-modu-kurulumu.md)

## 12. Son Not

Domizan artık yalnızca bir fikir aşamasında değildir.

Şu anda:

- çalışan bir desktop iskeleti vardır
- mükellef yönetimi vardır
- kimlik ayrımı netleştirilmiştir
- Excel içe aktarma çekirdeği vardır
- klasör üretme mantığı vardır
- `Bilgi.txt` akışı vardır
- lisans altyapısının temeli vardır

Bir sonraki büyük kırılım belge operasyon çekirdeğidir.
