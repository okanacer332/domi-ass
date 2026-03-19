# Domizan Teknik Mimari ve Yol Haritasi

## 1. Ana Karar

Domizan, `local-first` calisan, Windows ve macOS'ta paketlenebilen bir `Electron` masaustu uygulamasi olarak ilerlemelidir.

Bu karar neden dogru:

- Urunun ana kullanim yeri masaustu ve ofis ortami
- Mukkellef klasorleri, Excel importu ve belge yonetimi dosya sistemiyle cok yakin calisiyor
- Mali musavir ofisinde internet dalgalansa bile temel kullanim devam etmeli
- Windows ve macOS destegi tek kod tabaniyla daha hizli cikabilir

## 2. Mimari Ozeti

Domizan 4 ana katmandan olusmalidir:

1. `Electron Main Process`
2. `Preload / IPC Bridge`
3. `Renderer UI`
4. `Local Data + File System Engine`

### 2.1 Electron Main Process

Ana sorumluluklar:

- Uygulama acilis ve pencere yasam dongusu
- Yerel veritabani baglantisi
- Dosya sistemi islemleri
- Mukkellef klasor yapisi olusturma
- `GelenKutusu` izleme
- Belge analiz ve tasnif pipeline'ini tetikleme
- Bildirimler
- Rutin zamanlayicilar
- Telegram senkron servisleri
- Lisans dogrulama ve guvenli saklama

Kritik ilke:

- Is kurallari renderer'da degil, main process tarafinda yasamali

### 2.2 Preload / IPC Bridge

Ana sorumluluklar:

- Renderer'in Node veya file system'a dogrudan erismesini engellemek
- Tipe sahip guvenli IPC metodlari sunmak
- UI ile sistem servisleri arasinda kontrollu bir kopru olmak

Ornek IPC alanlari:

- `mukellef.create`
- `mukellef.list`
- `import.previewExcel`
- `import.commitExcel`
- `inbox.list`
- `document.approveRouting`
- `dashboard.summary`
- `telegram.connect`
- `settings.update`

### 2.3 Renderer UI

Teknoloji tercihi:

- `React`
- `TypeScript`
- `Vite`
- `React Router`
- `Zustand` for UI state
- `TanStack Table` for veri agir ekranlar
- `Tailwind CSS` + ozel tasarim tokenlari
- `Radix UI` primitive'leri ustune ozel bilesen sistemi

Kritik ilke:

- Hazir admin panel goruntusu degil, veri yogun ama premium hissettiren ozel bir masaustu arayuzu

### 2.4 Local Data + File System Engine

Iki cekirdek alan olacak:

- `SQLite` tabanli operasyon verisi
- Masaustunde `Domizan` klasor yapisi

Bu iki alan senkron ama ayrik dusunulmeli:

- Veritabani: uygulamanin kaynak dogrusu
- Klasor yapisi: operasyonun fiziksel calisma alani

## 3. Veritabani Karari

Yerel veritabani icin onerim:

- `SQLite`
- `better-sqlite3`
- `Drizzle ORM`

Bu secimin nedeni:

- Electron masaustu uygulamasinda cok hafif
- Sunucu gerektirmiyor
- Kurulumu ve dagitimi kolay
- Dosya tabanli oldugu icin yedekleme kolay
- `better-sqlite3`, Electron main process'te stabil ve performansli

### 3.1 Veritabani nerede tutulacak

- Uygulama verisi `app.getPath("userData")` altinda tutulmali
- Ornek:
  - Windows: `%APPDATA%/Domizan`
  - macOS: `~/Library/Application Support/Domizan`

### 3.2 Ilk tablo gruplari

Ilk asamada su mantiksal tablolar yeterli:

- `mukellefler`
- `mukellef_etiketleri`
- `belgeler`
- `belge_eslestirme_loglari`
- `import_kayitlari`
- `takvim_olaylari`
- `hatirlatmalar`
- `rutinler`
- `telegram_oturumlari`
- `ayarlar`
- `lisans`

## 4. Dosya Sistemi Karari

Masaustunde fiziksel klasor yapisi urunun parcasidir.

Ana yol:

- `Desktop/Domizan`

Alt yapilar:

- `Desktop/Domizan/Mukellefler`
- `Desktop/Domizan/GelenKutusu`
- `Desktop/Domizan/Veri`
- `Desktop/Domizan/Raporlar`
- `Desktop/Domizan/Sablonlar`
- `Desktop/Domizan/_Sistem`

Kural:

- Belgeleri calisan ekip `GelenKutusu` klasorune birakir
- Domizan belgeleri anlar, eslestirir ve ilgili mukellef klasorune tasir
- Telegram belge toplama noktasi olmaz

## 5. Telegram Karari

Telegram'in rolu nettir:

- Sadece mali musavir icin kullanilacak
- Kisisel sorgu, bilgi alma ve brif kanali olacak
- Gunluk ozet, kritik uyari ve hatirlatmalar bu kanal uzerinden gidecek
- Aksam saatlerinde hizli bilgi ihtiyaci icin "cepteki Domizan" gibi calisacak

Telegram'in ilk asamadaki rolleri:

- Gunluk brif
- Beyanname ve odeme hatirlatmasi
- Eksik evrak bildirimi
- Mukellef bazli hizli sorgular
- Kritik risk ozetleri

Telegram'in ilk asamadaki rolleri disinda kalan:

- Belge toplama
- Dosya yukleme merkezi
- Ofis calisanlari icin genel operasyon araci

## 6. UI ve Tasarim Karari

Hedef gorunum:

