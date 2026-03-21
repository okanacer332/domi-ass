import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X
} from "lucide-react";

import type {
  ClientRecord,
  DashboardPlannerPayload,
  PlannerCalendarEvent,
  PlannerEventCategory,
  PlannerEventSeverity,
  PlannerReminderColor
} from "../../../../shared/contracts";
import { useAppStore } from "../app/app-store";

const weekdayLabels = ["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"];
const reminderColors: Array<{ value: PlannerReminderColor; label: string }> = [
  { value: "indigo", label: "Lacivert" },
  { value: "amber", label: "Amber" },
  { value: "mint", label: "Mint" },
  { value: "rose", label: "Gul" }
];

type SheetMode = "create-reminder" | "edit-reminder" | "edit-event";

const nextMonth = (value: Date, amount: number) =>
  new Date(value.getFullYear(), value.getMonth() + amount, 1);

const toDateTimeLocalValue = (value: Date) => {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const formatPlannerDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    weekday: "short"
  }).format(new Date(value));

const formatDateHeadline = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    weekday: "long"
  }).format(new Date(value));

const getEventTone = (event: PlannerCalendarEvent) =>
  event.source === "reminder" && event.color ? `reminder-${event.color}` : `${event.category} ${event.severity}`;

const buildSelectedDateValue = (dateOnly: string) => `${dateOnly}T09:00`;

const createEmptyReminderForm = (dateValue: string) => ({
  title: "",
  dueDate: dateValue,
  notes: "",
  color: "indigo" as PlannerReminderColor,
  scope: "office" as "office" | "client",
  clientId: ""
});

