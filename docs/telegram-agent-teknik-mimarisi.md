# Domizan Telegram Agent Teknik Mimarisi

## 1. Amac

Domizan Telegram Agent, her mali musavirlik ofisi icin ozel calisan, AI destekli, operasyon bilinci olan bir Telegram asistani olmalidir.

Bu botun gorevi:

- ofisin gunluk durumunu bilmek
- mukellef bazli ozet verebilmek
- eksik belge, kritik gun, gelen kutusu ve planlama bilgisini tasimak
- Resmi Gazete icinden SMMM'leri ilgilendiren degisiklikleri filtrelemek
- ofis sahibine veya yetkili kisilere dogru zamanda dogru bilgiyi vermek

## 2. Net urun siniri

Telegram bot:

- `belge toplama kanali` olmayacak
- `mukelleflerin kullandigi bot` olmayacak
- `genel amacli chatbot` olmayacak

Telegram bot:

- `ofis bazli` olacak
- `mali musavir / ofis sahibi` odakli olacak
- `bilgi, brif, uyari, sorgu ve aksiyon kanali` olacak

## 3. Temel urun modeli

Ana ilke:

- `1 organizasyon = 1 Telegram bot baglantisi`

Bu baglanti su sekilde calisir:

1. Organizasyon Domizan icinde olusur
2. Admin panelden o organizasyona Telegram bot tokeni atanir
3. Bot ilk kez `/start` ile sahiplenilir
4. Bot owner veya yetkili kullanici ile eslesir
5. Bot artik o organizasyonun verisine bagli calisir

## 4. Mevcut domi-ass mimarisi ile uyum

Su an `domi-ass` tarafinda elde olan temel katmanlar:

- `desktop`: operasyonun kaynak sistemi
- `backend`: lisans ve webhook API katmani
- `local-first db`: planner, inbox, mukellef ve ogrenme verisi

Mevcut ana servisler:

- [inbox-service.ts](/Users/acero/Documents/GitHub/domi-ass/src/main/services/inbox/inbox-service.ts)
- [inbox-learning.ts](/Users/acero/Documents/GitHub/domi-ass/src/main/services/inbox/inbox-learning.ts)
- [planner-service.ts](/Users/acero/Documents/GitHub/domi-ass/src/main/services/planner/planner-service.ts)
- [access-service.ts](/Users/acero/Documents/GitHub/domi-ass/src/main/services/licensing/access-service.ts)
- [server.ts](/Users/acero/Documents/GitHub/domi-ass/backend/src/server.ts)

Bu nedenle Telegram agent sifirdan urun degil, mevcut sistemin dis operasyona acilan katmani olacaktir.

## 5. Hedef mimari

Uzun vadeli dogru mimari:

```text
Desktop App
  -> local db + klasor yapisi + analiz + planner + inbox
  -> ozet veri uretir
  -> backend'e senkron eder

Backend API
  -> organizasyon / lisans / telegram ayarlari
  -> telegram agent icin veri endpointleri
  -> resmi gazete isleme
  -> audit ve kullanim loglari

Telegram Agent Worker
  -> botu surekli acik tutar
  -> komutlari ve AI sorgularini isler
  -> scheduler ile gunluk brif ve uyari yollar
```

Kisa vadeli hizli cikis:

- bot mantigi desktop icinde baslayabilir

Uzun vadeli dogru karar:

- bot `always-on` calisacagi icin backend/worker tarafina alinmalidir

## 6. Katmanlara gore sorumluluklar

### 6.1 Desktop

Desktop su verileri uretir ve normalize eder:

- mukellef listesi
- aktif / pasif durum
- kimlik numarasi, iletisim, notlar
- gelen kutusu analiz sonucu
- belge eslesme durumu
- duplicate ve ogrenme kayitlari
- planlama olaylari
- hatirlaticilar

Desktop su verileri backend'e ozet olarak gonderecektir:

- gunluk dashboard ozetleri
- bugunun planlama kayitlari
- yaklasan resmi gunler
- eksik belge listeleri
- gelen kutusunda bekleyen kritik belge sayisi
- son analiz ve eslesme sinyalleri

### 6.2 Backend

Backend su rolleri ustlenmelidir:

- organizasyon bazli bot ayarlarini saklamak
- telegram token / owner / yetki bilgisini saklamak
- Telegram agent icin API vermek
- daily brief payload uretmek
- Resmi Gazete tarama ve filtreleme sonucu sunmak
- AI sorgularini loglamak
- bot aksiyon loglarini tutmak

### 6.3 Telegram Agent Worker

