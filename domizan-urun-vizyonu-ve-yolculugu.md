# Domizan Ürün Vizyonu ve Kullanıcı Yolculuğu

## 1. Ürün Tanımı

Domizan, mali müşavirler ve ofis ekipleri için geliştirilen, yapay zeka destekli bir masaüstü operasyon platformudur.

Ürünün amacı:

- Mükellef takibini kolaylaştırmak
- Gelen belgeleri düzenli ve standart bir yapıya sokmak
- Belge karmaşasını azaltmak
- Beyanname, ödeme, eksik evrak ve kritik tarihleri kaçırma riskini düşürmek
- Mali müşavir ve ekip arkadaşlarının aynı operasyon diliyle çalışmasını sağlamak

Domizan bir chatbot ürünü değil, bir ofis işletim sistemi olarak konumlanmalıdır.

Tek cümlelik konumlandırma:

> Domizan, mali müşavir ofisinin ortak gelen kutusunu, mükellef klasör yapısını, belge tasnifini, hatırlatma akışlarını ve ekip kullanımını yapay zeka desteğiyle yöneten masaüstü operasyon platformudur.

## 2. Neden Bu Ürün Var

Bugün mali müşavir ofislerinde en büyük problemlerden bazıları şunlardır:

- Belgelerin WhatsApp, e-posta, masaüstü, indirilenler klasörü ve farklı kişiler arasında dağılması
- Hangi belgenin hangi mükellefe ait olduğunun elle ayıklanması
- Her personelin farklı klasörleme ve takip sistemi kullanması
- Beyanname, ödeme ve eksik evrak süreçlerinin kişisel hafızaya dayanması
- Mükellef bilgisine ve geçmiş belgelere hızlı erişimin zor olması
- Ofis sahibinin ekip üzerinde operasyon görünürlüğünün zayıf kalması

Domizan bu dağınıklığı tek bir sisteme indirgemeyi hedefler.

## 3. Vizyon

Domizan’ın uzun vadeli vizyonu, mali müşavir ofisleri için standart haline gelen bir dijital operasyon katmanı olmaktır.

Bu vizyonun temel taşları:

- Her mükellefin düzenli, otomatik oluşan bir dijital çalışma alanına sahip olması
- Gelen belgelerin AI ile okunup doğru klasöre otomatik veya yarı otomatik taşınması
- Ofis içindeki herkesin aynı mükellef yapısı, aynı belge düzeni ve aynı takip ekranı ile çalışması
- Telegram üzerinden bilgi alma, hatırlatma gönderme ve ofis içi operasyonları hızlandırma
- Lisans, satın alma ve abonelik tarafının teknik olarak sade ve ticari olarak sürdürülebilir bir modele oturması

## 4. Hedef Kullanıcılar

### 4.1 Ana kullanıcı

- Mali müşavir
- Ofis sahibi
- Operasyonun son sorumlusu

Bu kullanıcı için kritik ihtiyaçlar:

- Tüm mükellefleri tek yerden görmek
- Belge akışını kontrol etmek
- Personel erişimini yönetmek
- Hatırlatma ve kritik operasyonları kaçırmamak
- Satın alma ve lisans tarafını kolay yönetmek

### 4.2 İkincil kullanıcı

- Ofiste çalışan personel
- Muhasebe elemanı
- Operasyon destek personeli

Bu kullanıcı için kritik ihtiyaçlar:

- Hangi mükellef üzerinde çalıştığını hızlı bulmak
- Gelen belgeyi doğru yere ulaştırmak
- Eksik evrak ve yaklaşan işlemleri görmek
- Ofis sahibinin kurduğu sistem içinde düzenli çalışmak

## 5. Ürünün Çekirdek Vaadi

Domizan’ın kullanıcıya verdiği ana söz şudur:

