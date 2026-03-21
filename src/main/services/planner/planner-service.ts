import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import type {
  DashboardPlannerPayload,
  PlannerCalendarDay,
  PlannerCalendarEvent,
  PlannerEventRecord,
  PlannerEventUpdateInput,
  PlannerEventCategory,
  PlannerEventSeverity,
  PlannerNoteCreateInput,
  PlannerNoteRecord,
  PlannerReminderCreateInput,
  PlannerReminderRecord,
  PlannerReminderUpdateInput,
  PlannerReminderStatusInput
} from "../../../shared/contracts";
import { getDatabase, persistDatabase } from "../../database/connection";
import { clientsTable, plannerEventsTable, plannerNotesTable, remindersTable } from "../../database/schema";

const reminderCreateSchema = z.object({
  title: z.string().trim().min(2, "Hatirlatici basligi zorunludur."),
  dueDate: z.string().datetime().nullable(),
  clientId: z.number().int().positive().nullable().optional(),
  color: z.enum(["indigo", "amber", "mint", "rose"]),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional()
});

const reminderStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["pending", "done"])
});

const reminderUpdateSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(2, "Hatirlatici basligi zorunludur."),
  dueDate: z.string().datetime().nullable(),
  clientId: z.number().int().positive().nullable().optional(),
  color: z.enum(["indigo", "amber", "mint", "rose"]),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional()
});

const plannerEventUpdateSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(2, "Takvim basligi zorunludur."),
  date: z.string().datetime(),
  category: z.enum(["beyanname", "odeme", "hatirlatma"]),
  severity: z.enum(["high", "medium", "low"]),
  description: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional()
});

const noteCreateSchema = z.object({
  title: z.string().trim().min(2, "Not basligi zorunludur."),
  content: z.string().trim().min(2, "Not icerigi zorunludur."),
  color: z.enum(["indigo", "amber", "mint", "slate"])
});

const referenceDateSchema = z
  .string()
  .datetime()
  .optional()
  .transform((value) => (value ? new Date(value) : new Date()));

const trMonthFormatter = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric"
});

const trDayFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  weekday: "long"
});

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const startOfCalendarGrid = (date: Date) => {
  const monthStart = startOfMonth(date);
  const day = monthStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() - diff);
};

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toEventDate = (year: number, month: number, day: number) =>
  new Date(year, month, day, 12).toISOString();

const toLocalDate = (value: string) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const compareByDate = (left: PlannerCalendarEvent, right: PlannerCalendarEvent) =>
  new Date(left.date).getTime() - new Date(right.date).getTime();

const getSeverityRank = (severity: PlannerEventSeverity) => {
  switch (severity) {
    case "high":
      return 0;
    case "medium":
      return 1;
    default:
      return 2;
  }
};

