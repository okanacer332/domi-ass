import { BookMarked, FolderTree, Waypoints } from "lucide-react";

import {
  documentMappings,
  mizanClasses,
  mizanRules,
  mizanSummaryCards,
  officeBreakdowns
} from "./mizan-content";

export function MizanPage() {
  return (
    <div className="page-stack">
      <section className="mizan-header">
        <div>
          <p className="eyebrow">Mizan Kodları</p>
          <h3>Mizan yönetimi</h3>
        </div>

        <div className="mizan-header__chips">
          <span className="mizan-header__chip">
            <BookMarked size={16} />
            Tekdüzen omurga
          </span>
          <span className="mizan-header__chip">
            <FolderTree size={16} />
            Ofis alt kodları
          </span>
          <span className="mizan-header__chip">
            <Waypoints size={16} />
            Belge eşleme
          </span>
        </div>
      </section>

      <section className="stats-grid">
        {mizanSummaryCards.map((item) => (
          <article key={item.label} className="stat-card">
            <div className="stat-head">
              <span>{item.label}</span>
            </div>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Ana Kodlar</p>
              <h3>Hesap sınıfları</h3>
            </div>
          </div>

          <div className="mizan-class-grid">
            {mizanClasses.map((item) => (
              <article key={item.code} className="mizan-class-card">
                <div className="mizan-class-card__head">
                  <span className="mizan-class-card__code">{item.code}</span>
                  <h4>{item.title}</h4>
                </div>

                <div className="mizan-chip-list">
                  {item.samples.map((sample) => (
                    <span key={sample} className="mizan-chip">
                      {sample}
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
              <p className="eyebrow">Temel Kurallar</p>
              <h3>Karar mantığı</h3>
            </div>
          </div>

          <div className="task-list">
            {mizanRules.map((rule) => (
              <div key={rule} className="task-item">
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Ofis Kırılımları</p>
              <h3>Alt kod örnekleri</h3>
            </div>
          </div>

          <div className="mizan-route-table-shell">
            <table className="mizan-route-table">
              <thead>
                <tr>
                  <th>Ana kod</th>
                  <th>Ofis kodu</th>
                  <th>Etiket</th>
                </tr>
              </thead>
              <tbody>
                {officeBreakdowns.map((item) => (
                  <tr key={item.officeCode}>
                    <td>{item.baseCode}</td>
                    <td>{item.officeCode}</td>
                    <td>{item.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Belge Eşleme</p>
              <h3>Aday kod yönleri</h3>
            </div>
          </div>

          <div className="mizan-route-table-shell">
            <table className="mizan-route-table">
              <thead>
                <tr>
                  <th>Belge</th>
                  <th>Ana kod</th>
                  <th>Ofis kararı</th>
                </tr>
              </thead>
              <tbody>
                {documentMappings.map((item) => (
                  <tr key={item.documentType}>
                    <td>{item.documentType}</td>
                    <td>{item.primaryCode}</td>
                    <td>{item.officeRule}</td>
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
