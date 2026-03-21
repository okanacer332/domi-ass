import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  HardDrive,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import type { ClientDetailSnapshot } from "../../../../shared/contracts";
import { StatePanel } from "../../components/ui/state-panel";
import { getClientIdentitySummary, getClientStatusLabel } from "./client-utils";

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const formatBytes = (value: number | null) => {
  if (value == null) {
    return "—";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [detail, setDetail] = useState<ClientDetailSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const parsedClientId = Number(clientId);

  const loadDetail = async () => {
    if (!Number.isFinite(parsedClientId) || parsedClientId <= 0) {
      setStatus("error");
      setError("Mükellef detayı açılamadı.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const payload = await window.domizanApi.getClientDetail(parsedClientId);
      setDetail(payload);
      setStatus("ready");
    } catch (loadError) {
      setStatus("error");
      setError(loadError instanceof Error ? loadError.message : "Mükellef detayı alınamadı.");
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [parsedClientId]);

  const totalFileCount = useMemo(
    () => detail?.sections.reduce((sum, section) => sum + section.fileCount, 0) ?? 0,
    [detail]
  );

  const handleOpenPath = async (targetPath: string) => {
    const result = await window.domizanApi.openPath(targetPath);

    if (!result.opened) {
      setFeedback(result.error ?? "Yol açılamadı.");
      return;
    }

    setFeedback(null);
  };

  if (status === "loading") {
    return (
      <StatePanel
        eyebrow="Yükleniyor"
        title="Mükellef detayı hazırlanıyor"
        description="Genel bilgiler, klasörler ve evrak listesi getiriliyor."
      />
    );
  }

  if (status === "error" || !detail) {
    return (
      <StatePanel
        eyebrow="Hata"
        title="Mükellef detayı açılamadı"
        description={error ?? "Beklenmeyen hata"}
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="panel panel--accent client-detail-hero">
        <div className="client-detail-hero__copy">
          <button className="secondary-button" onClick={() => navigate("/mukellefler")} type="button">
            <ArrowLeft size={16} />
            <span>Listeye dön</span>
          </button>
          <p className="eyebrow">Mükellef detayı</p>
          <h3>{detail.client.name}</h3>
          <p>{getClientIdentitySummary(detail.client)}</p>
        </div>

        <div className="client-detail-hero__actions">
          <button
            className="secondary-button"
            onClick={() => void handleOpenPath(detail.client.folderPath)}
            type="button"
          >
            <FolderOpen size={16} />
            <span>Ana klasörü aç</span>
          </button>
          <button className="secondary-button" onClick={() => void loadDetail()} type="button">
            <RefreshCw size={16} />
            <span>Yenile</span>
          </button>
        </div>
      </section>

      {feedback && <div className="inline-error">{feedback}</div>}

      <section className="detail-grid client-detail-summary-grid">
        <article className="panel">
          <div className="panel-head client-detail-section-head">
            <div>
              <p className="eyebrow">Genel</p>
              <h3>Durum ve iletişim</h3>
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="client-detail-kv">
            <div>
              <span>Durum</span>
              <strong>{getClientStatusLabel(detail.client.status)}</strong>
            </div>
            <div>
              <span>Vergi dairesi</span>
              <strong>{detail.client.taxOffice || "—"}</strong>
            </div>
            <div>
              <span>Yetkili</span>
              <strong>{detail.client.authorizedPerson || "—"}</strong>
            </div>
            <div>
              <span>Telefon</span>
              <strong>{detail.client.phone || "—"}</strong>
            </div>
            <div>
              <span>E-posta</span>
              <strong>{detail.client.email || "—"}</strong>
            </div>
            <div>
              <span>İl / İlçe</span>
              <strong>{detail.client.city || "—"}</strong>
            </div>
          </div>

          <div className="client-detail-note">
            <span>Notlar</span>
            <p>{detail.client.notes || detail.client.address || "Kayıtlı not yok."}</p>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head client-detail-section-head">
            <div>
              <p className="eyebrow">Overall</p>
              <h3>Klasör ve evrak özeti</h3>
            </div>
            <HardDrive size={18} />
          </div>

          <div className="client-detail-kv client-detail-kv--compact">
            <div>
              <span>Toplam dosya</span>
              <strong>{totalFileCount}</strong>
            </div>
            <div>
              <span>Takipli evrak</span>
              <strong>{detail.trackedDocuments.length}</strong>
            </div>
            <div>
              <span>Son güncelleme</span>
              <strong>{formatDateTime(detail.client.updatedAt)}</strong>
            </div>
            <div>
              <span>Klasör yolu</span>
              <strong className="client-detail-path">{detail.client.folderPath}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head client-detail-section-head client-detail-section-head--wide">
          <div>
            <p className="eyebrow">Klasörler</p>
            <h3>Alt klasörler ve son evraklar</h3>
          </div>
        </div>

        <div className="client-folder-grid">
          {detail.sections.map((section) => (
            <article className="client-folder-card" key={section.name}>
              <div className="client-folder-card__head">
                <div className="client-folder-card__copy">
                  <strong>{section.name}</strong>
                  <span>
                    {section.fileCount} dosya · {section.folderCount} alt klasör
                  </span>
                </div>
                <button
                  className="table-action-button"
                  onClick={() => void handleOpenPath(section.path)}
                  type="button"
                >
                  <FolderOpen size={16} />
                  <span>Aç</span>
                </button>
              </div>

              <p className="client-folder-card__meta">
                Son hareket: {formatDateTime(section.lastModifiedAt)}
              </p>

              <div className="client-file-list client-file-list--compact">
                {section.recentFiles.length === 0 ? (
                  <div className="clients-empty-state client-file-list__empty">
                    <h4>Henüz dosya yok</h4>
                    <p>Bu klasörde dosya oluştuğunda burada görünür.</p>
                  </div>
                ) : (
                  section.recentFiles.map((file) => (
                    <button
                      className="client-file-row"
                      key={file.absolutePath}
                      onClick={() => void handleOpenPath(file.absolutePath)}
                      type="button"
                    >
                      <div>
                        <strong>{file.name}</strong>
                        <span>{file.relativePath}</span>
                      </div>
                      <span>{formatBytes(file.sizeBytes)}</span>
                    </button>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-grid client-detail-content-grid">
        <article className="panel">
          <div className="panel-head client-detail-section-head">
            <div>
              <p className="eyebrow">Files</p>
              <h3>Son dosyalar</h3>
            </div>
          </div>

          <div className="client-file-list">
            {detail.recentFiles.length === 0 ? (
              <div className="clients-empty-state">
                <h4>Dosya bulunamadı</h4>
                <p>Mükellef klasöründe henüz listelenecek evrak yok.</p>
              </div>
            ) : (
              detail.recentFiles.map((file) => (
                <button
                  className="client-file-row"
                  key={file.absolutePath}
                  onClick={() => void handleOpenPath(file.absolutePath)}
                  type="button"
                >
                  <div>
                    <strong>{file.name}</strong>
                    <span>
                      {file.folderLabel} · {file.relativePath}
                    </span>
                  </div>
                  <div className="client-file-row__meta">
                    <span>{formatBytes(file.sizeBytes)}</span>
                    <span>{formatDateTime(file.modifiedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head client-detail-section-head">
            <div>
              <p className="eyebrow">Domizan</p>
              <h3>Takip edilen evraklar</h3>
            </div>
            <FileText size={18} />
          </div>

          <div className="client-file-list">
            {detail.trackedDocuments.length === 0 ? (
              <div className="clients-empty-state">
                <h4>Takipli evrak yok</h4>
                <p>Gelen kutusundan bu mükellefe taşınan evraklar burada görünür.</p>
              </div>
            ) : (
              detail.trackedDocuments.map((document) => (
                <button
                  className="client-file-row"
                  key={document.id}
                  onClick={() => void handleOpenPath(document.storedPath)}
                  type="button"
                >
                  <div>
                    <strong>{document.originalName}</strong>
                    <span>
                      {document.routedFolder || document.suggestedFolder || "Klasör yok"} ·{" "}
                      {document.detectedType || "Belge tipi yok"}
                    </span>
                  </div>
                  <div className="client-file-row__meta">
                    <span>{document.analysisStatus}</span>
                    <span>{formatDateTime(document.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
