import {
  ArrowRight,
  BellRing,
  Bot,
  FolderOpen,
  Inbox,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";

import type { BootstrapPayload } from "../../../../shared/contracts";
import { MiniStatus } from "../../components/ui/mini-status";
import { formatPath } from "../../lib/format";
import { sprintItems, workflowPrinciples } from "./dashboard-content";

type DashboardPageProps = {
  bootstrap: BootstrapPayload;
};

const directoryLabels: Record<keyof BootstrapPayload["directories"], string> = {
  root: "Kök klasör",
  clients: "Mükellefler",
  inbox: "Gelen Kutusu",
  data: "Veri",
  reports: "Raporlar",
  templates: "Şablonlar",
  system: "Sistem",
  monthlySummary: "Aylık özet",
  declarationTracking: "Beyanname takip"
};

export function DashboardPage({ bootstrap }: DashboardPageProps) {
  const stats = [
    {
      label: "Mükellef",
      value: bootstrap.summary.clientCount,
      detail: "Oluşmuş aktif portföy",
      icon: Users
    },
    {
      label: "Bekleyen belge",
      value: bootstrap.summary.waitingDocumentCount,
      detail: "GelenKutusu veya onay sırası",
      icon: Inbox
    },
    {
      label: "Toplam belge",
      value: bootstrap.summary.totalDocumentCount,
      detail: "Takibe alınmış kayıt",
      icon: FolderOpen
    },
    {
      label: "Hatırlatma",
      value: bootstrap.summary.pendingReminderCount,
      detail: "Takip edilmesi gereken iş",
      icon: BellRing
    }
  ];

  const directoryEntries = Object.entries(bootstrap.directories) as Array<
    [keyof BootstrapPayload["directories"], string]
  >;

  return (
    <div className="page-stack">
      <section className="hero-grid">
        <article className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Bugünkü Başlangıç</p>
            <h3>Masaüstü klasörleri, yerel veritabanı ve temel servisler hazır.</h3>
            <p>
              Buradan mükellefleri, gelen kutusunu ve hatırlatma akışlarını yöneteceksin. İlk amaç
              hızlı kurulumdan sonra doğrudan operasyon ekranına geçmek.
            </p>
          </div>

          <div className="hero-actions">
            <div className="hero-badge">
              <Sparkles size={16} />
              <span>7 günlük deneme akışı için hazır iskelet</span>
            </div>
            <div className="hero-badge hero-badge--secondary">
              <ShieldCheck size={16} />
              <span>Veri local-first tutulacak şekilde kurgulanıyor</span>
            </div>
          </div>
        </article>

        <article className="panel telegram-card">
          <p className="eyebrow">Telegram Rolü</p>

          <div className="telegram-title">
            <Bot size={20} />
            <h3>Sahibe özel sakin bilgi kanalı</h3>
          </div>

          <p>
            Telegram belge toplama noktası değil. Günlük brif, beyanname hatırlatması ve anlık
            soru-cevap kanalı olarak çalışacak.
          </p>

          <div className="mini-status-grid">
            <MiniStatus label="Günlük brif" ready />
            <MiniStatus label="Gece sorgusu" ready />
            <MiniStatus label="Belge girişi" ready={false} />
          </div>
        </article>
      </section>

      <section className="stats-grid">
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

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Oluşan Klasörler</p>
              <h3>Desktop / Domizan yapısı</h3>
            </div>
          </div>

          <div className="path-list">
            {directoryEntries.map(([key, value]) => (
              <div key={key} className="path-row">
                <span className="path-key">{directoryLabels[key]}</span>
                <code>{formatPath(value)}</code>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Operasyon İlkeleri</p>
              <h3>Akışın net tanımı</h3>
            </div>
          </div>

          <div className="principle-list">
            {workflowPrinciples.map((item) => (
              <div key={item.title} className="principle-item">
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Sonraki Sprint</p>
              <h3>Hemen inşa edilecek başlıklar</h3>
            </div>
          </div>

          <div className="task-list">
            {sprintItems.map((item) => (
              <div key={item} className="task-item">
                <ArrowRight size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--accent">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Sistem Hazırlığı</p>
              <h3>Başlangıç omurgası çalışıyor</h3>
            </div>
          </div>

          <p className="accent-copy">
            Uygulama klasör yapısını oluşturuyor, yerel veritabanını hazırlıyor ve Gemini ile
            Telegram durumunu tek ekranda gösterebiliyor. Bundan sonraki odak gerçek operasyon
            akışlarını eklemek.
          </p>
        </article>
      </section>
    </div>
  );
}