1. Önce ofisin mükellef yapısını kur.
2. Sonra belgeleri ortak gelen kutusunda topla.
3. Domizan belgeleri anlasın, ayırsın ve yönlendirsin.
4. Mükellef takibini, eksik evrakları ve kritik tarihleri görünür hale getirsin.
5. Telegram üzerinden ofisin hafızası gibi çalışsın.

## 6. Temel Ürün Bileşenleri

Domizan aşağıdaki ana modüller üzerine kurulmalıdır:

### 6.1 Onboarding ve deneme

- Kullanıcı landing page’e gelir
- Uygulamayı Windows veya macOS için indirir
- Kurulumu tamamlar
- İlk açılışta 7 günlük ücretsiz deneme başlar
- Kullanıcı ofis sahibi olarak ilk organizasyonunu oluşturur

### 6.2 Mükellef yönetimi

- Kullanıcı mükellef listesini elle oluşturur veya Excel ile içeri alır
- Liste onaylandıktan sonra masaüstünde `Domizan` klasör yapısı kurulur
- Her mükellef için standart klasörler ve alt kırılımlar otomatik oluşur

### 6.3 Belge alma ve tasnif

- Belgeler ortak gelen kutusunda ofis çalışanları tarafından toplanır
- Bu gelen kutusu, e-posta, WhatsApp, tarama, elden gelen dosya ve farklı kanallardan gelen belgelerin tek toplama noktasıdır
- AI belgeyi okur ve türünü çıkarır
- Belgenin hangi mükellefe ait olduğunu bulur
- Gerekirse kullanıcıdan onay ister
- Sonra belgeyi doğru klasöre taşır

### 6.4 Takip ve hatırlatma

- Beyannameler
- Ödemeler
- Eksik evraklar
- Kritik son tarihler
- Ofis içi rutin kontroller

Bu yapı hem uygulama içinde hem Telegram üzerinden görünür olur.

### 6.5 Telegram çalışma katmanı

- Telegram, belge giriş kanalı değil; mali müşavirin kişisel bilgi, sorgu ve brif kanalidir
- Ofis sahibi veya ana mali müşavir kendine özel Telegram botunu bağlar
- Bot, Domizan ile senkron şekilde mükellef, uyarı, özet ve durum bilgisini bilir
- Belirli bilgilere Telegram üzerinden ulaşılır
- Hatırlatmalar Telegram’dan gelir
- Operasyonel özetler ve uyarılar Telegram’a düşer

### 6.6 Lisans ve satın alma

- Ürün deneme ile başlar
- Satın alma Lemon üzerinden yapılır
- Abonelik, yenileme, iptal ve plan yükseltme Lemon tarafından yönetilir
- Domizan backend’i sadece lisans durumunu ve erişim yetkilerini yönetir

## 7. Hedef Kullanıcı Yolculuğu

Bu bölüm, ürünün kullanıcı gözündeki ideal akışını tanımlar.

### Adım 1: Landing page

- Kullanıcı landing page’e gelir
- Domizan’ın ne yaptığını net biçimde görür
- Windows ve macOS desteğini görür
- 7 günlük ücretsiz deneme mesajını görür
- “İndir ve dene” çağrısıyla masaüstü uygulamasını indirir

Bu ekranda verilmesi gereken ana mesaj:

> Belgeleri topla, mükelleflerini düzenle, Domizan geri kalan operasyonu hızlandırsın.

### Adım 2: İndirme ve kurulum

- Kullanıcı işletim sistemine uygun kurulumu indirir
- Uygulamayı kurar
- İlk açılışta temiz ve hızlı bir onboarding ekranı ile karşılaşır

İlk açılışta kullanıcıdan sadece gerçekten gerekli bilgiler istenmelidir:

- Ad soyad
- E-posta
- Ofis adı
- Telefon opsiyonel

Hedef: İlk değer deneyimine 5-10 dakika içinde ulaşmak.

### Adım 3: 7 günlük deneme başlatma

