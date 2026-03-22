import { count, eq } from "drizzle-orm";

import type { BootstrapPayload } from "../../shared/contracts";
import { env } from "../config/env";
import { getDatabase } from "../database/connection";
import { clientsTable, documentsTable, remindersTable } from "../database/schema";
import { ensureDomizanDirectories } from "./domizan-directories";
import { getAgentStatusSnapshot } from "./agent/agent-state";
import { deriveOnboardingSnapshot, getAccessSnapshot } from "./licensing/access-service";
import { isLemonConfigured } from "./licensing/lemon";
import { getWorkspaceProfile } from "./onboarding/workspace-service";

export const getBootstrapPayload = async (): Promise<BootstrapPayload> => {
  const db = getDatabase();
  const directories = ensureDomizanDirectories();
  const [workspace, access] = await Promise.all([getWorkspaceProfile(), getAccessSnapshot()]);
  const agentStatus = getAgentStatusSnapshot();

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
      telegramReady: agentStatus.telegram.enabled,
      geminiReady: agentStatus.gemini.configured || Boolean(env.geminiApiKey),
      lemonReady: isLemonConfigured(),
      lemonMode: env.lemon.mode
    },
    workspace,
    access,
    onboarding: deriveOnboardingSnapshot({
      workspaceCompleted: Boolean(workspace?.onboardingCompletedAt),
      access
    })
  };
};
