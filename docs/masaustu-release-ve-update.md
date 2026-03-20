# Domizan Masaüstü Release ve Update Akışı

## 1. Hedef

Domizan şu şekilde dağıtılmalıdır:

- Windows'ta çift tıklanabilir kurulum dosyası
- macOS Intel için çift tıklanabilir kurulum dosyası
- macOS Apple Silicon için çift tıklanabilir kurulum dosyası
- yeni sürüm çıktığında uygulama içinden güncelleme denetimi
- indirilen güncellemenin tek tıkla kurulması

## 2. Sıfır Maliyetli Yayın Modeli

İlk faz için yayın kanalı:

- GitHub Releases

Sebep:

- ek sunucu maliyeti yok
- `electron-builder` ile doğal uyumlu
- `electron-updater` ile Windows ve macOS yayın metadata dosyaları üretilebilir

Repo:

- `https://github.com/okanacer332/domi-ass`

## 3. Üretilen Paketler

Windows:

- `NSIS` installer
- hedef mimari: `x64`

macOS:

- `DMG`
- `ZIP`
- hedef mimariler:
  - `x64` Intel
  - `arm64` Apple Silicon

Not:

- macOS update metadata için `zip` artefaktı da üretilir.

## 4. Otomatik Güncelleme Davranışı

Uygulama tarafında:

- kurulu masaüstü sürümü açıldığında arka planda güncelleme denetimi yapılır
- yeni sürüm varsa otomatik indirme başlar
- indirme tamamlandığında kullanıcıya `Şimdi kur` aksiyonu görünür
- kullanıcı isterse hemen kurar, isterse uygulamayı kapatınca kurulur

Geliştirme modunda:

- otomatik update kapalıdır
- bu bilerek böyledir
- `.bat` veya `npm run dev` ile çalışan akışta updater beklenmez

## 4.1. 404 Hatası Ne Anlama Gelir

Eğer kurulu Windows sürümünde `releases.atom` için `404` görülüyorsa bunun pratik anlamı şudur:

- updater GitHub release akışını okuyamıyor
- repo public değil olabilir
- ya da public olsa bile yayınlanmış release henüz yoktur

Önemli not:

- update denetimi yalnızca kurulu uygulama + yayınlanmış release kombinasyonunda anlamlıdır
- lokal `npm run dist:win` çıktısı tek başına update testi için yetmez

## 5. Windows Durumu

Windows tarafı için hedef akış:

- kullanıcı `Domizan-...-win-x64.exe` installer dosyasına çift tıklar
- kurulum tamamlanır
- sonraki sürümlerde uygulama içi updater çalışır

Bu akış için mevcut yapı yeterlidir.

## 6. macOS Durumu

Kurulum tarafı:

- kullanıcı `.dmg` dosyasına çift tıklar
- uygulamayı `Applications` klasörüne taşır

Önemli üretim notu:

- macOS'ta sorunsuz otomatik update ve Gatekeeper deneyimi için Apple code signing ve notarization gerekir
- yani kurulum paketi üretmek mümkündür, fakat production seviyesinde tam güven veren update deneyimi için Apple Developer sertifikaları sonraki adımda eklenmelidir

Bu nedenle mevcut karar:

- çift tıklanabilir macOS kurulumunu şimdi destekle
- macOS production auto-update sertifikasyonunu ayrı bir sertleştirme adımı olarak ele al

## 7. GitHub Actions Release Pipeline

Dosya:

- [.github/workflows/release-desktop.yml](C:/Users/acero/Documents/GitHub/domi-ass/.github/workflows/release-desktop.yml)

Tetikleme:

- `v*` tag push
- manuel `workflow_dispatch`

Üretilen build'ler:

- Windows x64
- macOS Intel x64
- macOS Apple Silicon arm64

## 8. Lokal Komutlar

Windows installer:

```bash
npm run dist:win
```

macOS Intel:

```bash
npm run dist:mac:intel
```

macOS Apple Silicon:

```bash
npm run dist:mac:apple
```

## 9. Release Alma Sırası

Önerilen akış:

1. `package.json` içindeki sürümü artır
2. değişiklikleri commit et
3. `vX.Y.Z` formatında tag oluştur
4. tag'i GitHub'a gönder
5. GitHub Actions release workflow artefaktları oluştursun
6. kurulu uygulama yeni sürümü updater ile görsün

## 9.1. Güncelleme Testi Nasıl Yapılır

En temiz test akışı:

1. `0.1.0` installer'ını kur
2. repo içinde sürümü `0.1.1` yap
3. değişiklikleri push et
4. `v0.1.1` tag'ini gönder
5. GitHub Release oluşsun ve `latest.yml` yayınlansın
6. kurulu `0.1.0` uygulamada `Güncellemeyi denetle` de

Bu akışın çalışması için yayın hedefi public erişilebilir olmalıdır.

Sıfır maliyetli en doğru seçenekler:

1. mevcut repo'yu public yapmak
2. kod reposu private kalacaksa yalnızca artefaktlar için ayrı public bir release repo kullanmak
3. alternatif olarak generic provider ile public bir statik indirme alanı kullanmak

## 10. Bu Fazda Kabul Kriteri

Bu faz tamam sayılmak için:

1. Windows installer üretilebilmeli
2. GitHub Release pipeline hazır olmalı
3. Uygulama içinde update durumu görünmeli
4. Yeni sürüm indirildiğinde `Şimdi kur` aksiyonu görünmeli
5. macOS kurulum hedefleri ayrı ayrı tanımlanmış olmalı

## 11. Sonraki Sertleştirme Adımı

macOS tarafında tam production kalite için sonra eklenecekler:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

Bu bilgiler eklendiğinde notarized macOS release zinciri tamamlanır.
