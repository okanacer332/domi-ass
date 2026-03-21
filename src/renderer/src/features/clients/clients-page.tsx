import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { FileUp, KeyRound, Plus, Search, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type {
  BootstrapPayload,
  ClientFormInput,
  ClientImportCommitResult,
  ClientRecord
} from "../../../../shared/contracts";
import { StatePanel } from "../../components/ui/state-panel";
import { useAppStore } from "../app/app-store";
import { ClientFormSheet } from "./client-form-sheet";
import { ClientImportSheet } from "./client-import-sheet";
import { useClientsStore } from "./client-store";
import { ClientTable } from "./client-table";
import { getClientSearchBlob } from "./client-utils";

type ClientsPageProps = {
  bootstrap: BootstrapPayload;
  onUnlockAccess: () => void;
  onOpenCheckout: () => void;
};

export function ClientsPage({ bootstrap, onUnlockAccess, onOpenCheckout }: ClientsPageProps) {
  const navigate = useNavigate();
  const clients = useClientsStore((state) => state.clients);
  const status = useClientsStore((state) => state.status);
  const error = useClientsStore((state) => state.error);
  const loadClients = useClientsStore((state) => state.loadClients);
  const createClient = useClientsStore((state) => state.createClient);
  const updateClient = useClientsStore((state) => state.updateClient);
  const setClientStatus = useClientsStore((state) => state.setClientStatus);
  const openClientFolder = useClientsStore((state) => state.openClientFolder);
  const refreshBootstrap = useAppStore((state) => state.refreshBootstrap);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const operationsLocked =
    bootstrap.onboarding.isComplete &&
    bootstrap.access.requiresPurchase &&
    !bootstrap.access.canUseApp;

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!operationsLocked) {
      return;
    }

    setFormMode(null);
    setSelectedClient(null);
    setShowImport(false);
  }, [operationsLocked]);

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
    if (operationsLocked) {
      return;
    }

    startTransition(() => {
      setSelectedClient(null);
      setFormMode("create");
      setActionError(null);
      setActionSuccess(null);
    });
  };

  const openEditSheet = (client: ClientRecord) => {
    if (operationsLocked) {
      return;
    }

    startTransition(() => {
      setSelectedClient(client);
      setFormMode("edit");
      setActionError(null);
      setActionSuccess(null);
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
    setActionSuccess(null);

    try {
      if (formMode === "edit" && selectedClient) {
        await updateClient({
          id: selectedClient.id,
          ...input
        });
      } else {
        await createClient(input);
      }

      await refreshBootstrap();
      setActionSuccess(
        formMode === "edit" ? "Mükellef kaydı güncellendi." : "Mükellef kaydı oluşturuldu."
      );
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
    if (operationsLocked) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    try {
      await setClientStatus({
        id: client.id,
        status: client.status === "active" ? "passive" : "active"
      });
      await refreshBootstrap();
      setActionSuccess(
        client.status === "active"
          ? "Mükellef pasife çekildi."
          : "Mükellef yeniden aktifleştirildi."
      );
    } catch (statusError) {
      setActionError(
        statusError instanceof Error ? statusError.message : "Durum güncellenemedi."
      );
    }
  };

  const handleOpenFolder = async (client: ClientRecord) => {
    if (operationsLocked) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    const result = await openClientFolder(client.id);

    if (!result.opened) {
      setActionError(result.error ?? "Klasör açılamadı.");
    }
  };

  const handleOpenDetail = (client: ClientRecord) => {
    navigate(`/mukellefler/${client.id}`);
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
            Liste ekranı artık detay akışına açılır. Detay sayfasında klasörler, evraklar ve genel
            mükellef görünümü tek yerde toplanır.
          </p>
        </div>

        <div className="clients-toolbar__actions">
          <button
            className="secondary-button"
            disabled={operationsLocked}
            onClick={() => setShowImport(true)}
            type="button"
          >
            <FileUp size={16} />
            <span>Excel içe aktar</span>
          </button>
          <button
            className="primary-button"
            disabled={operationsLocked}
            onClick={openCreateSheet}
            type="button"
          >
            <Plus size={16} />
            <span>Yeni mükellef</span>
          </button>
        </div>
      </section>

      {operationsLocked && (
        <section className="readonly-notice">
          <div className="readonly-notice__copy">
            <p className="eyebrow">Lisans Gerekli</p>
            <h4>Mükellef kayıtlarını görebilirsin, fakat işlem yapamazsın.</h4>
            <p>
              Deneme süresi dolduğu için yeni mükellef ekleme, Excel içe aktarma, düzenleme,
              pasife çekme ve klasör açma geçici olarak kapatıldı.
            </p>
          </div>

          <div className="readonly-notice__actions">
            <button className="secondary-button" onClick={onUnlockAccess} type="button">
              <KeyRound size={16} />
              <span>Lisansı etkinleştir</span>
            </button>
            <button className="primary-button" onClick={onOpenCheckout} type="button">
              <ShoppingCart size={16} />
              <span>Satın alma sayfasını aç</span>
            </button>
          </div>
        </section>
      )}

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

          <select
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            value={statusFilter}
          >
            <option value="all">Tüm durumlar</option>
            <option value="active">Yalnızca aktif</option>
            <option value="passive">Yalnızca pasif</option>
          </select>
        </div>

        {actionError && <div className="inline-error">{actionError}</div>}
        {actionSuccess && <div className="inline-success">{actionSuccess}</div>}

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
            disabled={operationsLocked}
            onEdit={openEditSheet}
            onOpenDetail={handleOpenDetail}
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

      {showImport && !operationsLocked && (
        <ClientImportSheet
          onClose={() => setShowImport(false)}
          onImported={async (result: ClientImportCommitResult) => {
            await loadClients({ silent: true });
            await refreshBootstrap();
            setActionError(null);
            setActionSuccess(
              `${result.created} yeni, ${result.updated} güncellenen, ${result.skipped} atlanan kayıt işlendi.${
                result.warnings.length > 0 ? ` ${result.warnings.length} uyarı oluştu.` : ""
              }`
            );
          }}
        />
      )}
    </div>
  );
}
