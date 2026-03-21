# Mizan Kodları ve Belge Tasnifi

## Amaç

Domizan, gelen belgeyi sadece klasöre atmayacak; önce muhasebe açısından hangi hesap alanına yakın olduğunu anlayacak, sonra ofisin kendi alt kırılım kuralına göre tasnifi tamamlayacak.

Bu yüzden ürün içinde ayrı bir `Mizan Kodları` sayfası gereklidir.

## Araştırma Özeti

Türkiye omurgası açısından iki gerçek birlikte yaşıyor:

1. SMMM ofisleri halen büyük ölçüde tekdüzen / mizan kod mantığı ile düşünüyor.
2. Resmi hesap planı içinde ofis veya işletme ihtiyacına göre alt kırılım açılması gerekiyor.

Araştırmada öne çıkan resmi dayanaklar:

- KGK `Finansal Raporlama Standartlarına Uygun Örnek Hesap Planı`
  - finansal kuruluşlar dışındaki bilanço esasına göre defter tutan işletmeler için örnek omurga veriyor
  - 1-9 arası ana hesap sınıflarını açıkça listeliyor
  - işletmelerin ihtiyaç halinde boş hesapları ve `84-89` serbest hesap alanlarını kullanabileceğini söylüyor
- Bu yaklaşım pratikte şu anlama geliyor:
  - Domizan ana sınıfı resmi omurgadan almalı
  - ama nihai ofis kodu mutlaka SMMM ofisinin kendi alt hesabına kadar inebilmelidir

## Ürün Kararı

Domizan belgeyi doğrudan muhasebe fişine çevirmeye çalışmayacak.

İlk faz karar akışı:

1. Belge tipini tanı
2. Ana hesap sınıfını tahmin et
3. İlgili hesap grubunu daralt
4. Ofisin tanımladığı alt kırılımla eşleştir
5. Mükellef klasörleme kararını bununla birlikte tamamla

## Domizan İçin Gereken Veri Modeli

Bir mizan kaydı için en az şu alanlar gerekir:

- `baseClassCode`
  - örn: `1`, `3`, `6`, `7`
- `baseGroupCode`
  - örn: `102`, `320`, `600`, `770`
- `officeCode`
  - örn: `320.01.001`
- `title`
  - örn: `Yurt içi satıcı - Vodafone`
- `documentTypes`
  - banka dekontu, alış faturası, satış faturası, bordro, vergi tahakkuku vb.
- `keywords`
  - belge üstünde aranacak firma, açıklama veya açıklayıcı anahtar kelimeler
- `scope`
  - ofis geneli mi, mükellef özelinde mi
- `isActive`

## Belge Tasnifinde Kullanım

Belge gelen kutusuna düştüğünde Domizan şu sırayı izlemeli:

1. Belgenin türünü çıkar
2. Belgeden firma adı, banka adı, açıklama, tutar yönü, vergi tipi gibi sinyalleri topla
3. Bu sinyalleri mizan kural setiyle eşleştir
4. En güçlü 3 aday kodu üret
5. Ofis kuralı çok netse otomatik tasnif yap
6. Net değilse kullanıcıya aday hesap kodlarıyla onay ekranı göster

## Neden Ayrı Sayfa Gerekli

Çünkü bu konu sadece muhasebe teorisi değil, ofis standardıdır.

Farklı SMMM ofisleri:

- aynı belgeyi farklı alt hesaplara indirebilir
- banka hesaplarını farklı hiyerarşilerle açabilir
- giderleri `770` altında çok farklı alt kırılımlara bölebilir
- müşteri ve satıcı kod standardını kendine göre tasarlayabilir

Bu yüzden `Mizan Kodları` sayfası:

- resmi omurgayı gösterecek
- ofis alt kodlarını yönetecek
- belge türüne göre kural mantığını anlatacak
- ileride rule engine ve AI eşleştirme ekranına veri sağlayacak

## İlk Faz Sınırı

İlk fazda bu sayfa bir yönetim ve tasarım ekranıdır.

Henüz yapılmayanlar:

- veritabanına kalıcı mizan kodu yazma
- belge -> mizan kural motorunu gerçekten çalıştırma
- gelen kutusuna düşen belgeyi bu sayfadan otomatik kodlama

## Kaynaklar

- KGK Örnek Hesap Planı:
  - https://kgk.gov.tr/Portalv2Uploads/files/Duyurular/v2/Diger/Finansal%20Raporlama%20Standartlar%C4%B1na%20Uygun%20Hesap%20Plan%C4%B1%20%28PDF%29.pdf
