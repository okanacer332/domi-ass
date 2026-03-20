import type { ClientImportField } from "./contracts";

export type ClientImportTemplateColumn = {
  field: ClientImportField;
  label: string;
  description: string;
  required: boolean;
  width?: number;
};

export const DOMIZAN_CLIENT_IMPORT_TEMPLATE_FILE_BASENAME = "Domizan-Mukellef-Sablonu";

export const DOMIZAN_CLIENT_IMPORT_TEMPLATE_COLUMNS: ClientImportTemplateColumn[] = [
  {
    field: "name",
    label: "Mükellef Adı",
    description: "Her satırda tek bir mükellef adı veya unvanı bulunmalı.",
    required: true,
    width: 30
  },
  {
    field: "identityNumber",
    label: "Vergi / T.C. Kimlik No",
    description: "10 haneli VKN veya 11 haneli T.C. kimlik numarası girin.",
    required: false,
    width: 24
  },
  {
    field: "taxOffice",
    label: "Vergi Dairesi",
    description: "Varsa bağlı olduğu vergi dairesi adı.",
    required: false,
    width: 24
  },
  {
    field: "authorizedPerson",
    label: "Yetkili Kişi",
    description: "Ofisin hızlı ulaşacağı ilgili kişi bilgisi.",
    required: false,
    width: 24
  },
  {
    field: "phone",
    label: "Telefon",
    description: "Cep telefonu veya sabit hat numarası.",
    required: false,
    width: 20
  },
  {
    field: "email",
    label: "E-posta",
    description: "İlgili kişinin veya şirketin aktif e-posta adresi.",
    required: false,
    width: 28
  },
  {
    field: "city",
    label: "Şehir / İlçe",
    description: "Kısa lokasyon bilgisi. Örn: İstanbul / Kadıköy.",
    required: false,
    width: 24
  },
  {
    field: "address",
    label: "Açık Adres",
    description: "İleride Bilgi.txt için kullanılacak detaylı adres alanı.",
    required: false,
    width: 38
  },
  {
    field: "notes",
    label: "Notlar",
    description: "Ofis içi kısa notlar veya özel durum açıklamaları.",
    required: false,
    width: 36
  }
];

export const DOMIZAN_CLIENT_IMPORT_TEMPLATE_GUIDANCE = [
  "En sorunsuz içe aktarma için sadece Domizan şablonunu kullanın.",
  "Başlık satırını değiştirmeyin; sadece altına kendi mükellef satırlarınızı ekleyin.",
  "Her satır tek bir mükellef olmalı, birleşik hücre veya alt toplam kullanmayın.",
  "Kimlik numarası varsa mutlaka 10 haneli VKN veya 11 haneli T.C. kimlik numarası olarak girin."
] as const;
