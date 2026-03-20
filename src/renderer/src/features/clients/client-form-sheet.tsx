import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import {
  getClientIdentityTypeLabel,
  validateIdentityInput
} from "../../../../shared/client-identity";
import type { ClientFormInput, ClientIdentityType, ClientRecord } from "../../../../shared/contracts";

type ClientFormSheetProps = {
  mode: "create" | "edit";
  client?: ClientRecord | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: ClientFormInput) => Promise<void>;
};

const getInitialState = (client?: ClientRecord | null): ClientFormInput => ({
  name: client?.name ?? "",
  identityType: client?.identityType ?? null,
  identityNumber: client?.identityNumber ?? "",
  taxOffice: client?.taxOffice ?? "",
  authorizedPerson: client?.authorizedPerson ?? "",
  phone: client?.phone ?? "",
  email: client?.email ?? "",
  city: client?.city ?? "",
  address: client?.address ?? "",
  notes: client?.notes ?? ""
});

export function ClientFormSheet({
  mode,
  client,
  busy,
  onClose,
  onSubmit
}: ClientFormSheetProps) {
  const [form, setForm] = useState<ClientFormInput>(() => getInitialState(client));
  const [error, setError] = useState<string | null>(null);

  const identityValidation = validateIdentityInput(form.identityType ?? null, form.identityNumber ?? null);

  const setField = <Key extends keyof ClientFormInput>(key: Key, value: ClientFormInput[Key]) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!identityValidation.isValid) {
      setError(identityValidation.error ?? "Kimlik bilgileri doğrulanamadı.");
      return;
    }

    try {
      await onSubmit(form);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Kayıt sırasında hata oluştu.");
    }
  };

  const getIdentityPlaceholder = (identityType: ClientIdentityType | null | undefined) => {
    if (identityType === "vkn") {
      return "10 haneli VKN";
    }

    if (identityType === "tckn") {
      return "11 haneli T.C. kimlik no";
    }

    return "Önce kimlik türünü seç";
  };

  return (
    <div className="sheet-overlay" role="presentation">
      <section className="sheet-panel">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">{mode === "create" ? "Yeni kayıt" : "Mükellef düzenle"}</p>
            <h3>{mode === "create" ? "Mükellef ekle" : client?.name}</h3>
          </div>

          <button className="sheet-close-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <form className="sheet-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Mükellef adı</span>
            <input
              autoFocus
              onChange={(event) => setField("name", event.target.value)}
              placeholder="Örn. Acar Gıda Ltd. Şti."
              value={form.name ?? ""}
            />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Kimlik türü</span>
              <select
                onChange={(event) =>
                  setField(
                    "identityType",
                    event.target.value ? (event.target.value as ClientIdentityType) : null
                  )
                }
                value={form.identityType ?? ""}
              >
                <option value="">Seçiniz</option>
                <option value="vkn">VKN</option>
                <option value="tckn">T.C. Kimlik</option>
              </select>
            </label>

            <label className="field">
              <span>Kimlik numarası</span>
              <input
                inputMode="numeric"
                onChange={(event) => setField("identityNumber", event.target.value)}
                placeholder={getIdentityPlaceholder(form.identityType)}
                value={form.identityNumber ?? ""}
              />
            </label>
          </div>

          {(form.identityType || form.identityNumber) && (
            <div className={identityValidation.isValid ? "inline-success" : "inline-error"}>
              {identityValidation.isValid
                ? `${getClientIdentityTypeLabel(form.identityType ?? null)} doğrulaması hazır.`
                : identityValidation.error}
            </div>
          )}

          <div className="field-grid">
            <label className="field">
              <span>Vergi dairesi</span>
              <input
                onChange={(event) => setField("taxOffice", event.target.value)}
                placeholder="Örn. Kadıköy"
                value={form.taxOffice ?? ""}
              />
            </label>

            <label className="field">
              <span>Yetkili kişi</span>
              <input
                onChange={(event) => setField("authorizedPerson", event.target.value)}
                placeholder="İlgili kişi"
                value={form.authorizedPerson ?? ""}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Telefon</span>
              <input
                onChange={(event) => setField("phone", event.target.value)}
                placeholder="05xx xxx xx xx"
                value={form.phone ?? ""}
              />
            </label>

            <label className="field">
              <span>E-posta</span>
              <input
                onChange={(event) => setField("email", event.target.value)}
                placeholder="ornek@firma.com"
                value={form.email ?? ""}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>İl / İlçe</span>
              <input
                onChange={(event) => setField("city", event.target.value)}
                placeholder="Örn. İstanbul / Ümraniye"
                value={form.city ?? ""}
              />
            </label>
          </div>

          <label className="field">
            <span>Açık adres</span>
            <textarea
              onChange={(event) => setField("address", event.target.value)}
              placeholder="Mahalle, sokak, bina ve diğer adres bilgileri"
              rows={3}
              value={form.address ?? ""}
            />
          </label>

          <label className="field">
            <span>Notlar</span>
            <textarea
              onChange={(event) => setField("notes", event.target.value)}
              placeholder="Ofis içi kısa notlar"
              rows={4}
              value={form.notes ?? ""}
            />
          </label>

          <div className="sheet-footnote">
            Kayıt sırasında masaüstündeki `Domizan / Mükellefler` alanında güvenli klasör yapısı
            oluşturulur ve `Bilgi.txt` otomatik güncellenir.
          </div>

          {error && <div className="inline-error">{error}</div>}

          <div className="sheet-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Vazgeç
            </button>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Kaydediliyor..." : mode === "create" ? "Kaydet" : "Değişiklikleri kaydet"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
