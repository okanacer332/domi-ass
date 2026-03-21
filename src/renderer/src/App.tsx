import { useEffect, useState } from "react";
import { KeyRound, ShoppingCart, X } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppSidebar } from "./components/layout/app-sidebar";
import { AppTopbar } from "./components/layout/app-topbar";
import { MascotDock } from "./components/ui/mascot-dock";
import { StatePanel } from "./components/ui/state-panel";
import { useAppStore } from "./features/app/app-store";
import { ClientDetailPage } from "./features/clients/client-detail-page";
import { ClientsPage } from "./features/clients/clients-page";
import { DashboardPage } from "./features/dashboard/dashboard-page";
import { InboxPage } from "./features/inbox/inbox-page";
import { MizanPage } from "./features/mizan/mizan-page";
import { OnboardingPage } from "./features/onboarding/onboarding-page";
import { PlannerPage } from "./features/planner/planner-page";
import { SettingsPage } from "./features/settings/settings-page";

function App() {
  const bootstrap = useAppStore((state) => state.bootstrap);
  const settings = useAppStore((state) => state.settings);
  const updateState = useAppStore((state) => state.updateState);
  const status = useAppStore((state) => state.status);
  const error = useAppStore((state) => state.error);
  const loadBootstrap = useAppStore((state) => state.loadBootstrap);
  const loadSettings = useAppStore((state) => state.loadSettings);
  const loadUpdateState = useAppStore((state) => state.loadUpdateState);
  const watchUpdateState = useAppStore((state) => state.watchUpdateState);
  const checkForUpdates = useAppStore((state) => state.checkForUpdates);
  const installUpdate = useAppStore((state) => state.installUpdate);
  const openCheckout = useAppStore((state) => state.openCheckout);
  const [showAccessCenter, setShowAccessCenter] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    void loadBootstrap();
    void loadSettings();
    void loadUpdateState();
    const unsubscribe = watchUpdateState();

    return () => {
      unsubscribe();
    };
  }, [loadBootstrap, loadSettings, loadUpdateState, watchUpdateState]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const preference = settings?.themePreference ?? "system";
      const resolvedTheme =
        preference === "system" ? (mediaQuery.matches ? "dark" : "light") : preference;

      root.dataset.theme = resolvedTheme;
      root.style.colorScheme = resolvedTheme;
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [settings?.themePreference]);

  useEffect(() => {
    if (bootstrap?.access.canUseApp) {
      setShowAccessCenter(false);
    }
  }, [bootstrap?.access.canUseApp]);

  if (status === "loading") {
    return (
      <div className="app-shell app-shell--centered">
        <main className="content content--single">
          <StatePanel
            eyebrow="Yukleniyor"
            title="Domizan masaustu hazirlaniyor"
            description="Yerel klasorler, veritabani ve guvenli kurulum denetimleri calistiriliyor."
          />
        </main>
        <MascotDock />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="app-shell app-shell--centered">
        <main className="content content--single">
          <StatePanel
            eyebrow="Hata"
            title="Baslangic verisi alinamadi"
            description={error ?? "Beklenmeyen hata"}
          />
        </main>
        <MascotDock />
      </div>
    );
  }

  if (!bootstrap) {
    return null;
  }

  const isPurchaseLocked =
    bootstrap.onboarding.isComplete &&
    bootstrap.access.requiresPurchase &&
    !bootstrap.access.canUseApp;
  const shouldShowOnboarding =
    !bootstrap.onboarding.isComplete || (!bootstrap.access.canUseApp && !isPurchaseLocked);

  if (shouldShowOnboarding) {
    return (
      <div className="app-shell app-shell--centered">
        <main className="content content--single">
          <OnboardingPage bootstrap={bootstrap} />
        </main>
        <MascotDock />
      </div>
    );
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-shell--sidebar-collapsed" : ""}`}>
      <AppSidebar collapsed={sidebarCollapsed} />

      <main className="content">
        <AppTopbar
          accessMode={bootstrap.access.mode}
          isSidebarCollapsed={sidebarCollapsed}
          officeName={bootstrap.workspace?.officeName ?? "Domizan"}
          onCheckUpdates={() => void checkForUpdates()}
          onInstallUpdate={() => void installUpdate()}
          onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
          trialDaysLeft={bootstrap.access.trial.daysLeft}
          updateState={updateState}
        />
        <div className="route-viewport">
          {isPurchaseLocked && (
            <section className="access-lock-banner">
              <div className="access-lock-banner__copy">
                <p className="eyebrow">Goruntuleme Modu</p>
                <h3>Deneme suresi doldu. Tum veriler gorunur, islemler kilitli.</h3>
                <p>
                  {bootstrap.access.reason ??
                    "Kayitlari inceleyebilirsin ancak yeni musteri ekleme, import, duzenleme ve klasor islemleri lisans etkinlesene kadar durduruldu."}
                </p>
              </div>

              <div className="access-lock-banner__actions">
                <button
                  className="secondary-button"
                  onClick={() => setShowAccessCenter(true)}
                  type="button"
                >
                  <KeyRound size={16} />
                  <span>Lisansi etkinlestir</span>
                </button>
                <button
                  className="primary-button"
                  onClick={() =>
                    void openCheckout({
                      email: bootstrap.workspace?.ownerEmail ?? undefined,
                      name: bootstrap.workspace?.ownerName ?? undefined
                    })
                  }
                  type="button"
                >
                  <ShoppingCart size={16} />
                  <span>Satin alma sayfasini ac</span>
                </button>
              </div>
            </section>
          )}

          <div className="route-viewport__body">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage bootstrap={bootstrap} />} />
              <Route path="/planlama" element={<PlannerPage />} />
              <Route
                path="/mukellefler"
                element={
                  <ClientsPage
                    bootstrap={bootstrap}
                    onOpenCheckout={() =>
                      void openCheckout({
                        email: bootstrap.workspace?.ownerEmail ?? undefined,
                        name: bootstrap.workspace?.ownerName ?? undefined
                      })
                    }
                    onUnlockAccess={() => setShowAccessCenter(true)}
                  />
                }
              />
              <Route path="/mukellefler/:clientId" element={<ClientDetailPage />} />
              <Route path="/mizan-kodlari" element={<MizanPage />} />
              <Route path="/gelen-kutusu" element={<InboxPage bootstrap={bootstrap} />} />
              <Route path="/hatirlatmalar" element={<Navigate to="/planlama" replace />} />
              <Route path="/ayarlar" element={<SettingsPage bootstrap={bootstrap} />} />
            </Routes>
          </div>
        </div>
      </main>

      <MascotDock />

      {showAccessCenter && (
        <div className="access-center-overlay" role="presentation">
          <div
            className="access-center-overlay__scrim"
            onClick={() => setShowAccessCenter(false)}
          />
          <div className="access-center-overlay__panel">
            <button
              aria-label="Erisim merkezini kapat"
              className="sheet-close-button access-center-overlay__close"
              onClick={() => setShowAccessCenter(false)}
              type="button"
            >
              <X size={18} />
            </button>
            <OnboardingPage bootstrap={bootstrap} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
