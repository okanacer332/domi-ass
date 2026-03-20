import { useEffect, useState } from "react";
import { KeyRound, ShoppingCart, X } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppSidebar } from "./components/layout/app-sidebar";
import { AppTopbar } from "./components/layout/app-topbar";
import { MascotDock } from "./components/ui/mascot-dock";
import { StatePanel } from "./components/ui/state-panel";
import { useAppStore } from "./features/app/app-store";
import { ClientsPage } from "./features/clients/clients-page";
import { DashboardPage } from "./features/dashboard/dashboard-page";
import { OnboardingPage } from "./features/onboarding/onboarding-page";
import { PlaceholderPage } from "./features/shared/placeholder-page";

function App() {
  const bootstrap = useAppStore((state) => state.bootstrap);
  const updateState = useAppStore((state) => state.updateState);
  const status = useAppStore((state) => state.status);
  const error = useAppStore((state) => state.error);
  const loadBootstrap = useAppStore((state) => state.loadBootstrap);
  const loadUpdateState = useAppStore((state) => state.loadUpdateState);
  const watchUpdateState = useAppStore((state) => state.watchUpdateState);
  const checkForUpdates = useAppStore((state) => state.checkForUpdates);
  const installUpdate = useAppStore((state) => state.installUpdate);
  const openCheckout = useAppStore((state) => state.openCheckout);
  const [showAccessCenter, setShowAccessCenter] = useState(false);

  useEffect(() => {
    void loadBootstrap();
    void loadUpdateState();
    const unsubscribe = watchUpdateState();

    return () => {
      unsubscribe();
    };
  }, [loadBootstrap, loadUpdateState, watchUpdateState]);

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
            eyebrow="Yükleniyor"
            title="Domizan masaüstü hazırlanıyor"
            description="Yerel klasörler, veritabanı ve güvenli kurulum denetimleri çalıştırılıyor."
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
            title="Başlangıç verisi alınamadı"
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
    <div className="app-shell">
      <AppSidebar />

      <main className="content">
        <AppTopbar
          accessMode={bootstrap.access.mode}
          geminiReady={bootstrap.summary.geminiReady}
          lemonMode={bootstrap.summary.lemonMode}
          lemonReady={bootstrap.summary.lemonReady}
          officeName={bootstrap.workspace?.officeName ?? "Domizan"}
          onCheckUpdates={() => void checkForUpdates()}
          onInstallUpdate={() => void installUpdate()}
          telegramReady={bootstrap.summary.telegramReady}
          trialDaysLeft={bootstrap.access.trial.daysLeft}
          updateState={updateState}
        />

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
                <span>Satın alma sayfasini ac</span>
              </button>
            </div>
          </section>
        )}

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage bootstrap={bootstrap} />} />
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
          <Route path="/gelen-kutusu" element={<PlaceholderPage title="Gelen Kutusu" />} />
          <Route path="/hatirlatmalar" element={<PlaceholderPage title="Hatırlatmalar" />} />
          <Route path="/ayarlar" element={<PlaceholderPage title="Ayarlar" />} />
        </Routes>
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
