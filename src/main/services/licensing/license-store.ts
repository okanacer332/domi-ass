import { desc } from "drizzle-orm";

import type { StoredLicenseState } from "../../../shared/contracts";
import { getDatabase, persistDatabase } from "../../database/connection";
import { licenseStateTable } from "../../database/schema";

const mapRowToLicense = (
  row: typeof licenseStateTable.$inferSelect | undefined
): StoredLicenseState | null => {
  if (!row) {
    return null;
  }

  return {
    provider: "lemonsqueezy",
    licenseKey: row.licenseKey,
    licenseStatus: row.licenseStatus,
    instanceId: row.instanceId ?? null,
    instanceName: row.instanceName ?? null,
    customerEmail: row.customerEmail ?? null,
    customerName: row.customerName ?? null,
    storeId: row.storeId ?? null,
    productId: row.productId ?? null,
    variantId: row.variantId ?? null,
    orderId: row.orderId ?? null,
    orderItemId: row.orderItemId ?? null,
    expiresAt: row.expiresAt ?? null,
    activatedAt: row.activatedAt ?? null,
    validatedAt: row.validatedAt ?? null,
    updatedAt: row.updatedAt
  };
};

export const getStoredLicenseState = async (): Promise<StoredLicenseState | null> => {
  const db = getDatabase();
  const [row] = await db.select().from(licenseStateTable).orderBy(desc(licenseStateTable.id)).limit(1);
  return mapRowToLicense(row);
};

export const replaceStoredLicenseState = async (
  license: Omit<StoredLicenseState, "provider">
): Promise<StoredLicenseState> => {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.delete(licenseStateTable);
  await db.insert(licenseStateTable).values({
    provider: "lemonsqueezy",
    licenseKey: license.licenseKey,
    licenseStatus: license.licenseStatus,
    instanceId: license.instanceId,
    instanceName: license.instanceName,
    customerEmail: license.customerEmail,
    customerName: license.customerName,
    storeId: license.storeId,
    productId: license.productId,
    variantId: license.variantId,
    orderId: license.orderId,
    orderItemId: license.orderItemId,
    expiresAt: license.expiresAt,
    activatedAt: license.activatedAt,
    validatedAt: license.validatedAt,
    createdAt: now,
    updatedAt: license.updatedAt
  });

  persistDatabase();
  const state = await getStoredLicenseState();

  if (!state) {
    throw new Error("Lisans durumu kaydedilemedi.");
  }

  return state;
};

export const clearStoredLicenseState = async () => {
  const db = getDatabase();
  await db.delete(licenseStateTable);
  persistDatabase();
};