- Kullanıcı ilk açılışta denemeyi başlatır
- Sistem arka planda bir deneme organizasyonu oluşturur
- Bu organizasyon bir ana kullanıcıya bağlanır
- Deneme süresi ilk açılış anından itibaren 7 gün olarak işler

Bu aşamada kullanıcı lisans anahtarıyla uğraşmamalıdır.

İdeal deneyim:

- Kullanıcı hesabı oluşur
- Organizasyon oluşur
- Deneme lisansı atanır
- Uygulama doğrudan kurulum akışına geçer

### Adım 4: İlk kurulum ve ofis yapısının oluşturulması

- Kullanıcıya Domizan’ın nasıl çalıştığı çok kısa şekilde anlatılır
- Sonraki ana aksiyon “mükellef listesini oluştur” olmalıdır
- Kullanıcı ister manuel ekleme yapar, ister Excel ile toplu yükleme yapar

Buradaki ürün ilkesi:

- Domizan’ın değeri, kullanıcı mükellef listesini kurduğu anda başlamalıdır

### Adım 5: Mükellef listesinin oluşturulması

Kullanıcı iki yolla ilerler:

1. Manuel mükellef ekleme
2. Excel’den toplu içe aktarma

Her mükellef için temel bilgiler:

- Firma adı veya kişi adı
- Vergi numarası veya TC kimlik numarası
- Telefon
- E-posta
- Adres
- Durum

Liste tamamlandığında kullanıcı ilk kez gerçek değer görmelidir.

### Adım 6: Masaüstü klasör yapısının kurulması

Mükellef listesi oluşturulduktan sonra Domizan masaüstünde ana çalışma alanını kurar:

- `Desktop/Domizan`
- `Desktop/Domizan/Mükellefler`
- `Desktop/Domizan/GelenKutusu`
- `Desktop/Domizan/Veri`
- `Desktop/Domizan/Raporlar`
- `Desktop/Domizan/Şablonlar`
- `Desktop/Domizan/_Sistem`

Her mükellef için de otomatik klasörler açılır:

- `01-Beyannameler`
- `02-Faturalar`
- `03-Banka`
- `04-SGK`
- `05-Bordro`
- `06-Sözleşmeler`
- `07-Vekaletnameler`
- `08-Resmi-Yazışmalar`
- `09-Muhasebe-Kayıtları`
- `10-Şirket-Belgeleri`
- `99-Diğer`

Bu adım Domizan’ın “sadece bir uygulama değil, ofisin düzen kurucusu” olduğunu hissettirmelidir.

### Adım 7: Ortak gelen kutusunun kullanıma açılması

- Kullanıcıya `Domizan/GelenKutusu` klasörü gösterilir
- Belgelerin bu klasöre bırakılması gerektiği anlatılır
- Bu klasör ürünün operasyon giriş kapısı olur
- Bu klasörün sahibi sistem değil, ofis operasyonudur; belgeyi buraya çoğunlukla çalışan ekip bırakır

Hedef kullanım:

- E-postadan indirilen belge buraya atılır
- WhatsApp’tan alınan dosya buraya atılır
- Taratılan PDF veya görseller buraya atılır
- Ofis personeli belgeyi doğrudan bu kutuda toplar

Buradaki ana ilke:

- Belgeler çok farklı kanallardan gelebileceği için ilk etapta kanal entegrasyonundan önce ofis içi ortak toplama alışkanlığı kurulmalıdır
- Domizan’ın asıl değeri, belgeyi nereye bıraktığın değil, bırakıldıktan sonra onu anlayıp doğru mükellef düzenine sokmasıdır

İlerleyen aşamada bu ortak gelen kutusu paylaşımlı klasör veya ofis senkronu ile daha da güçlendirilebilir.

### Adım 8: AI ile belge anlama ve eşleştirme

`GelenKutusu` içine yeni belge geldiğinde Domizan şu akışı çalıştırır:

1. Dosyayı algılar
2. Belgenin türünü anlamaya çalışır
3. Belgeden firma adı, vergi numarası, TC no, tarih, belge tipi gibi sinyalleri çıkarır
4. Belgeyi doğru mükellefle eşleştirir
5. Hedef klasörü belirler
6. Gerekirse kullanıcıdan onay ister
7. Belgeyi ilgili klasöre taşır
8. İşlem kaydını sisteme işler

Bu modül ürünün en kritik fark yaratan taraflarından biridir.

### Adım 9: Kullanıcı onayı ve güvenli otomasyon

Tam otomasyon yerine güvenli otomasyon hedeflenmelidir.

Yani:

- Emin olunan belgeler otomatik taşınabilir
- Emin olunmayan belgelerde kullanıcıya öneri gösterilmelidir
- Kullanıcı tek tıkla onay, düzeltme veya başka mükellefe taşıma yapabilmelidir

Amaç, hatasızlık ile hız arasında sağlıklı denge kurmaktır.

### Adım 10: Günlük çalışma ekranı

Kullanıcı Domizan’ı açtığında şunları görmelidir:

- Bugün yaklaşan işlemler
- Beyanname ve ödeme hatırlatmaları
- Eksik belge uyarıları
- Son işlenen belgeler
- Belge yönlendirme bekleyen işler
- Kritik mükellef notları

Domizan açıldığında “bugün ofiste neye bakmalıyım” sorusunu cevaplamalıdır.

### Adım 11: Telegram bağlantısı

Kullanıcı veya ofis sahibi kendine özel Telegram botunu bağlar.

Bu bağlantı sonrasında Telegram şu amaçlarla kullanılır:

- Günlük özet göndermek
- Beyanname ve ödeme hatırlatmaları göndermek
- Eksik belge uyarıları göndermek
- Belirli mükellef bilgilerini hızlı sorgulatmak
- Operasyonel dikkat gerektiren durumları iletmek

Telegram’ın rolü özellikle şudur:

- Akşam saatlerinde veya masa başında değilken mali müşavirin hızlı bilgi almasını sağlamak
- Günlük brif, kritik hatırlatma ve anlık sorgu kanalı olmak
- Ofis çalışanlarının kullandığı belge toplama hattından ayrı konumlanmak

Telegram’ın ilk sürümde belge toplama kanalı olması hedeflenmemelidir.
Belge girişinin merkezi `Domizan/GelenKutusu`, Telegram’ın merkezi ise mali müşavirin kişisel operasyon ekranı olmalıdır.

Örnek kullanım:

- “X firmasının eksik evrakları neler?”
- “Bu hafta beyanname yaklaşan mükellefleri göster”
- “Bugün hangi işlemler kritik?”
- “Akşam 9’da Y Ltd. ile ilgili riskli veya eksik bir durum var mı?”

### Adım 12: Ekip kullanımının açılması

Domizan tek kişilik değil, ofis içi ekip kullanımı için tasarlanmalıdır.

Bu yüzden ana kullanıcı:

- Organizasyon sahibi olur
- Çalışan ekibi sisteme dahil eder
- Gerekirse cihaz ve kullanıcı limitlerini yönetir

Ekipteki çalışanlar:

- Aynı organizasyona katılır
- Aynı mükellef yapısı üzerinde çalışır
- Aynı belge akışını görür
- Kendi cihazlarından sisteme bağlanır

### Adım 13: Deneme sonu satın alma

Deneme süresi bittiğinde kullanıcıyı satış temsilcisi değil ürünün kendisi yönlendirmelidir.

Akış şu şekilde olmalıdır:

1. Deneme süresi yaklaşınca kullanıcıya uyarı gösterilir
2. Uygulama içinde yükseltme çağrısı görünür
3. Kullanıcı Lemon checkout sayfasına gider
4. Plan seçer ve ödemeyi tamamlar
5. Lemon webhook’u backend’e düşer
6. Organizasyon lisansı güncellenir
7. Kullanıcı uygulamaya döndüğünde erişimi devam eder

