import { useMemo, useState } from "react";
import {
  Cpu,
  Download,
  FolderOpen,
  HardDrive,
  KeyRound,
  LaptopMinimal,
  MoonStar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SunMedium
} from "lucide-react";

import type { BootstrapPayload, ThemePreference } from "../../../../shared/contracts";
import { StatePanel } from "../../components/ui/state-panel";
import { useAppStore } from "../app/app-store";

type SettingsPageProps = {
  bootstrap: BootstrapPayload;
};

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
}> = [
  {
    value: "system",
    label: "Sistem",
    description: "Bilgisayarin tema tercihini kullanir."
  },
  {
    value: "light",
    label: "Aydinlik",
    description: "Aydinlik ofis gorunumu."
  },
  {
    value: "dark",
    label: "Karanlik",
    description: "Dusuk isikta daha rahat gorunum."
  }
];

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const maskLicenseKey = (licenseKey: string) => {
  if (licenseKey.length <= 8) {
    return licenseKey;
  }

  return `${licenseKey.slice(0, 4)}••••${licenseKey.slice(-4)}`;
};

const getAccessTitle = (bootstrap: BootstrapPayload) => {
  if (bootstrap.access.mode === "licensed") {
    return "Lisans aktif";
  }

  if (bootstrap.access.mode === "trial") {
    return `Deneme aktif (${bootstrap.access.trial.daysLeft} gun)`;
  }

  return "Lisans gerekli";
};

