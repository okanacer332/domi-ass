export const mizanSummaryCards = [
  { label: "Ana sınıf", value: "1-9" },
  { label: "Belge kuralı", value: "İlk eşleşme" },
  { label: "Ofis kırılımı", value: "Son karar" }
] as const;

export const mizanClasses = [
  { code: "1", title: "Dönen Varlıklar", samples: ["100", "102", "120", "153"] },
  { code: "2", title: "Duran Varlıklar", samples: ["255", "257", "260"] },
  { code: "3", title: "Kısa Vadeli Borçlar", samples: ["320", "335", "360"] },
  { code: "4", title: "Uzun Vadeli Borçlar", samples: ["400", "472"] },
  { code: "5", title: "Özkaynaklar", samples: ["500", "570", "590"] },
  { code: "6", title: "Gelir Hesapları", samples: ["600", "602", "689"] },
  { code: "7", title: "Maliyet / Gider", samples: ["740", "760", "770"] },
  { code: "8", title: "Serbest Alan", samples: ["80", "84-89"] },
  { code: "9", title: "Nazım Hesaplar", samples: ["900-999"] }
] as const;

export const officeBreakdowns = [
  { baseCode: "102", officeCode: "102.02.001", label: "Banka / Şube / Hesap" },
  { baseCode: "120", officeCode: "120.01.145", label: "Müşteri Alt Hesabı" },
  { baseCode: "320", officeCode: "320.01.001", label: "Satıcı Alt Hesabı" },
  { baseCode: "770", officeCode: "770.03.014", label: "Genel Yönetim Gideri" }
] as const;

export const documentMappings = [
  { documentType: "Banka dekontu", primaryCode: "102 / 320 / 120", officeRule: "Banka ve karşı taraf alt kodu" },
  { documentType: "Alış faturası", primaryCode: "153 / 320 / 770", officeRule: "Stok mu gider mi kararı" },
  { documentType: "Satış faturası", primaryCode: "600 / 120", officeRule: "Müşteri alt hesabı" },
  { documentType: "Masraf fişi", primaryCode: "770 / 760", officeRule: "Gider merkezi alt kodu" },
  { documentType: "Vergi tahakkuku", primaryCode: "360 / 770", officeRule: "Beyanname tipine göre alt kod" },
  { documentType: "SGK bildirimi", primaryCode: "361 / 770", officeRule: "Personel kırılımı" }
] as const;

export const mizanRules = [
  "Belge önce ana koda düşer.",
  "Ofis alt kodu son kararı verir.",
  "Belirsiz belgede otomatik fiş yok.",
  "Klasörleme ile mizan kararı birlikte yürür."
] as const;
