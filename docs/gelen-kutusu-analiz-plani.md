# Gelen Kutusu Analiz Plani

## Amaç

Domizan acildigi anda `Desktop/Domizan/GelenKutusu` klasorunu izler.
Klasore yeni bir belge dustugunde:

1. belge kayda alinir
2. analiz kuyruguna girer
3. belge tipi tahmin edilir
4. en olasi mukellef eslesmesi uretilir
5. onerilen musteri klasoru ve alt klasor bulunur
6. sonuc kullaniciya `Gelen Kutusu` ekraninda gosterilir

## Faz 1

Bu fazda aktif olanlar:

- startup ile otomatik izleme
- yeni dosyayi veritabanina kaydetme
- analiz kuyrugu
- temel belge tipi siniflandirma
- temel mukellef eslestirme
- Gemini varsa AI destekli ikinci gorus
- sonucu `Gelen Kutusu` ekraninda gosterme
- kullanicinin belgeyi acip yeniden analize alabilmesi

## Faz 2

Bir sonraki adimda eklenecekler:

- kullanicinin "dogru mukellef" onayi
- kullanicinin "dogru klasor" onayi
- onay sonrasi belgeyi ilgili musteri klasorune tasima
- tasnif sonucunu `Bilgi.txt` ve belge gecmisine yazma
- dogru kararlar uzerinden ofise ozel ogrenme

## Faz 3

- belge icindeki VKN/TCKN, unvan, banka, IBAN, tarih, tutar alanlarini ayri ayri cikarma
- e-Arsiv ve UBL XML icin ozel parser
- banka dekontlari icin ozel sinyaller
- mizan kodlari ile belge tipi arasinda kurallar
- otomatik yonlendirme + geri alma

## Analiz Metrikleri

Her belge icin su metrikler uretilecek:

- belge tipi
- onerilen klasor
- eslesen mukellef
- eslesme guveni
- eslesme nedeni
- AI saglayicisi
- son analiz zamani
- hata nedeni varsa hata metni

## Mukellef Eslestirme Sirasi

1. belge icinde veya dosya adinda net kimlik numarasi
2. tam unvan eslesmesi
3. unvan token eslesmesi
4. yetkili kisi eslesmesi
5. AI ikinci gorus
6. insan dogrulamasi

## Ofis Ogrenme Mantigi

Kalici karar su olacak:

- ilk 3 haneli mizan kodlari devlet standardi
- belge siniflandirma ana mantigi Domizan standardi
- alt klasor / alt kod / ozel yonlendirme ofise ozeldir
- kullanici dogrulamalari zamanla ofis profilini olusturur

## OpenClaw Kullanimi

OpenClaw bu alanda yardimci katman olabilir:

- PDF/media extraction
- image understanding
- Telegram veya baska kanal uzerinden gelen belgeyi intake klasorune indirme
- webhook/hook uzerinden dis kaynak tetikleme

Ama karar merkezi Domizan kalmali:

- mukellef kaydi
- klasor yapisi
- belge routing source of truth
- ofis ogrenme kurallari

## Teknik Karar

Faz 1'de hafif ve guvenilir omurga:

- klasor izleme: polling tabanli
- storage: local SQLite
- analiz: heuristic + Gemini hibrit
- UI: gecici ama canli kontrol paneli

Bu secim bilincli:

- Windows ve mac'te ayni davranis
- dosya sistemi event farklarindan daha az etkilenme
- kritik akisin izlenebilir olmasi

## Gemini Kullanimi

Gemini tarafinda ilk karar:

- PDF ve image belgelerde dogrudan dosya sinyali
- text/xml/csv/excel tarafinda text preview ile analiz
- AI sonucu asla tek gercek sayilmaz
- yuksek riskli alanlarda insan dogrulamasi zorunlu kalir

Referans:

- Gemini image/file multimodal giris mantigi: https://ai.google.dev/gemini-api/docs/image-understanding

## Net Hedef

Kullanici `Gelen Kutusu` ekranina baktiginda tek satirda su sorularin cevabini gorecek:

- bu belge ne
- kime ait
- neden oyle dusunuldu
- nereye gitmeli
- emin miyiz degil miyiz
