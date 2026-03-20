import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { FileUp, Plus, Search } from "lucide-react";

import type { ClientFormInput, ClientRecord } from "../../../../shared/contracts";
import { StatePanel } from "../../components/ui/state-panel";
import { useClientsStore } from "./client-store";
import { ClientFormSheet } from "./client-form-sheet";
import { ClientImportSheet } from "./client-import-sheet";
import { ClientTable } from "./client-table";
import { getClientSearchBlob } from "./client-utils";

export function ClientsPage() {
  const clients = useClientsStore((state) => state.clients);
  const status = useClientsStore((state) => state.status);
  const error = useClientsStore((state) => state.error);
  const loadClients = useClientsStore((state) => state.loadClients);
  const createClient = useClientsStore((state) => state.createClient);
  const updateClient = useClientsStore((state) => state.updateClient);
  const setClientStatus = useClientsStore((state) => state.setClientStatus);
  const openClientFolder = useClientsStore((state) => state.openClientFolder);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      deferredSearch.trim().length === 0 ||
      getClientSearchBlob(client).includes(deferredSearch.trim().toLocaleLowerCase("tr-TR"));

    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = clients.filter((client) => client.status === "active").length;
  const passiveCount = clients.filter((client) => client.status === "passive").length;

  const openCreateSheet = () => {
    startTransition(() => {
      setSelectedClient(null);
      setFormMode("create");
      setActionError(null);
    });
  };

  const openEditSheet = (client: ClientRecord) => {
    startTransition(() => {
      setSelectedClient(client);
      setFormMode("edit");
      setActionError(null);
    });
  };

  const closeFormSheet = () => {
    setFormMode(null);
    setSelectedClient(null);
    setActionError(null);
  };

  const handleSubmit = async (input: ClientFormInput) => {
    setSubmitting(true);
    setActionError(null);

    try {
      if (formMode === "edit" && selectedClient) {
        await updateClient({
          id: selectedClient.id,
          ...input
        });
      } else {
        await createClient(input);
      }

      closeFormSheet();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Mükellef kaydı sırasında hata oluştu.";
      setActionError(message);
      throw submitError;
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (client: ClientRecord) => {
    setActionError(null);

    try {
      await setClientStatus({
        id: client.id,
        status: client.status === "active" ? "passive" : "active"
      });
    } catch (statusError) {
      setActionError(
        statusError instanceof Error ? statusError.message : "Durum güncellenemedi."
      );
    }
  };

  const handleOpenFolder = async (client: ClientRecord) => {
    setActionError(null);
    const result = await openClientFolder(client.id);

    if (!result.opened) {
      setActionError(result.error ?? "Klasör açılamadı.");
    }
  };

  if (status === "loading") {
    return (
      <StatePanel
        eyebrow="Yükleniyor"
        title="Mükellefler sayfası hazırlanıyor"
        description="Tablo, klasör durumu ve kayıtlar yükleniyor."
      />
    );
  }

  if (status === "error") {
    return (
      <StatePanel
        eyebrow="Hata"
        title="Mükellefler yüklenemedi"
        description={error ?? "Beklenmeyen hata"}
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="clients-toolbar">
        <div className="clients-toolbar__copy">
          <p className="eyebrow">Mükellef Yönetimi</p>
          <h3>Mükellef listesi, klasör erişimi ve kontrollü Excel aktarımı</h3>
          <p>
            Kimlik türü artık net biçimde ayrılır. Sistem VKN ve T.C. kimlik numaralarını farklı
            kurallarla doğrular.
          </p>
        </div>

        <div className="clients-toolbar__actions">
          <button className="secondary-button" onClick={() => setShowImport(true)} type="button">
            <FileUp size={16} />
            <span>Excel içe aktar</span>
          </button>
          <button className="primary-button" onClick={openCreateSheet} type="button">
            <Plus size={16} />
            <span>Yeni mükellef</span>
          </button>
        </div>
      </section>

      <section className="stats-grid clients-stats-grid">
        <article className="stat-card">
          <div className="stat-head">
            <span>Toplam kayıt</span>
          </div>
          <strong>{clients.length}</strong>
          <p>Sistemde görünen mükellefler</p>
        </article>
        <article className="stat-card">
          <div className="stat-head">
            <span>Aktif</span>
          </div>
          <strong>{activeCount}</strong>
          <p>Operasyonda kullanılan kayıtlar</p>
        </article>
        <article className="stat-card">
          <div className="stat-head">
            <span>Pasif</span>
          </div>
          <strong>{passiveCount}</strong>
          <p>Arşivde tutulan kayıtlar</p>
        </article>
      </section>

      <section className="panel">
        <div className="clients-filter-bar">
          <label className="search-box">
            <Search size={16} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mükellef adı, kimlik no, yetkili, telefon veya adres ara"
              value={search}
            />
          </label>

          <select onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} value={statusFilter}>
            <option value="all">Tüm durumlar</option>
            <option value="active">Yalnızca aktif</option>
            <option value="passive">Yalnızca pasif</option>
          </select>
        </div>

        {actionError && <div className="inline-error">{actionError}</div>}

        {filteredClients.length === 0 ? (
          <div className="clients-empty-state">
            <p className="eyebrow">Hazır</p>
            <h4>Henüz gösterilecek mükellef yok</h4>
            <p>
              İlk kaydı tek tek ekleyebilir ya da Excel içe aktarma sihirbazıyla toplu şekilde
              başlayabilirsin.
            </p>
          </div>
        ) : (
          <ClientTable
            clients={filteredClients}
            onEdit={openEditSheet}
            onOpenFolder={handleOpenFolder}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </section>

      {formMode && (
        <ClientFormSheet
          busy={submitting}
          client={selectedClient}
          mode={formMode}
          onClose={closeFormSheet}
          onSubmit={handleSubmit}
        />
      )}

      {showImport && (
        <ClientImportSheet
          onClose={() => setShowImport(false)}
          onImported={async () => {
            await loadClients();
          }}
        />
      )}
    </div>
  );
}
