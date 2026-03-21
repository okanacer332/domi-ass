import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  LoaderCircle,
  ShieldAlert,
  X
} from "lucide-react";

import {
  DOMIZAN_CLIENT_IMPORT_TEMPLATE_COLUMNS,
  DOMIZAN_CLIENT_IMPORT_TEMPLATE_GUIDANCE
} from "../../../../shared/client-import-template";
import {
  getClientIdentityTypeLabel,
  inferIdentityFromValue
} from "../../../../shared/client-identity";
import type {
  ClientImportCommitInput,
  ClientImportCommitResult,
  ClientImportField,
  ClientImportPreview
} from "../../../../shared/contracts";
import { clientImportFieldLabels } from "./client-utils";

type ClientImportSheetProps = {
  onClose: () => void;
  onImported: (result: ClientImportCommitResult) => Promise<void>;
};

const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

const validateMappedRow = (mapped: Partial<Record<ClientImportField, string>>) => {
  const warnings: string[] = [];

  if (!mapped.name?.trim()) {
    warnings.push("Mükellef adı yok");
  }

  if (mapped.identityNumber) {
    const identity = inferIdentityFromValue(mapped.identityNumber);

    if (!identity.isValid) {
      warnings.push(identity.error ?? "Kimlik numarası doğrulanamadı");
    }
  }

  if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
    warnings.push("E-posta biçimi hatalı");
  }

  return warnings;
};

