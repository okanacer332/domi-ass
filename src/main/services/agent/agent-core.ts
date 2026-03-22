import os from "node:os";
import { desc, eq } from "drizzle-orm";

import type {
  AgentChannel,
  AgentChatRequest,
  AgentChatResponse,
  AgentMessageRecord,
  AgentStatusSnapshot,
  ClientRecord,
  PlannerCalendarEvent
} from "../../../shared/contracts";
import { getDatabase, persistDatabase } from "../../database/connection";
import { agentMessagesTable, documentsTable, remindersTable } from "../../database/schema";
import { listClients } from "../clients/client-service";
import { listInboxDocuments } from "../inbox/inbox-service";
import { getAccessSnapshot } from "../licensing/access-service";
import { getWorkspaceProfile } from "../onboarding/workspace-service";
import { getDashboardPlanner } from "../planner/planner-service";
import { generateWithGemini } from "./gemini-service";
import { getResolvedGeminiKey, getAgentStatusSnapshot } from "./agent-state";
import { registerRemoteAgentUsage } from "./agent-backend";

type AgentPromptKind =
  | "daily_brief"
  | "official_gazette"
  | "client_status"
  | "client_count"
  | "inbox_summary"
  | "planner_summary"
  | "general";

type OfficeContext = {
  officeName: string | null;
  ownerName: string | null;
  accessMode: string;
  trialDaysLeft: number;
  licenseExpiresAt: string | null;
  clientCount: number;
  activeClientCount: number;
  passiveClientCount: number;
  waitingInboxCount: number;
  reviewInboxCount: number;
  overdueReminderCount: number;
  todayItemCount: number;
  nextDeadline: PlannerCalendarEvent | null;
  upcomingEvents: PlannerCalendarEvent[];
  latestInbox: ReturnType<typeof summarizeInboxRows>;
};

const CLIENT_QUERY_STOP_WORDS = new Set([
  "mukellef",
  "mukellefin",
  "mukellefler",
  "mukelleflerin",
  "sayisi",
  "kac",
  "ne",
  "nedir",
  "kim",
  "hangi",
  "var",
  "durumu",
  "durum",
  "vkn",
  "tckn",
  "tc",
  "kimlik",
  "numarasi",
  "vergi",
  "no",
  "nin",
  "nın",
  "nun",
  "nün",
  "si",
  "sı",
  "su",
  "bu",
  "bir",
  "ile",
  "icin"
]);

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");

const tokenizeText = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
};

const summarizeInboxRows = (rows: Awaited<ReturnType<typeof listInboxDocuments>>) =>
  rows.slice(0, 5).map((row) => ({
    id: row.id,
    name: row.originalName,
    status: row.analysisStatus,
    detectedType: row.detectedType,
    matchedClientName: row.matchedClientName,
    suggestedFolder: row.suggestedFolder,
    summary: row.analysisSummary
  }));

