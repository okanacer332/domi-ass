# Kisayol

Bu klasor, Domizan'i hizli test etmek icin cift tikla calistirilabilecek yardimci dosyalari icerir.

- `domizan-test-baslat.bat`: Windows icin gelistirme modunu baslatir.
- `domizan-test-baslat.command`: macOS icin gelistirme modunu baslatir.
- `domizan-sifirla.bat`: Windows tarafinda masaustu verilerini, Electron kullanici verilerini ve ortak makine guvenlik kayitlarini siler.
- `domizan-sifirla.command`: macOS tarafinda masaustu verilerini, Electron kullanici verilerini ve `/Users/Shared/Domizan` altindaki ortak guvenlik kayitlarini siler.
- `domizan-durum.bat`: Windows tarafinda mevcut erisim durumunu gosterir.
- `domizan-durum.command`: macOS tarafinda mevcut erisim durumunu gosterir.
- `domizan-lisansi-kaldir.bat`: Windows tarafinda yalnizca yerel lisans kaydini temizler.
- `domizan-lisansi-kaldir.command`: macOS tarafinda yalnizca yerel lisans kaydini temizler.
- `domizan-denemeyi-bitir.bat`: Windows tarafinda denemeyi aninda bitmis hale getirir.
- `domizan-denemeyi-bitir.command`: macOS tarafinda denemeyi aninda bitmis hale getirir.
- `domizan-denemeyi-sifirla.bat`: Windows tarafinda trial kaydini temizler.
- `domizan-denemeyi-sifirla.command`: macOS tarafinda trial kaydini temizler.
- `domizan-gelen-kutusunu-sifirla.bat`: Windows tarafinda `GelenKutusu` klasorunu ve gelen kutusu belge kayitlarini temizler.
- `domizan-gelen-kutusunu-sifirla.command`: macOS tarafinda `GelenKutusu` klasorunu ve gelen kutusu belge kayitlarini temizler.

Notlar:

- Baslatma scriptleri proje kokune cikar ve `npm run dev` calistirir.
- `node_modules` yoksa once `npm install` dener.
- Sifirlama scriptleri kaynak kodu silmez; yalnizca test verilerini temizler.
- Lisans ve deneme yardimci scriptleri mukellef verilerini silmez; yalnizca erisim durumunu degistirir.
- Gelen kutusu sifirlama scriptleri musteri kayitlarina dokunmaz; yalnizca `team_inbox` kaynakli belge kayitlarini ve klasor iceriklerini temizler.
- macOS tarafinda ilk calistirmada gerekirse `chmod +x Kisayol/*.command` komutunu bir kez vermek gerekebilir.
