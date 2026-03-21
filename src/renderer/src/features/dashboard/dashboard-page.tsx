import { BellRing, FolderOpen, Inbox, Users } from "lucide-react";

import type { BootstrapPayload } from "../../../../shared/contracts";

type DashboardPageProps = {
  bootstrap: BootstrapPayload;
};

export function DashboardPage({ bootstrap }: DashboardPageProps) {
  const stats = [
    {
      label: "Mükellef",
      value: bootstrap.summary.clientCount,
      detail: "Toplam kayıt",
      icon: Users
    },
    {
      label: "Bekleyen belge",
      value: bootstrap.summary.waitingDocumentCount,
      detail: "Gelen kutusu",
      icon: Inbox
    },
    {
      label: "Toplam belge",
      value: bootstrap.summary.totalDocumentCount,
      detail: "Arşivlenen kayıt",
      icon: FolderOpen
    },
    {
      label: "Hatırlatma",
      value: bootstrap.summary.pendingReminderCount,
      detail: "Bekleyen iş",
      icon: BellRing
    }
  ];

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
    </div>
  );
}
