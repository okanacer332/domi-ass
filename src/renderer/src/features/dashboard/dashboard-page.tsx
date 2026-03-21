import { useEffect, useState } from "react";
import { AlarmClock, BellRing, CalendarDays, FileStack, Users } from "lucide-react";

import type { BootstrapPayload, DashboardPlannerPayload } from "../../../../shared/contracts";
import { StatePanel } from "../../components/ui/state-panel";

type DashboardPageProps = {
  bootstrap: BootstrapPayload;
};

const formatPlannerDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    weekday: "short"
  }).format(new Date(value));

export function DashboardPage({ bootstrap }: DashboardPageProps) {
  const [planner, setPlanner] = useState<DashboardPlannerPayload | null>(null);
  const [plannerStatus, setPlannerStatus] = useState<"loading" | "ready" | "error">("loading");
  const [plannerError, setPlannerError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlanner = async () => {
      setPlannerStatus("loading");
      setPlannerError(null);

      try {
        const payload = await window.domizanApi.getDashboardPlanner();
        setPlanner(payload);
        setPlannerStatus("ready");
      } catch (error) {
        setPlannerStatus("error");
        setPlannerError(error instanceof Error ? error.message : "Planlama verisi alinamadi.");
      }
    };

    void loadPlanner();
  }, []);

  const stats = [
    {
      label: "Mukellef",
      value: bootstrap.summary.clientCount,
      detail: "Aktif kayit",
      icon: Users
    },
    {
      label: "Bekleyen belge",
      value: bootstrap.summary.waitingDocumentCount,
      detail: "Gelen kutusu",
      icon: FileStack
    },
    {
      label: "Hatirlatici",
      value: bootstrap.summary.pendingReminderCount,
      detail: "Takip listesi",
      icon: BellRing
    },
    {
      label: "Bugun",
      value: planner?.todayItemCount ?? 0,
      detail: "Takvim kaydi",
      icon: CalendarDays
    }
  ];

  if (plannerStatus === "error" && !planner) {
    return (
      <div className="page-stack">
        <section className="stats-grid dashboard-stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article key={stat.label} className="stat-card">
                <div className="stat-head">
                  <span>{stat.label}</span>
                  <Icon size={18} />
                </div>
                <strong>{stat.value}</strong>
                <p>{stat.detail}</p>
              </article>
            );
          })}
        </section>

        <StatePanel
          eyebrow="Planlama"
          title="Organizasyon ozeti alinamadi"
          description={plannerError ?? "Planlama verisi alinamadi."}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="stats-grid dashboard-stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article key={stat.label} className="stat-card">
              <div className="stat-head">
                <span>{stat.label}</span>
                <Icon size={18} />
              </div>
              <strong>{stat.value}</strong>
              <p>{stat.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="dashboard-overview-grid">
        <article className="dashboard-summary-card">
          <div className="dashboard-summary-card__head">
            <p className="eyebrow">Bu ayin odagi</p>
            <CalendarDays size={16} />
          </div>
          <h3>{planner?.focusPhaseLabel ?? "Planlama yukleniyor"}</h3>
          <p>{planner?.focusPhaseText ?? "Aylik takvim okunuyor."}</p>
        </article>

        <article className="dashboard-summary-card dashboard-summary-card--accent">
          <div className="dashboard-summary-card__head">
            <p className="eyebrow">Siradaki resmi gun</p>
            <AlarmClock size={16} />
          </div>
          <h3>{planner?.nextDeadline?.title ?? "Kritik gun bulunamadi"}</h3>
          <p>
            {planner?.nextDeadline
              ? `${formatPlannerDate(planner.nextDeadline.date)} · ${planner.nextDeadline.description ?? "Takvim kaydi"}`
              : "Planlama sayfasinda tum ay gorunumuyle detaylari acabilirsin."}
          </p>
        </article>

        <article className="dashboard-summary-card">
          <div className="dashboard-summary-card__head">
            <p className="eyebrow">Operasyon ozeti</p>
            <BellRing size={16} />
          </div>
          <h3>{bootstrap.summary.pendingReminderCount} acik takip</h3>
          <p>Detayli takvim, notlar ve manuel hatirlaticilar artik Planlama sayfasinda.</p>
          <div className="dashboard-summary-chips">
            <span className="dashboard-summary-chip">
              Bekleyen belge: {bootstrap.summary.waitingDocumentCount}
            </span>
            <span className="dashboard-summary-chip">
              Toplam belge: {bootstrap.summary.totalDocumentCount}
            </span>
          </div>
        </article>
      </section>
    </div>
  );
}
