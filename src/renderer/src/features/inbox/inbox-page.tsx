import { startTransition, useEffect, useMemo, useState } from "react";
import {
  Bot,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert
} from "lucide-react";

import type {
  BootstrapPayload,
  ClientRecord,
  InboxDocumentRecord,
  InboxMonitorSnapshot,
  InboxRouteFolder
} from "../../../../shared/contracts";
import { StatePanel } from "../../components/ui/state-panel";
import { useAppStore } from "../app/app-store";
import { InboxRouteSheet } from "./inbox-route-sheet";
import { useInboxStore } from "./inbox-store";

type InboxPageProps = {
  bootstrap: BootstrapPayload;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
};

const isDuplicateDocument = (document: InboxDocumentRecord) =>
  document.matchedBy === "ayni-belge" || document.analysisProvider === "duplicate-match";

const getStatusTone = (document: InboxDocumentRecord) => {
  if (isDuplicateDocument(document)) {
    return "duplicate";
  }

  switch (document.analysisStatus) {
    case "ready":
      return "ready";
    case "needs_review":
      return "muted";
    case "analyzing":
      return "checking";
    case "failed":
      return "error";
    default:
      return "queued";
  }
};

const getStatusLabel = (document: InboxDocumentRecord) => {
  if (isDuplicateDocument(document)) {
    return "Mukerrer";
  }

  switch (document.analysisStatus) {
    case "ready":
      return "Hazir";
    case "needs_review":
      return "Kontrol gerekli";
    case "analyzing":
      return "Analiz ediliyor";
    case "failed":
      return "Hata";
    default:
      return "Sirada";
  }
};