Burada hedef:

- Satın alma ile kullanım arasında sürtünme oluşturmamak

### Adım 14: Ücretli kullanım ve süreklilik

Satın alma sonrasında Domizan şu şekilde yaşamaya devam eder:

- Lisans aktif kalır
- Ekip kullanımı genişleyebilir
- Cihaz limitleri plana göre yönetilir
- Telegram ve AI özellikleri plana göre açık kalır
- Müşteri zamanla daha fazla mükellef ve belgeyi sistem içine taşır

Ürünün kalıcı hale gelmesi, belge ve operasyon hafızasının Domizan içinde büyümesiyle olur.

## 8. Lemon Tabanlı Satın Alma ve Lisanslama Modeli

Hedef ticari yapı şu olmalıdır:

- Landing page satış vitrini olur
- Lemon ödeme ve abonelik katmanı olur
- Domizan backend lisans ve organizasyon katmanı olur
- Desktop uygulama erişim doğrulama ve kullanım katmanı olur

Önerilen akış:

1. Kullanıcı landing page’den deneme başlatır veya uygulamayı indirir
2. Deneme organizasyonu backend’de açılır
3. Kullanıcı uygulamaya giriş yapar ve denemeyi kullanır
4. Satın alma gerektiğinde Lemon checkout açılır
5. Lemon ödeme durumunu webhook ile backend’e iletir
6. Backend organizasyon planını, süresini, kullanıcı limitini ve cihaz limitini günceller
7. Desktop uygulama backend’den güncel lisansı çeker

Bu modelin avantajı:

- Satın alma mantığı ürün kodundan ayrılır
- Fatura, yenileme, iptal, başarısız ödeme gibi ticari senaryolar Lemon’da kalır
- Domizan yalnızca erişim ve deneyim tarafına odaklanır

## 9. Faz Bazlı Yapılacaklar

Bu bölüm ürünün hayata geçirilmesi için önerilen öncelik sırasını verir.

### Faz 1: İlk değer deneyimi

Hedef:

- Kullanıcı landing page’den indirip 10 dakika içinde ilk faydayı görsün

Yapılacaklar:

1. Landing page indirme akışını netleştir
2. Windows ve macOS installer deneyimini sadeleştir
3. İlk açılışta 7 günlük denemeyi otomatik başlat
4. İlk onboarding ekranını kısa ve net hale getir
5. Manuel mükellef ekleme akışını kusursuzlaştır
6. Excel ile toplu mükellef import akışını güvenilir hale getir
7. Mükellef listesi oluştuğunda `Domizan` klasör yapısını otomatik kur
8. İlk başarı hissi için kullanıcıya oluşturulan klasörleri görünür şekilde göster

### Faz 2: Belge operasyon çekirdeği

Hedef:

- Domizan, ofisin belge giriş kapısı haline gelsin

Yapılacaklar:

1. `GelenKutusu` deneyimini ürünün merkezine koy
2. PDF, görsel ve temel belge formatlarında sağlam belge algılama kur
3. Belgeden mükellef sinyali çıkarma doğruluğunu artır
4. Belge türü tespiti ve hedef klasör önerisini iyileştir
5. Kullanıcı onay ekranını çok hızlı hale getir
6. Yanlış eşleşme ve belirsiz belge akışlarını güvenli şekilde yönet
7. Belge yönlendirme loglarını görünür hale getir

### Faz 3: Takip ve görünürlük

Hedef:

- Kullanıcı Domizan’ı açınca neyin kritik olduğunu hemen görsün

Yapılacaklar:

1. Dashboard’da günlük operasyon özetini önceliklendir
2. Beyanname ve ödeme takvimini netleştir
3. Eksik evrak mantığını görünür hale getir
4. Mükellef bazlı durum kartları oluştur
5. Kritik uyarı mantığını sade ama güvenilir kur

### Faz 4: Telegram operasyon katmanı

Hedef:

- Mali müşavir uygulama dışında da ofis operasyonuna bağlı kalsın

Yapılacaklar:

1. Mali müşavir için tekil ve güvenli Telegram bot bağlantısını kolaylaştır
2. Günlük özetleri Telegram’a gönder
3. Yaklaşan beyanname ve ödeme hatırlatmalarını gönder
4. Eksik evrak bildirimlerini gönder
5. Mükellef sorgu akışlarını kontrollü şekilde aç
6. Telegram’ı belge alım kanalı değil, bilgi ve hatırlatma kanalı olarak konumlandır
7. Telegram ve masaüstü geçmişini birleştir

### Faz 5: Çok kullanıcılı ofis modeli

Hedef:

- Ana mali müşavir ve çalışanlar aynı sistem içinde çalışabilsin

Yapılacaklar:

1. Organizasyon sahibi ve çalışan rollerini netleştir
2. Kullanıcı davet veya şirket kodu ile katılım akışını sadeleştir
3. Cihaz limitlerini plan bazlı yönet
4. Ekip görünürlüğü ve işlem geçmişini artır
5. Ortak gelen kutusu modelini operasyonel olarak netleştir

### Faz 6: Lemon ile ticari yapı

Hedef:

- Satın alma ve lisans tarafı tam otomatik çalışsın

Yapılacaklar:

1. Plan yapısını netleştir
2. Lemon ürün ve abonelik modellerini tanımla
3. Deneme, aktif abonelik, iptal, yenileme ve ödeme başarısızlığı durumlarını tasarla
4. Lemon webhook’larını backend lisans modeliyle bağla
5. Uygulama içi yükseltme ve plan yönetimi ekranlarını ekle
6. Deneme bitiş ve ödeme uyarılarını ürün içine yerleştir

### Faz 7: Güven, doğruluk ve ölçek

Hedef:

- Ürün günlük operasyonda güvenilir bir omurga haline gelsin

Yapılacaklar:

1. Belge sınıflandırma doğruluğunu ölç
2. Hatalı yönlendirme oranını takip et
3. Geri alma ve düzeltme akışlarını güçlendir
4. Audit ve işlem geçmişini iyileştir
5. Lisans, ekip, cihaz ve veri güvenliğini sertleştir

## 10. Başarı Kriterleri

Domizan’ın başarılı sayılması için aşağıdaki çıktıları üretmesi gerekir:

- Kullanıcı kurulum sonrası kısa sürede mükellef listesini oluşturabiliyor olmalı
- Domizan klasör yapısı manuel uğraş olmadan kurulmalı
- Belgeler ofis içinde belirgin bir düzenle toplanmalı
- Belge eşleştirme kullanıcıya zaman kazandırmalı
- Kullanıcı Telegram’dan gerçek değer almalı
- Denemeden ücretliye geçiş sürtünmesiz olmalı
- Ana mali müşavir ve çalışanlar aynı sistem içinde rahat çalışabilmeli

## 11. Net Ürün Cümlesi

Domizan, mali müşavir ofisinin mükellef yönetimini, belge tasnifini, klasör düzenini, kritik tarih takibini ve ekip operasyonunu AI destekli şekilde yöneten, Windows ve macOS üzerinde çalışan çok kullanıcılı bir masaüstü platformudur.

## 12. Kısa Sonuç

Bu ürün fikri güçlüdür çünkü soyut bir AI aracı değil, doğrudan günlük iş yükünü azaltan somut bir operasyon çözümüdür.

En kritik fark yaratacak unsur:

- Ortak gelen kutusu
- AI destekli belge tasnifi
- Mükellef klasör standardı
- Mali müşavire özel Telegram üzerinden operasyonel erişim
- Lemon ile sadeleştirilmiş ticari model

Domizan’ın doğru ürün vaadi şudur:

> Mükellefini kur, belgeni bırak, Domizan düzeni kursun ve seni kritik işlerde uyarsın.