const mapReminderRow = (
  row: typeof remindersTable.$inferSelect,
  clientName: string | null
): PlannerReminderRecord => ({
  id: row.id,
  clientId: row.clientId ?? null,
  clientName,
  title: row.title,
  dueDate: row.dueDate ?? null,
  status: row.status === "done" ? "done" : "pending",
  channel: row.channel,
  color:
    row.color === "amber" || row.color === "mint" || row.color === "rose" ? row.color : "indigo",
  notes: row.notes ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const mapNoteRow = (row: typeof plannerNotesTable.$inferSelect): PlannerNoteRecord => ({
  id: row.id,
  title: row.title,
  content: row.content,
  color:
    row.color === "amber" || row.color === "mint" || row.color === "slate" ? row.color : "indigo",
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const mapPlannerEventRow = (row: typeof plannerEventsTable.$inferSelect): PlannerEventRecord => ({
  id: row.id,
  title: row.title,
  date: row.date,
  category:
    row.category === "odeme" || row.category === "hatirlatma" ? row.category : "beyanname",
  severity: row.severity === "high" || row.severity === "low" ? row.severity : "medium",
  source: row.source === "system" ? "system" : "manual",
  description: row.description ?? null,
  seedKey: row.seedKey ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const getReminderById = async (id: number) => {
  const db = getDatabase();
  const [row] = await db.select().from(remindersTable).where(eq(remindersTable.id, id)).limit(1);

  if (!row) {
    throw new Error("Hatirlatici bulunamadi.");
  }

  return row;
};

const getNoteById = async (id: number) => {
  const db = getDatabase();
  const [row] = await db.select().from(plannerNotesTable).where(eq(plannerNotesTable.id, id)).limit(1);

  if (!row) {
    throw new Error("Not bulunamadi.");
  }

  return row;
};

const getPlannerEventById = async (id: number) => {
  const db = getDatabase();
  const [row] = await db.select().from(plannerEventsTable).where(eq(plannerEventsTable.id, id)).limit(1);

  if (!row) {
    throw new Error("Takvim kaydi bulunamadi.");
  }

  return row;
};

const buildMonthlySeedRows = (year: number, month: number) => [
  {
    title: "KDV 2",
    date: toEventDate(year, month, 25),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    source: "system" as const,
    description: "Sorumlu sifatiyla KDV beyannamesi icin resmi beyan ve odeme gunu.",
    seedKey: `official-kdv2-${year}-${month + 1}`
  },
  {
    title: "Muhtasar ve Prim Hizmet",
    date: toEventDate(year, month, 26),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    source: "system" as const,
    description: "Muhtasar ve Prim Hizmet Beyannamesi icin resmi beyan ve odeme gunu.",
    seedKey: `official-muhtasar-${year}-${month + 1}`
  },
  {
    title: "Damga Vergisi",
    date: toEventDate(year, month, 26),
    category: "odeme" as PlannerEventCategory,
    severity: "medium" as PlannerEventSeverity,
    source: "system" as const,
    description: "Surekli damga vergisi mukellefleri icin resmi beyan ve odeme gunu.",
    seedKey: `official-damga-${year}-${month + 1}`
  },
  {
    title: "KDV 1",
    date: toEventDate(year, month, 28),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    source: "system" as const,
    description: "Katma Deger Vergisi beyannamesi icin resmi beyan ve odeme gunu.",
    seedKey: `official-kdv1-${year}-${month + 1}`
  }
];

const buildAnnualSeedRows = (year: number) => [
  {
    title: "Yillik Gelir Vergisi",
    date: toEventDate(year, 2, 31),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    source: "system" as const,
    description: "Yillik gelir vergisi beyannamesi icin Mart son gun.",
    seedKey: `official-gelir-${year}`
  },
  {
    title: "Yillik Kurumlar Vergisi",
    date: toEventDate(year, 3, 30),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    source: "system" as const,
    description: "Yillik kurumlar vergisi beyannamesi icin Nisan son gun.",
    seedKey: `official-kurumlar-${year}`
  },
  {
    title: "Gecici Vergi 1. Donem",
    date: toEventDate(year, 4, 17),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    source: "system" as const,
    description: "Ocak-Subat-Mart donemi gecici vergi beyannamesi son gunu.",
    seedKey: `official-gecici-1-${year}`
  },
  {
    title: "Gecici Vergi 2. Donem",
    date: toEventDate(year, 7, 17),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    source: "system" as const,
    description: "Nisan-Mayis-Haziran donemi gecici vergi beyannamesi son gunu.",
    seedKey: `official-gecici-2-${year}`
  },
  {
    title: "Gecici Vergi 3. Donem",
    date: toEventDate(year, 10, 17),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    source: "system" as const,
    description: "Temmuz-Agustos-Eylul donemi gecici vergi beyannamesi son gunu.",
    seedKey: `official-gecici-3-${year}`
  },
  {
    title: "Gecici Vergi 4. Donem",
    date: toEventDate(year + 1, 1, 17),
    category: "beyanname" as PlannerEventCategory,
    severity: "high" as PlannerEventSeverity,
    source: "system" as const,
    description: "Ekim-Kasim-Aralik donemi gecici vergi beyannamesi son gunu.",
    seedKey: `official-gecici-4-${year}`
  }
];

const ensureOfficialPlannerEvents = async (referenceDate: Date) => {
  const db = getDatabase();
  const monthStart = startOfMonth(referenceDate);
  const previousMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const monthlyRows = [previousMonth, monthStart, nextMonth].flatMap((monthDate) =>
    buildMonthlySeedRows(monthDate.getFullYear(), monthDate.getMonth())
  );
  const annualRows = [
    ...buildAnnualSeedRows(referenceDate.getFullYear()),
    ...buildAnnualSeedRows(referenceDate.getFullYear() + 1)
  ];
  const seedRows = [...monthlyRows, ...annualRows];
  const existingRows = await db.select().from(plannerEventsTable);
  const existingSeedKeys = new Set(
    existingRows.map((row) => row.seedKey).filter((seedKey): seedKey is string => Boolean(seedKey))
  );
  const now = new Date().toISOString();

  const missingRows = seedRows.filter((row) => !existingSeedKeys.has(row.seedKey));

  if (missingRows.length === 0) {
    return;
  }

  await db.insert(plannerEventsTable).values(
    missingRows.map((row) => ({
      ...row,
      createdAt: now,
      updatedAt: now
    }))
  );

  persistDatabase();
};

const buildStoredEvents = (eventRows: PlannerEventRecord[]): PlannerCalendarEvent[] =>
  eventRows.map((event) => ({
    id: `planner-event-${event.id}`,
    recordId: event.id,
    title: event.title,
    date: event.date,
    category: event.category,
    severity: event.severity,
    source: event.source,
    description: event.description,
    color: null,
    reminderStatus: null,
    clientId: null,
    clientName: null
  }));

const buildReminderEvents = (reminders: PlannerReminderRecord[]): PlannerCalendarEvent[] =>
  reminders
    .filter((reminder) => reminder.dueDate)
    .map((reminder) => ({
      id: `reminder-${reminder.id}`,
      recordId: reminder.id,
      title: reminder.title,
      date: reminder.dueDate as string,
      category: "hatirlatma",
      severity:
        reminder.status === "done"
          ? "low"
          : new Date(reminder.dueDate as string).getTime() < Date.now()
            ? "high"
            : "medium",
      source: "reminder",
      description: reminder.notes ?? null,
      color: reminder.color,
      reminderStatus: reminder.status,
      clientId: reminder.clientId,
      clientName: reminder.clientName
    }));

const buildCalendarDays = (referenceDate: Date, events: PlannerCalendarEvent[]): PlannerCalendarDay[] => {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const gridStart = startOfCalendarGrid(referenceDate);
  const todayIso = toIsoDate(new Date());
  const eventMap = new Map<string, PlannerCalendarEvent[]>();

  events.forEach((event) => {
    const key = toIsoDate(new Date(event.date));
    const existing = eventMap.get(key) ?? [];
    existing.push(event);
    existing.sort((left, right) => {
      const severityDiff = getSeverityRank(left.severity) - getSeverityRank(right.severity);
      return severityDiff !== 0 ? severityDiff : compareByDate(left, right);
    });
    eventMap.set(key, existing);
  });

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const dateIso = toIsoDate(date);
    const inCurrentMonth = date >= monthStart && date <= monthEnd;

    return {
      date: dateIso,
      dayNumber: date.getDate(),
      inCurrentMonth,
      isToday: dateIso === todayIso,
      items: (eventMap.get(dateIso) ?? []).slice(0, 3)
    };
  });
};

const resolveFocusPhase = (referenceDate: Date) => {
  const day = referenceDate.getDate();

  if (day <= 10) {
    return {
      label: "Evrak toplama",
      text: "Ay basi evrak tamamlama, banka hareketleri ve eksik belge toplama odaginda."
    };
  }

  if (day <= 20) {
    return {
      label: "Kontrol ve mutabakat",
      text: "Cari kontrol, banka-fatura mutabakati ve dosya kapatma yogunlugu bu aralikta yukselir."
    };
  }

  if (day <= 28) {
    return {
      label: "Beyanname yogunlugu",
      text: "KDV, Muhtasar ve diger resmi beyanlar icin en kritik donem."
    };
  }

  return {
    label: "Kapanis ve tahsilat",
    text: "Ay kapanisi, tahsilat kontrolu ve gelecek aya hazirlik odaginda."
  };
};

export const getDashboardPlanner = async (referenceDate?: string): Promise<DashboardPlannerPayload> => {
  const db = getDatabase();
  const resolvedReferenceDate = referenceDateSchema.parse(referenceDate);
  const now = new Date();

  await ensureOfficialPlannerEvents(resolvedReferenceDate);

  const [reminderRows, noteRows, eventRows] = await Promise.all([
    db.select().from(remindersTable).orderBy(desc(remindersTable.updatedAt)),
    db.select().from(plannerNotesTable).orderBy(desc(plannerNotesTable.updatedAt)),
    db.select().from(plannerEventsTable).orderBy(desc(plannerEventsTable.date))
  ]);

  const clientNames = new Map(
    (
      await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable)
    ).map((client) => [client.id, client.name] as const)
  );
  const reminders = reminderRows.map((row) => mapReminderRow(row, row.clientId ? clientNames.get(row.clientId) ?? null : null));
  const notes = noteRows.map(mapNoteRow);
  const plannerEvents = eventRows.map(mapPlannerEventRow);
  const sortedReminders = [...reminders].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "pending" ? -1 : 1;
    }

    if (left.dueDate && right.dueDate) {
      return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
    }

    if (left.dueDate) {
      return -1;
    }

    if (right.dueDate) {
      return 1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
  const storedEvents = buildStoredEvents(plannerEvents);
  const reminderEvents = buildReminderEvents(sortedReminders);
  const allEvents = [...storedEvents, ...reminderEvents].sort(compareByDate);
  const calendarDays = buildCalendarDays(resolvedReferenceDate, allEvents);
  const upcomingEvents = allEvents
    .filter((event) => new Date(event.date).getTime() >= now.getTime())
    .sort((left, right) => {
      const timeDiff = compareByDate(left, right);
      if (timeDiff !== 0) {
        return timeDiff;
      }

      return getSeverityRank(left.severity) - getSeverityRank(right.severity);
    })
    .slice(0, 8);
  const overdueReminderCount = reminders.filter(
    (reminder) =>
      reminder.status === "pending" &&
      reminder.dueDate &&
      new Date(reminder.dueDate).getTime() < now.getTime()
  ).length;
  const todayItemCount = calendarDays.find((day) => day.isToday)?.items.length ?? 0;
  const focusPhase = resolveFocusPhase(resolvedReferenceDate);

  return {
    referenceDate: resolvedReferenceDate.toISOString(),
    monthLabel: trMonthFormatter.format(resolvedReferenceDate),
    focusPhaseLabel: focusPhase.label,
    focusPhaseText: focusPhase.text,
    nextDeadline: upcomingEvents[0] ?? null,
    overdueReminderCount,
    todayItemCount,
    calendarDays,
    allEvents,
    upcomingEvents,
    reminders: sortedReminders,
    notes: notes.slice(0, 8)
  };
};

export const updatePlannerEvent = async (input: PlannerEventUpdateInput): Promise<PlannerEventRecord> => {
  const parsed = plannerEventUpdateSchema.parse(input);
  const db = getDatabase();

  await getPlannerEventById(parsed.id);
  await db
    .update(plannerEventsTable)
    .set({
      title: parsed.title,
      date: parsed.date,
      category: parsed.category,
      severity: parsed.severity,
      description: parsed.description ?? null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(plannerEventsTable.id, parsed.id));

  persistDatabase();
  return mapPlannerEventRow(await getPlannerEventById(parsed.id));
};

export const deletePlannerEvent = async (id: number) => {
  const db = getDatabase();

  await getPlannerEventById(id);
  await db.delete(plannerEventsTable).where(eq(plannerEventsTable.id, id));
  persistDatabase();

  return { deleted: true };
};

export const createPlannerReminder = async (
  input: PlannerReminderCreateInput
): Promise<PlannerReminderRecord> => {
  const parsed = reminderCreateSchema.parse(input);
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.insert(remindersTable).values({
    clientId: parsed.clientId ?? null,
    title: parsed.title,
    dueDate: parsed.dueDate,
    status: "pending",
    channel: "desktop",
    color: parsed.color,
    notes: parsed.notes ?? null,
    createdAt: now,
    updatedAt: now
  });

  persistDatabase();
  const [row] = await db.select().from(remindersTable).orderBy(desc(remindersTable.id)).limit(1);

  if (!row) {
    throw new Error("Hatirlatici kaydi olusturulamadi.");
  }

  return mapReminderRow(row, row.clientId ? await resolveReminderClientName(row.clientId) : null);
};

const resolveReminderClientName = async (clientId: number | null) => {
  if (!clientId) {
    return null;
  }

  const db = getDatabase();
  const [client] = await db
    .select({ name: clientsTable.name })
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId))
    .limit(1);

  return client?.name ?? null;
};

export const updatePlannerReminder = async (
  input: PlannerReminderUpdateInput
): Promise<PlannerReminderRecord> => {
  const parsed = reminderUpdateSchema.parse(input);
  const db = getDatabase();

  await getReminderById(parsed.id);
  await db
    .update(remindersTable)
    .set({
      title: parsed.title,
      dueDate: parsed.dueDate,
      clientId: parsed.clientId ?? null,
      color: parsed.color,
      notes: parsed.notes ?? null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(remindersTable.id, parsed.id));

  persistDatabase();
  const row = await getReminderById(parsed.id);
  return mapReminderRow(row, row.clientId ? await resolveReminderClientName(row.clientId) : null);
};

export const setPlannerReminderStatus = async (
  input: PlannerReminderStatusInput
): Promise<PlannerReminderRecord> => {
  const parsed = reminderStatusSchema.parse(input);
  const db = getDatabase();

  await db
    .update(remindersTable)
    .set({
      status: parsed.status,
      updatedAt: new Date().toISOString()
    })
    .where(eq(remindersTable.id, parsed.id));

  persistDatabase();
  const row = await getReminderById(parsed.id);
  return mapReminderRow(row, row.clientId ? await resolveReminderClientName(row.clientId) : null);
};

export const deletePlannerReminder = async (id: number) => {
  const db = getDatabase();

  await db.delete(remindersTable).where(eq(remindersTable.id, id));
  persistDatabase();

  return { deleted: true };
};

export const createPlannerNote = async (input: PlannerNoteCreateInput): Promise<PlannerNoteRecord> => {
  const parsed = noteCreateSchema.parse(input);
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.insert(plannerNotesTable).values({
    title: parsed.title,
    content: parsed.content,
    color: parsed.color,
    createdAt: now,
    updatedAt: now
  });

  persistDatabase();
  const [row] = await db.select().from(plannerNotesTable).orderBy(desc(plannerNotesTable.id)).limit(1);

  if (!row) {
    throw new Error("Not kaydi olusturulamadi.");
  }

  return mapNoteRow(row);
};

export const deletePlannerNote = async (id: number) => {
  const db = getDatabase();

  await getNoteById(id);
  await db.delete(plannerNotesTable).where(eq(plannerNotesTable.id, id));
  persistDatabase();

  return { deleted: true };
};

export const formatPlannerEventDate = (value: string) => trDayFormatter.format(toLocalDate(value));
