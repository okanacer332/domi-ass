import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type {
  MizanCodeCreateInput,
  MizanCodeDeleteResult,
  MizanCustomCodeRecord
} from "../../../shared/contracts";
import { tekduzenCodeRows } from "../../../shared/tekduzen-code-data";
import { getDatabase, persistDatabase } from "../../database/connection";
import { mizanCustomCodesTable } from "../../database/schema";
import { requireOperationalAccess } from "../licensing/access-service";

const createMizanCodeSchema = z.object({
  parentCode: z.string().trim().min(3, "Üst kod zorunludur."),
  code: z.string().trim().min(3, "Kod zorunludur."),
  title: z.string().trim().min(2, "Kod adı zorunludur.")
});

const standardCodeMap = new Map(tekduzenCodeRows.map((row) => [row.code, row]));
const standardCodeSet = new Set(tekduzenCodeRows.map((row) => row.code));
const baseCodePattern = /^\d{3}$/;
const customCodePattern = /^\d{3}(?:\.\d{2,3})+$/;

const normalizeCode = (value: string) => value.trim().replace(/\s+/g, "");
const getSegmentCount = (code: string) => code.split(".").length;

const compareCode = (left: string, right: string) => {
  const leftSegments = left.split(".").map((segment) => Number(segment));
  const rightSegments = right.split(".").map((segment) => Number(segment));
  const length = Math.max(leftSegments.length, rightSegments.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftSegments[index] ?? -1;
    const rightValue = rightSegments[index] ?? -1;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return left.localeCompare(right, "tr");
};

const mapRow = (row: typeof mizanCustomCodesTable.$inferSelect): MizanCustomCodeRecord => ({
  id: row.id,
  code: row.code,
  title: row.title,
  baseCode: row.baseCode,
  parentCode: row.parentCode,
  level: row.level,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const listRows = async () => {
  const db = getDatabase();
  const rows = await db.select().from(mizanCustomCodesTable);
  return rows.sort((left, right) => compareCode(left.code, right.code));
};

const getRowById = async (id: number) => {
  const db = getDatabase();
  const [row] = await db.select().from(mizanCustomCodesTable).where(eq(mizanCustomCodesTable.id, id)).limit(1);
  return row ?? null;
};

const getRowByCode = async (code: string) => {
  const db = getDatabase();
  const [row] = await db.select().from(mizanCustomCodesTable).where(eq(mizanCustomCodesTable.code, code)).limit(1);
  return row ?? null;
};

const ensureParentExists = async (parentCode: string) => {
  if (standardCodeSet.has(parentCode)) {
    return {
      parentCode,
      baseCode: parentCode,
      parentLevel: 0
    };
  }

  const parentRow = await getRowByCode(parentCode);
  if (!parentRow) {
    throw new Error("Seçilen üst kod bulunamadı.");
  }

  return {
    parentCode: parentRow.code,
    baseCode: parentRow.baseCode,
    parentLevel: parentRow.level
  };
};

const validateCreateInput = async (input: MizanCodeCreateInput) => {
  const parsed = createMizanCodeSchema.parse(input);
  const parentCode = normalizeCode(parsed.parentCode);
  const code = normalizeCode(parsed.code);
  const title = parsed.title.trim();

  if (!baseCodePattern.test(parentCode) && !customCodePattern.test(parentCode)) {
    throw new Error("Üst kod biçimi geçersiz.");
  }

  if (!customCodePattern.test(code)) {
    throw new Error("Alt kırılım kodu `166.01` veya `166.01.001` formatında olmalıdır.");
  }

  const parent = await ensureParentExists(parentCode);

  if (!code.startsWith(`${parent.parentCode}.`)) {
    throw new Error("Alt kırılım seçilen üst kodla başlamalıdır.");
  }

  if (getSegmentCount(code) !== getSegmentCount(parent.parentCode) + 1) {
    throw new Error("Bir seferde yalnızca bir alt seviye eklenebilir.");
  }

  if (standardCodeSet.has(code)) {
    throw new Error("İlk 3 haneli standart kodlar değiştirilemez.");
  }

  const existing = await getRowByCode(code);
  if (existing) {
    throw new Error("Bu mizan kodu zaten tanımlı.");
  }

  return {
    code,
    title,
    parentCode: parent.parentCode,
    baseCode: parent.baseCode,
    level: parent.parentLevel + 1
  };
};

export const listMizanCodes = async (): Promise<MizanCustomCodeRecord[]> => {
  const rows = await listRows();
  return rows.map(mapRow);
};

export const createMizanCode = async (
  input: MizanCodeCreateInput
): Promise<MizanCustomCodeRecord> => {
  await requireOperationalAccess();
  const next = await validateCreateInput(input);
  const now = new Date().toISOString();
  const db = getDatabase();

  await db.insert(mizanCustomCodesTable).values({
    code: next.code,
    title: next.title,
    baseCode: next.baseCode,
    parentCode: next.parentCode,
    level: next.level,
    createdAt: now,
    updatedAt: now
  });

  persistDatabase();

  const created = await getRowByCode(next.code);
  if (!created) {
    throw new Error("Yeni mizan kodu oluşturulamadı.");
  }

  return mapRow(created);
};

export const deleteMizanCode = async (id: number): Promise<MizanCodeDeleteResult> => {
  await requireOperationalAccess();
  const row = await getRowById(id);

  if (!row) {
    throw new Error("Silinecek mizan kodu bulunamadı.");
  }

  const rows = await listRows();
  const targetCodes = rows
    .filter((item) => item.code === row.code || item.code.startsWith(`${row.code}.`))
    .map((item) => item.id);

  if (targetCodes.length === 0) {
    return { deletedCount: 0 };
  }

  const db = getDatabase();
  await db.delete(mizanCustomCodesTable).where(inArray(mizanCustomCodesTable.id, targetCodes));
  persistDatabase();

  return {
    deletedCount: targetCodes.length
  };
};

export const getStandardMizanTitle = (code: string) => standardCodeMap.get(code)?.title ?? null;
