# Domizan Manuel Test Planı

Bu doküman, custom domain tamamlanmadan da ürün testlerine güvenle başlayabilmek için hazırlanmıştır.

Şu an lisans backend'i canlıdır ve aşağıdaki adımlar `run.app` adresi üzerinden çalışır. `api.domizan.com` yalnızca daha temiz production alan adıdır; testleri engellemez.

## 1. Mevcut Smoke Durumu

Bu doküman yazılırken aşağıdaki kontroller başarılıdır:

- masaüstü build: `npm run build`
- backend build: `backend/npm run build`
- canlı sağlık kontrolü: `GET https://domizan-api-5jzmdzz6lq-ew.a.run.app/health`
- Windows hızlı başlatma script'i süreç açık kalacak şekilde çalışıyor

## 2. Teste Başlamadan Önce

Windows için önerilen temiz başlangıç:

1. [domizan-sifirla.bat](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-sifirla.bat) çalıştır.
2. [domizan-test-baslat.bat](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-test-baslat.bat) ile uygulamayı aç.

macOS için:

1. [domizan-sifirla.command](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-sifirla.command) çalıştır.
2. [domizan-test-baslat.command](C:/Users/acero/Documents/GitHub/domi-ass/Kisayol/domizan-test-baslat.command) ile uygulamayı aç.

## 3. Faz 1: Onboarding ve 7 Günlük Deneme

### Test 1.1: İlk Açılış

Adımlar:

1. Sıfırlama script'ini çalıştır.
2. Uygulamayı başlat.
3. Karşılama ekranının açıldığını doğrula.

Beklenen:

- onboarding ekranı açılır
- cihaz bilgisi görünür
- erişim modu henüz kilitli görünür
- `7 günlük deneme hazır` benzeri mesaj görünür

### Test 1.2: Ofis Bilgileri Kaydı

Adımlar:

1. `Kuruluma başla` butonuna bas.
2. Ofis adı, yetkili adı ve yetkili e-posta gir.
3. Kaydet.

Beklenen:

- onboarding tamamlanır
- erişim adımına geçilir
- ofis bilgileri uygulama yeniden açıldığında korunur

### Test 1.3: Deneme Başlatma

Adımlar:

1. `7 günlük denemeyi başlat` butonuna bas.
2. Sonucu gözlemle.

Beklenen:

- erişim modu `trial` olur
- hata çıkmaz
- başarı mesajı görünür
- deneme kalan gün sayısı görünür

### Test 1.4: Uygulamayı Yeniden Aç

Adımlar:

1. Uygulamayı kapat.
2. Yeniden aç.

Beklenen:

- tekrar onboarding istemez
- deneme durumu korunur
- doğrudan uygulamaya girilir

## 4. Faz 2: Kopya Koruması ve Paylaşımlı Ofis Senaryosu

### Test 2.1: Makine Kaydı Oluştu mu

Windows beklenen kayıt:

- `C:\ProgramData\Domizan\Security\machine-binding.json`

Beklenen:

- dosya oluşur
- kurulum kimliği tutulur
- bağlama durumu normal görünür

### Test 2.2: Aynı Makinede İkinci Deneme Açılamaması

Adımlar:

1. Mevcut denemeyi başlat.
2. Uygulama verisini yerel kullanıcı klasöründen temizlemeden başka kullanıcı profili veya ikinci açılış senaryosu dene.

Beklenen:

- sistem yeni deneme açmaz
- ortak makine durumu korunur

Not:

- Bu test ofis bilgisayarları için kritiktir.
- Deneme kararı kullanıcı bazlı değil, makine bazlıdır.

### Test 2.3: Kopyalanmış Kurulum Engeli

Adımlar:

1. Uygulama verisini başka makineye taşıyarak açmayı dene.

Beklenen:

- bağlama durumu `mismatch` olur
- erişim kilitlenir
- yeni trial başlatılamaz

## 5. Faz 3: Lemon Satın Alma ve Lisans Aktivasyonu

Not:

- Bu faz için custom domain gerekli değildir.
- Aktif backend URL'si yeterlidir.

### Test 3.1: Satın Alma Sayfası Açılıyor mu

Adımlar:

1. Onboarding erişim ekranında `Satın alma sayfasını aç` butonuna bas.

