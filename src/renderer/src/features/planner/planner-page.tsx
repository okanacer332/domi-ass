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

const weekdayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const reminderColors: Array<{ value: PlannerReminderColor; label: string }> = [
  { value: "indigo", label: "Lacivert" },
  { value: "amber", label: "Amber" },
  { value: "mint", label: "Mint" },
  { value: "rose", label: "Gül" }
];

type SheetMode = "create-reminder" | "edit-reminder" | "edit-event";
type PlannerViewMode = "month" | "week" | "day";

type PlannerDayView = {
  date: string;
  label: string;
  shortLabel: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  items: PlannerCalendarEvent[];
};

type ReminderFormState = {
  title: string;
  date: string;
  time: string;
  notes: string;
  color: PlannerReminderColor;
  scope: "office" | "client";
  clientId: string;
};

type EventFormState = {
  title: string;
  date: string;
  time: string;
  category: PlannerEventCategory;
  severity: PlannerEventSeverity;
  description: string;
};

const nextMonth = (value: Date, amount: number) =>
  new Date(value.getFullYear(), value.getMonth() + amount, 1);

const addDays = (value: Date, amount: number) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate() + amount);

const toDateKey = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeValue = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const combineDateAndTime = (dateValue: string, timeValue: string) =>
  new Date(`${dateValue}T${timeValue || "09:00"}:00`).toISOString();

const startOfWeek = (value: Date) => {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const weekday = date.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(date, offset);
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

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const formatViewTitle = (viewMode: PlannerViewMode, referenceDate: Date, monthLabel: string) => {
  if (viewMode === "month") {
    return monthLabel;
  }

  if (viewMode === "day") {
    return formatDateHeadline(referenceDate.toISOString());
  }

  const weekStart = startOfWeek(referenceDate);
  const weekEnd = addDays(weekStart, 6);
  const formatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });
  return `${formatter.format(weekStart)} - ${formatter.format(weekEnd)}`;
};

const getEventTone = (event: PlannerCalendarEvent) =>
  event.source === "reminder" && event.color ? `reminder-${event.color}` : `${event.category} ${event.severity}`;

const createEmptyReminderForm = (dateValue: string): ReminderFormState => ({
  title: "",
  date: dateValue,
  time: "09:00",
  notes: "",
  color: "indigo",
  scope: "office",
  clientId: ""
});

const createEmptyEventForm = (dateValue: string): EventFormState => ({
  title: "",
  date: dateValue,
  time: "09:00",
  category: "beyanname",
  severity: "high",
  description: ""
});

const buildDayMap = (events: PlannerCalendarEvent[]) => {
  const map = new Map<string, PlannerCalendarEvent[]>();
  for (const event of events) {
    const key = toDateKey(event.date);
    const current = map.get(key) ?? [];
    current.push(event);
    current.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
    map.set(key, current);
  }
  return map;
};

const buildWeekDays = (referenceDate: Date, eventsByDay: Map<string, PlannerCalendarEvent[]>) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startOfWeek(referenceDate), index);
    const dateKey = toDateKey(date);
    return {
      date: dateKey,
      label: new Intl.DateTimeFormat("tr-TR", {
        weekday: "long",
        day: "2-digit",
        month: "short"
      }).format(date),
      shortLabel: weekdayLabels[index],
      dayNumber: date.getDate(),
      inCurrentMonth: true,
      isToday: dateKey === toDateKey(new Date()),
      items: eventsByDay.get(dateKey) ?? []
    } satisfies PlannerDayView;
  });

const buildSingleDay = (referenceDate: Date, eventsByDay: Map<string, PlannerCalendarEvent[]>) => {
  const dateKey = toDateKey(referenceDate);
  return [
    {
      date: dateKey,
      label: formatDateHeadline(referenceDate.toISOString()),
      shortLabel: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(referenceDate),
      dayNumber: referenceDate.getDate(),
      inCurrentMonth: true,
      isToday: dateKey === toDateKey(new Date()),
      items: eventsByDay.get(dateKey) ?? []
    } satisfies PlannerDayView
  ];
};

