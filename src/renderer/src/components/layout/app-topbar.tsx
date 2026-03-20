import type { LemonMode } from "../../../../shared/contracts";
import { StatusPill } from "../ui/status-pill";

type AppTopbarProps = {
  geminiReady: boolean;
  telegramReady: boolean;
  lemonReady: boolean;
  lemonMode: LemonMode;
};

export function AppTopbar({
  geminiReady,
  telegramReady,
  lemonReady,
  lemonMode
}: AppTopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Ana Panel</p>
        <h2>Genel durum</h2>
      </div>

      <div className="status-row">
        <StatusPill label="Gemini" ready={geminiReady} />
        <StatusPill label="Telegram" ready={telegramReady} />
        <StatusPill label={`Lemon (${lemonMode})`} ready={lemonReady} />
      </div>
    </header>
  );
}
