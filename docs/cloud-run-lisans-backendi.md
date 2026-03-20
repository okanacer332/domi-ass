# Cloud Run Lisans Backend'i

## Aktif Kurulum

- Google Cloud projesi: `domizan`
- Cloud Run servisi: `domizan-api`
- Bölge: `europe-west1`
- Aktif URL: `https://domizan-api-5jzmdzz6lq-ew.a.run.app`
- Runtime service account: `domizan-api-run@domizan.iam.gserviceaccount.com`

## Lemon Test Mode Değerleri

- `LEMON_MODE=test`
- `LEMON_STORE_ID=321476`
- `LEMON_PRODUCT_ID=906701`
- `LEMON_VARIANT_ID=1426060`
- `LEMON_CHECKOUT_URL=https://domizan.lemonsqueezy.com/checkout/buy/628ec32c-e243-4be8-8722-08a863a9c827`
- Aktivasyon limiti: `5`

## Secret Manager

Oluşturulan secret'lar:

- `domizan-lemon-api-key`
- `domizan-lemon-webhook-secret`

Verilen yetki:

- `roles/secretmanager.secretAccessor`
- Üye: `serviceAccount:domizan-api-run@domizan.iam.gserviceaccount.com`

## Backend Endpoint'leri

- `GET /health`
- `POST /licenses/activate`
- `POST /licenses/validate`
- `POST /webhooks/lemon`

## Desktop Tarafı

Desktop artık Lemon API'ye doğrudan gitmez.

Desktop ana süreç şu public backend adresini kullanır:

- `DOMIZAN_API_BASE_URL=https://domizan-api-5jzmdzz6lq-ew.a.run.app`

Bu sayede:

- `LEMON_API_KEY` istemciye gömülmez
- webhook secret istemciye girmez
- lisans aktivasyon ve doğrulama server-side yapılır

## Webhook Durumu

Aktif Lemon webhook:

- Webhook ID: `82983`
- Geçici callback URL:
- `https://domizan-api-5jzmdzz6lq-ew.a.run.app/webhooks/lemon`

Webhook imza testi başarılı geçti.

## Domain Durumu

Hedef custom domain:

- `https://api.domizan.com/webhooks/lemon`

Şu anda doğrudan Cloud Run domain mapping tamamlanmadı çünkü Google tarafında `domizan.com` henüz verify görünmüyor.

Bu durum testleri engellemez. Aktif `run.app` adresiyle onboarding, trial, lisans aktivasyonu ve webhook akışları çalışır.

Kontrol sonucu:

- verify edilmiş domain: `olric.app`
- verify bekleyen domain: `domizan.com`

## Domain İçin Kalan Tek Adım

`domizan.com` Search Console üzerinden verify edildiğinde şu komut çalıştırılmalı:

```bash
gcloud beta run domain-mappings create \
  --service=domizan-api \
  --domain=api.domizan.com \
  --region=europe-west1 \
  --project=domizan
```

Sonrasında Lemon webhook URL'i tekrar şu adrese çevrilmeli:

- `https://api.domizan.com/webhooks/lemon`

## Deploy Komutu

```bash
gcloud run deploy domizan-api \
  --source backend \
  --region=europe-west1 \
  --project=domizan \
  --allow-unauthenticated \
  --service-account=domizan-api-run@domizan.iam.gserviceaccount.com \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --env-vars-file=backend/deploy.env.yaml \
  --set-secrets="LEMON_API_KEY=domizan-lemon-api-key:latest,LEMON_WEBHOOK_SECRET=domizan-lemon-webhook-secret:latest"
```

## Not

Lemon API key bu sohbette paylaşıldığı için güvenlik açısından uygun bir anda rotate edilmesi önerilir.
