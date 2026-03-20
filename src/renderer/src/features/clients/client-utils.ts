import { getClientIdentityTypeLabel } from "../../../../shared/client-identity";
import type { ClientImportField, ClientRecord } from "../../../../shared/contracts";

export const clientImportFieldLabels: Record<ClientImportField, string> = {
  name: "Mükellef adı",
  identityNumber: "Kimlik numarası",
  taxOffice: "Vergi dairesi",
  authorizedPerson: "Yetkili kişi",
  phone: "Telefon",
  email: "E-posta",
  city: "İl / İlçe",
  address: "Açık adres",
  notes: "Notlar"
};

export const getClientStatusLabel = (status: ClientRecord["status"]) =>
  status === "active" ? "Aktif" : "Pasif";

export const getClientIdentitySummary = (client: ClientRecord) => {
  if (!client.identityNumber) {
    return "Kimlik numarası belirtilmedi";
  }

  return `${getClientIdentityTypeLabel(client.identityType)} · ${client.identityNumber}`;
};

export const getClientSearchBlob = (client: ClientRecord) =>
  [
    client.name,
    client.identityNumber,
    getClientIdentityTypeLabel(client.identityType),
    client.taxOffice,
    client.authorizedPerson,
    client.phone,
    client.email,
    client.city,
    client.address,
    client.notes
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