export function PlannerPage() {
  const refreshBootstrap = useAppStore((state) => state.refreshBootstrap);
  const [planner, setPlanner] = useState<DashboardPlannerPayload | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [plannerStatus, setPlannerStatus] = useState<"loading" | "ready" | "error">("loading");
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<PlannerViewMode>("month");
  const [savingReminder, setSavingReminder] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("create-reminder");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [dateLocked, setDateLocked] = useState(false);
  const [reminderForm, setReminderForm] = useState<ReminderFormState>(() => createEmptyReminderForm(toDateKey(new Date())));
  const [eventForm, setEventForm] = useState<EventFormState>(() => createEmptyEventForm(toDateKey(new Date())));

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
      setPlannerError(error instanceof Error ? error.message : "Planlama verisi alınamadı.");
    }
  };

  useEffect(() => {
    void loadPlanner(referenceDate);
  }, [referenceDate]);

  const reloadPlanner = async () => {
    const [payload, clientRows] = await Promise.all([
      window.domizanApi.getDashboardPlanner(referenceDate.toISOString()),
      window.domizanApi.listClients()
    ]);
    setPlanner(payload);
    setClients(clientRows.filter((client) => client.status === "active"));
    setPlannerStatus("ready");
    setPlannerError(null);
  };

  const allRecords = useMemo(() => planner?.allEvents ?? [], [planner]);
  const dayMap = useMemo(() => buildDayMap(allRecords), [allRecords]);
  const dayItems = useMemo(() => dayMap.get(selectedDate) ?? [], [dayMap, selectedDate]);
  const visibleDays = useMemo(() => {
    if (!planner) {
      return [] as PlannerDayView[];
    }

    if (viewMode === "month") {
      return planner.calendarDays.map((day) => ({
        date: day.date,
        label: formatPlannerDate(day.date),
        shortLabel: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(
          new Date(day.date)
        ),
        dayNumber: day.dayNumber,
        inCurrentMonth: day.inCurrentMonth,
        isToday: day.isToday,
        items: dayMap.get(day.date) ?? []
      }));
    }

    if (viewMode === "week") {
      return buildWeekDays(referenceDate, dayMap);
    }

    return buildSingleDay(referenceDate, dayMap);
  }, [planner, viewMode, referenceDate, dayMap]);

  const calendarTitle = planner
    ? formatViewTitle(viewMode, referenceDate, planner.monthLabel)
    : "";

  if (plannerStatus === "error" && !planner) {
    return (
      <div className="page-stack">
        <article className="dashboard-summary-card">
          <div className="dashboard-summary-card__head">
            <p className="eyebrow">Planlama</p>
            <AlarmClock size={16} />
          </div>
          <h3>Planlama paneli açılamadı</h3>
          <p>{plannerError ?? "Takvim verisi alınamadı."}</p>
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
          <h3>Planlama paneli yükleniyor</h3>
          <p>Aylık takvim ve kayıtlar hazırlanıyor.</p>
        </article>
      </div>
    );
  }

  const openDaySheet = (dateValue: string) => {
    setSelectedDate(dateValue);
    setDateLocked(true);
    setSheetMode("create-reminder");
    setEditingEventId(null);
    setEditingReminderId(null);
    setReminderForm(createEmptyReminderForm(dateValue));
    setEventForm(createEmptyEventForm(dateValue));
    setEditorExpanded(false);
    setShowSheet(true);
  };

  const openCreateReminderPanel = (dateValue = toDateKey(new Date()), lockedDate = false) => {
    setSelectedDate(dateValue);
    setDateLocked(lockedDate);
    setSheetMode("create-reminder");
    setEditingEventId(null);
    setEditingReminderId(null);
    setReminderForm(createEmptyReminderForm(dateValue));
    setEventForm(createEmptyEventForm(dateValue));
    setEditorExpanded(true);
    setShowSheet(true);
  };

  const startEditEvent = (event: PlannerCalendarEvent) => {
    if (!event.recordId || event.source === "reminder") return;
    const dateValue = toDateKey(event.date);
    setSelectedDate(dateValue);
    setDateLocked(false);
    setSheetMode("edit-event");
    setEditingEventId(event.recordId);
    setEditingReminderId(null);
    setEventForm({
      title: event.title,
      date: dateValue,
      time: toTimeValue(event.date),
      category: event.category,
      severity: event.severity,
      description: event.description ?? ""
    });
    setEditorExpanded(true);
    setShowSheet(true);
  };

  const startEditReminder = (event: PlannerCalendarEvent) => {
    if (!event.recordId || event.source !== "reminder") return;
    const dateValue = toDateKey(event.date);
    setSelectedDate(dateValue);
    setDateLocked(false);
    setSheetMode("edit-reminder");
    setEditingEventId(null);
    setEditingReminderId(event.recordId);
    setReminderForm({
      title: event.title,
      date: dateValue,
      time: toTimeValue(event.date),
      notes: event.description ?? "",
      color: event.color ?? "indigo",
      scope: event.clientId ? "client" : "office",
      clientId: event.clientId ? String(event.clientId) : ""
    });
    setEditorExpanded(true);
    setShowSheet(true);
  };

  const closeSheet = () => {
    setShowSheet(false);
    setEditorExpanded(false);
    setDateLocked(false);
    setSheetMode("create-reminder");
    setEditingEventId(null);
    setEditingReminderId(null);
  };

  const moveReference = (direction: -1 | 1) => {
    if (viewMode === "month") {
      setReferenceDate((current) => nextMonth(current, direction));
      return;
    }

    if (viewMode === "week") {
      setReferenceDate((current) => addDays(current, direction * 7));
      return;
    }

    setReferenceDate((current) => addDays(current, direction));
  };

  const handleReminderCreate = async () => {
    if (!reminderForm.title.trim() || !reminderForm.date) return;

    setSavingReminder(true);
    try {
      const clientId =
        reminderForm.scope === "client" && reminderForm.clientId
          ? Number(reminderForm.clientId)
          : null;

      await window.domizanApi.createPlannerReminder({
        title: reminderForm.title.trim(),
        dueDate: combineDateAndTime(reminderForm.date, reminderForm.time),
        clientId,
        color: reminderForm.color,
        notes: reminderForm.notes.trim() || null
      });

      await Promise.all([reloadPlanner(), refreshBootstrap()]);
      setSelectedDate(reminderForm.date);
      setEditorExpanded(false);
      setReminderForm(createEmptyReminderForm(reminderForm.date));
    } finally {
      setSavingReminder(false);
    }
  };

  const handleReminderUpdate = async () => {
    if (!editingReminderId || !reminderForm.title.trim() || !reminderForm.date) return;

    setSavingReminder(true);
    try {
      const clientId =
        reminderForm.scope === "client" && reminderForm.clientId
          ? Number(reminderForm.clientId)
          : null;

      await window.domizanApi.updatePlannerReminder({
        id: editingReminderId,
        title: reminderForm.title.trim(),
        dueDate: combineDateAndTime(reminderForm.date, reminderForm.time),
        clientId,
        color: reminderForm.color,
        notes: reminderForm.notes.trim() || null
      });

      await Promise.all([reloadPlanner(), refreshBootstrap()]);
      setSelectedDate(reminderForm.date);
      setSheetMode("create-reminder");
      setEditingReminderId(null);
      setEditorExpanded(false);
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
    if (!editingEventId || !eventForm.title.trim() || !eventForm.date) return;

    setSavingEvent(true);
    try {
      await window.domizanApi.updatePlannerEvent({
        id: editingEventId,
        title: eventForm.title.trim(),
        date: combineDateAndTime(eventForm.date, eventForm.time),
        category: eventForm.category,
        severity: eventForm.severity,
        description: eventForm.description.trim() || null
      });

      await reloadPlanner();
      setSelectedDate(eventForm.date);
      setSheetMode("create-reminder");
      setEditingEventId(null);
      setEditorExpanded(false);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEventDelete = async (id: number) => {
    await window.domizanApi.deletePlannerEvent(id);
    await reloadPlanner();
  };

  const renderRecordActions = (record: PlannerCalendarEvent) => {
    if (record.source === "reminder" && record.recordId) {
      return (
        <>
          <button className="table-action-button" onClick={() => startEditReminder(record)} type="button">
            <Pencil size={16} />
          </button>
          {record.reminderStatus === "pending" ? (
            <button
              className="table-action-button"
              onClick={() => void handleReminderStatus(record.recordId as number, "done")}
              type="button"
            >
              <CheckCircle2 size={16} />
            </button>
          ) : (
            <button
              className="table-action-button"
              onClick={() => void handleReminderStatus(record.recordId as number, "pending")}
              type="button"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            className="table-action-button table-action-button--danger"
            onClick={() => void handleReminderDelete(record.recordId as number)}
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </>
      );
    }

    if (record.recordId) {
      return (
        <>
          <button className="table-action-button" onClick={() => startEditEvent(record)} type="button">
            <Pencil size={16} />
          </button>
          <button
            className="table-action-button table-action-button--danger"
            onClick={() => void handleEventDelete(record.recordId as number)}
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </>
      );
    }

    return null;
  };

  return (
    <div className="page-stack page-stack--planner">
      <article className="planner-calendar-card planner-calendar-card--full">
        <div className="planner-calendar-card__head">
          <div className="planner-calendar-card__copy">
            <p className="eyebrow">Planlama</p>
            <h3>{calendarTitle}</h3>
          </div>

          <div className="planner-calendar-card__actions">
            <div className="planner-view-switch">
              {[
                { value: "month", label: "Aylık" },
                { value: "week", label: "Haftalık" },
                { value: "day", label: "Günlük" }
              ].map((view) => (
                <button
                  className={`planner-view-switch__item ${viewMode === view.value ? "is-active" : ""}`}
                  key={view.value}
                  onClick={() => setViewMode(view.value as PlannerViewMode)}
                  type="button"
                >
                  {view.label}
                </button>
              ))}
            </div>

            <div className="planner-month-switcher">
              <button className="secondary-button" onClick={() => moveReference(-1)} type="button">
                <ArrowLeft size={16} />
              </button>
              <button className="secondary-button" onClick={() => setReferenceDate(new Date())} type="button">
                Bugün
              </button>
              <button
                className="secondary-button"
                onClick={() => openCreateReminderPanel(toDateKey(new Date()))}
                type="button"
              >
                <Plus size={16} />
                <span>Yeni kayıt ekle</span>
              </button>
              <button className="secondary-button" onClick={() => moveReference(1)} type="button">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="planner-inline-metrics planner-inline-metrics--compact">
          <div className="planner-inline-metric">
            <span>Geciken</span>
            <strong>{planner.overdueReminderCount}</strong>
          </div>
          <div className="planner-inline-metric">
            <span>Bugün</span>
            <strong>{planner.todayItemCount}</strong>
          </div>
          <div className="planner-inline-metric">
            <span>Sıradaki gün</span>
            <strong>{planner.nextDeadline ? formatPlannerDate(planner.nextDeadline.date) : "-"}</strong>
          </div>
        </div>

        {viewMode === "month" && (
          <>
            <div className="planner-weekdays">
              {weekdayLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="planner-calendar-grid planner-calendar-grid--large">
              {visibleDays.map((day) => (
                <button
                  key={day.date}
                  className={[
                    "planner-day-card",
                    "planner-day-card--large",
                    day.inCurrentMonth ? "" : "is-muted",
                    day.isToday ? "is-today" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => openDaySheet(day.date)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    openDaySheet(day.date);
                  }}
                  type="button"
                >
                  <div className="planner-day-card__head">
                    <strong>{day.dayNumber}</strong>
                    {day.items.length > 0 && <span>{day.items.length}</span>}
                  </div>
                  <div className="planner-day-card__items">
                    {day.items.slice(0, 3).map((item) => (
                      <div key={item.id} className={`planner-event-pill ${getEventTone(item)}`}>
                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {viewMode === "week" && (
          <div className="planner-week-grid">
            {visibleDays.map((day) => (
              <button
                className={`planner-week-card ${day.isToday ? "is-today" : ""}`}
                key={day.date}
                onClick={() => openDaySheet(day.date)}
                type="button"
              >
                <div className="planner-week-card__head">
                  <span>{day.shortLabel}</span>
                  <strong>{day.dayNumber}</strong>
                </div>
                <div className="planner-week-card__items">
                  {day.items.length === 0 ? (
                    <span className="planner-week-card__empty">Kayıt yok</span>
                  ) : (
                    day.items.map((item) => (
                      <div className={`planner-event-pill planner-event-pill--stacked ${getEventTone(item)}`} key={item.id}>
                        <strong>{formatTime(item.date)}</strong>
                        <span>{item.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {viewMode === "day" && visibleDays[0] && (
          <button
            className={`planner-day-focus ${visibleDays[0].isToday ? "is-today" : ""}`}
            onClick={() => openDaySheet(visibleDays[0].date)}
            type="button"
          >
            <div className="planner-day-focus__head">
              <div>
                <p className="eyebrow">Seçili gün</p>
                <h4>{visibleDays[0].label}</h4>
              </div>
              <span className="planner-phase-chip">{visibleDays[0].items.length} kayıt</span>
            </div>

            <div className="planner-day-focus__items">
              {visibleDays[0].items.length === 0 ? (
                <div className="clients-empty-state">
                  <h4>Bugün için kayıt yok</h4>
                  <p>Yeni kayıt ekle butonuyla doğrudan kayıt açabilirsin.</p>
                </div>
              ) : (
                visibleDays[0].items.map((item) => (
                  <div className="planner-day-focus__item" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.description ?? "Açıklama yok"}</span>
                    </div>
                    <span>{formatTime(item.date)}</span>
                  </div>
                ))
              )}
            </div>
          </button>
        )}
      </article>

      <article className="planner-reminder-board">
        <div className="planner-reminder-board__head">
          <div>
            <p className="eyebrow">Tüm kayıtlar</p>
            <h3>{allRecords.length} kayıt</h3>
          </div>
          <span className="planner-phase-chip">Resmi günler + manuel kayıtlar</span>
        </div>

        <div className="planner-reminder-list">
          {allRecords.length === 0 ? (
            <div className="clients-empty-state">
              <h4>Kayıt yok</h4>
              <p>Takvimden gün seçip plan oluşturmaya başlayabilirsin.</p>
            </div>
          ) : (
            allRecords.map((record) => (
              <div key={record.id} className="planner-reminder-item planner-reminder-item--board">
                <div className="planner-reminder-item__main">
                  <div className="planner-reminder-item__title">
                    <span className={`planner-color-dot ${record.color ?? "slate"}`} />
                    <strong>{record.title}</strong>
                    <span
                      className={`planner-reminder-status ${
                        record.source === "reminder"
                          ? record.reminderStatus === "done"
                            ? "done"
                            : "pending"
                          : "system"
                      }`}
                    >
                      {record.source === "reminder"
                        ? record.reminderStatus === "done"
                          ? "Tamamlandı"
                          : "Manuel"
                        : "Resmi"}
                    </span>
                  </div>
                  <p>{record.description ?? "Açıklama yok"}</p>
                </div>
                <div className="planner-reminder-item__meta">
                  <span>{formatPlannerDate(record.date)}</span>
                  <span>{record.clientName || "Tüm mükellefler"}</span>
                  <div className="planner-reminder-item__actions">{renderRecordActions(record)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      {showSheet && (
        <div className="sheet-overlay" role="presentation">
          <div className="sheet-panel planner-sheet">
            <div className="sheet-header">
              <div>
                <p className="eyebrow">Seçili gün</p>
                <h3>{formatDateHeadline(selectedDate)}</h3>
              </div>
              <button aria-label="Kayıt panelini kapat" className="sheet-close-button" onClick={closeSheet} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="planner-sheet__day-list">
              <div className="panel-head panel-head--tight">
                <div>
                  <p className="eyebrow">Aynı gün</p>
                  <h4>{dayItems.length} kayıt</h4>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setSheetMode("create-reminder");
                    setEditingEventId(null);
                    setEditingReminderId(null);
                    setReminderForm(createEmptyReminderForm(selectedDate));
                    setDateLocked(true);
                    setEditorExpanded((current) => !current);
                  }}
                  type="button"
                >
                  <Plus size={16} />
                  <span>Yeni kayıt ekle</span>
                </button>
              </div>

              <div className="planner-reminder-list">
                {dayItems.length === 0 ? (
                  <div className="clients-empty-state">
                    <h4>Bu gün için kayıt yok</h4>
                    <p>İstersen buradan yeni kayıt açabilirsin.</p>
                  </div>
                ) : (
                  dayItems.map((item) => (
                    <div key={item.id} className="planner-reminder-item planner-reminder-item--compact">
                      <div className="planner-reminder-item__main">
                        <div className="planner-reminder-item__title">
                          <span className={`planner-color-dot ${item.color ?? "slate"}`} />
                          <strong>{item.title}</strong>
                          <span
                            className={`planner-reminder-status ${
                              item.source === "reminder"
                                ? item.reminderStatus === "done"
                                  ? "done"
                                  : "pending"
                                : "system"
                            }`}
                          >
                            {item.source === "reminder"
                              ? item.reminderStatus === "done"
                                ? "Tamamlandı"
                                : "Manuel"
                              : "Resmi"}
                          </span>
                        </div>
                        <p>{item.description ?? "Açıklama yok"}</p>
                      </div>
                      <div className="planner-reminder-item__meta">
                        <span>{formatTime(item.date)}</span>
                        <span>{item.clientName || "Tüm mükellefler"}</span>
                        <div className="planner-reminder-item__actions">{renderRecordActions(item)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {editorExpanded && (
              <div className="sheet-form planner-sheet__editor">
                {sheetMode === "edit-event" ? (
                  <>
                    <div className="panel-head panel-head--tight">
                      <div>
                        <p className="eyebrow">Düzenle</p>
                        <h4>Takvim kaydı</h4>
                      </div>
                    </div>
                    <label className="field">
                      <span>Başlık</span>
                      <input onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} placeholder="Örnek: KDV 1" type="text" value={eventForm.title} />
                    </label>
                    <div className="field-grid field-grid--planner">
                      <label className="field">
                        <span>Tarih</span>
                        <input onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))} type="date" value={eventForm.date} />
                      </label>
                      <label className="field">
                        <span>Saat</span>
                        <input onChange={(event) => setEventForm((current) => ({ ...current, time: event.target.value }))} type="time" value={eventForm.time} />
                      </label>
                    </div>
                    <div className="field-grid field-grid--planner">
                      <label className="field">
                        <span>Kategori</span>
                        <select onChange={(event) => setEventForm((current) => ({ ...current, category: event.target.value as PlannerEventCategory }))} value={eventForm.category}>
                          <option value="beyanname">Beyanname</option>
                          <option value="odeme">Ödeme</option>
                          <option value="hatirlatma">Hatırlatma</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Önem</span>
                        <select onChange={(event) => setEventForm((current) => ({ ...current, severity: event.target.value as PlannerEventSeverity }))} value={eventForm.severity}>
                          <option value="high">Yüksek</option>
                          <option value="medium">Orta</option>
                          <option value="low">Düşük</option>
                        </select>
                      </label>
                    </div>
                    <label className="field">
                      <span>Açıklama</span>
                      <textarea onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))} placeholder="Takvim kaydı açıklaması" value={eventForm.description} />
                    </label>
                    <div className="sheet-actions">
                      <button className="secondary-button" onClick={() => setEditorExpanded(false)} type="button">Daralt</button>
                      <button className="primary-button" disabled={savingEvent} onClick={() => void handleEventUpdate()} type="button">
                        <Pencil size={16} />
                        <span>{savingEvent ? "Kaydediliyor" : "Değişiklikleri kaydet"}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel-head panel-head--tight">
                      <div>
                        <p className="eyebrow">{sheetMode === "edit-reminder" ? "Düzenle" : "Yeni kayıt"}</p>
                        <h4>Manuel kayıt</h4>
                      </div>
                    </div>
                    <label className="field">
                      <span>Başlık</span>
                      <input onChange={(event) => setReminderForm((current) => ({ ...current, title: event.target.value }))} placeholder="Örnek: Muhtasar kontrolü" type="text" value={reminderForm.title} />
                    </label>
                    <div className="field-grid field-grid--planner">
                      <label className="field">
                        <span>Tarih</span>
                        <input
                          disabled={dateLocked}
                          onChange={(event) => {
                            setSelectedDate(event.target.value);
                            setReminderForm((current) => ({ ...current, date: event.target.value }));
                          }}
                          type="date"
                          value={reminderForm.date}
                        />
                      </label>
                      <label className="field">
                        <span>Saat</span>
                        <input onChange={(event) => setReminderForm((current) => ({ ...current, time: event.target.value }))} type="time" value={reminderForm.time} />
                      </label>
                    </div>
                    <div className="field-grid field-grid--planner">
                      <label className="field">
                        <span>Renk</span>
                        <select onChange={(event) => setReminderForm((current) => ({ ...current, color: event.target.value as PlannerReminderColor }))} value={reminderForm.color}>
                          {reminderColors.map((color) => (
                            <option key={color.value} value={color.value}>{color.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Kapsam</span>
                        <div className="planner-scope-switch">
                          <button className={`planner-scope-switch__item ${reminderForm.scope === "office" ? "is-active" : ""}`} onClick={() => setReminderForm((current) => ({ ...current, scope: "office", clientId: "" }))} type="button">Tüm mükellefler</button>
                          <button className={`planner-scope-switch__item ${reminderForm.scope === "client" ? "is-active" : ""}`} onClick={() => setReminderForm((current) => ({ ...current, scope: "client" }))} type="button">Mükellef bazlı</button>
                        </div>
                      </label>
                    </div>
                    {reminderForm.scope === "client" && (
                      <label className="field">
                        <span>Mükellef</span>
                        <select onChange={(event) => setReminderForm((current) => ({ ...current, clientId: event.target.value }))} value={reminderForm.clientId}>
                          <option value="">Mükellef seç</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="field">
                      <span>Geniş not</span>
                      <textarea onChange={(event) => setReminderForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Kontrol listesi, açıklama, ekip notu veya belge beklentisi" value={reminderForm.notes} />
                    </label>
                    <div className="sheet-actions">
                      <button className="secondary-button" onClick={() => setEditorExpanded(false)} type="button">Daralt</button>
                      <button className="primary-button" disabled={savingReminder} onClick={() => void (sheetMode === "edit-reminder" ? handleReminderUpdate() : handleReminderCreate())} type="button">
                        <Plus size={16} />
                        <span>{savingReminder ? "Kaydediliyor" : sheetMode === "edit-reminder" ? "Kaydı güncelle" : "Kaydet"}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
