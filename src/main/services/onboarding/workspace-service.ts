import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import type { OnboardingSetupInput, WorkspaceProfile } from "../../../shared/contracts";
import { getDatabase, persistDatabase } from "../../database/connection";
import { workspaceStateTable } from "../../database/schema";

const workspaceSchema = z.object({
  officeName: z.string().trim().min(2, "Ofis adı zorunludur."),
  ownerName: z.string().trim().min(2, "Yetkili adı zorunludur."),
  ownerEmail: z.string().trim().email("Geçerli bir e-posta adresi girilmelidir.")
});

const mapWorkspaceProfile = (
  row: typeof workspaceStateTable.$inferSelect | undefined
): WorkspaceProfile | null => {
  if (!row) {
    return null;
  }

  return {
    officeName: row.officeName ?? null,
    ownerName: row.ownerName ?? null,
    ownerEmail: row.ownerEmail ?? null,
    onboardingCompletedAt: row.onboardingCompletedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

export const getWorkspaceProfile = async (): Promise<WorkspaceProfile | null> => {
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(workspaceStateTable)
    .orderBy(desc(workspaceStateTable.id))
    .limit(1);

  return mapWorkspaceProfile(row);
};

export const completeOnboarding = async (
  input: OnboardingSetupInput
): Promise<WorkspaceProfile> => {
  const parsed = workspaceSchema.parse(input);
  const db = getDatabase();
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(workspaceStateTable)
    .orderBy(desc(workspaceStateTable.id))
    .limit(1);

  if (!existing) {
    await db.insert(workspaceStateTable).values({
      officeName: parsed.officeName,
      ownerName: parsed.ownerName,
      ownerEmail: parsed.ownerEmail.toLocaleLowerCase("tr-TR"),
      onboardingCompletedAt: now,
      createdAt: now,
      updatedAt: now
    });
  } else {
    await db
      .update(workspaceStateTable)
      .set({
        officeName: parsed.officeName,
        ownerName: parsed.ownerName,
        ownerEmail: parsed.ownerEmail.toLocaleLowerCase("tr-TR"),
        onboardingCompletedAt: existing.onboardingCompletedAt ?? now,
        updatedAt: now
      })
      .where(eq(workspaceStateTable.id, existing.id));
  }

  persistDatabase();
  const profile = await getWorkspaceProfile();

  if (!profile) {
    throw new Error("Onboarding bilgileri kaydedilemedi.");
  }

  return profile;
};