Beklenen:

- Lemon test mode checkout tarayıcıda açılır
- ürün `Domizan-Üyelik` görünür

### Test 3.2: Test Siparişi Sonrası Lisans Anahtarı Al

Adımlar:

1. Lemon test checkout üzerinden siparişi tamamla.
2. Oluşan lisans anahtarını al.

Beklenen:

- Lemon siparişi oluşturur
- lisans anahtarı görünür veya sipariş ekranında erişilebilir olur

### Test 3.3: Lisans Etkinleştirme

Adımlar:

1. Uygulamaya dön.
2. Lisans anahtarını gir.
3. Sipariş e-postasını gir.
4. `Lisansı etkinleştir` butonuna bas.

Beklenen:

- aktivasyon başarılı olur
- erişim modu `licensed` olur
- lisans durumu aktif görünür
- son doğrulama zamanı yazılır

### Test 3.4: Kayıtlı Lisansı Doğrula

Adımlar:

1. `Kayıtlı lisansı doğrula` butonuna bas.

Beklenen:

- backend doğrulaması başarılı olur
- hata görünmez

### Test 3.5: Aktivasyon Limiti

Bilinen kural:

- Lemon tarafında aktivasyon limiti `5`

Beklenen:

- altıncı farklı cihaz aktivasyonunda sistem reddetmelidir

## 6. Faz 4: Operasyon Smoke Testleri

### Test 4.1: Mükellef Oluşturma

Adımlar:

1. Mükellefler sayfasına git.
2. Yeni mükellef oluştur.

Beklenen:

- kayıt tabloya düşer
- mükellef klasörü oluşur
- `Bilgi.txt` oluşur

### Test 4.2: Mükellef Düzenleme

Adımlar:

1. Telefon, e-posta, adres, not gibi alanları güncelle.

Beklenen:

- tablo güncellenir
- `Bilgi.txt` anında güncellenir

### Test 4.3: Pasife Çekme

Adımlar:

1. Bir mükellefi pasife çek.

Beklenen:

- durum pasif olur
- yanlışlıkla silme yaşanmaz

### Test 4.4: Excel ve CSV İçe Aktarma

Adımlar:

1. Türkçe karakter içeren `.csv` dosyası içe aktar.
2. Farklı kolon sıralı `.xlsx` dosyası içe aktar.
3. Kolon eşleme ekranını kontrol et.

Beklenen:

- `UTF-8`, `UTF-8 BOM`, `Windows-1254`, `ISO-8859-9` kaynaklı Türkçe isimler bozulmaz
- otomatik eşleme önerisi gelir
- kullanıcı onayı olmadan hatalı eşleme commit edilmez
- geçersiz VKN veya T.C. kimlik numarası sisteme alınmaz

## 7. Bug Bildirirken Yazılacaklar

Her bulgu için minimum şu format kullanılmalıdır:

- test adı
- hangi işletim sistemi
- hangi adımda hata oldu
- ekrandaki tam hata mesajı
- mümkünse ilgili dosya veya ekran görüntüsü

Örnek:

- Test: `3.3 Lisans Etkinleştirme`
- OS: `Windows 11`
- Adım: `Lisansı etkinleştir`
- Hata: `license_key not found`
- Not: `Lemon siparişi yeni tamamlanmıştı`

## 8. Bu Fazda Özellikle Aranacak Riskler

- onboarding sonrası boş ekran
- trial birden fazla kez başlatılabiliyor mu
- shared machine koruması deliniyor mu
- lisans etkinleştirme sonrası durum ekrana yansımıyor mu
- CSV import'ta Türkçe karakter bozuluyor mu
- VKN ve T.C. doğrulama yanlış pozitif veriyor mu
- `Bilgi.txt` ile veri kartı senkronu kaçıyor mu

## 9. Test Fazı Kararı

Şu an doğru yaklaşım:

1. custom domain'i beklememek
2. onboarding ve trial akışını gerçek kullanıcı gibi test etmek
3. Lemon test satın alma ve lisans aktivasyonunu doğrulamak
4. ardından belge operasyon çekirdeğine geçmek

Yani `api.domizan.com` son adım olabilir; testleri durdurmak için sebep değildir.
