# Lemon Test Modu Kurulumu

## Amaç

Domizan tarafında satın alma ve lisans akışı için ilk fazda şu modeli kullanıyoruz:

- Ödeme ve checkout tamamen Lemon üzerinden akacak
- Masaüstü uygulama yalnızca hosted checkout linkini açacak
- Kullanıcı satın alma sonrası lisans anahtarını Domizan içine girecek
- Domizan bu lisans anahtarını Lemon License API ile aktive edip doğrulayacak

Bu yaklaşım ilk sürüm için doğru çünkü:

- Desktop uygulamaya gizli API key gömmemiş oluyoruz
- Satın alma tarafını hızlıca Lemon test modunda uçtan uca deneyebiliyoruz
- Lisans aktivasyonu ve periyodik doğrulama doğrudan uygulamadan yapılabiliyor

## Bu Repoda Hazır Olanlar

Bu repo içinde artık şu temel hazırlıklar var:

- Lemon env alanları `.env.example` içine eklendi
- Hosted checkout linkini açan servis eklendi
- Lemon lisans aktivasyon/doğrulama servisi eklendi
- Yerel `license_state` tablosu eklendi
- Uygulama bootstrap özetine Lemon hazırlık durumu eklendi

## Lemon Panelinden Alınacak Değerler

Test modunda Lemon panelinden alman gereken minimum alanlar:

1. `LEMON_MODE=test`
2. `LEMON_STORE_ID`
3. `LEMON_PRODUCT_ID`
4. `LEMON_VARIANT_ID`
5. `LEMON_CHECKOUT_URL`

İleride webhook servisi için ayrıca gerekecek ama desktop içine gömülmeyecek alanlar:

1. `LEMON_API_KEY`
2. `LEMON_WEBHOOK_SECRET`

## Lemon Dashboard Adımları

### 1. Test mode açık olsun

- Lemon dokümanına göre mağaza ilk açıldığında test mode varsayılan olarak açık gelir.
- Test sırasında checkout, subscription, license key, webhook ve API entegrasyonları test edilebilir.

### 2. Test modunda published ürün oluştur

- Ürün test modunda `published` olmalı.
- Ürünü `Share` veya `Preview` ederek test checkout linki üret.
- Bu linki `LEMON_CHECKOUT_URL` olarak kullanacağız.

### 3. Lisans anahtarı üretimini aç

Domizan bir masaüstü yazılım olduğu için ürün tarafında lisanslama açık olmalı.

Kontrol etmen gerekenler:

- Ürün lisans key üretiyor mu
- Aktivasyon limiti tanımlı mı
- Gerekirse cihaz limiti ürün kuralıyla uyumlu mu

### 4. Ürün kimliklerini not al

İlk sürümde aktivasyon ve doğrulama sonucunda gelen lisans verisinin gerçekten Domizan ürününe ait olup olmadığını kontrol edeceğiz.

Bu yüzden:

- `store_id`
- `product_id`
- `variant_id`

değerlerini `.env` içine gireceğiz.

### 5. Test checkout akışını çalıştır

Lemon test modu dokümanına göre:

- test checkout linkini aç
- gerçek kart kullanma
- test kartları ile ödeme dene

Sık kullanılan test kartları:

- Visa: `4242 4242 4242 4242`
- Mastercard: `5555 5555 5555 4444`
- American Express: `3782 822463 10005`
- Yetersiz bakiye: `4000 0000 0000 9995`
- Süresi geçmiş kart: `4000 0000 0000 0069`
- 3D Secure: `4000 0027 6000 3184`

### 6. Webhook hazırlığını şimdiden planla

İlk sürümde desktop yalnız başına public webhook alamaz. Bu yüzden webhook tarafı ileride küçük bir cloud servisinde ya da mevcut gateway benzeri bir sunucuda yaşayacak.

Minimum webhook alanları:

- callback URL
- signing secret
- event listesi

Önerilen minimum eventler:

- Tek seferlik satışta `order_created`
- Subscription modelde `subscription_created`
- `subscription_payment_success`
- `subscription_updated`
- Lisanslı ürünlerde `license_key_created`
- Gerekirse `license_key_updated`

## Bu Repodaki Env Alanları

`.env.example` içinde hazır bekleyen alanlar:

```env
LEMON_MODE=test
LEMON_STORE_ID=
LEMON_PRODUCT_ID=
LEMON_VARIANT_ID=
LEMON_CHECKOUT_URL=

# cloud only
LEMON_API_KEY=
LEMON_WEBHOOK_SECRET=
```

## Desktop Tarafında Çalışan Akış

Şu anda projede hazır olan mimari:

1. Uygulama `LEMON_CHECKOUT_URL` varsa checkout açabilir
2. Kullanıcı lisans anahtarını girdikten sonra uygulama Lemon License API `activate` endpointine gider
3. Dönen lisansın `store_id`, `product_id` ve `variant_id` değerleri kontrol edilir
4. Başarılı aktivasyon yerel `license_state` tablosuna yazılır
5. Sonraki açılışlarda `validate` ile lisans geçerliliği tekrar kontrol edilebilir

## Önemli Güvenlik Kararı

`LEMON_API_KEY` ile webhook secret desktop uygulamanın kalıcı parçası olmamalı.

Bu iki değer:

- masaüstü istemcide saklanmamalı
- renderer tarafına hiç verilmemeli
- ileride cloud webhook/lisans senkron servisinde tutulmalı

## Sonraki Adım

Lemon panelinden yukarıdaki değerleri aldıktan sonra bir sonraki mantıklı adım:

1. uygulama içinde lisans ekranı yapmak
2. `Satın al` butonunu Lemon checkout'a bağlamak
3. lisans anahtarı giriş ve aktivasyon akışını UI'a bağlamak
4. ileride webhook senkron servisini eklemek

## Resmi Kaynaklar

- [Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
- [License API](https://docs.lemonsqueezy.com/api/license-api)
- [Validating License Keys With the License API](https://docs.lemonsqueezy.com/guides/tutorials/license-keys)
- [Webhooks](https://docs.lemonsqueezy.com/help/webhooks)
- [Event Types](https://docs.lemonsqueezy.com/help/webhooks/event-types)
- [Signing Requests](https://docs.lemonsqueezy.com/help/webhooks/signing-requests)
