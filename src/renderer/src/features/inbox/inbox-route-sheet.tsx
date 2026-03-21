import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FolderTree, X } from "lucide-react";

import {
  DOMIZAN_CLIENT_SUBFOLDERS,
  type ClientRecord,
  type InboxDocumentRecord,
  type InboxRouteFolder
} from "../../../../shared/contracts";

type InboxRouteSheetProps = {
  busy: boolean;
  clients: ClientRecord[];
  document: InboxDocumentRecord;
  onClose: () => void;
  onSubmit: (input: { clientId: number; targetFolder: InboxRouteFolder }) => Promise<void>;
};

const getDefaultFolder = (document: InboxDocumentRecord): InboxRouteFolder =>
  (DOMIZAN_CLIENT_SUBFOLDERS.find((folder) => folder === document.suggestedFolder) ??
    "01-Gelen Belgeler") as InboxRouteFolder;

const getDefaultClientId = (document: InboxDocumentRecord) => document.clientId ?? null;

export function InboxRouteSheet({
  busy,
  clients,
  document,
  onClose,
  onSubmit
}: InboxRouteSheetProps) {
  const sortedClients = useMemo(
    () =>
      [...clients].sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "active" ? -1 : 1;
        }

        return left.name.localeCompare(right.name, "tr");
      }),
    [clients]
  );

  const [clientId, setClientId] = useState<number>(
    getDefaultClientId(document) ?? 0
  );
  const [targetFolder, setTargetFolder] = useState<InboxRouteFolder>(getDefaultFolder(document));

  useEffect(() => {
    setClientId(getDefaultClientId(document) ?? 0);
    setTargetFolder(getDefaultFolder(document));
  }, [document]);

  const selectedClient = sortedClients.find((client) => client.id === clientId) ?? null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientId) {
      return;
    }

    await onSubmit({
      clientId,
      targetFolder
    });
  };

  return (
    <div className="sheet-overlay" role="presentation">
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-label="Belgeyi klasore tasi">
        {busy && (
          <div className="sheet-busy-overlay">
            <div className="sheet-busy-card">
              <FolderTree className="sheet-busy-spinner" size={28} />
              <strong>Belge tasiniyor ve sistem ogreniyor</strong>
              <span>Dosya yeni klasorune aliniyor, onay karari hafizaya yaziliyor.</span>
            </div>
          </div>
        )}

        <div className="sheet-header">
          <div>
            <p className="eyebrow">Belge Onayi</p>
            <h3>Belgeyi dogru mukellef ve klasore tasi</h3>
            <p className="sheet-footnote">
              Bu onay sonraki analizlerde Domizan'in eslesme kalitesini yukseltir.
            </p>
          </div>

          <button className="sheet-close-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="mizan-create-summary">
          <span>Belge</span>
          <strong>{document.originalName}</strong>
          <p>{document.analysisSummary ?? "Analiz sonucu henuz olusmadi."}</p>
        </div>

        <form className="sheet-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="field">
            <span>Mukellef</span>
            <select onChange={(event) => setClientId(Number(event.target.value))} value={clientId || ""}>
              <option value="">Mukellef sec</option>
              {sortedClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.status === "passive" ? " (Pasif)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Hedef klasor</span>
            <select
              onChange={(event) => setTargetFolder(event.target.value as InboxRouteFolder)}
              value={targetFolder}
            >
              {DOMIZAN_CLIENT_SUBFOLDERS.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </div>

          {selectedClient && (
            <div className="mizan-create-summary">
              <span>Secilen mukellef</span>
              <strong>{selectedClient.name}</strong>
              <p>
                Kimlik: {selectedClient.identityNumber ?? "-"} | Durum:{" "}
                {selectedClient.status === "active" ? "Aktif" : "Pasif"}
              </p>
            </div>
          )}

          <div className="sheet-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Vazgec
            </button>
            <button
              className="primary-button"
              disabled={!selectedClient || busy}
              type="submit"
            >
              Tasi ve ogren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