const mapAgentMessageRow = (row: typeof agentMessagesTable.$inferSelect): AgentMessageRecord => ({
  id: row.id,
  channel: row.channel === "telegram" ? "telegram" : "desktop",
  role: row.role === "assistant" || row.role === "system" ? row.role : "user",
  content: row.content,
  meta: row.meta ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const saveMessage = async (
  channel: AgentChannel,
  role: AgentMessageRecord["role"],
  content: string,
  meta?: Record<string, unknown> | null
) => {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.insert(agentMessagesTable).values({
    channel,
    role,
    content,
    meta: meta ? JSON.stringify(meta) : null,
    createdAt: now,
    updatedAt: now
  });
  persistDatabase();

  const [row] = await db.select().from(agentMessagesTable).orderBy(desc(agentMessagesTable.id)).limit(1);
  if (!row) {
    throw new Error("Agent mesaji kaydedilemedi.");
  }

  return mapAgentMessageRow(row);
};

const detectPromptKind = (message: string): AgentPromptKind => {
  const normalized = normalizeText(message);

  if (
    normalized.includes("gunluk brif") ||
    normalized.includes("/brief") ||
    normalized.includes("bugun ne var")
  ) {
    return "daily_brief";
  }

  if (normalized.includes("resmi gazete")) {
    return "official_gazette";
  }

  if (
    normalized.includes("mukellef sayisi") ||
    normalized.includes("kac mukellef") ||
    normalized.includes("toplam mukellef")
  ) {
    return "client_count";
  }

  if (normalized.includes("eksik belge") || normalized.includes("gelen kutusu")) {
    return "inbox_summary";
  }

  if (normalized.includes("takvim") || normalized.includes("planlama") || normalized.includes("hatirlat")) {
    return "planner_summary";
  }

  if (
    normalized.includes("mukellef") ||
    normalized.includes("musteri") ||
    normalized.includes("client") ||
    normalized.includes("vkn") ||
    normalized.includes("tckn") ||
    normalized.includes("kimlik") ||
    normalized.includes("vergi no")
  ) {
    return "client_status";
  }

  return "general";
};

const findClientByPrompt = (message: string, clients: ClientRecord[]) => {
  const normalizedPrompt = normalizeText(message);
  const promptTokens = tokenizeText(message);
  const exactIdentity = message.replace(/\D+/g, "");

  if (exactIdentity.length >= 10) {
    const byIdentity = clients.find((client) => client.identityNumber === exactIdentity);
    if (byIdentity) {
      return byIdentity;
    }
  }

  const fullNameMatch = clients.find((client) => normalizedPrompt.includes(normalizeText(client.name)));
  if (fullNameMatch) {
    return fullNameMatch;
  }

  const scoredMatches = clients
    .map((client) => {
      const clientTokens = tokenizeText(client.name).filter(
        (token) => token.length > 2 && !CLIENT_QUERY_STOP_WORDS.has(token)
      );
      const matchedCount = clientTokens.filter((token) =>
        promptTokens.some((promptToken) => promptToken === token || promptToken.startsWith(token))
      ).length;

      return {
        client,
        matchedCount,
        clientTokenCount: clientTokens.length
      };
    })
    .filter((entry) => entry.matchedCount > 0)
    .sort((left, right) => right.matchedCount - left.matchedCount);

  if (scoredMatches.length > 0) {
    const [best, second] = scoredMatches;
    if (
      best.matchedCount >= 2 ||
      (best.matchedCount === 1 &&
        best.clientTokenCount === 1 &&
        (!second || second.matchedCount < best.matchedCount))
    ) {
      return best.client;
    }
  }

  return null;
};

const buildClientReply = async (message: string, clients: ClientRecord[]) => {
  const client = findClientByPrompt(message, clients);
  if (!client) {
    return null;
  }

  const normalizedPrompt = normalizeText(message);
  const wantsIdentity =
    normalizedPrompt.includes("vkn") ||
    normalizedPrompt.includes("tckn") ||
    normalizedPrompt.includes("kimlik") ||
    normalizedPrompt.includes("vergi no") ||
    normalizedPrompt.includes("kimlik no");

  if (wantsIdentity) {
    const identityTypeLabel =
      client.identityType === "tckn"
        ? "T.C. Kimlik No"
        : client.identityType === "vkn"
          ? "VKN"
          : "Kimlik";

    return [
      `${client.name} icin kimlik bilgisi:`,
      `- Tip: ${identityTypeLabel}`,
      `- Numara: ${client.identityNumber ?? "Kayitli degil"}`
    ].join("\n");
  }

  const db = getDatabase();
  const trackedCountResult = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.clientId, client.id));
  const reminderRows = await db
    .select()
    .from(remindersTable)
    .where(eq(remindersTable.clientId, client.id));
  const pendingReminders = reminderRows.filter((row) => row.status === "pending");

  return [
    `${client.name} icin ozet:`,
    `- Durum: ${client.status === "active" ? "Aktif" : "Pasif"}`,
    `- Kimlik: ${client.identityNumber ?? "Kayitli degil"}`,
    `- Vergi dairesi: ${client.taxOffice ?? "-"}`,
    `- Telefon: ${client.phone ?? "-"}`,
    `- E-posta: ${client.email ?? "-"}`,
    `- Takip edilen evrak: ${trackedCountResult.length}`,
    `- Bekleyen hatirlatici: ${pendingReminders.length}`,
    pendingReminders[0]
      ? `- En yakin hatirlatici: ${pendingReminders[0].title} (${formatDateTime(
          pendingReminders[0].dueDate ?? null
        )})`
      : "- En yakin hatirlatici: Yok"
  ].join("\n");
};

const buildInboxReply = (context: OfficeContext) => {
  const lines = [
    `Gelen kutusunda bekleyen belge: ${context.waitingInboxCount}`,
    `Kontrol gereken belge: ${context.reviewInboxCount}`
  ];

  if (context.latestInbox.length > 0) {
    lines.push("", "Son belgeler:");
    context.latestInbox.forEach((item) => {
      lines.push(
        `- ${item.name} | ${item.detectedType ?? "Belge"} | ${item.matchedClientName ?? "Eslesme yok"} | ${item.suggestedFolder ?? "Klasor yok"}`
      );
    });
  }

  return lines.join("\n");
};