- Premium
- Guven veren
- Veri yogunlugunu kaldirabilen
- Uzun saatler kullanima uygun
- Excel mantigina yabanci hissettirmeyen

Bu yuzden tasarim dili su sekilde olmalidir:

- `Desktop-first`, ama pencere daralinca guzel toparlayan responsive layout
- Sol navigasyon + ust komut alani + ana icerik paneli
- Yogun veri ekranlarinda tablo merkezli tasarim
- Kartlar sadece gosteris icin degil, karar destek icin kullanilmali
- Renk dili sakin ama zengin olmali
- Gereksiz animasyon degil, anlamli gecisler olmali

### 6.1 Gorsel yon

Onerilen yon:

- Arka plan: kirik beyaz, yumusak tas tonlari, koyu grafit metin
- Vurgu renkleri: zeytin, bakir, koyu petrol
- Tipografi:
  - Basliklar: `Manrope`
  - Govde ve veri: `IBM Plex Sans`
  - Kod, vergi no, tutar, teknik alanlar: `JetBrains Mono`

Bu yon, hem premium durur hem de muhasebe dunyasina fazla "oyuncak" his vermez.

### 6.2 Responsive yaklasim

Burada hedef mobil uygulama degil, `resizable desktop app`.

Yani responsive kararlar su amaca hizmet etmeli:

- 13 inch laptopta da rahat kullanim
- Buyuk monitorlerde iki panelli guclu yerlesim
- Dar pencerede ikincil panellerin drawer veya tab yapisina dusmesi

## 7. Onerilen Klasor Yapisi

Projeyi baslangicta su sekilde kurmak mantikli:

```text
domi-ass/
  docs/
  src/
    main/
    preload/
    renderer/
      src/
        app/
        pages/
        components/
        features/
        stores/
        lib/
        styles/
  database/
    schema/
    migrations/
  assets/
  scripts/
```

## 8. Onerilen Teknoloji Seti

Karari netlestirilmis ilk stack:

- Desktop shell: `Electron`
- Language: `TypeScript`
- Renderer: `React + Vite`
- UI state: `Zustand`
- Data grid: `TanStack Table`
- Styling: `Tailwind CSS`
- Primitive UI: `Radix UI`
- Local DB: `SQLite + better-sqlite3 + Drizzle`
- Validation: `Zod`
- Forms: `React Hook Form`
- Packaging: `electron-builder`
- Testing:
  - unit: `Vitest`
  - component/ui: `Testing Library`
  - e2e sonrasi asama: `Playwright`

## 9. Faz Bazli Teknik Yol

### Faz 1: Iskelet

Hedef:

- Electron + React + TypeScript calisan temel uygulama

Yapilacaklar:

1. Proje iskeletini kur
2. IPC omurgasini kur
3. Tasarim tokenlarini ve ana layout'u kur
4. SQLite baglantisini kur
5. Ilk migration yapisini olustur

### Faz 2: Mukkellef cekirdegi

Hedef:

- Mukkellef ekleme, listeleme, guncelleme ve klasor olusturma

Yapilacaklar:

1. Mukkellef veri modelini kur
2. CRUD ekranlarini yap
3. Klasor olusturma servislerini yaz
4. Aktif/pasif mantigini ekle

### Faz 3: Excel ve veri girisi

Hedef:

- Ofisin mevcut Excel aliskanligini urune dogal sekilde almak

Yapilacaklar:

1. Excel preview/import ekranini yap
2. Kolon esleme mantigini kur
3. Import sonrasi toplu klasor olustur
4. Import gecmisi tut

### Faz 4: Gelen kutusu ve belge akisi

Hedef:

- `GelenKutusu` urunun merkez operasyon kapisi olsun

Yapilacaklar:

1. Gelen kutusu watcher kur
2. Belge metadata cikarma pipeline'i yaz
3. Mukkellef eslestirme motoru yaz
4. Onay ekrani tasarla
5. Dosya route etme ve loglama yap

### Faz 5: Dashboard ve hatirlatmalar

Hedef:

- Mali musavir acinca bugunu hemen gorebilsin

Yapilacaklar:

1. Dashboard ozetlerini kur
2. Takvim ve kritik tarih yapisini kur
3. Rutin ve hatirlatma motorunu ekle

### Faz 6: Telegram katmani

Hedef:

- Mali musavirin kisisel operasyon asistani

Yapilacaklar:

1. Telegram bot baglantisini kur
2. Gunluk brif akisini yaz
3. Hızlı sorgu komutlarini tasarla
4. Kritik uyari ve eksik evrak mesajlarini ekle

### Faz 7: Lisans ve Lemon

Hedef:

- Deneme ve satin alma akisini urune baglamak

Yapilacaklar:

1. 7 gunluk deneme modeli
2. Lisans dogrulama servisi
3. Lemon webhook entegrasyonu
4. Plan, cihaz ve kullanici limiti mantigi

## 10. Simdi Ne Yapacagiz

Bir sonraki pratik adimlar su olmali:

1. Electron tabanli proje iskeletini olusturmak
2. Tasarim sisteminin ilk tokenlarini belirlemek
3. SQLite ve ilk schema'yi kurmak
4. Mukkellefler ekraninin ilk versiyonunu cikararak urunun cekirdegini baslatmak

## 11. Son Karar Cumlesi

Domizan, Electron ile gelistirilen; yerel SQLite veritabani kullanan; Windows ve macOS'ta calisan; ofis calisanlarinin ortak `GelenKutusu` akisi ile belge topladigi ve mali musavirin Telegram uzerinden bilgi alabildigi local-first bir masaustu operasyon platformu olarak ilerlemelidir.
