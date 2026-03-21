# Domizan v2.0.1

Yayin tarihi: 21 Mart 2026

## Ozet

Bu surum, Domizan'in gelen kutusu omurgasini ilk kez gercek ofis kullanimina uygun hale getirir. Belge izleme, analiz, mukellef eslestirme, onayli tasima, duplicate tespiti ve ogrenme akisi ayni surumde birlestirildi.

## Gelen Kutusu

- `Desktop/Domizan/GelenKutusu` klasoru uygulama acildigi anda izlenir.
- Yeni dosyalar otomatik siraya alinir ve analiz edilir.
- PDF, HTML, TXT, XML, XLSX ve gorsel tabanli belge akislari icin temel analiz omurgasi aktif.
- Gelen kutusu artik placeholder degil; gercek islem ekranidir.

## Belge Analizi

- HTML ve e-Arsiv belgelerde `TCKN`, `VKN`, `SAYIN`, `Vergi Dairesi`, `Fatura No`, `Fatura Tarihi` ve `Odenecek Tutar` gibi alanlar daha guclu okunur.
- Turkish encoding tarafinda `UTF-8`, `UTF-16LE`, `Windows-1254` ve `ISO-8859-9` denemeleri ile daha saglam decode yapilir.
- Gemini promptu sertlestirildi:
  - tek JSON nesnesi
  - markdown yok
  - array yok
  - muhasebe ofisi odakli belge sinyal onceligi
- AI dizi donse bile parse hatasi vermeden normalize edilir.

## Mukellef Eslestirme

- Belge icindeki alici ve duzenleyen kimlikleri eslestirmede daha agirlikli kullanilir.
- Unvan, yetkili ve metin tokenlari ile destek eslestirme devam eder.
- Yanlis guven algisi azaltildi:
  - net mukellef yoksa sahte `%98 guven` tarzi gorunumler gosterilmez
  - kullaniciya dogrulama gerektigi acikca belirtilir

## Onayli Tasima

- Kullanici belgeyi secilen mukellef ve alt klasore tasiyabilir.
- Tasima fiziksel dosya hareketi olarak gerceklesir.
- Tasima sonrasi belge kaydi guncellenir.
- `Bilgi.txt` ve mukellef klasor yapisi ile uyumlu operasyon akisi korunur.

## Ogrenme Sistemi

- Kullanici onayi artik sistem hafizasina yazilir.
- Ogrenilen sinyaller:
  - alici kimlik
  - duzenleyen kimlik
  - alici unvan
  - duzenleyen unvan
  - belge tipi -> klasor iliskisi
  - belge fingerprint
  - belge imzasi
- Sonraki analizlerde bu ofise ozel kararlar eslestirme ve klasor onerisine etki eder.

## Duplicate Yonetimi

- Ayni belgenin parmak izi tutulur.
- Daha once yuklenmis belge tekrar geldiginde sistem bunu fark eder.
- Daha once route edilmis duplicate belge yeniden tasinmaz.
- Gelen kutusunda `Mukerrer` olarak gorunur.
- Kullanici bu duplicate kopyayi tek tikla `Mukerrer sil` ile temizleyebilir.

## Kullanim Detaylari

- Route ekraninda artik rastgele ilk aktif kayit otomatik secilmez.
- Analiz net eslesme bulmadiysa kullanici elle mukellef secer.
- Terminoloji duzeltildi:
  - `musteri` yerine `mukellef`

## Test ve Operasyon

- Gelen kutusunu sifirlama kisayollari eklendi:
  - `Kisayol/domizan-gelen-kutusunu-sifirla.bat`
  - `Kisayol/domizan-gelen-kutusunu-sifirla.command`
- Build dogrulamasi temiz:
  - `npm run build`

## Bilinen Sinirlar

- Bu surumde belgeyi otomatik mizan koduna baglama yok.
- Kullanici onayi sonrasi belge tasima ogreniyor; tam otonom klasor routing sonraki faz.
- Mac imzalama / notarization konusu ayri fazda ele alinacak.

## Sonuc

`v2.0.1`, Domizan'in gelen kutusunu konsept seviyesinden cikarip gercek ofis kullanimina yakin bir operasyon omurgasina tasir. Bu surumden sonra odak, merkezi yonetim ve admin gozetim katmani olacaktir.
