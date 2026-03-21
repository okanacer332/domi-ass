import { BookMarked, FolderTree, ShieldCheck, Waypoints } from "lucide-react";

import {
  documentRoutingExamples,
  documentRoutingSteps,
  mizanClasses,
  officeBreakdownExamples
} from "./mizan-content";

export function MizanPage() {
  return (
    <div className="page-stack">
      <section className="hero-grid">
        <article className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Mizan Kodları</p>
            <h3>Belgeyi önce hesap planına, sonra ofis kırılımına bağlayan karar katmanı.</h3>
            <p>
              Domizan belgeyi doğrudan klasöre atmadan önce hangi ana hesap grubuna ait olduğunu
              anlamalı. Son karar ise SMMM ofisinin kendi alt kod standardı ile tamamlanmalı.
            </p>
          </div>

          <div className="hero-actions">
            <div className="hero-badge">
              <BookMarked size={16} />
              <span>Türkiye omurgası: Tekdüzen / resmi hesap planı mantığı</span>
            </div>
            <div className="hero-badge hero-badge--secondary">
              <FolderTree size={16} />
              <span>Ofis alt kırılımı: 320.01.001 gibi özel kodlar</span>
            </div>
          </div>
        </article>

        <article className="panel panel--accent">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Domizan Kararı</p>
              <h3>Belgeden doğrudan fiş değil, güvenli aday kod üretimi</h3>
            </div>
          </div>

          <p className="accent-copy">
            Bu sayfanın amacı muhasebe fişini otomatik kesmek değil; gelen belgeyi doğru mizan
            sınıfına yaklaştırmak, ofis standardını uygulamak ve klasörlemeyi daha az hatalı hale
            getirmek.
          </p>
        </article>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-head">
            <span>Ana sınıflar</span>
            <BookMarked size={18} />
          </div>
          <strong>1-9</strong>
          <p>Belgeyi önce bu seviyede daraltacağız.</p>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>Belge karar akışı</span>
            <Waypoints size={18} />
          </div>
          <strong>4 adım</strong>
          <p>Belge tipi, ana grup, ofis alt kodu, mükellef klasörü.</p>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>Ofis standardı</span>
            <FolderTree size={18} />
          </div>
          <strong>Alt kırılım</strong>
          <p>Her SMMM ofisinin kendi kod uzantıları yönetilecek.</p>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>Güvenlik</span>
            <ShieldCheck size={18} />
          </div>
          <strong>Aday yön</strong>
          <p>Domizan öneri verecek, kritik son karar kural setiyle netleşecek.</p>
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Türkiye Omurgası</p>
              <h3>Ana mizan sınıfları</h3>
            </div>
          </div>

          <div className="mizan-class-grid">
            {mizanClasses.map((item) => (
              <article key={item.classCode} className="mizan-class-card">
                <div className="mizan-class-card__head">
                  <span className="mizan-class-card__code">{item.classCode}</span>
                  <h4>{item.title}</h4>
                </div>
                <p>{item.summary}</p>
                <div className="mizan-chip-list">
                  {item.examples.map((example) => (
                    <span key={example} className="mizan-chip">
                      {example}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Belge Akışı</p>
              <h3>Domizan'ın kullanacağı karar sırası</h3>
            </div>
          </div>

          <div className="principle-list">
            {documentRoutingSteps.map((step, index) => (
              <div key={step.title} className="principle-item">
                <h4>
                  {index + 1}. {step.title}
                </h4>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Ofis Alt Kodları</p>
              <h3>SMMM ofislerinin ürettiği kırılımlar</h3>
            </div>
          </div>

          <div className="mizan-subcode-list">
            {officeBreakdownExamples.map((item) => (
              <div key={item.officeCode} className="mizan-subcode-item">
                <div className="mizan-subcode-item__codes">
                  <span className="mizan-subcode-item__base">{item.baseCode}</span>
                  <strong>{item.officeCode}</strong>
                </div>
                <div>
                  <h4>{item.label}</h4>
                  <p>{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Belgeye Göre Aday Yön</p>
              <h3>İlk sınıflandırma mantığı</h3>
            </div>
          </div>

          <div className="mizan-route-table-shell">
            <table className="mizan-route-table">
              <thead>
                <tr>
                  <th>Belge tipi</th>
                  <th>Aday ana grup</th>
                  <th>Ofis kararı</th>
                  <th>Risk notu</th>
                </tr>
              </thead>
              <tbody>
                {documentRoutingExamples.map((item) => (
                  <tr key={item.documentType}>
                    <td>{item.documentType}</td>
                    <td>{item.candidateGroups}</td>
                    <td>{item.officeDecision}</td>
                    <td>{item.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