export function ClientImportSheet({ onClose, onImported }: ClientImportSheetProps) {
  const [preview, setPreview] = useState<ClientImportPreview | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<ClientImportField, string>>>({});
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const busyMessage = committing
    ? "Mükellefler içeri alınıyor"
    : loading
      ? "Dosya hazırlanıyor"
      : null;

  const prepareTemplate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      await waitForNextPaint();
      const response = await window.domizanApi.prepareClientImportTemplate();
      setResult(
        response.error
          ? `Şablon oluşturuldu ancak klasör açılamadı: ${response.error}`
          : `Şablon hazırlandı. Şablon klasörü açıldı: ${response.folderPath}`
      );
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "Şablon hazırlanırken beklenmeyen hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      await waitForNextPaint();
      const picked = await window.domizanApi.pickClientImportFile();
      if (!picked) {
        return;
      }

      const nextPreview = await window.domizanApi.previewClientImport(picked.filePath);
      setPreview(nextPreview);
      setMapping(nextPreview.suggestedMapping);
    } catch (pickError) {
      setError(
        pickError instanceof Error ? pickError.message : "Dosya seçilirken beklenmeyen hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  };

  const commitImport = async () => {
    if (!preview) {
      return;
    }

    const payload: ClientImportCommitInput = {
      filePath: preview.filePath,
      mapping
    };

    setCommitting(true);
    setError(null);
    setResult(null);

    try {
      await waitForNextPaint();
      const response = await window.domizanApi.commitClientImport(payload);
      await onImported(response);
      setCommitting(false);
      onClose();
      return;
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "İçe aktarma tamamlanamadı.");
    } finally {
      setCommitting(false);
    }
  };

  const mappedPreviewRows = preview?.previewRows.map((row) => {
    const mapped = Object.entries(mapping).reduce<Partial<Record<ClientImportField, string>>>(
      (record, [field, columnKey]) => {
        if (!columnKey) {
          return record;
        }

        record[field as ClientImportField] = row.raw[columnKey] || "";
        return record;
      },
      {}
    );

    return {
      rowNumber: row.rowNumber,
      mapped,
      warnings: validateMappedRow(mapped)
    };
  });

  return (
    <div className="sheet-overlay" role="presentation">
      <section className="sheet-panel sheet-panel--wide">
        {busyMessage && (
          <div className="sheet-busy-overlay" role="status" aria-live="polite">
            <div className="sheet-busy-card">
              <LoaderCircle className="sheet-busy-spinner" size={28} />
              <strong>{busyMessage}</strong>
              <span>Lütfen bekleyin. İşlem bitince pencere kapanacak.</span>
            </div>
          </div>
        )}

        <header className="sheet-header">
          <div>
            <p className="eyebrow">Excel içe aktar</p>
            <h3>Mükellef listesi içe aktarma</h3>
          </div>

          <button
            className="sheet-close-button"
            disabled={loading || committing}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <div className="import-intro-card">
          <div>
            <strong>Domizan şablonu ile başla</strong>
            <p>
              En temiz akış Domizan şablonunu doldurup içeri almaktır. Standart düzen bu
              olacaktır.
            </p>
          </div>

          <div className="import-intro-actions">
            <button
              className="secondary-button"
              disabled={loading || committing}
              onClick={() => void prepareTemplate()}
              type="button"
            >
              <Download size={16} />
              <span>{loading ? "Hazırlanıyor..." : "Şablonu oluştur ve aç"}</span>
            </button>

            <button
              className="primary-button"
              disabled={loading || committing}
              onClick={() => void pickFile()}
              type="button"
            >
              <FileSpreadsheet size={16} />
              <span>{loading ? "Dosya okunuyor..." : "Excel dosyası seç"}</span>
            </button>
          </div>
        </div>

        {!preview && (
          <div className="empty-import-state">
            <p className="eyebrow">Adım 1</p>
            <h4>Önce şablonu indir</h4>
            <p>Bir kere bu düzene geçtiğinde içe aktarma tarafı sorunsuz ilerler.</p>

            <div className="template-guidance-grid">
              <article className="template-guidance-card">
                <strong>Kurallar</strong>
                <ul className="template-guidance-list">
                  {DOMIZAN_CLIENT_IMPORT_TEMPLATE_GUIDANCE.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="template-guidance-card">
                <strong>Beklenen kolonlar</strong>
                <div className="template-column-list">
                  {DOMIZAN_CLIENT_IMPORT_TEMPLATE_COLUMNS.map((column) => (
                    <span key={column.field} className="template-column-pill">
                      {column.label}
                      {column.required ? " *" : ""}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </div>
        )}

        {preview && (
          <div className="import-layout">
            <section className="import-panel">
              <div className="import-meta-grid">
                <div className="import-meta-card">
                  <span>Dosya</span>
                  <strong>{preview.fileName}</strong>
                </div>
                <div className="import-meta-card">
                  <span>Sayfa</span>
                  <strong>{preview.sheetName}</strong>
                </div>
                <div className="import-meta-card">
                  <span>Veri satırı</span>
                  <strong>{preview.totalRows}</strong>
                </div>
              </div>

              <div className="mapping-grid">
                {(Object.keys(clientImportFieldLabels) as ClientImportField[]).map((field) => (
                  <label key={field} className="field">
                    <span>{clientImportFieldLabels[field]}</span>
                    <select
                      onChange={(event) =>
                        setMapping((current) => ({
                          ...current,
                          [field]: event.target.value || undefined
                        }))
                      }
                      value={mapping[field] ?? ""}
                    >
                      <option value="">Eşleme yok</option>
                      {preview.columns.map((column) => (
                        <option key={column.key} value={column.key}>
                          {column.header}
                          {column.guessedField === field ? " · öneri" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              {preview.globalWarnings.length > 0 && (
                <div className="import-warning-box">
                  <ShieldAlert size={18} />
                  <div>
                    {preview.globalWarnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="import-panel">
              <div className="import-preview-head">
                <div>
                  <p className="eyebrow">Adım 2</p>
                  <h4>Ön izleme</h4>
                </div>
                <p className="import-help-text">
                  Geçersiz kimlik numarası olan satırlar içe alınmaz.
                </p>
              </div>

              <div className="import-preview-table-shell">
                <table className="import-preview-table">
                  <thead>
                    <tr>
                      <th>Satır</th>
                      <th>Mükellef</th>
                      <th>Kimlik</th>
                      <th>Yetkili</th>
                      <th>Telefon</th>
                      <th>Uyarılar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedPreviewRows?.map((row) => {
                      const identity = inferIdentityFromValue(row.mapped.identityNumber);
                      const identityLabel =
                        identity.identityType && identity.normalizedValue
                          ? `${getClientIdentityTypeLabel(identity.identityType)} · ${identity.normalizedValue}`
                          : row.mapped.identityNumber || "—";

                      return (
                        <tr key={row.rowNumber}>
                          <td>{row.rowNumber}</td>
                          <td>{row.mapped.name || "—"}</td>
                          <td>{identityLabel}</td>
                          <td>{row.mapped.authorizedPerson || "—"}</td>
                          <td>{row.mapped.phone || "—"}</td>
                          <td>{row.warnings.length > 0 ? row.warnings.join(", ") : "Hazır"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {error && <div className="inline-error">{error}</div>}
        {result && <div className="inline-success">{result}</div>}

        <div className="sheet-actions">
          <button
            className="secondary-button"
            disabled={loading || committing}
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
          <button
            className="primary-button"
            disabled={!preview || !mapping.name || committing || loading}
            onClick={() => void commitImport()}
            type="button"
          >
            {committing ? "İçe alınıyor..." : "İçe aktar"}
          </button>
        </div>
      </section>
    </div>
  );
}
