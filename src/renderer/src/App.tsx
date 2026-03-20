import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppSidebar } from "./components/layout/app-sidebar";
import { AppTopbar } from "./components/layout/app-topbar";
import { MascotDock } from "./components/ui/mascot-dock";
import { StatePanel } from "./components/ui/state-panel";
import { useAppStore } from "./features/app/app-store";
import { ClientsPage } from "./features/clients/clients-page";
import { DashboardPage } from "./features/dashboard/dashboard-page";
import { PlaceholderPage } from "./features/shared/placeholder-page";

function App() {
  const bootstrap = useAppStore((state) => state.bootstrap);
  const status = useAppStore((state) => state.status);
  const error = useAppStore((state) => state.error);
  const loadBootstrap = useAppStore((state) => state.loadBootstrap);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  return (
    <div className="app-shell">
      <AppSidebar />

      <main className="content">
        <AppTopbar
          geminiReady={bootstrap?.summary.geminiReady ?? false}
          telegramReady={bootstrap?.summary.telegramReady ?? false}
          lemonMode={bootstrap?.summary.lemonMode ?? "test"}
          lemonReady={bootstrap?.summary.lemonReady ?? false}
        />

        {status === "loading" && (
          <StatePanel
            eyebrow="Yükleniyor"
            title="Domizan masaüstü hazırlanıyor"
            description="Yerel klasörler, veritabanı ve ilk pano özetleri toplanıyor."
          />
        )}

        {status === "error" && (
          <StatePanel
            eyebrow="Hata"
            title="Başlangıç verisi alınamadı"
            description={error ?? "Beklenmeyen hata"}
          />
        )}

        {status === "ready" && bootstrap && (
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage bootstrap={bootstrap} />} />
            <Route path="/mukellefler" element={<ClientsPage />} />
            <Route path="/gelen-kutusu" element={<PlaceholderPage title="Gelen Kutusu" />} />
            <Route path="/hatirlatmalar" element={<PlaceholderPage title="Hatırlatmalar" />} />
            <Route path="/ayarlar" element={<PlaceholderPage title="Ayarlar" />} />
          </Routes>
        )}
      </main>

      <MascotDock />
    </div>
  );
}

export default App;
