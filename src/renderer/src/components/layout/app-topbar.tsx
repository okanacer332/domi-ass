import { Download, RefreshCw, Rocket } from "lucide-react";

import type { AccessMode, AppUpdateState, LemonMode } from "../../../../shared/contracts";
import { StatusPill } from "../ui/status-pill";

type AppTopbarProps = {
  officeName: string;
  accessMode: AccessMode;
  trialDaysLeft: number;
  geminiReady: boolean;
  telegramReady: boolean;
  lemonReady: boolean;
  lemonMode: LemonMode;
  updateState: AppUpdateState | null;
  onCheckUpdates: () => void;
  onInstallUpdate: () => void;
};

const getAccessLabel = (accessMode: AccessMode, trialDaysLeft: number) => {
  if (accessMode === "licensed") {
    return "Erişim: Lisanslı";
  }

  if (accessMode === "trial") {
    return `Erişim: Deneme (${trialDaysLeft} gün)`;
  }

  return "Erişim: Kilitli";
};

const getUpdateLabel = (updateState: AppUpdateState | null) => {
  if (!updateState) {
    return "Güncelleme: Yükleniyor";
  }

  switch (updateState.status) {
    case "checking":
      return "Güncelleme: Denetleniyor";
    case "available":
    case "downloading":
      return `Güncelleme: İndiriliyor${updateState.nextVersion ? ` (${updateState.nextVersion})` : ""}`;
    case "downloaded":
      return `Güncelleme: Hazır${updateState.nextVersion ? ` (${updateState.nextVersion})` : ""}`;
    case "installing":
      return "Güncelleme: Kuruluyor";
    case "not-available":
      return `Sürüm: Güncel (${updateState.currentVersion})`;
    case "error":
      return "Güncelleme: Hata";
    case "unsupported":
      return "Güncelleme: Kurulu sürümde aktif";
    default:
      return `Sürüm: ${updateState.currentVersion}`;
  }
};

const getUpdateMessage = (updateState: AppUpdateState | null) => {
  if (!updateState) {
    return "Masaüstü sürümü hazırlanıyor.";
  }

  if (updateState.status === "unsupported") {
    return updateState.error ?? "Otomatik güncelleme yalnızca kurulu masaüstü sürümünde çalışır.";
  }

  if (updateState.status === "downloaded") {
    return "Yeni sürüm indi. Uygulamayı kapatmadan tek tıkla kurabilirsin.";
  }

  if (updateState.status === "downloading") {
    return `${Math.round(updateState.progressPercent ?? 0)}% indirildi. Arka planda devam ediyor.`;
  }

  if (updateState.status === "not-available") {
    return "Masaüstü uygulama güncel. Yeni bir sürüm bulunduğunda burada görünecek.";
  }

  if (updateState.status === "error") {
    return updateState.error ?? "Güncelleme denetlenirken bir hata oluştu.";
  }

  if (updateState.nextVersion) {
    return `Yeni sürüm adayı ${updateState.nextVersion} algılandı. İndirme otomatik başlayacak.`;
  }

  return "Kurulu sürüm, yayınlanan güncellemeleri bu panelden denetler.";
};

export function AppTopbar({
  officeName,
  accessMode,
  trialDaysLeft,
  geminiReady,
  telegramReady,
  lemonReady,
  lemonMode,
  updateState,
  onCheckUpdates,
  onInstallUpdate
}: AppTopbarProps) {
  const isChecking = updateState?.status === "checking";
  const isDownloading = updateState?.status === "available" || updateState?.status === "downloading";
  const canInstall = updateState?.canInstall ?? false;
  const canCheck = updateState?.canCheck ?? false;

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{officeName}</p>
        <h2>Genel durum</h2>
      </div>

      <div className="topbar-side">
        <div className="status-row">
          <StatusPill label={getAccessLabel(accessMode, trialDaysLeft)} ready={accessMode !== "blocked"} />
          <StatusPill label="Gemini" ready={geminiReady} />
          <StatusPill label="Telegram" ready={telegramReady} />
          <StatusPill label={`Lemon (${lemonMode})`} ready={lemonReady} />
          <StatusPill label={getUpdateLabel(updateState)} ready={updateState?.status !== "error"} />
        </div>

        <div className="update-card">
          <div className="update-card__copy">
            <p className="eyebrow">Masaüstü sürümü</p>
            <h3>v{updateState?.currentVersion ?? "..."}</h3>
            <p>{getUpdateMessage(updateState)}</p>
          </div>

          <div className="update-card__actions">
            <button
              className="secondary-button"
              disabled={!canCheck || isChecking || isDownloading || canInstall}
              onClick={onCheckUpdates}
              type="button"
            >
              <RefreshCw size={16} />
              <span>{isChecking ? "Denetleniyor" : "Güncellemeyi denetle"}</span>
            </button>

            <button
              className="primary-button"
              disabled={!canInstall}
              onClick={onInstallUpdate}
              type="button"
            >
              {canInstall ? <Download size={16} /> : <Rocket size={16} />}
              <span>{canInstall ? "Şimdi kur" : "Kurulu sürüm"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
