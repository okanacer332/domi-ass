# Lemon Test Modu Kurulumu

## Aktif Domizan Test Değerleri

- `LEMON_MODE=test`
- `LEMON_STORE_ID=321476`
- `LEMON_PRODUCT_ID=906701`
- `LEMON_VARIANT_ID=1426060`
- `LEMON_CHECKOUT_URL=https://domizan.lemonsqueezy.com/checkout/buy/628ec32c-e243-4be8-8722-08a863a9c827`
- aktivasyon limiti: `5`

## Mimari Karar

Domizan desktop uygulaması artık Lemon API’ye doğrudan gitmez.

Doğru model:

- desktop sadece checkout açar
- desktop lisans aktivasyon ve doğrulamayı Domizan backend’ine yollar
- Lemon API key sadece Cloud Run backend’inde tutulur
- webhook secret sadece backend’te tutulur

## Backend Bilgisi

- servis: `domizan-api`
- Cloud Run URL: `https://domizan-api-5jzmdzz6lq-ew.a.run.app`

Endpoint’ler:

- `GET /health`
- `POST /licenses/activate`
- `POST /licenses/validate`
- `POST /webhooks/lemon`

## Webhook

Aktif webhook:

- webhook ID: `82983`
- geçici callback URL:
  - `https://domizan-api-5jzmdzz6lq-ew.a.run.app/webhooks/lemon`

İmza doğrulaması backend’te `X-Signature` ile yapılır.

## Hedef Custom Domain

Hedef:

- `https://api.domizan.com/webhooks/lemon`

Şu anda backend canlıdır ama custom domain mapping beklemededir çünkü `domizan.com` Google tarafında henüz verify görünmemektedir.

Verify tamamlandığında:

1. `api.domizan.com` Cloud Run’a map edilir
2. webhook callback yeniden `https://api.domizan.com/webhooks/lemon` yapılır

## Desktop Env

Desktop tarafında kullanılacak public değerler:

```env
DOMIZAN_API_BASE_URL=https://domizan-api-5jzmdzz6lq-ew.a.run.app
LEMON_MODE=test
LEMON_STORE_ID=321476
LEMON_PRODUCT_ID=906701
LEMON_VARIANT_ID=1426060
LEMON_CHECKOUT_URL=https://domizan.lemonsqueezy.com/checkout/buy/628ec32c-e243-4be8-8722-08a863a9c827
```

## Güvenlik Notu

`LEMON_API_KEY` bu sohbette paylaşıldığı için uygun bir anda rotate edilmesi önerilir.

## Resmi Kaynaklar

- [Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
- [License Keys Guide](https://docs.lemonsqueezy.com/guides/tutorials/license-keys)
- [License Keys and Subscriptions](https://docs.lemonsqueezy.com/help/licensing/license-keys-subscriptions)
- [Signing Requests](https://docs.lemonsqueezy.com/help/webhooks/signing-requests)
- [Event Types](https://docs.lemonsqueezy.com/help/webhooks/event-types)
