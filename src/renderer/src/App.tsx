import { useEffect } from "react";
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

  useEffect(() => {
    void loadBootstrap();
    void loadUpdateState();
    const unsubscribe = watchUpdateState();

    return () => {
      unsubscribe();
    };
  }, [loadBootstrap, loadUpdateState, watchUpdateState]);

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

  const shouldShowOnboarding = !bootstrap.onboarding.isComplete || !bootstrap.access.canUseApp;

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

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage bootstrap={bootstrap} />} />
          <Route path="/mukellefler" element={<ClientsPage />} />
          <Route path="/gelen-kutusu" element={<PlaceholderPage title="Gelen Kutusu" />} />
          <Route path="/hatirlatmalar" element={<PlaceholderPage title="Hatırlatmalar" />} />
          <Route path="/ayarlar" element={<PlaceholderPage title="Ayarlar" />} />
        </Routes>
      </main>

      <MascotDock />
    </div>
  );
}

export default App;
