import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  detectIdentityType,
  normalizeIdentityNumber,
  validateIdentityInput
} from "../../../shared/client-identity";
import type {
  ClientFormInput,
  ClientIdentityType,
  ClientRecord,
  ClientStatusUpdateInput,
  ClientUpdateInput
} from "../../../shared/contracts";
import { getDatabase, persistDatabase } from "../../database/connection";
import { clientsTable } from "../../database/schema";
import { requireOperationalAccess } from "../licensing/access-service";
import {
  buildClientFolderSlug,
  ensureClientFolderStructure,
  ensureUniqueClientFolderName,
  getClientFolderPath,
  openClientFolderPath,
  syncClientInfoFile
} from "./client-folders";

const optionalString = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();

const optionalIdentityType = z.enum(["vkn", "tckn"]).nullable().optional();

const clientSchema = z.object({
  name: z.string().trim().min(2, "Mükellef adı zorunludur."),
  identityType: optionalIdentityType,
  identityNumber: optionalString,
  taxOffice: optionalString,
  authorizedPerson: optionalString,
  phone: optionalString,
  email: optionalString,
  city: optionalString,
  address: optionalString,
  notes: optionalString
});

const clientUpdateSchema = clientSchema.extend({
  id: z.number().int().positive()
});

const clientStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["active", "passive"])
});

const normalizeLookupText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLocaleLowerCase("tr-TR");

const sanitizePhone = (value: string | null | undefined) => value?.trim() || null;

const resolveIdentity = (identityType: ClientIdentityType | null | undefined, identityNumber: string | null | undefined) => {
  const normalizedValue = normalizeIdentityNumber(identityNumber);
  const normalizedType = identityType ?? (normalizedValue ? detectIdentityType(normalizedValue) : null);

  return {
    identityType: normalizedType,
    identityNumber: normalizedValue
  };
};

const mapClientRow = (row: typeof clientsTable.$inferSelect): ClientRecord => {
  const identity = resolveIdentity(
    row.identityType === "vkn" || row.identityType === "tckn" ? row.identityType : null,
    row.identityNumber ?? row.taxId ?? null
  );

  return {
    id: row.id,
    name: row.name,
    identityType: identity.identityType,
    identityNumber: identity.identityNumber,
    taxOffice: row.taxOffice ?? null,
    authorizedPerson: row.authorizedPerson ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    city: row.city ?? null,
    address: row.address ?? null,
    notes: row.notes ?? null,
    status: row.status === "passive" ? "passive" : "active",
    folderName: row.folderName,
    folderPath: getClientFolderPath(row.folderName),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

const getClientById = async (id: number) => {
  const db = getDatabase();
  const [row] = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1);

  if (!row) {
    throw new Error("Mükellef bulunamadı.");
  }

  return row;
};

const getClientByFolderName = async (folderName: string) => {
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.folderName, folderName))
    .limit(1);

  if (!row) {
    throw new Error("Oluşturulan mükellef kaydı geri okunamadı.");
  }

  return row;
};

const findExistingByIdentityNumber = async (identityNumber: string, excludeId?: number) => {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.identityNumber, identityNumber));

  return rows.find((row) => row.id !== excludeId) ?? null;
};

const ensureClientIdentity = (input: z.infer<typeof clientSchema>) => {
  const validation = validateIdentityInput(input.identityType, input.identityNumber);

  if (!validation.isValid) {
    throw new Error(validation.error ?? "Kimlik bilgileri doğrulanamadı.");
  }

  return validation;
};

const ensureClientUniqueness = async (
  input: z.infer<typeof clientSchema>,
  excludeId?: number
) => {
  const validation = ensureClientIdentity(input);

  if (!validation.normalizedValue) {
    return validation;
  }

  const existing = await findExistingByIdentityNumber(validation.normalizedValue, excludeId);
  if (existing) {
    throw new Error("Bu kimlik numarası ile kayıtlı bir mükellef zaten var.");
  }

  return validation;
};

const ensureClientFolderAssets = (client: ClientRecord, onlyIfMissing = false) => {
  try {
    syncClientInfoFile(client, { onlyIfMissing });
  } catch (error) {
    console.error("Bilgi.txt güncellenemedi:", error);
  }
};

export const listClients = async (): Promise<ClientRecord[]> => {
  const db = getDatabase();
  const rows = await db.select().from(clientsTable).orderBy(desc(clientsTable.updatedAt));
  const mapped = rows.map(mapClientRow);

  mapped.forEach((client) => {
    ensureClientFolderAssets(client, true);
  });

  return mapped.sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "active" ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "tr");
  });
};

