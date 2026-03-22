# Domizan Telegram Agent Faz 1 Test Rehberi

Bu rehber, `domi-ass` icindeki ilk Telegram agent fazini resmi teste hazirlamak icin yazildi.

## Hedef

Bu faz sonunda:

- masaustu uygulama ofis durumunu backend'e sync eder
- admin panelden organizasyona Telegram bot tokeni atanir
- masaustu uygulama ayni token ile yerel Telegram botu calistirir
- bot owner eslesmesini `/start` ile alir
- ayni agent hem Telegram'da hem sag alttaki maskot chat'te cevap verir

## Mimari

- `Desktop`
  - ofis verisini toplar
  - agent core'u calistirir
  - Telegram polling botu calistirir
- `Backend`
  - organizasyon kaydi, token, owner ve kullanim loglarini tutar
  - admin paneli icin API verir
- `Admin`
  - token atar
  - owner durumunu gorur
  - AI kullanimini, cihazlari ve sync durumunu izler

## Zorunlu Alanlar

### Desktop

- `DOMIZAN_API_BASE_URL=https://domizan-api-66765735737.europe-west1.run.app`
- ofis onboarding tamamlanmis olmali
- uygulama acik olmali

### Backend

- admin auth aktif olmali
- `/desktop/sync`
- `/desktop/agent-config`
- `/desktop/telegram/claim-owner`
- `/desktop/agent-usage`
- `/desktop/telegram-activity`
- `/admin/...` endpointleri canli olmali

### Admin

- organizasyon detay ekraninda Telegram alanlari gorunmeli
- bot token ve bot username kaydedilebilmeli
- desktop sync ve owner bilgisi izlenebilmeli

## Kullanici Akisi

1. Masaustu uygulamayi ac.
2. Onboarding ve lisans/trial akisini tamamla.
3. Admin panelde ilgili organizasyona gir.
4. Telegram bot token ve bot username alanlarini doldur.
5. Masaustu uygulamayi acik birak ve en fazla 60 saniye bekle.
6. Telegram'da bota `/start` gonder.
7. Bot owner baglantisini alsin.
8. Sonra su testleri yap:
   - `gunluk brif`
   - `resmi gazete`
   - `gelen kutusu`
   - `X mukellefin durumu ne`

## Beklenen Sonuclar

### Admin tarafinda

- organizasyon detayinda `owner chat` dolu gelir
- `owner ad` dolu gelir
- `son mesaj` alanina zaman yansir
- `Agent kullanim akisi` listesinde `telegram` ve `desktop` sorgulari gorunur
- `Desktop sync ozeti` kartinda son sync zamani gorunur

### Desktop tarafinda

- Ayarlar ekraninda Telegram durumu aktif gorunur
- owner bilgisi gorunur
- sag alttaki maskota tiklaninca ayni agent acilir
- Telegram'da verilen cevap ile desktop chat cevabi ayni mantikta olur

## Faz 1 Komutlari

Su komutlar desteklenir:

- `/start`
- `/yardim`
- `/help`
- `/brief`
- `/gazete`
- serbest metin:
  - `gunluk brif`
  - `resmi gazete`
  - `gelen kutusu`
  - `bu hafta kritik ne var`
  - `meltem goren durumu ne`

## Bilinen Sinirlar

- Telegram bu fazda belge toplama kanali degil
- Resmi Gazete yaniti altyapi modunda; canli mevzuat ozet servisi sonraki fazda derinlestirilecek
- Bot owner odakli calisir; baska chatlere yanit vermez
- Masaustu kapaliysa yerel Telegram bot da calismaz

## Resmi Test Checklist

### 1. Admin

- organizasyon olusmus
- token kaydedildi
- bot username kaydedildi

### 2. Desktop

- sync geldi
- Telegram status aktif
- Gemini status gorunuyor

### 3. Telegram

- `/start` owner claim yapti
- `gunluk brif` cevabi geldi
- `resmi gazete` cevabi geldi

### 4. Mascot Chat

- sag alttaki maskot acildi
- ayni ofis baglami ile cevap verdi
- mesajlar kaydedildi

Bu faz bitti sayilabilmesi icin, kullanici yalnizca bot tokenini girip owner claim yaptiktan sonra hem Telegram hem desktop chat uzerinden ayni agenti kullanabilmelidir.