export function SettingsPage({ bootstrap }: SettingsPageProps) {
  const settings = useAppStore((state) => state.settings);
  const updateState = useAppStore((state) => state.updateState);
  const setThemePreference = useAppStore((state) => state.setThemePreference);
  const refreshSettings = useAppStore((state) => state.refreshSettings);
  const checkForUpdates = useAppStore((state) => state.checkForUpdates);
  const installUpdate = useAppStore((state) => state.installUpdate);
  const validateStoredLicense = useAppStore((state) => state.validateStoredLicense);
  const activateLicense = useAppStore((state) => state.activateLicense);
  const openCheckout = useAppStore((state) => state.openCheckout);

  const [licenseKey, setLicenseKey] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyArea, setBusyArea] = useState<"theme" | "license" | "paths" | "update" | null>(null);

  const integrationChips = useMemo(
    () => [
      { label: "Gemini", ready: bootstrap.summary.geminiReady },
      { label: "Telegram", ready: bootstrap.summary.telegramReady },
      {
        label: bootstrap.summary.lemonMode === "live" ? "Lemon" : "Lemon (test)",
        ready: bootstrap.summary.lemonReady
      }
    ],
    [bootstrap.summary]
  );

  const directories = settings?.directories
    ? [
        { label: "Domizan kok klasoru", path: settings.directories.root },
        { label: "Mukellefler", path: settings.directories.clients },
        { label: "GelenKutusu", path: settings.directories.inbox },
        { label: "Veri", path: settings.directories.data },
        { label: "Raporlar", path: settings.directories.reports },
        { label: "Sablonlar", path: settings.directories.templates }
      ]
    : [];

  const handleThemeChange = async (theme: ThemePreference) => {
    setBusyArea("theme");
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await setThemePreference(theme);
      setStatusMessage("Tema tercihi kaydedildi.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Tema kaydedilemedi.");
    } finally {
      setBusyArea(null);
    }
  };

  const handleOpenPath = async (targetPath: string) => {
    setBusyArea("paths");
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await window.domizanApi.openPath(targetPath);

      if (!result.opened) {
        throw new Error(result.error ?? "Klasor acilamadi.");
      }

      setStatusMessage("Klasor acildi.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Yol acilamadi.");
    } finally {
      setBusyArea(null);
    }
  };

  const handleValidateLicense = async () => {
    setBusyArea("license");
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await validateStoredLicense();
      await refreshSettings();
      setStatusMessage("Lisans durumu yenilendi.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Lisans dogrulanamadi.");
    } finally {
      setBusyArea(null);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setErrorMessage("Lisans anahtarini gir.");
      return;
    }

    setBusyArea("license");
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await activateLicense({
        licenseKey: licenseKey.trim(),
        email: bootstrap.workspace?.ownerEmail ?? undefined,
        instanceName: settings?.device.hostname ?? undefined
      });

      if (!result.success) {
        throw new Error(result.error ?? "Lisans etkinlestirilemedi.");
      }

      await refreshSettings();
      setLicenseKey("");
      setStatusMessage("Lisans basariyla etkinlestirildi.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Lisans etkinlestirilemedi.");
    } finally {
      setBusyArea(null);
    }
  };

  const handleOpenCheckout = async () => {
    setBusyArea("license");
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await openCheckout({
        email: bootstrap.workspace?.ownerEmail ?? undefined,
        name: bootstrap.workspace?.ownerName ?? undefined
      });

      if (!result.opened) {
        throw new Error(result.error ?? "Satin alma sayfasi acilamadi.");
      }

      setStatusMessage("Satin alma sayfasi tarayicida acildi.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Checkout acilamadi.");
    } finally {
      setBusyArea(null);
    }
  };

  const handleCheckUpdates = async () => {
    setBusyArea("update");
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await checkForUpdates();
      setStatusMessage("Guncelleme denetimi baslatildi.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Guncelleme denetlenemedi.");
    } finally {
      setBusyArea(null);
    }
  };

  const handleInstallUpdate = async () => {
    setBusyArea("update");
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await installUpdate();
      setStatusMessage("Kurulum baslatildi.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Kurulum baslatilamadi.");
    } finally {
      setBusyArea(null);
    }
  };

  if (!settings) {
    return (
      <StatePanel
        eyebrow="Ayarlar"
        title="Ayarlar yukleniyor"
        description="Tema, lisans ve cihaz bilgileri hazirlaniyor."
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="settings-hero">
        <div className="settings-hero__copy">
          <p className="eyebrow">Ayarlar</p>
          <h3>Uygulama gorunumu, lisans ve bu cihazin teknik detaylari</h3>
          <p>
            Tema tercihini burada yonetebilir, lisansi dogrulayabilir ve Domizan klasorlerini
            dogrudan acabilirsin.
          </p>
        </div>

        <div className="settings-hero__aside">
          <div className="settings-chip-row">
            <span className="settings-chip settings-chip--accent">{getAccessTitle(bootstrap)}</span>
            {integrationChips.map((item) => (
              <span
                key={item.label}
                className={`settings-chip ${item.ready ? "settings-chip--ready" : "settings-chip--muted"}`}
              >
                {item.label}
              </span>
            ))}
          </div>
          <div className="settings-app-version">
            <strong>v{updateState?.currentVersion ?? settings.app.version}</strong>
            <span>{settings.app.isPackaged ? "Kurulu surum" : "Gelistirme modu"}</span>
          </div>
        </div>
      </section>

      {(statusMessage || errorMessage) && (
        <div className={errorMessage ? "inline-error" : "inline-success"}>
          {errorMessage ?? statusMessage}
        </div>
      )}

      <div className="settings-grid">
        <article className="settings-card settings-card--appearance">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Gorunum</p>
              <h4>Tema secimi</h4>
            </div>
            <Sparkles size={16} />
          </div>

          <div className="settings-theme-grid">
            {themeOptions.map((option) => {
              const Icon =
                option.value === "light"
                  ? SunMedium
                  : option.value === "dark"
                    ? MoonStar
                    : LaptopMinimal;

              return (
                <button
                  key={option.value}
                  className={`settings-theme-card ${settings.themePreference === option.value ? "is-active" : ""}`}
                  disabled={busyArea === "theme"}
                  onClick={() => void handleThemeChange(option.value)}
                  type="button"
                >
                  <span className="settings-theme-card__icon">
                    <Icon size={18} />
                  </span>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              );
            })}
          </div>
        </article>

        <article className="settings-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Lisans</p>
              <h4>Lisans ve guncelleme</h4>
            </div>
            <KeyRound size={16} />
          </div>

          <div className="settings-stack">
            <div className="settings-kv-grid">
              <div className="settings-kv-card">
                <span>Durum</span>
                <strong>{getAccessTitle(bootstrap)}</strong>
                <p>{bootstrap.access.reason ?? "Uygulama kullanima hazir."}</p>
              </div>
              <div className="settings-kv-card">
                <span>Deneme bitisi</span>
                <strong>{formatDateTime(bootstrap.access.trial.expiresAt)}</strong>
                <p>
                  {bootstrap.access.mode === "trial"
                    ? `${bootstrap.access.trial.daysLeft} gun kaldi`
                    : "Deneme aktif degil"}
                </p>
              </div>
            </div>

            <div className="settings-license-box">
              <div className="settings-license-box__head">
                <ShieldCheck size={16} />
                <strong>Mevcut lisans</strong>
              </div>

              {bootstrap.access.license ? (
                <div className="settings-license-grid">
                  <div>
                    <span>Lisans anahtari</span>
                    <strong className="settings-code">{maskLicenseKey(bootstrap.access.license.licenseKey)}</strong>
                  </div>
                  <div>
                    <span>Durum</span>
                    <strong>{bootstrap.access.license.licenseStatus}</strong>
                  </div>
                  <div>
                    <span>E-posta</span>
                    <strong>{bootstrap.access.license.customerEmail ?? "-"}</strong>
                  </div>
                  <div>
                    <span>Son dogrulama</span>
                    <strong>{formatDateTime(bootstrap.access.license.validatedAt)}</strong>
                  </div>
                </div>
              ) : (
                <div className="clients-empty-state">
                  <h4>Aktif lisans yok</h4>
                  <p>Deneme suresi bittiginde islemleri acmak icin lisans anahtari girebilirsin.</p>
                </div>
              )}
            </div>

            <label className="field">
              <span>Lisans anahtari</span>
              <input
                className="settings-input"
                onChange={(event) => setLicenseKey(event.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                type="text"
                value={licenseKey}
              />
            </label>

            <div className="settings-actions">
              <button
                className="primary-button"
                disabled={busyArea === "license"}
                onClick={() => void handleActivateLicense()}
                type="button"
              >
                <KeyRound size={16} />
                <span>Lisansi etkinlestir</span>
              </button>
              <button
                className="secondary-button"
                disabled={busyArea === "license"}
                onClick={() => void handleValidateLicense()}
                type="button"
              >
                <ShieldCheck size={16} />
                <span>Lisansi dogrula</span>
              </button>
              <button
                className="secondary-button"
                disabled={busyArea === "license"}
                onClick={() => void handleOpenCheckout()}
                type="button"
              >
                <Sparkles size={16} />
                <span>Satin alma sayfasini ac</span>
              </button>
            </div>

            <div className="settings-actions">
              <button
                className="secondary-button"
                disabled={busyArea === "update"}
                onClick={() => void handleCheckUpdates()}
                type="button"
              >
                <RefreshCw size={16} />
                <span>Guncellemeyi denetle</span>
              </button>
              {updateState?.canInstall && (
                <button
                  className="primary-button"
                  disabled={busyArea === "update"}
                  onClick={() => void handleInstallUpdate()}
                  type="button"
                >
                  <Download size={16} />
                  <span>Hazir surumu kur</span>
                </button>
              )}
            </div>
          </div>
        </article>

        <article className="settings-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Bu cihaz</p>
              <h4>Kurulum ve teknik bilgiler</h4>
            </div>
            <Cpu size={16} />
          </div>

          <div className="settings-kv-grid">
            <div className="settings-kv-card">
              <span>Bilgisayar adi</span>
              <strong>{settings.device.hostname}</strong>
              <p>{settings.app.platform} / {settings.app.arch}</p>
            </div>
            <div className="settings-kv-card">
              <span>Baglanti durumu</span>
              <strong>{settings.device.bindingStatus}</strong>
              <p>Kurulum kimligi cihaz bazli korunuyor.</p>
            </div>
            <div className="settings-kv-card">
              <span>Kurulum kimligi</span>
              <strong className="settings-code">{settings.device.installationId}</strong>
              <p>Ilk baglanma: {formatDateTime(settings.device.firstBoundAt)}</p>
            </div>
            <div className="settings-kv-card">
              <span>Uygulama</span>
              <strong>{settings.app.name} v{settings.app.version}</strong>
              <p>Electron {settings.app.electronVersion} / Node {settings.app.nodeVersion}</p>
            </div>
          </div>

          <div className="settings-path-box">
            <div className="settings-path-box__head">
              <HardDrive size={16} />
              <strong>Teknik yollar</strong>
            </div>
            <div className="settings-path-list">
              <div className="settings-path-row">
                <span>Shared binding</span>
                <code className="settings-path">{settings.device.sharedBindingPath}</code>
              </div>
              <div className="settings-path-row">
                <span>User data</span>
                <code className="settings-path">{settings.app.userDataPath}</code>
              </div>
            </div>
          </div>
        </article>

        <article className="settings-card settings-card--full">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Klasorler</p>
              <h4>Domizan klasor yapisi</h4>
            </div>
            <FolderOpen size={16} />
          </div>

          <div className="settings-folder-grid">
            {directories.map((directory) => (
              <div key={directory.path} className="settings-folder-card">
                <div className="settings-folder-card__copy">
                  <strong>{directory.label}</strong>
                  <code className="settings-path">{directory.path}</code>
                </div>
                <button
                  className="secondary-button"
                  disabled={busyArea === "paths"}
                  onClick={() => void handleOpenPath(directory.path)}
                  type="button"
                >
                  <FolderOpen size={16} />
                  <span>Ac</span>
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
