# Kisayol

Bu klasör, Domizan'ı hızlı test etmek için çift tıkla çalıştırılabilecek başlatma ve sıfırlama dosyalarını içerir.

- `domizan-test-baslat.bat`: Windows için geliştirme modunu başlatır.
- `domizan-test-baslat.command`: macOS için geliştirme modunu başlatır.
- `domizan-sifirla.bat`: Windows tarafında yerel çalışma verilerini siler.
- `domizan-sifirla.command`: macOS tarafında yerel çalışma verilerini siler.

Notlar:

- Başlatma scriptleri proje köküne çıkarak `npm run dev` çalıştırır.
- `node_modules` yoksa önce `npm install` dener.
- Sıfırlama scriptleri kaynak kodu silmez; yalnızca masaüstündeki `Domizan` klasörünü ve Electron uygulama verilerini temizler.
- macOS tarafında ilk çalıştırmada gerekirse `chmod +x Kisayol/domizan-test-baslat.command` ve `chmod +x Kisayol/domizan-sifirla.command` komutlarını bir kez vermek gerekebilir.
