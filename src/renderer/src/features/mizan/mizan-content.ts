export const mizanClasses = [
  {
    classCode: "1",
    title: "Dönen Varlıklar",
    summary: "Kasa, banka, alacak ve stok gibi kısa vadeli varlık alanları.",
    examples: ["100 Kasa", "102 Bankalar", "120 Alıcılar", "153 Ticari Mallar"]
  },
  {
    classCode: "2",
    title: "Duran Varlıklar",
    summary: "Demirbaş, taşıt, yazılım ve diğer uzun vadeli kıymetler.",
    examples: ["255 Demirbaşlar", "257 Birikmiş Amortismanlar", "260 Haklar"]
  },
  {
    classCode: "3",
    title: "Kısa Vadeli Yükümlülükler",
    summary: "Satıcılar, vergi, SGK ve diğer kısa vadeli borç alanları.",
    examples: ["320 Satıcılar", "335 Personele Borçlar", "360 Ödenecek Vergi ve Fonlar"]
  },
  {
    classCode: "4",
    title: "Uzun Vadeli Yükümlülükler",
    summary: "Bir yıldan uzun borç ve karşılık yapıları.",
    examples: ["400 Banka Kredileri", "472 Kıdem Tazminatı Karşılığı"]
  },
  {
    classCode: "5",
    title: "Özkaynaklar",
    summary: "Sermaye, geçmiş yıl karları ve dönem sonucu.",
    examples: ["500 Sermaye", "570 Geçmiş Yıllar Karları", "590 Dönem Net Karı"]
  },
  {
    classCode: "6",
    title: "Gelir Tablosu Hesapları",
    summary: "Satış, gelir, gider ve dönem sonucu hesapları.",
    examples: ["600 Yurt İçi Satışlar", "602 Diğer Gelirler", "689 Diğer Olağandışı Gider ve Zararlar"]
  },
  {
    classCode: "7",
    title: "Maliyet Hesapları",
    summary: "7/A ve 7/B seçeneklerindeki maliyet ve gider izleme alanı.",
    examples: ["740 Hizmet Üretim Maliyeti", "760 Pazarlama Satış ve Dağıtım Giderleri", "770 Genel Yönetim Giderleri"]
  },
  {
    classCode: "8",
    title: "Serbest ve Diğer Kapsamlı Gelir Alanı",
    summary: "Resmi planda serbest bırakılan alanlar ve diğer kapsamlı gelir grupları.",
    examples: ["84-89 Serbest Hesaplar", "80 Diğer Kapsamlı Gelirler"]
  },
  {
    classCode: "9",
    title: "Nazım Hesaplar",
    summary: "Bilanço dışı izlenen bilgi ve taahhüt hesapları.",
    examples: ["900-999 Nazım Hesaplar"]
  }
] as const;

export const officeBreakdownExamples = [
  {
    baseCode: "320",
    officeCode: "320.01.001",
    label: "Satıcı / Tedarikçi alt hesabı",
    note: "Ofisler çoğunlukla satıcı kartlarını ayrı kırmak için kullanır."
  },
  {
    baseCode: "770",
    officeCode: "770.03.014",
    label: "Genel yönetim gideri alt kırılımı",
    note: "Telefon, yazılım, kargo gibi giderler ofis standardına göre ayrılabilir."
  },
  {
    baseCode: "102",
    officeCode: "102.02.001",
    label: "Banka / şube / hesap bazlı kırılım",
    note: "Banka dekontlarının ilk temas noktası genelde burasıdır."
  },
  {
    baseCode: "120",
    officeCode: "120.01.145",
    label: "Müşteri bazlı alıcı hesabı",
    note: "Satış belgelerinde müşteri özelinde alt hesap açılabilir."
  }
] as const;

export const documentRoutingSteps = [
  {
    title: "Belgeyi tanı",
    text: "Fatura, banka dekontu, bordro, vergi tahakkuku veya resmi evrak olduğunu belirle."
  },
  {
    title: "Ana hesap sınıfını bul",
    text: "Belgeyi önce 1-9 arasındaki ana sınıf seviyesinde aday bir alana yerleştir."
  },
  {
    title: "Ofis alt koduna in",
    text: "SMMM ofisinin açtığı özel alt kırılımlar varsa nihai yönlendirmeyi oraya yap."
  },
  {
    title: "Mükellef klasörünü eşleştir",
    text: "Hesap kodu kararı ile mükellef ve klasörleme kararı birlikte tamamlanmalı."
  }
] as const;

export const documentRoutingExamples = [
  {
    documentType: "Banka dekontu",
    candidateGroups: "10 / 102, 32 / 320, 12 / 120",
    officeDecision: "Banka ve karşı taraf alt hesabı ofis kuralıyla netleşir.",
    risk: "Tek başına belgeyle fiş üretmek yerine aday kod seti üretmek daha güvenli."
  },
  {
    documentType: "Alış faturası",
    candidateGroups: "15, 32, 63 veya 7 grubu",
    officeDecision: "Stok, gider veya demirbaş ayrımı şirket tipine göre değişebilir.",
    risk: "Belge tipi doğru olsa bile gider merkezi alt kodu ofise göre farklılaşabilir."
  },
  {
    documentType: "Satış faturası",
    candidateGroups: "60 / 600 ve 12 / 120",
    officeDecision: "Müşteri alt hesabı ve özel satış kırılımı ofis tarafından belirlenir.",
    risk: "İhracat, hizmet, yurt içi satış gibi ayrımlar ayrıca kontrol edilmelidir."
  },
  {
    documentType: "Muhtasar / SGK / vergi tahakkuku",
    candidateGroups: "36, 37, 770, 720, 730",
    officeDecision: "Beyanname tipine göre borç ve gider ayağı değişebilir.",
    risk: "Yanlış sınıf seçimi dönem sonu denetimini bozabilir."
  }
] as const;
