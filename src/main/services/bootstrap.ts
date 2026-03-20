import { count, eq } from "drizzle-orm";

import { env } from "../config/env";
import { getDatabase } from "../database/connection";
import { clientsTable, documentsTable, remindersTable } from "../database/schema";
import { ensureDomizanDirectories } from "./domizan-directories";
import { isLemonConfigured } from "./licensing/lemon";

export const getBootstrapPayload = async () => {
  const db = getDatabase();
  const directories = ensureDomizanDirectories();

  const [clientRow] = await db.select({ value: count() }).from(clientsTable);
  const [waitingDocumentRow] = await db
    .select({ value: count() })
    .from(documentsTable)
    .where(eq(documentsTable.status, "waiting"));
  const [totalDocumentRow] = await db.select({ value: count() }).from(documentsTable);
  const [pendingReminderRow] = await db
    .select({ value: count() })
    .from(remindersTable)
    .where(eq(remindersTable.status, "pending"));

  return {
    directories,
    summary: {
      clientCount: clientRow?.value ?? 0,
      waitingDocumentCount: waitingDocumentRow?.value ?? 0,
      totalDocumentCount: totalDocumentRow?.value ?? 0,
      pendingReminderCount: pendingReminderRow?.value ?? 0,
      telegramReady: Boolean(env.telegramBotToken && env.telegramChatId),
      geminiReady: Boolean(env.geminiApiKey),
      lemonReady: isLemonConfigured(),
      lemonMode: env.lemon.mode
    }
  };
};
