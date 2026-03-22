import { claimRemoteTelegramOwner, registerRemoteTelegramActivity, type SyncedAgentConfig } from "./agent-backend";
import { sendAgentPrompt } from "./agent-core";
import {
  getAgentStatusSnapshot,
  setAgentTelegramState,
  setResolvedTelegramToken
} from "./agent-state";

type TelegramMessage = {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  chat: {
    id: number;
    type: string;
  };
  from?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result: T;
  description?: string;
};

type RuntimeTelegramConfig = Pick<SyncedAgentConfig, "organizationId" | "telegram">;

let currentToken = "";
let currentOffset = 0;
let currentConfig: RuntimeTelegramConfig | null = null;
let pollingTimer: NodeJS.Timeout | null = null;
let disposed = false;
let polling = false;

const TELEGRAM_API_BASE = "https://api.telegram.org";

const buildDisplayName = (message: TelegramMessage) => {
  const parts = [message.from?.first_name, message.from?.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : message.from?.username ?? null;
};

const buildHelpText = () =>
  [
    "Domizan Telegram agent hazir.",
    "",
    "Kullanabilecegin ornekler:",
    "- gunluk brif",
    "- resmi gazete",
    "- gelen kutusu",
    "- X mukellefin durumu ne",
    "- bu hafta kritik ne var"
  ].join("\n");

const telegramRequest = async <T>(token: string, method: string, body?: Record<string, unknown>) => {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body
      ? {
          "Content-Type": "application/json"
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = (await response.json()) as TelegramApiResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram ${method} istegi basarisiz oldu.`);
  }

  return payload.result;
};

const sendText = async (token: string, chatId: string, text: string) => {
  const chunks = text.match(/[\s\S]{1,3800}/g) ?? [text];

  for (const chunk of chunks) {
    await telegramRequest(token, "sendMessage", {
      chat_id: chatId,
      text: chunk
    });
  }
};

const scheduleNextPoll = (delayMs = 2000) => {
  if (disposed || !currentToken) {
    return;
  }

  pollingTimer = setTimeout(() => {
    void pollUpdates();
  }, delayMs);
};

const handleOwnerClaim = async (message: TelegramMessage, chatId: string) => {
  if (!currentConfig) {
    return;
  }

  const displayName = buildDisplayName(message);
  await claimRemoteTelegramOwner({
    organizationId: currentConfig.organizationId,
    chatId,
    displayName
  });

  currentConfig = {
    ...currentConfig,
    telegram: {
      ...currentConfig.telegram,
      ownerChatId: chatId,
      ownerDisplayName: displayName
    }
  };

  setAgentTelegramState({
    ownerChatId: chatId,
    ownerDisplayName: displayName,
    lastError: null
  });

  await sendText(
    currentToken,
    chatId,
    [
      `Domizan owner baglantisi tamamlandi.`,
      `${currentConfig.telegram.botUsername ?? "Bot"} artik bu ofis icin sadece sana yanit verecek.`,
      "",
      buildHelpText()
    ].join("\n")
  );
};

const handleIncomingMessage = async (message: TelegramMessage) => {
  const chatId = String(message.chat.id);
  const text = (message.text ?? message.caption ?? "").trim();
  const displayName = buildDisplayName(message);

  if (!text) {
    await sendText(currentToken, chatId, "Yalnizca metin komutlari ve sorulari isleyebiliyorum.");
    return;
  }

  if (!currentConfig) {
    await sendText(currentToken, chatId, "Agent konfigurasyonu hazir degil. Biraz sonra tekrar dene.");
    return;
  }

  const ownerChatId = currentConfig.telegram.ownerChatId;

  if (!ownerChatId) {
    await handleOwnerClaim(message, chatId);
    return;
  }

  if (ownerChatId !== chatId) {
    await sendText(currentToken, chatId, "Bu bot yalnizca ofis sahibine ozel calisiyor.");
    return;
  }

  if (text === "/start" || text === "/yardim" || text === "/help") {
    await sendText(currentToken, chatId, buildHelpText());
    return;
  }

  const normalizedText = text.toLocaleLowerCase("tr-TR");
  const agentPrompt =
    normalizedText === "/brief" ? "gunluk brif" : normalizedText === "/gazete" ? "resmi gazete" : text;
  const result = await sendAgentPrompt({
    channel: "telegram",
    message: agentPrompt
  });

  await sendText(currentToken, chatId, result.message.content);

  setAgentTelegramState({
    lastMessageAt: new Date().toISOString(),
    ownerChatId: chatId,
    ownerDisplayName: displayName,
    lastError: null
  });

  if (currentConfig.organizationId) {
    void registerRemoteTelegramActivity({
      organizationId: currentConfig.organizationId,
      displayName,
      summary: text.slice(0, 180)
    }).catch((error) => {
      console.error("Remote telegram activity could not be saved:", error);
    });
  }
};

const pollUpdates = async () => {
  if (polling || disposed || !currentToken) {
    return;
  }

  polling = true;
  try {
    const updates = await telegramRequest<TelegramUpdate[]>(currentToken, "getUpdates", {
      timeout: 25,
      offset: currentOffset,
      allowed_updates: ["message"]
    });

    for (const update of updates) {
      currentOffset = update.update_id + 1;
      if (update.message) {
        await handleIncomingMessage(update.message);
      }
    }

    setAgentTelegramState({
      running: true,
      lastError: null
    });
    scheduleNextPoll(updates.length > 0 ? 100 : 1500);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram poll hatasi.";
    console.error("Telegram agent poll failed:", error);
    setAgentTelegramState({
      running: false,
      lastError: message
    });
    scheduleNextPoll(5000);
  } finally {
    polling = false;
  }
};

const stopInternal = () => {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }

  currentToken = "";
  currentOffset = 0;
  setResolvedTelegramToken("");
  setAgentTelegramState({
    running: false
  });
};

export const syncTelegramAgent = async (config: RuntimeTelegramConfig | null) => {
  currentConfig = config;
  const nextToken = config?.telegram.enabled && config.telegram.botToken ? config.telegram.botToken : "";

  setAgentTelegramState({
    enabled: Boolean(nextToken),
    botUsername: config?.telegram.botUsername ?? null,
    ownerChatId: config?.telegram.ownerChatId ?? null,
    ownerDisplayName: config?.telegram.ownerDisplayName ?? null,
    lastMessageAt: config?.telegram.ownerChatId ? getAgentStatusSnapshot().telegram.lastMessageAt : null
  });

  if (!nextToken) {
    stopInternal();
    return;
  }

  if (currentToken === nextToken) {
    return;
  }

  stopInternal();
  currentToken = nextToken;
  currentConfig = config;
  setResolvedTelegramToken(nextToken);

  try {
    const me = await telegramRequest<{ username?: string }>(currentToken, "getMe");
    await telegramRequest(currentToken, "deleteWebhook", { drop_pending_updates: false });

    setAgentTelegramState({
      enabled: true,
      running: true,
      botUsername: config?.telegram.botUsername ?? (me.username ? `@${me.username}` : null),
      ownerChatId: config?.telegram.ownerChatId ?? null,
      ownerDisplayName: config?.telegram.ownerDisplayName ?? null,
      lastError: null
    });

    scheduleNextPoll(200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram bot baslatilamadi.";
    console.error("Telegram agent bootstrap failed:", error);
    setAgentTelegramState({
      enabled: true,
      running: false,
      lastError: message
    });
  }
};

export const disposeTelegramAgent = () => {
  disposed = true;
  stopInternal();
  currentConfig = null;
};