export function PlannerPage() {
  const refreshBootstrap = useAppStore((state) => state.refreshBootstrap);
  const [planner, setPlanner] = useState<DashboardPlannerPayload | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [plannerStatus, setPlannerStatus] = useState<"loading" | "ready" | "error">("loading");
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [referenceMonth, setReferenceMonth] = useState(() => new Date());
  const [savingReminder, setSavingReminder] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("create-reminder");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateTimeLocalValue(new Date()));
  const [reminderForm, setReminderForm] = useState(() =>
    createEmptyReminderForm(toDateTimeLocalValue(new Date(Date.now() + 86400000)))
  );
  const [eventForm, setEventForm] = useState({
    title: "",
    date: toDateTimeLocalValue(new Date()),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    description: ""
  });

  const loadPlanner = async (date: Date) => {
    setPlannerStatus("loading");
    setPlannerError(null);
    try {
      const [payload, clientRows] = await Promise.all([
        window.domizanApi.getDashboardPlanner(date.toISOString()),
        window.domizanApi.listClients()
      ]);
      setPlanner(payload);
      setClients(clientRows.filter((client) => client.status === "active"));
      setPlannerStatus("ready");
    } catch (error) {
      setPlannerStatus("error");
      setPlannerError(error instanceof Error ? error.message : "Planlama verisi alinamadi.");
    }
  };

  useEffect(() => {
    void loadPlanner(referenceMonth);
  }, [referenceMonth]);

  const reloadPlanner = async () => {
    const [payload, clientRows] = await Promise.all([
      window.domizanApi.getDashboardPlanner(referenceMonth.toISOString()),
      window.domizanApi.listClients()
    ]);
    setPlanner(payload);
    setClients(clientRows.filter((client) => client.status === "active"));
    setPlannerStatus("ready");
    setPlannerError(null);
  };

  const openCreateReminderSheet = (dateValue?: string) => {
    const nextDate = dateValue ? buildSelectedDateValue(dateValue) : toDateTimeLocalValue(new Date());
    setSelectedDate(nextDate);
    setSheetMode("create-reminder");
    setEditingEventId(null);
    setEditingReminderId(null);
    setReminderForm(createEmptyReminderForm(nextDate));
    setShowReminderSheet(true);
  };

  const startEditEvent = (event: PlannerCalendarEvent) => {
    if (!event.recordId || event.source === "reminder") return;
    const dateValue = toDateTimeLocalValue(new Date(event.date));
    setSelectedDate(dateValue);
    setSheetMode("edit-event");
    setEditingEventId(event.recordId);
    setEditingReminderId(null);
    setEventForm({
      title: event.title,
      date: dateValue,
      category: event.category,
      severity: event.severity,
      description: event.description ?? ""
    });
    setShowReminderSheet(true);
  };

  const startEditReminder = (event: PlannerCalendarEvent) => {
    if (!event.recordId || event.source !== "reminder") return;
    const dateValue = toDateTimeLocalValue(new Date(event.date));
    setSelectedDate(dateValue);
    setSheetMode("edit-reminder");
    setEditingEventId(null);
    setEditingReminderId(event.recordId);
    setReminderForm({
      title: event.title,
      dueDate: dateValue,
      notes: event.description ?? "",
      color: event.color ?? "indigo",
      scope: event.clientId ? "client" : "office",
      clientId: event.clientId ? String(event.clientId) : ""
    });
    setShowReminderSheet(true);
  };

  const closeReminderSheet = () => {
    setShowReminderSheet(false);
    setSheetMode("create-reminder");
    setEditingEventId(null);
    setEditingReminderId(null);
    setReminderForm(createEmptyReminderForm(selectedDate));
    setEventForm({
      title: "",
      date: selectedDate,
      category: "beyanname",
      severity: "high",
      description: ""
    });
  };

  const allRecords = useMemo(() => planner?.allEvents ?? [], [planner]);
  const dayItems = useMemo(
    () => allRecords.filter((event) => event.date.slice(0, 10) === selectedDate.slice(0, 10)),
    [allRecords, selectedDate]
  );

  if (plannerStatus === "error" && !planner) {
    return (
      <div className="page-stack">
        <article className="dashboard-summary-card">
          <div className="dashboard-summary-card__head">
            <p className="eyebrow">Planlama</p>
            <AlarmClock size={16} />
          </div>
          <h3>Planlama paneli acilamadi</h3>
          <p>{plannerError ?? "Takvim verisi alinamadi."}</p>
        </article>
      </div>
    );
  }

  if (!planner) {
    return (
      <div className="page-stack">
        <article className="dashboard-summary-card">
          <div className="dashboard-summary-card__head">
            <p className="eyebrow">Planlama</p>
            <AlarmClock size={16} />
          </div>
          <h3>Planlama paneli yukleniyor</h3>
          <p>Aylik takvim ve hatirlaticilar hazirlaniyor.</p>
        </article>
      </div>
    );
  }

  const handleReminderCreate = async () => {
    if (!reminderForm.title.trim()) return;
    setSavingReminder(true);
    try {
      const clientId =
        reminderForm.scope === "client" && reminderForm.clientId
          ? Number(reminderForm.clientId)
          : null;
      await window.domizanApi.createPlannerReminder({
        title: reminderForm.title.trim(),
        dueDate: reminderForm.dueDate ? new Date(reminderForm.dueDate).toISOString() : null,
        clientId,
        color: reminderForm.color,
        notes: reminderForm.notes.trim() || null
      });
      await Promise.all([reloadPlanner(), refreshBootstrap()]);
      closeReminderSheet();
    } finally {
      setSavingReminder(false);
    }
  };

  const handleReminderUpdate = async () => {
    if (!editingReminderId || !reminderForm.title.trim()) return;
    setSavingReminder(true);
    try {
      const clientId =
        reminderForm.scope === "client" && reminderForm.clientId
          ? Number(reminderForm.clientId)
          : null;
      await window.domizanApi.updatePlannerReminder({
        id: editingReminderId,
        title: reminderForm.title.trim(),
        dueDate: reminderForm.dueDate ? new Date(reminderForm.dueDate).toISOString() : null,
        clientId,
        color: reminderForm.color,
        notes: reminderForm.notes.trim() || null
      });
      await Promise.all([reloadPlanner(), refreshBootstrap()]);
      closeReminderSheet();
    } finally {
      setSavingReminder(false);
    }
  };

  const handleReminderStatus = async (id: number, status: "pending" | "done") => {
    await window.domizanApi.setPlannerReminderStatus({ id, status });
    await Promise.all([reloadPlanner(), refreshBootstrap()]);
  };

  const handleReminderDelete = async (id: number) => {
    await window.domizanApi.deletePlannerReminder(id);
    await Promise.all([reloadPlanner(), refreshBootstrap()]);
  };

  const handleEventUpdate = async () => {
    if (!editingEventId || !eventForm.title.trim()) return;
    setSavingEvent(true);
    try {
      await window.domizanApi.updatePlannerEvent({
        id: editingEventId,
        title: eventForm.title.trim(),
        date: new Date(eventForm.date).toISOString(),
        category: eventForm.category,
        severity: eventForm.severity,
        description: eventForm.description.trim() || null
      });
      await reloadPlanner();
      closeReminderSheet();
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEventDelete = async (id: number) => {
    await window.domizanApi.deletePlannerEvent(id);
    await reloadPlanner();
  };

  return (
    <div className="page-stack page-stack--planner">
      <article className="planner-calendar-card planner-calendar-card--full">
        <div className="planner-calendar-card__head">
          <div className="planner-calendar-card__copy">
            <p className="eyebrow">Planlama</p>
            <h3>{planner.monthLabel}</h3>
          </div>

          <div className="planner-calendar-card__actions">
            <span className="planner-phase-chip">{planner.focusPhaseLabel}</span>

            <div className="planner-month-switcher">
              <button className="secondary-button" onClick={() => setReferenceMonth((current) => nextMonth(current, -1))} type="button">
                <ArrowLeft size={16} />
              </button>
              <button className="secondary-button" onClick={() => setReferenceMonth(new Date())} type="button">
                Bugun
              </button>
              <button className="secondary-button" onClick={() => openCreateReminderSheet()} type="button">
                <Plus size={16} />
                <span>Hatirlatici</span>
              </button>
              <button className="secondary-button" onClick={() => setReferenceMonth((current) => nextMonth(current, 1))} type="button">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="planner-inline-metrics">
          <div className="planner-inline-metric"><span>Geciken</span><strong>{planner.overdueReminderCount}</strong></div>
          <div className="planner-inline-metric"><span>Bugun</span><strong>{planner.todayItemCount}</strong></div>
          <div className="planner-inline-metric"><span>Siradaki gun</span><strong>{planner.nextDeadline ? formatPlannerDate(planner.nextDeadline.date) : "-"}</strong></div>
        </div>

        <div className="planner-weekdays">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="planner-calendar-grid planner-calendar-grid--large">
          {planner.calendarDays.map((day) => (
            <button
              key={day.date}
              className={["planner-day-card", "planner-day-card--large", day.inCurrentMonth ? "" : "is-muted", day.isToday ? "is-today" : ""].filter(Boolean).join(" ")}
              onClick={() => openCreateReminderSheet(day.date)}
              onContextMenu={(event) => {
                event.preventDefault();
                openCreateReminderSheet(day.date);
              }}
              type="button"
            >
              <div className="planner-day-card__head">
                <strong>{day.dayNumber}</strong>
                {day.items.length > 0 && <span>{day.items.length}</span>}
              </div>
              <div className="planner-day-card__items">
                {day.items.map((item) => (
                  <div key={item.id} className={`planner-event-pill ${getEventTone(item)}`}>
                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </article>

      <article className="planner-reminder-board">
        <div className="planner-reminder-board__head">
          <div>
            <p className="eyebrow">Tum kayitlar</p>
            <h3>{allRecords.length} kayit</h3>
          </div>
          <span className="planner-phase-chip">Resmi gunler + manuel hatirlaticilar</span>
        </div>

        <div className="planner-reminder-list">
          {allRecords.length === 0 && (
            <div className="clients-empty-state">
              <h4>Kayit yok</h4>
              <p>Takvimde bir gune tiklayip ya da sag tiklayip yeni kayit acabilirsin.</p>
            </div>
          )}

          {allRecords.map((record) => (
            <div key={record.id} className="planner-reminder-item planner-reminder-item--board">
              <div className="planner-reminder-item__main">
                <div className="planner-reminder-item__title">
                  <span className={`planner-color-dot ${record.color ?? "slate"}`} />
                  <strong>{record.title}</strong>
                  <span className={`planner-reminder-status ${record.source === "reminder" ? record.reminderStatus === "done" ? "done" : "pending" : "system"}`}>
                    {record.source === "reminder" ? record.reminderStatus === "done" ? "Tamamlandi" : "Manuel" : "Resmi"}
                  </span>
                </div>
                <p>{record.description ?? "Aciklama yok"}</p>
              </div>

              <div className="planner-reminder-item__meta">
                <span>{formatPlannerDate(record.date)}</span>
                <span>{record.clientName ? record.clientName : "Tum mukellefler"}</span>
                <div className="planner-reminder-item__actions">
                  {record.source === "reminder" && record.recordId ? (
                    <>
                      <button className="table-action-button" onClick={() => startEditReminder(record)} type="button"><Pencil size={16} /></button>
                      {record.reminderStatus === "pending" ? (
                        <button className="table-action-button" onClick={() => void handleReminderStatus(record.recordId as number, "done")} type="button"><CheckCircle2 size={16} /></button>
                      ) : (
                        <button className="table-action-button" onClick={() => void handleReminderStatus(record.recordId as number, "pending")} type="button"><RotateCcw size={16} /></button>
                      )}
                      <button className="table-action-button table-action-button--danger" onClick={() => void handleReminderDelete(record.recordId as number)} type="button"><Trash2 size={16} /></button>
                    </>
                  ) : record.recordId ? (
                    <>
                      <button className="table-action-button" onClick={() => startEditEvent(record)} type="button"><Pencil size={16} /></button>
                      <button className="table-action-button table-action-button--danger" onClick={() => void handleEventDelete(record.recordId as number)} type="button"><Trash2 size={16} /></button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>

      {showReminderSheet && (
        <div className="sheet-overlay" role="presentation">
          <div className="sheet-panel planner-sheet">
            <div className="sheet-header">
              <div>
                <p className="eyebrow">Takvim gunu</p>
                <h3>{formatDateHeadline(selectedDate)}</h3>
              </div>
              <button aria-label="Hatirlatici panelini kapat" className="sheet-close-button" onClick={closeReminderSheet} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="sheet-form">
              {sheetMode === "edit-event" ? (
                <>
                  <label className="field"><span>Baslik</span><input onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ornek: KDV 1" type="text" value={eventForm.title} /></label>
                  <label className="field"><span>Tarih</span><input onChange={(event) => { setSelectedDate(event.target.value); setEventForm((current) => ({ ...current, date: event.target.value })); }} type="datetime-local" value={eventForm.date} /></label>
                  <div className="field-grid">
                    <label className="field"><span>Kategori</span><select onChange={(event) => setEventForm((current) => ({ ...current, category: event.target.value as PlannerEventCategory }))} value={eventForm.category}><option value="beyanname">Beyanname</option><option value="odeme">Odeme</option><option value="hatirlatma">Hatirlatma</option></select></label>
                    <label className="field"><span>Onem</span><select onChange={(event) => setEventForm((current) => ({ ...current, severity: event.target.value as PlannerEventSeverity }))} value={eventForm.severity}><option value="high">Yuksek</option><option value="medium">Orta</option><option value="low">Dusuk</option></select></label>
                  </div>
                  <label className="field"><span>Aciklama</span><textarea onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))} placeholder="Takvim aciklamasi" value={eventForm.description} /></label>
                  <div className="sheet-actions">
                    <button className="secondary-button" onClick={closeReminderSheet} type="button">Vazgec</button>
                    <button className="primary-button" disabled={savingEvent} onClick={() => void handleEventUpdate()} type="button"><Pencil size={16} /><span>{savingEvent ? "Kaydediliyor" : "Degisiklikleri kaydet"}</span></button>
                  </div>
                </>
              ) : (
                <>
                  <label className="field"><span>Baslik</span><input onChange={(event) => setReminderForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ornek: Muhtasar kontrolu" type="text" value={reminderForm.title} /></label>
                  <label className="field"><span>Tarih</span><input onChange={(event) => { setSelectedDate(event.target.value); setReminderForm((current) => ({ ...current, dueDate: event.target.value })); }} type="datetime-local" value={reminderForm.dueDate} /></label>
                  <div className="field-grid">
                    <label className="field"><span>Renk</span><select onChange={(event) => setReminderForm((current) => ({ ...current, color: event.target.value as PlannerReminderColor }))} value={reminderForm.color}>{reminderColors.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}</select></label>
                    <label className="field"><span>Kapsam</span><div className="planner-scope-switch"><button className={`planner-scope-switch__item ${reminderForm.scope === "office" ? "is-active" : ""}`} onClick={() => setReminderForm((current) => ({ ...current, scope: "office", clientId: "" }))} type="button">Tum mukellefler</button><button className={`planner-scope-switch__item ${reminderForm.scope === "client" ? "is-active" : ""}`} onClick={() => setReminderForm((current) => ({ ...current, scope: "client" }))} type="button">Mukellef bazli</button></div></label>
                  </div>
                  {reminderForm.scope === "client" && (
                    <label className="field"><span>Mukellef</span><select onChange={(event) => setReminderForm((current) => ({ ...current, clientId: event.target.value }))} value={reminderForm.clientId}><option value="">Mukellef sec</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
                  )}
                  <label className="field"><span>Genis not</span><textarea onChange={(event) => setReminderForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Kontrol listesi, aciklama, evrak beklentisi veya ekip notu" value={reminderForm.notes} /></label>
                  <div className="sheet-actions">
                    <button className="secondary-button" onClick={closeReminderSheet} type="button">Vazgec</button>
                    <button className="primary-button" disabled={savingReminder} onClick={() => void (sheetMode === "edit-reminder" ? handleReminderUpdate() : handleReminderCreate())} type="button"><Plus size={16} /><span>{savingReminder ? "Kaydediliyor" : sheetMode === "edit-reminder" ? "Hatirlaticiyi guncelle" : "Kaydet"}</span></button>
                  </div>
                </>
              )}
            </div>

            <div className="planner-sheet__day-list">
              <div className="panel-head"><div><p className="eyebrow">Ayni gun</p><h4>{dayItems.length} kayit</h4></div></div>
              <div className="planner-reminder-list">
                {dayItems.length === 0 && <div className="clients-empty-state"><h4>Bu gun icin kayit yok</h4><p>Formu doldurup dogrudan bu gunun hatirlaticisini ekleyebilirsin.</p></div>}
                {dayItems.map((item) => (
                  <div key={item.id} className="planner-reminder-item planner-reminder-item--compact">
                    <div className="planner-reminder-item__main">
                      <div className="planner-reminder-item__title">
                        <span className={`planner-color-dot ${item.color ?? "slate"}`} />
                        <strong>{item.title}</strong>
                        <span className={`planner-reminder-status ${item.source === "reminder" ? item.reminderStatus === "done" ? "done" : "pending" : "system"}`}>
                          {item.source === "reminder" ? item.reminderStatus === "done" ? "Tamamlandi" : "Manuel" : "Resmi"}
                        </span>
                      </div>
                      <p>{item.description ?? "Aciklama yok"}</p>
                    </div>
                    <div className="planner-reminder-item__meta">
                      <span>{item.clientName ? item.clientName : "Tum mukellefler"}</span>
                      <div className="planner-reminder-item__actions">
                        {item.source === "reminder" && item.recordId ? (
                          <>
                            <button className="table-action-button" onClick={() => startEditReminder(item)} type="button"><Pencil size={16} /></button>
                            {item.reminderStatus === "pending" ? (
                              <button className="table-action-button" onClick={() => void handleReminderStatus(item.recordId as number, "done")} type="button"><CheckCircle2 size={16} /></button>
                            ) : (
                              <button className="table-action-button" onClick={() => void handleReminderStatus(item.recordId as number, "pending")} type="button"><RotateCcw size={16} /></button>
                            )}
                            <button className="table-action-button table-action-button--danger" onClick={() => void handleReminderDelete(item.recordId as number)} type="button"><Trash2 size={16} /></button>
                          </>
                        ) : item.recordId ? (
                          <>
                            <button className="table-action-button" onClick={() => startEditEvent(item)} type="button"><Pencil size={16} /></button>
                            <button className="table-action-button table-action-button--danger" onClick={() => void handleEventDelete(item.recordId as number)} type="button"><Trash2 size={16} /></button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