const buildPlannerReply = (context: OfficeContext) => {
  const lines = [
    `Bugun takvimde ${context.todayItemCount} kayit var.`,
    `Geciken hatirlatici sayisi ${context.overdueReminderCount}.`
  ];

  if (context.nextDeadline) {
    lines.push(`Siradaki kritik gun: ${context.nextDeadline.title} - ${formatDate(context.nextDeadline.date)}`);
  }

  if (context.upcomingEvents.length > 0) {
    lines.push("", "Yaklasan kayitlar:");
    context.upcomingEvents.slice(0, 5).forEach((event) => {
      lines.push(`- ${event.title} (${formatDate(event.date)})`);
    });
  }

  return lines.join("\n");
};

const buildDailyBrief = (context: OfficeContext) => {
  const lines = [
    `${context.officeName ?? "Domizan"} gunluk brif`,
    "",
    `- Mukellef: ${context.clientCount} (${context.activeClientCount} aktif, ${context.passiveClientCount} pasif)`,
    `- Gelen kutusu: ${context.waitingInboxCount} bekleyen, ${context.reviewInboxCount} kontrol gereken belge`,
    `- Hatirlatici: ${context.overdueReminderCount} geciken, bugun ${context.todayItemCount} kayit`
  ];

  if (context.nextDeadline) {
    lines.push(`- Siradaki kritik tarih: ${context.nextDeadline.title} (${formatDate(context.nextDeadline.date)})`);
  }

  if (context.upcomingEvents.length > 0) {
    lines.push("", "Bu hafta dikkat:");
    context.upcomingEvents.slice(0, 5).forEach((event) => {
      lines.push(`- ${event.title} | ${formatDate(event.date)}`);
    });
  }

  if (context.latestInbox.length > 0) {
    lines.push("", "Son gelen kutusu sinyalleri:");
    context.latestInbox.slice(0, 3).forEach((item) => {
      lines.push(`- ${item.name}: ${item.matchedClientName ?? "Eslesme yok"} / ${item.suggestedFolder ?? "Klasor yok"}`);
    });
  }

  return lines.join("\n");
};

const buildOfficialGazetteReply = () =>
  [
    "Resmi Gazete tarama omurgasi bu fazda agent akisina baglandi ancak masaustu icinde henuz canli gazete veri kaynagi beslenmiyor.",
    "Ilk resmi testte bu komut altyapiyi dogrulamak icin aktif kalacak.",
    "Sonraki adimda resmi kaynak taramasi ve SMMM etkisi ozetini ayni agente baglayacagiz."
  ].join("\n");

const buildClientCountReply = (context: OfficeContext) =>
  [
    `Toplam mukellef sayisi ${context.clientCount}.`,
    `- Aktif: ${context.activeClientCount}`,
    `- Pasif: ${context.passiveClientCount}`
  ].join("\n");

const buildOfficeContext = async (): Promise<OfficeContext> => {
  const [workspace, access, clients, planner, inboxRows] = await Promise.all([
    getWorkspaceProfile(),
    getAccessSnapshot(),
    listClients(),
    getDashboardPlanner(),
    listInboxDocuments()
  ]);

  const activeClientCount = clients.filter((client) => client.status === "active").length;
  const passiveClientCount = clients.length - activeClientCount;
  const waitingInboxCount = inboxRows.filter((row) => row.status !== "routed").length;
  const reviewInboxCount = inboxRows.filter((row) => row.analysisStatus === "needs_review").length;

  return {
    officeName: workspace?.officeName ?? null,
    ownerName: workspace?.ownerName ?? null,
    accessMode: access.mode,
    trialDaysLeft: access.trial.daysLeft,
    licenseExpiresAt: access.license?.expiresAt ?? null,
    clientCount: clients.length,
    activeClientCount,
    passiveClientCount,
    waitingInboxCount,
    reviewInboxCount,
    overdueReminderCount: planner.overdueReminderCount,
    todayItemCount: planner.todayItemCount,
    nextDeadline: planner.nextDeadline,
    upcomingEvents: planner.upcomingEvents,
    latestInbox: summarizeInboxRows(inboxRows)
  };
};