Agent worker su isi yapar:

- Telegram update'lerini dinler
- kullanici mesajlarini organizasyona gore cozer
- dogru veriyi backend'den ceker
- gunluk brif yollar
- kritik mevzuat bildirimini yollar
- belirli saatlerde planner kontrolu yapar
- AI tabanli cevaplari ofis baglaminda uretir

## 7. Veri modeli

Telegram agent icin yeni mantiksal tablolar / koleksiyonlar gerekir.

### 7.1 organization_telegram_settings

- organizationId
- botToken
- botUsername
- isEnabled
- ownerChatId
- allowedChatIds
- briefScheduleHour
- resmiGazeteEnabled
- dailyBriefEnabled
- missingDocumentAlertsEnabled
- quietHoursStart
- quietHoursEnd

### 7.2 organization_telegram_logs

- organizationId
- direction (`incoming` / `outgoing`)
- chatId
- messageType
- summary
- payload
- createdAt

### 7.3 organization_agent_usage

- organizationId
- channel (`telegram`)
- promptType
- tokensIn
- tokensOut
- model
- success
- latencyMs
- createdAt

### 7.4 organization_agent_memory

- organizationId
- memoryType
- key
- value
- confidence
- source (`user-confirmed`, `ai-inferred`, `system`)
- updatedAt

## 8. Yetki modeli

Ilk faz:

- tek owner
- sadece owner Telegram botu kullanir

Ikinci faz:

- owner
- manager
- viewer

Ilk ciktida owner modeli yeterlidir.

## 9. Botun bilmesi gereken veri alanlari

Bot minimum su alanlari bilmeli:

### 9.1 Organizasyon durumu

- lisans durumu
- deneme / aktif lisans
- surum
- son senkron zamani

### 9.2 Mukellef durumu

- toplam mukellef
- aktif / pasif sayisi
- belirli mukellefin detay ozeti
- eksik belge durumu
- son belge hareketi

### 9.3 Gelen kutusu durumu

- bekleyen belge sayisi
- kontrol gereken belge sayisi
- duplicate belge sayisi
- kritik belge ozetleri

### 9.4 Planlama durumu

- bugunun kayitlari
- bu haftanin kritik gunleri
- resmi beyan ve odeme gunleri
- mukellef bazli ozel hatirlaticilar

### 9.5 Mevzuat durumu

- bugun yeni kritik mevzuat var mi
- son resmi gazete ozetleri
- etki skoru ve uygulanacak aksiyonlar

## 10. Ilk cekirdek yetenekler

### 10.1 Gunluk brif

Her sabah tek mesaj:

- bugunun resmi gunleri
- bugunun manuel hatirlaticilari
- gecikmis kayitlar
- eksik belge bekleyen mukellefler
- gelen kutusunda bekleyen kritik belgeler
- varsa yeni kritik Resmi Gazete ozeti

### 10.2 Resmi Gazete ozeti

Her sabah taranir:

- vergi
- SGK
- e-uygulamalar
- ticaret / sirket hukuku
- SMMM meslegini etkileyen duzenlemeler

Bot yaniti su formatta olmalidir:

- ne degisti
- kimi etkiliyor
- ne zaman yururluge giriyor
- ofis olarak ne yapilmali

### 10.3 Operasyon sorgulari

Ilk komut / soru seti:

- `Bugun ne var`
- `Bu hafta ne var`
- `Eksik belge kimlerde`
- `Gelen kutusunda ne bekliyor`
- `X mukellefin durumu ne`
- `Son resmi gazete ozeti`
- `Kritik odeme veya beyan var mi`

### 10.4 Proaktif uyarilar

- bugun kritik vade var
- yarin kritik beyan var
- gelen kutusuna kritik belge geldi
- mukellef bazli eksik belge devam ediyor
- yuksek etkili mevzuat geldi

## 11. AI katmani

AI dogrudan her soruya ham cevap vermemeli.

Dogru akim:

1. mesaj niyetini belirle
2. gerekliyse deterministic veri topla
3. ozet ve yanit uret
4. gerekiyorsa dogrudan aksiyon oner

Botun AI tarafinda 3 mod olmali:

### 11.1 Deterministic mode

Sorgu netse:

- bugun ne var
- eksik belge listesi
- belirli mukellef ozeti

AI yerine sistem query sonucu kullanilir.

### 11.2 Assisted summary mode

Veri sistemden gelir, AI sadece ozetler:

- gunluk brif
- resmi gazete yorumu
- haftalik ozet

### 11.3 Agent mode

Daha serbest sorgular:

