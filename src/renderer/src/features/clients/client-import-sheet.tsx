import { useState } from "react";
import { FileSpreadsheet, ShieldAlert, X } from "lucide-react";

import {
  getClientIdentityTypeLabel,
  inferIdentityFromValue
} from "../../../../shared/client-identity";
import type {
  ClientImportCommitInput,
  ClientImportField,
  ClientImportPreview
} from "../../../../shared/contracts";
import { clientImportFieldLabels } from "./client-utils";

type ClientImportSheetProps = {
  onClose: () => void;
  onImported: () => Promise<void>;
};

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

  const pickFile = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
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
      const response = await window.domizanApi.commitClientImport(payload);
      setResult(
        `${response.created} yeni, ${response.updated} güncellenen, ${response.skipped} atlanan kayıt işlendi.`
      );
      await onImported();
    } catch (commitError) {
      setError(
        commitError instanceof Error ? commitError.message : "İçe aktarma tamamlanamadı."
      );
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
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Excel içe aktar</p>
            <h3>Mükellef listesi içe aktarma sihirbazı</h3>
          </div>

          <button className="sheet-close-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="import-intro-card">
          <div>
            <strong>Farklı Excel formatlarına uyum</strong>
            <p>
              Sistem başlıkları otomatik tahmin eder. Yine de içe almadan önce alan eşlemesini sen
              onaylarsın.
            </p>
          </div>

          <button className="primary-button" disabled={loading} onClick={() => void pickFile()} type="button">
            <FileSpreadsheet size={16} />
            <span>{loading ? "Dosya okunuyor..." : "Excel dosyası seç"}</span>
          </button>
        </div>

        {!preview && (
          <div className="empty-import-state">
            <p className="eyebrow">Adım 1</p>
            <h4>Önce dosyanı seç</h4>
            <p>
              `.xlsx`, `.xls` veya `.csv` yükleyebilirsin. Sistem ilk sayfayı analiz edip sana
              eşleme önerileri çıkaracak.
            </p>
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
                  Kimlik numarası kolonunda geçersiz kayıt varsa sistem bu satırları içe almaz.
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
          <button className="secondary-button" onClick={onClose} type="button">
            Kapat
          </button>
          <button
            className="primary-button"
            disabled={!preview || !mapping.name || committing}
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