const buildSearchBlob = (document: InboxDocumentRecord) =>
  [
    document.originalName,
    document.detectedType,
    document.analysisSummary,
    document.analysisDetails,
    document.matchedClientName,
    document.suggestedFolder,
    document.analysisProvider
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

const InboxMonitorCard = ({ monitor }: { monitor: InboxMonitorSnapshot | null }) => {
  if (!monitor) {
    return null;
  }

  return (
    <section className="inbox-monitor-card">
      <div className="inbox-monitor-card__copy">
        <p className="eyebrow">Canli Izleme</p>
        <h3>Gelen kutusu aktif</h3>
      </div>

      <div className="inbox-monitor-card__meta">
        <div className="mini-status ready">
          <span className="status-dot" />
          <strong>{monitor.isWatching ? "Izleme aktif" : "Izleme kapali"}</strong>
        </div>
        <div className="inbox-monitor-card__timestamps">
          <span>Son tarama: {formatDateTime(monitor.lastScanAt)}</span>
          <span>Son analiz: {formatDateTime(monitor.lastAnalysisAt)}</span>
        </div>
      </div>
    </section>
  );
};

export function InboxPage({ bootstrap }: InboxPageProps) {
  const documents = useInboxStore((state) => state.documents);
  const monitor = useInboxStore((state) => state.monitor);
  const status = useInboxStore((state) => state.status);
  const error = useInboxStore((state) => state.error);
  const loadInbox = useInboxStore((state) => state.loadInbox);
  const openInboxFolder = useInboxStore((state) => state.openInboxFolder);
  const openInboxDocument = useInboxStore((state) => state.openInboxDocument);
  const reanalyzeInboxDocument = useInboxStore((state) => state.reanalyzeInboxDocument);
  const deleteInboxDocument = useInboxStore((state) => state.deleteInboxDocument);
  const routeInboxDocument = useInboxStore((state) => state.routeInboxDocument);
  const refreshBootstrap = useAppStore((state) => state.refreshBootstrap);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | InboxDocumentRecord["analysisStatus"]
  >("all");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [busyDocumentId, setBusyDocumentId] = useState<number | null>(null);
  const [routeDocument, setRouteDocument] = useState<InboxDocumentRecord | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadRouteClients = async () => {
    try {
      setClients(await window.domizanApi.listClients());
    } catch {
      setClients([]);
    }
  };

  useEffect(() => {
    void loadInbox();
    void loadRouteClients();
    const interval = window.setInterval(() => {
      void loadInbox({ silent: true });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [loadInbox]);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return documents.filter((document) => {
      const matchesFilter = statusFilter === "all" || document.analysisStatus === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 || buildSearchBlob(document).includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [documents, search, statusFilter]);

  const operationsLocked =
    bootstrap.onboarding.isComplete &&
    bootstrap.access.requiresPurchase &&
    !bootstrap.access.canUseApp;

  const reviewCount = documents.filter((document) => document.analysisStatus === "needs_review").length;
  const readyCount = documents.filter((document) => document.analysisStatus === "ready").length;
  const queueCount = documents.filter((document) => document.analysisStatus === "queued").length;

  const handleOpenInboxFolder = async () => {
    setActionError(null);
    const result = await openInboxFolder();
    if (!result.opened) {
      setActionError(result.error ?? "Gelen kutusu klasoru acilamadi.");
    }
  };

  const handleOpenDocument = async (documentId: number) => {
    setBusyDocumentId(documentId);
    setActionError(null);
    const result = await openInboxDocument(documentId);

    if (!result.opened) {
      setActionError(result.error ?? "Belge acilamadi.");
    }

    setBusyDocumentId(null);
  };

  const handleReanalyze = async (documentId: number) => {
    if (operationsLocked) {
      return;
    }

    setBusyDocumentId(documentId);
    setActionError(null);
    setActionSuccess(null);

    try {
      await reanalyzeInboxDocument(documentId);
      await loadInbox({ silent: true });
      await refreshBootstrap();
      setActionSuccess("Belge yeniden analiz sirasina alindi.");
    } catch (reanalyzeError) {
      setActionError(
        reanalyzeError instanceof Error ? reanalyzeError.message : "Belge yeniden analiz edilemedi."
      );
    } finally {
      setBusyDocumentId(null);
    }
  };

  const handleRoute = async (document: InboxDocumentRecord) => {
    if (operationsLocked) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setRouteDocument(document);
  };

  const handleDeleteDocument = async (document: InboxDocumentRecord) => {
    if (operationsLocked) {
      return;
    }

    setBusyDocumentId(document.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      await deleteInboxDocument(document.id);
      await loadInbox({ silent: true });
      await refreshBootstrap();
      setActionSuccess(`${document.originalName} gelen kutusundan kaldirildi.`);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : "Belge silinemedi."
      );
    } finally {
      setBusyDocumentId(null);
    }
  };

  const handleRouteSubmit = async (input: {
    clientId: number;
    targetFolder: InboxRouteFolder;
  }) => {
    if (!routeDocument) {
      return;
    }

    setRouteBusy(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await routeInboxDocument({
        documentId: routeDocument.id,
        clientId: input.clientId,
        targetFolder: input.targetFolder
      });

      await loadInbox({ silent: true });
      const refreshedBootstrap = await refreshBootstrap();
      await loadRouteClients();
      setRouteDocument(null);
      setActionSuccess(
        `${result.document.originalName} ${result.document.matchedClientName ?? "secilen mukellef"} icin ${input.targetFolder} klasorune tasindi.`
      );

      if (
        refreshedBootstrap.access.requiresPurchase &&
        !refreshedBootstrap.access.canUseApp
      ) {
        setActionSuccess(
          "Belge tasindi. Deneme suresi doldugu icin sonraki operasyonlar lisans gerektiriyor."
        );
      }
    } catch (routeError) {
      setActionError(
        routeError instanceof Error ? routeError.message : "Belge tasima sirasinda hata olustu."
      );
    } finally {
      setRouteBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <StatePanel
        eyebrow="Yukleniyor"
        title="Gelen kutusu hazirlaniyor"
        description="Canli izleme, bekleyen dosyalar ve analiz kuyrugu yukleniyor."
      />
    );
  }

  if (status === "error") {
    return (
      <StatePanel
        eyebrow="Hata"
        title="Gelen kutusu yuklenemedi"
        description={error ?? "Beklenmeyen hata"}
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="clients-toolbar">
        <div className="clients-toolbar__copy">
          <p className="eyebrow">Gelen Kutusu</p>
          <h3>Bekleyen belgeler ve analiz sonucu</h3>
        </div>

        <div className="clients-toolbar__actions">
          <button className="secondary-button" onClick={() => void loadInbox()} type="button">
            <RefreshCw size={16} />
            <span>Yenile</span>
          </button>
          <button className="primary-button" onClick={() => void handleOpenInboxFolder()} type="button">
            <FolderOpen size={16} />
            <span>Gelen kutusunu ac</span>
          </button>
        </div>
      </section>

      <InboxMonitorCard monitor={monitor} />

      <section className="stats-grid clients-stats-grid">
        <article className="stat-card">
          <div className="stat-head">
            <span>Sirada</span>
          </div>
          <strong>{queueCount}</strong>
          <p>Henuz islenmemis veya yeniden kuyruga alinmis belge</p>
        </article>
        <article className="stat-card">
          <div className="stat-head">
            <span>Hazir</span>
          </div>
          <strong>{readyCount}</strong>
          <p>Yuksek guvenle analiz edilen ve onerisi cikan belge</p>
        </article>
        <article className="stat-card">
          <div className="stat-head">
            <span>Kontrol gerekli</span>
          </div>
          <strong>{reviewCount}</strong>
          <p>Insan onayi bekleyen, emin olunmayan veya zayif eslesen belge</p>
        </article>
      </section>

      {operationsLocked && (
        <section className="readonly-notice">
          <div className="readonly-notice__copy">
            <p className="eyebrow">Lisans Gerekli</p>
            <h4>Belgeleri gorebilirsin, yeniden analiz ve sonraki islem adimlari kilitli.</h4>
            <p>Bu modda sadece gelen belgeleri ve mevcut analiz sonucunu incelersin.</p>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="clients-filter-bar">
          <label className="search-box">
            <Search size={16} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Dosya adi, analiz sonucu, mukellef veya klasor ara"
              value={search}
            />
          </label>

          <select
            onChange={(event) =>
              startTransition(() =>
                setStatusFilter(event.target.value as typeof statusFilter)
              )
            }
            value={statusFilter}
          >
            <option value="all">Tum durumlar</option>
            <option value="queued">Sirada</option>
            <option value="analyzing">Analiz ediliyor</option>
            <option value="ready">Hazir</option>
            <option value="needs_review">Kontrol gerekli</option>
            <option value="failed">Hata</option>
          </select>
        </div>

        {actionError && <div className="inline-error">{actionError}</div>}
        {actionSuccess && <div className="inline-success">{actionSuccess}</div>}

        {filteredDocuments.length === 0 ? (
          <div className="clients-empty-state">
            <p className="eyebrow">Hazir</p>
            <h4>Henuz gelen kutusunda islenecek belge yok</h4>
            <p>Masaustundeki `Domizan/GelenKutusu` klasorune bir PDF, XML, Excel, resim veya belge birakman yeterli.</p>
          </div>
        ) : (
          <div className="client-table-shell">
            <table className="client-table inbox-table">
              <thead>
                <tr>
                  <th>Belge</th>
                  <th>Durum</th>
                  <th>Analiz Sonucu</th>
                  <th>Mukellef</th>
                  <th>Onerilen Klasor</th>
                  <th>Islem</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <div className="client-name-cell">
                        <strong>{document.originalName}</strong>
                        <span>{document.fileExtension?.toUpperCase() ?? "-"}</span>
                        <span>{document.fileSize ? `${(document.fileSize / (1024 * 1024)).toFixed(2)} MB` : "-"}</span>
                      </div>
                    </td>
                    <td>
                      <div className={`inbox-status-pill ${getStatusTone(document)}`}>
                        {document.analysisStatus === "analyzing" ? (
                          <LoaderCircle className="sheet-busy-spinner" size={14} />
                        ) : isDuplicateDocument(document) ? (
                          <Trash2 size={14} />
                        ) : document.analysisStatus === "failed" ? (
                          <TriangleAlert size={14} />
                        ) : (
                          <Bot size={14} />
                        )}
                        <span>{getStatusLabel(document)}</span>
                      </div>
                      <span className="inbox-muted-line">
                        Son analiz: {formatDateTime(document.lastAnalyzedAt)}
                      </span>
                    </td>
                    <td>
                      <div className="inbox-analysis-cell">
                        <strong>{document.detectedType ?? "Belirlenemedi"}</strong>
                        <p>{document.analysisSummary ?? "Analiz bekleniyor."}</p>
                        {document.analysisProvider && (
                          <span className="inbox-muted-line">
                            <Sparkles size={12} /> {document.analysisProvider}
                          </span>
                        )}
                        {document.analysisError && (
                          <span className="inbox-muted-line inbox-muted-line--error">
                            {document.analysisError}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="inbox-analysis-cell">
                        <strong>{document.matchedClientName ?? "Net eslesme yok"}</strong>
                        <p>
                          {document.matchedClientName && document.matchedClientConfidence != null
                            ? `%${document.matchedClientConfidence} guven`
                            : "Insan dogrulamasi gerekli"}
                        </p>
                        {document.matchedBy && (
                          <span className="inbox-muted-line">Eslesme: {document.matchedBy}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="inbox-analysis-cell">
                        <strong>{document.suggestedFolder ?? "-"}</strong>
                        <p>
                          {isDuplicateDocument(document)
                            ? "Daha once tasinmis belge"
                            : document.status === "routed"
                            ? `Tasindi${document.routedFolder ? `: ${document.routedFolder}` : ""}`
                            : document.status === "error"
                              ? "Analiz tamamlanamadi"
                              : "Tasnif onerisi"}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="table-action-button"
                          onClick={() => void handleOpenDocument(document.id)}
                          type="button"
                        >
                          <FolderOpen size={14} />
                          <span>{busyDocumentId === document.id ? "Aciliyor" : "Ac"}</span>
                        </button>
                        <button
                          className="table-action-button"
                          disabled={operationsLocked || document.analysisStatus === "analyzing"}
                          onClick={() => void handleReanalyze(document.id)}
                          type="button"
                        >
                          <RefreshCw size={14} />
                          <span>Yeniden analiz</span>
                        </button>
                        <button
                          className="table-action-button"
                          disabled={
                            operationsLocked ||
                            document.analysisStatus === "analyzing" ||
                            isDuplicateDocument(document) ||
                            clients.length === 0
                          }
                          onClick={() => void handleRoute(document)}
                          type="button"
                        >
                          <FolderOpen size={14} />
                          <span>{document.status === "routed" ? "Yeniden tasi" : "Sec ve tasi"}</span>
                        </button>
                        {isDuplicateDocument(document) && document.status !== "routed" && (
                          <button
                            className="table-action-button table-action-button--danger"
                            disabled={operationsLocked || busyDocumentId === document.id}
                            onClick={() => void handleDeleteDocument(document)}
                            type="button"
                          >
                            <Trash2 size={14} />
                            <span>{busyDocumentId === document.id ? "Siliniyor" : "Mukerrer sil"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {routeDocument && (
        <InboxRouteSheet
          busy={routeBusy}
          clients={clients}
          document={routeDocument}
          onClose={() => {
            if (!routeBusy) {
              setRouteDocument(null);
            }
          }}
          onSubmit={handleRouteSubmit}
        />
      )}
    </div>
  );
}