const buildBaseReply = async (promptKind: AgentPromptKind, message: string) => {
  const [context, clients] = await Promise.all([buildOfficeContext(), listClients()]);

  if (promptKind === "client_status") {
    const clientReply = await buildClientReply(message, clients);
    if (clientReply) {
      return { reply: clientReply, context, promptKind };
    }
  }

  switch (promptKind) {
    case "daily_brief":
      return { reply: buildDailyBrief(context), context, promptKind };
    case "official_gazette":
      return { reply: buildOfficialGazetteReply(), context, promptKind };
    case "client_count":
      return { reply: buildClientCountReply(context), context, promptKind };
    case "inbox_summary":
      return { reply: buildInboxReply(context), context, promptKind };
    case "planner_summary":
      return { reply: buildPlannerReply(context), context, promptKind };
    case "client_status":
      return {
        reply:
          "Hangi mukellefi sordugunu net bulamadim. Mukellef adini veya VKN/TCKN bilgisini yazarsan dogrudan ozetleyebilirim.",
        context,
        promptKind
      };
    default:
      return {
        reply: [
          `${context.officeName ?? "Domizan"} ofisi icin hazirim.`,
          `Su an ${context.clientCount} mukellef, ${context.waitingInboxCount} bekleyen belge ve ${context.overdueReminderCount} geciken hatirlatici goruyorum.`,
          "Gunluk brif, resmi gazete, gelen kutusu, eksik belge veya bir mukellef adi ile sorabilirsin."
        ].join("\n"),
        context,
        promptKind
      };
  }
};

const maybePolishWithGemini = async (
  prompt: string,
  baseReply: string,
  context: OfficeContext,
  promptKind: AgentPromptKind
) => {
  const apiKey = getResolvedGeminiKey();
  if (!apiKey) {
    return {
      text: baseReply,
      model: null as string | null,
      tokensIn: 0,
      tokensOut: 0
    };
  }

  const payload = await generateWithGemini({
    apiKey,
    prompt: [
      `Kullanici mesaji: ${prompt}`,
      "",
      "Ofis baglami:",
      JSON.stringify(context, null, 2),
      "",
      "On taslak cevap:",
      baseReply,
      "",
      "Kurallar:",
      "- Sadece ofis verisine dayali cevap ver.",
      "- Kesin olmayan konu uydurma.",
      "- Kisa, net, mali musavir odakli yaz.",
      "- Liste gerekiyorsa duz '-' maddeleri kullan.",
      "- Resmi Gazete verisi yoksa bunu acikca soyle."
    ].join("\n"),
    systemInstruction:
      promptKind === "daily_brief"
        ? "Sen Domizan icindeki mali musavir ofisi operasyon asistansin. Kisa ve vurucu gunluk brif yaz."
        : "Sen Domizan icindeki mali musavir ofisi operasyon asistansin. Net, kisa ve dogru cevap ver."
  });

  return payload;
};

export const listAgentMessages = async (channel: AgentChannel = "desktop") => {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(agentMessagesTable)
    .where(eq(agentMessagesTable.channel, channel))
    .orderBy(desc(agentMessagesTable.id))
    .limit(60);

  return rows.map(mapAgentMessageRow).reverse();
};

export const clearAgentMessages = async (channel: AgentChannel = "desktop") => {
  const db = getDatabase();
  await db.delete(agentMessagesTable).where(eq(agentMessagesTable.channel, channel));
  persistDatabase();
  return { cleared: true };
};

export const getAgentStatus = async (): Promise<AgentStatusSnapshot> => getAgentStatusSnapshot();

export const sendAgentPrompt = async (input: AgentChatRequest): Promise<AgentChatResponse> => {
  const startedAt = Date.now();
  const channel = input.channel ?? "desktop";
  const prompt = input.message.trim();

  if (!prompt) {
    throw new Error("Mesaj bos olamaz.");
  }

  await saveMessage(channel, "user", prompt);

  const { reply: baseReply, context, promptKind } = await buildBaseReply(detectPromptKind(prompt), prompt);
  let assistantText = baseReply;
  let model: string | null = null;
  let tokensIn = 0;
  let tokensOut = 0;
  let success = true;

  try {
    const geminiReply = await maybePolishWithGemini(prompt, baseReply, context, promptKind);
    assistantText = geminiReply.text;
    model = geminiReply.model;
    tokensIn = geminiReply.tokensIn;
    tokensOut = geminiReply.tokensOut;
  } catch (error) {
    success = false;
    assistantText = baseReply;
    model = null;
    tokensIn = 0;
    tokensOut = 0;
    console.error("Agent Gemini polish failed:", error);
  }

  const assistantMessage = await saveMessage(channel, "assistant", assistantText, {
    promptKind,
    hostname: os.hostname()
  });

  const status = getAgentStatusSnapshot();

  if (status.organizationId) {
    void registerRemoteAgentUsage({
      organizationId: status.organizationId,
      channel,
      promptType: promptKind,
      model,
      tokensIn,
      tokensOut,
      success,
      latencyMs: Date.now() - startedAt
    }).catch((error) => {
      console.error("Remote agent usage could not be saved:", error);
    });
  }

  return {
    message: assistantMessage,
    status
  };
};
