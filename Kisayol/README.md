# Kisayol

Bu klasör, Domizan'ı hızlı test etmek için çift tıkla çalıştırılabilecek başlatma ve sıfırlama dosyalarını içerir.

- `domizan-test-baslat.bat`: Windows için geliştirme modunu başlatır.
- `domizan-test-baslat.command`: macOS için geliştirme modunu başlatır.
- `domizan-sifirla.bat`: Windows tarafında masaüstü verilerini, Electron kullanıcı verilerini ve ortak makine güvenlik kayıtlarını siler.
- `domizan-sifirla.command`: macOS tarafında masaüstü verilerini, Electron kullanıcı verilerini ve `/Users/Shared/Domizan` altındaki ortak güvenlik kayıtlarını siler.
- `domizan-durum.bat`: Windows tarafında mevcut erişim durumunu gösterir.
- `domizan-durum.command`: macOS tarafında mevcut erişim durumunu gösterir.
- `domizan-lisansi-kaldir.bat`: Windows tarafında yalnızca yerel lisans kaydını temizler.
- `domizan-lisansi-kaldir.command`: macOS tarafında yalnızca yerel lisans kaydını temizler.
- `domizan-denemeyi-bitir.bat`: Windows tarafında denemeyi anında bitmiş hale getirir.
- `domizan-denemeyi-bitir.command`: macOS tarafında denemeyi anında bitmiş hale getirir.
- `domizan-denemeyi-sifirla.bat`: Windows tarafında trial kaydını temizler.
- `domizan-denemeyi-sifirla.command`: macOS tarafında trial kaydını temizler.

Notlar:

- Başlatma scriptleri proje köküne çıkarak `npm run dev` çalıştırır.
- `node_modules` yoksa önce `npm install` dener.
- Sıfırlama scriptleri kaynak kodu silmez; yalnızca test verilerini temizler.
- Lisans ve deneme yardımcı scriptleri mükellef verilerini silmez; yalnızca erişim durumunu değiştirir.
- macOS tarafında ilk çalıştırmada gerekirse `chmod +x Kisayol/*.command` komutunu bir kez vermek gerekebilir.
