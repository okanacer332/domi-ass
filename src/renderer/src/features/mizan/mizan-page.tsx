import { useDeferredValue, useState } from "react";

import { mizanClassLabels, officeBreakdownExamples } from "./mizan-content";
import { tekduzenCodeRows } from "./tekduzen-code-data";

export function MizanPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<"all" | keyof typeof mizanClassLabels>("all");
  const deferredSearch = useDeferredValue(search);

  const filteredRows = tekduzenCodeRows.filter((row) => {
    const matchesClass = classFilter === "all" || row.classCode === classFilter;
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("tr-TR");
    const matchesSearch =
      normalizedSearch.length === 0 ||
      `${row.code} ${row.title}`.toLocaleLowerCase("tr-TR").includes(normalizedSearch);

    return matchesClass && matchesSearch;
  });

  return (
    <div className="page-stack">
      <section className="clients-toolbar mizan-toolbar">
        <div className="clients-toolbar__copy">
          <p className="eyebrow">Mizan Kodları</p>
          <h3>Standart kodlar ve ofis kırılımları</h3>
        </div>
      </section>

      <section className="stats-grid mizan-stats-grid">
        <article className="stat-card">
          <div className="stat-head">
            <span>Standart kod</span>
          </div>
          <strong>{tekduzenCodeRows.length}</strong>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>Filtrelenen</span>
          </div>
          <strong>{filteredRows.length}</strong>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>Ofis alt kırılımı</span>
          </div>
          <strong>3+</strong>
        </article>
      </section>

      <section className="panel">
        <div className="clients-filter-bar mizan-filter-bar">
          <label className="search-box">
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Kod veya hesap adı ara"
              value={search}
            />
          </label>

          <select
            onChange={(event) =>
              setClassFilter(event.target.value as "all" | keyof typeof mizanClassLabels)
            }
            value={classFilter}
          >
            <option value="all">Tüm sınıflar</option>
            {Object.entries(mizanClassLabels).map(([code, title]) => (
              <option key={code} value={code}>
                {code} - {title}
              </option>
            ))}
          </select>
        </div>

        <div className="mizan-route-table-shell mizan-table-shell">
          <table className="mizan-route-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Hesap adı</th>
                <th>Sınıf</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.code}>
                  <td>{row.code}</td>
                  <td>{row.title}</td>
                  <td>{mizanClassLabels[row.classCode] ?? row.classCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Ofis Alt Kırılımları</p>
            <h3>Örnek yapı</h3>
          </div>
        </div>

        <div className="mizan-route-table-shell">
          <table className="mizan-route-table">
            <thead>
              <tr>
                <th>Ana kod</th>
                <th>Hesap adı</th>
                <th>Alt kod</th>
                <th>Detay kod</th>
                <th>Etiket</th>
              </tr>
            </thead>
            <tbody>
              {officeBreakdownExamples.map((item) => (
                <tr key={item.detailCode}>
                  <td>{item.baseCode}</td>
                  <td>{item.baseTitle}</td>
                  <td>{item.officeCode}</td>
                  <td>{item.detailCode}</td>
                  <td>{item.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
