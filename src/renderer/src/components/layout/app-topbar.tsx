import { Download, PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";

import type { AccessMode, AppUpdateState } from "../../../../shared/contracts";
import { StatusPill } from "../ui/status-pill";

type AppTopbarProps = {
  officeName: string;
  accessMode: AccessMode;
  isSidebarCollapsed: boolean;
  trialDaysLeft: number;
  updateState: AppUpdateState | null;
  onCheckUpdates: () => void;
  onInstallUpdate: () => void;
  onToggleSidebar: () => void;
};

const getAccessLabel = (accessMode: AccessMode, trialDaysLeft: number) => {
  if (accessMode === "licensed") {
    return "Lisans: Aktif";
  }

  if (accessMode === "trial") {
    return `Lisans: Deneme (${trialDaysLeft} gün)`;
  }

  return "Lisans: Kilitli";
};

const getVersionLabel = (updateState: AppUpdateState | null) => {
  if (!updateState) {
    return "Sürüm yükleniyor";
  }

  switch (updateState.status) {
    case "available":
    case "downloading":
      return `Yeni sürüm: ${updateState.nextVersion ?? updateState.currentVersion}`;
    case "downloaded":
      return `Hazır: ${updateState.nextVersion ?? updateState.currentVersion}`;
    case "installing":
      return "Kurulum başlatıldı";
    default:
      return `v${updateState.currentVersion}`;
  }
};

export function AppTopbar({
  officeName,
  accessMode,
  isSidebarCollapsed,
  trialDaysLeft,
  updateState,
  onCheckUpdates,
  onInstallUpdate,
  onToggleSidebar
}: AppTopbarProps) {
  const isChecking = updateState?.status === "checking";
  const isDownloading = updateState?.status === "available" || updateState?.status === "downloading";
  const canInstall = updateState?.canInstall ?? false;
  const canCheck = updateState?.canCheck ?? false;

  return (
    <header className="topbar topbar--compact">
      <div className="topbar-copy">
        <button className="topbar-sidebar-toggle" onClick={onToggleSidebar} type="button">
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <p className="eyebrow">{officeName}</p>
        <h2>Kontrol paneli</h2>
      </div>

      <div className="topbar-actions">
        <StatusPill label={getAccessLabel(accessMode, trialDaysLeft)} ready={accessMode !== "blocked"} />

        <div className="topbar-version">
          <strong>{getVersionLabel(updateState)}</strong>

          <div className="topbar-version__actions">
            <button
              className="secondary-button"
              disabled={!canCheck || isChecking || isDownloading || canInstall}
              onClick={onCheckUpdates}
              type="button"
            >
              <RefreshCw size={16} />
              <span>{isChecking ? "Denetleniyor" : "Güncellemeyi denetle"}</span>
            </button>

            {canInstall && (
              <button className="primary-button" onClick={onInstallUpdate} type="button">
                <Download size={16} />
                <span>Şimdi kur</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