export const createClient = async (input: ClientFormInput): Promise<ClientRecord> => {
  await requireOperationalAccess();
  const parsed = clientSchema.parse(input);
  const identity = await ensureClientUniqueness(parsed);

  const now = new Date().toISOString();
  const baseFolderName = buildClientFolderSlug(parsed.name, identity.normalizedValue);
  const folderName = ensureUniqueClientFolderName(baseFolderName);
  ensureClientFolderStructure(folderName);

  const db = getDatabase();
  await db.insert(clientsTable).values({
    name: parsed.name.trim(),
    taxId: identity.normalizedValue,
    identityType: identity.identityType,
    identityNumber: identity.normalizedValue,
    taxOffice: parsed.taxOffice ?? null,
    authorizedPerson: parsed.authorizedPerson ?? null,
    phone: sanitizePhone(parsed.phone),
    email: parsed.email?.toLocaleLowerCase("tr-TR") ?? null,
    city: parsed.city ?? null,
    address: parsed.address ?? null,
    notes: parsed.notes ?? null,
    status: "active",
    folderName,
    createdAt: now,
    updatedAt: now
  });

  persistDatabase();
  const client = mapClientRow(await getClientByFolderName(folderName));
  ensureClientFolderAssets(client);
  return client;
};

export const updateClient = async (input: ClientUpdateInput): Promise<ClientRecord> => {
  await requireOperationalAccess();
  const parsed = clientUpdateSchema.parse(input);
  const existing = await getClientById(parsed.id);
  const identity = await ensureClientUniqueness(parsed, parsed.id);

  const db = getDatabase();
  await db
    .update(clientsTable)
    .set({
      name: parsed.name.trim(),
      taxId: identity.normalizedValue,
      identityType: identity.identityType,
      identityNumber: identity.normalizedValue,
      taxOffice: parsed.taxOffice ?? null,
      authorizedPerson: parsed.authorizedPerson ?? null,
      phone: sanitizePhone(parsed.phone),
      email: parsed.email?.toLocaleLowerCase("tr-TR") ?? null,
      city: parsed.city ?? null,
      address: parsed.address ?? null,
      notes: parsed.notes ?? null,
      folderName: existing.folderName,
      updatedAt: new Date().toISOString()
    })
    .where(eq(clientsTable.id, parsed.id));

  persistDatabase();
  const client = mapClientRow(await getClientById(parsed.id));
  ensureClientFolderAssets(client);
  return client;
};

export const setClientStatus = async (
  input: ClientStatusUpdateInput
): Promise<ClientRecord> => {
  await requireOperationalAccess();
  const parsed = clientStatusSchema.parse(input);
  const db = getDatabase();

  await db
    .update(clientsTable)
    .set({
      status: parsed.status,
      updatedAt: new Date().toISOString()
    })
    .where(eq(clientsTable.id, parsed.id));

  persistDatabase();
  const client = mapClientRow(await getClientById(parsed.id));
  ensureClientFolderAssets(client);
  return client;
};

export const openClientFolder = async (clientId: number) => {
  await requireOperationalAccess();
  const row = await getClientById(clientId);
  ensureClientFolderAssets(mapClientRow(row), true);
  return openClientFolderPath(row.folderName);
};

const matchImportedClient = (existingClients: ClientRecord[], input: ClientFormInput) => {
  const normalizedIdentityNumber = normalizeIdentityNumber(input.identityNumber);

  if (normalizedIdentityNumber) {
    const byIdentityNumber = existingClients.find(
      (client) => client.identityNumber === normalizedIdentityNumber
    );
    if (byIdentityNumber) {
      return byIdentityNumber;
    }
  }

  const normalizedName = normalizeLookupText(input.name);
  return (
    existingClients.find((client) => normalizeLookupText(client.name) === normalizedName) ?? null
  );
};

export const upsertImportedClient = async (
  input: ClientFormInput,
  existingClients: ClientRecord[]
): Promise<"created" | "updated" | "skipped"> => {
  const name = input.name?.trim();
  if (!name) {
    return "skipped";
  }

  const matchedClient = matchImportedClient(existingClients, input);

  if (!matchedClient) {
    const created = await createClient(input);
    existingClients.push(created);
    return "created";
  }

  const updated = await updateClient({
    id: matchedClient.id,
    name,
    identityType: input.identityType ?? matchedClient.identityType,
    identityNumber: input.identityNumber ?? matchedClient.identityNumber,
    taxOffice: input.taxOffice ?? matchedClient.taxOffice,
    authorizedPerson: input.authorizedPerson ?? matchedClient.authorizedPerson,
    phone: input.phone ?? matchedClient.phone,
    email: input.email ?? matchedClient.email,
    city: input.city ?? matchedClient.city,
    address: input.address ?? matchedClient.address,
    notes: input.notes ?? matchedClient.notes
  });

  const index = existingClients.findIndex((client) => client.id === updated.id);
  if (index >= 0) {
    existingClients[index] = updated;
  }

  return "updated";
};
