import { useDeferredValue, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";

import type {
  MizanCodeDeleteResult,
  MizanCustomCodeRecord
} from "../../../../shared/contracts";
import { StatePanel } from "../../components/ui/state-panel";
import { mizanClassLabels } from "./mizan-content";
import { tekduzenCodeRows } from "../../../../shared/tekduzen-code-data";

type MizanTableRow = {
  key: string;
  code: string;
  title: string;
  classCode: string;
  parentCode: string | null;
  baseCode: string;
  level: number;
  isCustom: boolean;
  recordId: number | null;
  hasChildren: boolean;
};

type CreateSheetState = {
  parentCode: string;
  parentTitle: string;
  suggestedCode: string;
} | null;

const compareCode = (left: string, right: string) => {
  const leftSegments = left.split(".").map((segment) => Number(segment));
  const rightSegments = right.split(".").map((segment) => Number(segment));
  const length = Math.max(leftSegments.length, rightSegments.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftSegments[index] ?? -1;
    const rightValue = rightSegments[index] ?? -1;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return left.localeCompare(right, "tr");
};

const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase("tr-TR");

const matchesSearch = (code: string, title: string, search: string) =>
  search.length === 0 ||
  `${code} ${title}`.toLocaleLowerCase("tr-TR").includes(search);

const getChildSegmentLength = (parentCode: string) => (parentCode.includes(".") ? 3 : 2);

const buildSuggestedCode = (parentCode: string, customCodes: MizanCustomCodeRecord[]) => {
  const directChildren = customCodes
    .filter((item) => item.parentCode === parentCode)
    .sort((left, right) => compareCode(left.code, right.code));

  const segmentLength = getChildSegmentLength(parentCode);

  if (directChildren.length === 0) {
    return `${parentCode}.${String(1).padStart(segmentLength, "0")}`;
  }

  const nextNumber =
    directChildren.reduce((maxValue, item) => {
      const segments = item.code.split(".");
      const lastSegment = segments[segments.length - 1] ?? "0";
      return Math.max(maxValue, Number(lastSegment));
    }, 0) + 1;

  return `${parentCode}.${String(nextNumber).padStart(segmentLength, "0")}`;
};

const buildExpandedDefaults = (customCodes: MizanCustomCodeRecord[]) => {
  const expanded = new Set<string>();

  customCodes.forEach((item) => {
    expanded.add(item.parentCode);
  });

  return expanded;
};

const buildChildMap = (customCodes: MizanCustomCodeRecord[]) => {
  const childMap = new Map<string, MizanCustomCodeRecord[]>();

  customCodes.forEach((item) => {
    const list = childMap.get(item.parentCode) ?? [];
    list.push(item);
    childMap.set(item.parentCode, list);
  });

  childMap.forEach((list) => {
    list.sort((left, right) => compareCode(left.code, right.code));
  });

  return childMap;
};

const buildTableRows = (
  customCodes: MizanCustomCodeRecord[],
  search: string,
  classFilter: "all" | keyof typeof mizanClassLabels,
  expandedCodes: Set<string>
) => {
  const childMap = buildChildMap(customCodes);
  const searchValue = normalizeSearch(search);
  const forceExpanded = searchValue.length > 0;
  const rows: MizanTableRow[] = [];

  const appendChildren = (parentCode: string) => {
    const children = childMap.get(parentCode) ?? [];

    children.forEach((child) => {
      const hasChildren = childMap.has(child.code);
      const childMatched = matchesSearch(child.code, child.title, searchValue);
      const descendantMatched = customCodes.some(
        (item) =>
          item.code.startsWith(`${child.code}.`) &&
          matchesSearch(item.code, item.title, searchValue)
      );

      if (!searchValue || childMatched || descendantMatched) {
        rows.push({
          key: `custom-${child.id}`,
          code: child.code,
          title: child.title,
          classCode: child.baseCode.slice(0, 1),
          parentCode: child.parentCode,
          baseCode: child.baseCode,
          level: child.level,
          isCustom: true,
          recordId: child.id,
          hasChildren
        });

        if (hasChildren && (forceExpanded || expandedCodes.has(child.code))) {
          appendChildren(child.code);
        }
      }
    });
  };

  tekduzenCodeRows.forEach((row) => {
    if (classFilter !== "all" && row.classCode !== classFilter) {
      return;
    }

    const hasChildren = childMap.has(row.code);
    const standardMatched = matchesSearch(row.code, row.title, searchValue);
    const customMatched = customCodes.some(
      (item) =>
        item.code.startsWith(`${row.code}.`) &&
        matchesSearch(item.code, item.title, searchValue)
    );

    if (searchValue && !standardMatched && !customMatched) {
      return;
    }

    rows.push({
      key: `standard-${row.code}`,
      code: row.code,
      title: row.title,
      classCode: row.classCode,
      parentCode: null,
      baseCode: row.code,
      level: 0,
      isCustom: false,
      recordId: null,
      hasChildren
    });

    if (hasChildren && (forceExpanded || expandedCodes.has(row.code))) {
      appendChildren(row.code);
    }
  });

  return rows;
};

export function MizanPage() {
  const [customCodes, setCustomCodes] = useState<MizanCustomCodeRecord[]>([]);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<"all" | keyof typeof mizanClassLabels>("all");
  const [sheetState, setSheetState] = useState<CreateSheetState>(null);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const loadCustomCodes = async () => {
    setStatus("loading");
    setError(null);

    try {
      const rows = await window.domizanApi.listMizanCodes();
      const sortedRows = rows.sort((left, right) => compareCode(left.code, right.code));
      setCustomCodes(sortedRows);
      setExpandedCodes(buildExpandedDefaults(sortedRows));
      setStatus("ready");
    } catch (loadError) {
      setStatus("error");
      setError(loadError instanceof Error ? loadError.message : "Mizan kodları yüklenemedi.");
    }
  };

  useEffect(() => {
    void loadCustomCodes();
  }, []);

  const tableRows = buildTableRows(customCodes, deferredSearch, classFilter, expandedCodes);

  const toggleExpanded = (code: string) => {
    setExpandedCodes((current) => {
      const next = new Set(current);

      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }

      return next;
    });
  };

  const openCreateSheet = (row: MizanTableRow) => {
    const suggestedCode = buildSuggestedCode(row.code, customCodes);

    setSheetState({
      parentCode: row.code,
      parentTitle: row.title,
      suggestedCode
    });
    setNewCode(suggestedCode);
    setNewTitle("");
    setActionError(null);
    setActionSuccess(null);
  };

  const closeSheet = () => {
    setSheetState(null);
    setNewCode("");
    setNewTitle("");
    setActionError(null);
  };

  const handleCreateCode = async () => {
    if (!sheetState) {
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      const created = await window.domizanApi.createMizanCode({
        parentCode: sheetState.parentCode,
        code: newCode,
        title: newTitle
      });

      const nextRows = [...customCodes, created].sort((left, right) => compareCode(left.code, right.code));
      setCustomCodes(nextRows);
      setExpandedCodes((current) => {
        const next = new Set(current);
        next.add(sheetState.parentCode);
        return next;
      });
      setActionSuccess(`${created.code} oluşturuldu.`);
      closeSheet();
    } catch (createError) {
      setActionError(
        createError instanceof Error ? createError.message : "Mizan kodu oluşturulamadı."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCode = async (row: MizanTableRow) => {
    if (!row.recordId) {
      return;
    }

    const confirmed = window.confirm(
      `${row.code} kodunu ve alt kayıtlarını silmek istediğine emin misin?`
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    try {
      const result: MizanCodeDeleteResult = await window.domizanApi.deleteMizanCode(row.recordId);
      const nextRows = customCodes.filter(
        (item) => item.code !== row.code && !item.code.startsWith(`${row.code}.`)
      );

      setCustomCodes(nextRows);
      setActionSuccess(`${result.deletedCount} kayıt silindi.`);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : "Mizan kodu silinemedi."
      );
    }
  };

  if (status === "loading") {
    return (
      <StatePanel
        eyebrow="Yükleniyor"
        title="Mizan kodları hazırlanıyor"
        description="Standart hesap planı ve ofis kırılımları yükleniyor."
      />
    );
  }

  if (status === "error") {
    return (
      <StatePanel
        eyebrow="Hata"
        title="Mizan kodları yüklenemedi"
        description={error ?? "Beklenmeyen hata"}
      />
    );
  }

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
            <span>Ofis kodu</span>
          </div>
          <strong>{customCodes.length}</strong>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>Görünen satır</span>
          </div>
          <strong>{tableRows.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="clients-filter-bar mizan-filter-bar">
          <label className="search-box search-box--mizan">
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Kod veya hesap adı ara"
              value={search}
            />
          </label>

          <select
            className="mizan-filter-select"
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

        {actionError && <div className="inline-error">{actionError}</div>}
        {actionSuccess && <div className="inline-success">{actionSuccess}</div>}

        <div className="mizan-route-table-shell mizan-table-shell">
          <table className="mizan-route-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Hesap adı</th>
                <th>Sınıf</th>
                <th>Tür</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const isExpanded = expandedCodes.has(row.code);

                return (
                  <tr key={row.key} className={row.isCustom ? "mizan-row mizan-row--custom" : "mizan-row"}>
                    <td>
                      <div className="mizan-code-cell" style={{ paddingLeft: `${row.level * 20}px` }}>
                        {row.hasChildren ? (
                          <button
                            className="mizan-toggle-button"
                            onClick={() => toggleExpanded(row.code)}
                            type="button"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        ) : (
                          <span className="mizan-toggle-spacer" />
                        )}
                        <strong>{row.code}</strong>
                      </div>
                    </td>
                    <td>{row.title}</td>
                    <td>{mizanClassLabels[row.classCode] ?? row.classCode}</td>
                    <td>
                      <span className={`mizan-row-kind ${row.isCustom ? "custom" : "standard"}`}>
                        {row.isCustom ? "Ofis" : "Standart"}
                      </span>
                    </td>
                    <td>
                      <div className="mizan-actions">
                        <button
                          className="table-action-button"
                          onClick={() => openCreateSheet(row)}
                          type="button"
                        >
                          <Plus size={16} />
                          <span>Kod ekle</span>
                        </button>

                        {row.isCustom && (
                          <button
                            className="table-action-button table-action-button--danger"
                            onClick={() => void handleDeleteCode(row)}
                            type="button"
                          >
                            <Trash2 size={16} />
                            <span>Sil</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {sheetState && (
        <div className="sheet-overlay" role="presentation">
          <section className="sheet-panel">
            <header className="sheet-header">
              <div>
                <p className="eyebrow">Yeni Mizan Kodu</p>
                <h3>Kod ekle</h3>
              </div>

              <button className="sheet-close-button" onClick={closeSheet} type="button">
                <X size={18} />
              </button>
            </header>

            <div className="mizan-create-summary">
              <span>Üst kod</span>
              <strong>{sheetState.parentCode}</strong>
              <p>{sheetState.parentTitle}</p>
            </div>

            <div className="sheet-form">
              <label className="field">
                <span>Yeni kod</span>
                <input
                  onChange={(event) => setNewCode(event.target.value)}
                  placeholder={sheetState.suggestedCode}
                  value={newCode}
                />
              </label>

              <label className="field">
                <span>Kod adı</span>
                <input
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Yeni hesap adı"
                  value={newTitle}
                />
              </label>
            </div>

            {actionError && <div className="inline-error">{actionError}</div>}

            <div className="sheet-actions">
              <button className="secondary-button" onClick={closeSheet} type="button">
                Vazgeç
              </button>
              <button
                className="primary-button"
                disabled={submitting || newCode.trim().length === 0 || newTitle.trim().length === 0}
                onClick={() => void handleCreateCode()}
                type="button"
              >
                {submitting ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
