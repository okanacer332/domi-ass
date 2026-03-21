export const mizanClassLabels: Record<string, string> = {
  "1": "Dönen Varlıklar",
  "2": "Duran Varlıklar",
  "3": "Kısa Vadeli Yabancı Kaynaklar",
  "4": "Uzun Vadeli Yabancı Kaynaklar",
  "5": "Özkaynaklar",
  "6": "Gelir Tablosu Hesapları",
  "7": "Maliyet Hesapları",
  "8": "Serbest",
  "9": "Nazım Hesaplar"
};

export const officeBreakdownExamples = [
  {
    baseCode: "100",
    baseTitle: "Kasa",
    officeCode: "100.01",
    detailCode: "100.01.001",
    label: "Merkez kasa / TL kasa"
  },
  {
    baseCode: "100",
    baseTitle: "Kasa",
    officeCode: "100.01",
    detailCode: "100.01.002",
    label: "Merkez kasa / Dolar kasa"
  },
  {
    baseCode: "100",
    baseTitle: "Kasa",
    officeCode: "100.01",
    detailCode: "100.01.003",
    label: "Merkez kasa / Euro kasa"
  },
  {
    baseCode: "300",
    baseTitle: "Banka Kredileri",
    officeCode: "300.01",
    detailCode: "300.01.001",
    label: "Garanti Bankası / Dinamik kredi hesabı"
  }
] as const;