- bana bu haftanin risklerini soyle
- X mukellefte neyi kaciriyoruz
- son donemde hangi alanlarda yogunluk var

Bu mod ikinci asamada acilmalidir.

## 12. Ogrenme mantigi

Ogrenme kaynagi `kullanici onayi` olmalidir.

Su olaylardan ogrenilir:

- gelen kutusunda belge -> dogru mukellef secildi
- belge -> dogru klasor secildi
- kullanici bir sorguda bir kaydi duzeltti
- belirli anahtar kelime / kurum / banka / unvan bir mukellefe baglandi

Ogrenme tabakalari:

1. `identity learning`
- VKN / TCKN -> mukellef

2. `name variation learning`
- unvan / ad soyad varyasyonu -> mukellef

3. `document routing learning`
- belge tipi -> klasor

4. `office preference learning`
- ofisin kullandigi kisa adlar
- ofis icin onemli calisma sekilleri

Telegram agent bu hafizayi kullanarak cevaplarini ofis baglamina gore guclendirir.

## 13. API ihtiyaclari

Backend'e su endpoint gruplari eklenmelidir:

### 13.1 Telegram settings

- `GET /telegram/settings`
- `PUT /telegram/settings`
- `POST /telegram/claim-owner`
- `POST /telegram/disable`

### 13.2 Telegram dashboard payload

- `GET /telegram/brief/today`
- `GET /telegram/brief/week`
- `GET /telegram/inbox/summary`
- `GET /telegram/clients/:id/summary`
- `GET /telegram/planner/today`
- `GET /telegram/resmi-gazete/latest`

### 13.3 Telegram actions

- `POST /telegram/alerts/test`
- `POST /telegram/brief/send-now`
- `POST /telegram/resmi-gazete/send-now`

### 13.4 Agent query

- `POST /telegram/query`

Bu endpoint, botun tek noktadan ofis baglamli cevap almasını saglar.

## 14. Scheduler mimarisi

Gunluk scheduler backend/worker tarafinda olmali.

Calisma saatleri:

- `08:00` Resmi Gazete tarama
- `08:30` gunluk brif
- `gun icinde` kritik planner / eksik belge / inbox olaylari

Her organizasyon icin schedule ayri tutulabilmelidir.

## 15. Guvenlik

Telegram tarafinda asagidaki kurallar zorunlu:

- bot token sadece backend secret olarak saklanir
- owner claim bir kere yapilir, sonra admin disinda degismez
- allowed chat listesi zorunlu olur
- her log organizationId ile isaretlenir
- AI promptlari ham hassas veri dokmez, ozetlenmis veri ile calisir

## 16. Faz plani

### Faz 1 - Temel bot

- organization telegram settings
- owner claim
- test message
- gunluk brif
- resmi gazete ozeti
- bugun / hafta / mukellef / eksik belge sorgulari

### Faz 2 - Operasyon bilinci

- gelen kutusu ozetleri
- planner kayitlari
- gecikmis / riskli durumlar
- daha iyi command seti

### Faz 3 - Ogrenme

- kullanici onayindan memory yazma
- office-specific eslesme
- sorgu kalitesi artisi

### Faz 4 - Proaktif agent

- otomatik kritik uyari
- sabah / aksam ozetleri
- risk odakli mesajlar

## 17. Ilk cikarilacak urun parcasi

Ilk teslim su olmalidir:

- admin/ayarlar ekranindan bot token tanimlama
- owner Telegram claim
- bugun ne var
- bu hafta ne var
- eksik belge kimlerde
- son resmi gazete ozeti
- sabah gunluk brif

Bu parcayi ciktiktan sonra Telegram agent artik gercek urun degeri üretmeye baslar.

## 18. Son karar

Domizan Telegram Agent, `domi-ass` icinde uretilen ofis verisini kullanarak, her organizasyon icin ozel calisan, owner odakli, operasyon bilinci olan, daily brief ve mevzuat takibi yapan bir Telegram asistani olarak gelistirilmelidir.

Ilk faz hedefi sohbet degil, `ofis kontrol kati` olmaktir.

## 19. Ortak agent yuzeyleri

Ayni agent yalnizca Telegram icin calismayacaktir.

Tek cekirdek, iki farkli yuzey olacaktir:

- `Telegram Agent Surface`
- `Desktop Maskot Chat Surface`

Kurallar:

- cevap mantigi ayni agent core'dan gelecektir
- ofis hafizasi ortak kullanilacaktir
- desktop chat ile Telegram ayri botlar gibi degil, ayni ofis beyninin iki ayri erisim noktasi gibi davranacaktir
