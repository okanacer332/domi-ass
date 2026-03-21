import { and, eq, isNull } from "drizzle-orm";

import {
  DOMIZAN_CLIENT_SUBFOLDERS,
  type InboxRouteFolder
} from "../../../shared/contracts";
import { getDatabase } from "../../database/connection";
import { clientsTable, inboxLearningRulesTable } from "../../database/schema";
import type { DocumentSignals } from "./inbox-analysis";

export type InboxAnalysisContext = {
  signals: DocumentSignals;
};

export type LearnedClientCandidate = {
  clientId: number;
  name: string;
  identityNumber: string | null;
  score: number;
  reason: string;
};

type LearningSignalType =
  | "receiver_identity"
  | "issuer_identity"
  | "receiver_name"
  | "issuer_name"
  | "client_document_type"
  | "document_fingerprint"
  | "document_signature";

type LearningRuleInput = {
  signalType: LearningSignalType;
  signalValue: string;
  clientId: number;
  targetFolder: InboxRouteFolder | null;
};

const safeFolderSet = new Set<string>(DOMIZAN_CLIENT_SUBFOLDERS);

const normalizeText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9.\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeIdentity = (value: string | null | undefined) => {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? digits : null;
};

const namesLikelySame = (left: string | null | undefined, right: string | null | undefined) => {
  const normalizedLeft = normalizeText(left ?? "");
  const normalizedRight = normalizeText(right ?? "");

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
};

const parseSignalValue = (signalType: LearningSignalType, value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  if (signalType.endsWith("_identity")) {
    return normalizeIdentity(value);
  }

  return normalizeText(value);
};

const upsertLearningRule = async (input: LearningRuleInput) => {
  const db = getDatabase();
  const now = new Date().toISOString();
  const conditions = [
    eq(inboxLearningRulesTable.signalType, input.signalType),
    eq(inboxLearningRulesTable.signalValue, input.signalValue),
    eq(inboxLearningRulesTable.clientId, input.clientId)
  ];

  const targetFolderCondition = input.targetFolder
    ? eq(inboxLearningRulesTable.targetFolder, input.targetFolder)
    : isNull(inboxLearningRulesTable.targetFolder);

  const [existing] = await db
    .select()
    .from(inboxLearningRulesTable)
    .where(and(...conditions, targetFolderCondition))
    .limit(1);

  if (existing) {
    await db
      .update(inboxLearningRulesTable)
      .set({
        hitCount: existing.hitCount + 1,
        updatedAt: now
      })
      .where(eq(inboxLearningRulesTable.id, existing.id));
    return;
  }

  await db.insert(inboxLearningRulesTable).values({
    signalType: input.signalType,
    signalValue: input.signalValue,
    clientId: input.clientId,
    targetFolder: input.targetFolder,
    hitCount: 1,
    createdAt: now,
    updatedAt: now
  });
};

export const serializeInboxAnalysisContext = (context: InboxAnalysisContext) =>
  JSON.stringify(context);

export const parseInboxAnalysisContext = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<InboxAnalysisContext>;
    if (!parsed || typeof parsed !== "object" || !parsed.signals || typeof parsed.signals !== "object") {
      return null;
    }

    return {
      signals: parsed.signals as DocumentSignals
    } satisfies InboxAnalysisContext;
  } catch {
    return null;
  }
};

export const findLearnedClientCandidates = async (
  signals: DocumentSignals
): Promise<LearnedClientCandidate[]> => {
  const db = getDatabase();
  const [clientRows, ruleRows] = await Promise.all([
    db.select().from(clientsTable).where(eq(clientsTable.status, "active")),
    db.select().from(inboxLearningRulesTable)
  ]);

  if (ruleRows.length === 0 || clientRows.length === 0) {
    return [];
  }

  const clientMap = new Map(
    clientRows.map((client) => [
      client.id,
      {
        id: client.id,
        name: client.name,
        identityNumber: client.identityNumber ?? null
      }
    ])
  );

  const scoreMap = new Map<number, LearnedClientCandidate>();
  const matchers: Array<{
    signalType: LearningSignalType;
    signalValue: string | null;
    baseScore: number;
    reason: string;
  }> = [
    {
      signalType: "receiver_identity",
      signalValue: parseSignalValue("receiver_identity", signals.receiverIdentity),
      baseScore: 0.998,
      reason: "ogrenilen-alici-kimlik"
    },
    {
      signalType: "issuer_identity",
      signalValue: parseSignalValue("issuer_identity", signals.issuerIdentity),
      baseScore: 0.994,
      reason: "ogrenilen-duzenleyen-kimlik"
    },
    {
      signalType: "receiver_name",
      signalValue: parseSignalValue("receiver_name", signals.receiverName),
      baseScore: 0.955,
      reason: "ogrenilen-alici-unvan"
    },
    {
      signalType: "issuer_name",
      signalValue: parseSignalValue("issuer_name", signals.issuerName),
      baseScore: 0.92,
      reason: "ogrenilen-duzenleyen-unvan"
    },
    {
      signalType: "document_fingerprint",
      signalValue: parseSignalValue("document_fingerprint", signals.fileFingerprint),
      baseScore: 1,
      reason: "ayni-belge"
    },
    {
      signalType: "document_signature",
      signalValue: parseSignalValue("document_signature", signals.documentSignature),
      baseScore: 0.985,
      reason: "benzer-belge"
    }
  ];

  matchers.forEach((matcher) => {
    if (!matcher.signalValue) {
      return;
    }

    const matchedRules = ruleRows.filter(
      (rule) => rule.signalType === matcher.signalType && rule.signalValue === matcher.signalValue
    );

    matchedRules.forEach((rule) => {
      const client = clientMap.get(rule.clientId);
      if (!client) {
        return;
      }

      const scoreBonus = Math.min(Math.max(rule.hitCount - 1, 0) * 0.0025, 0.012);
      const score = Math.min(matcher.baseScore + scoreBonus, 0.999);
      const current = scoreMap.get(rule.clientId);

      if (!current || score > current.score) {
        scoreMap.set(rule.clientId, {
          clientId: rule.clientId,
          name: client.name,
          identityNumber: client.identityNumber,
          score,
          reason: matcher.reason
        });
      }
    });
  });

  return [...scoreMap.values()].sort((left, right) => right.score - left.score);
};

export const findLearnedFolderSuggestion = async (
  clientId: number,
  detectedType: string | null | undefined
): Promise<InboxRouteFolder | null> => {
  const signalValue = parseSignalValue("client_document_type", detectedType);
  if (!signalValue) {
    return null;
  }

  const db = getDatabase();
  const rules = await db
    .select()
    .from(inboxLearningRulesTable)
    .where(
      and(
        eq(inboxLearningRulesTable.signalType, "client_document_type"),
        eq(inboxLearningRulesTable.clientId, clientId),
        eq(inboxLearningRulesTable.signalValue, signalValue)
      )
    );

  const topRule = rules.sort((left, right) => right.hitCount - left.hitCount)[0];
  if (!topRule?.targetFolder || !safeFolderSet.has(topRule.targetFolder)) {
    return null;
  }

  return topRule.targetFolder as InboxRouteFolder;
};

export const learnFromConfirmedRoute = async (input: {
  client: {
    id: number;
    name: string;
    identityNumber: string | null;
  };
  analysisContext: string | null;
  detectedType: string | null;
  targetFolder: InboxRouteFolder;
}) => {
  const context = parseInboxAnalysisContext(input.analysisContext);
  const signals = context?.signals;
  const learningRules: LearningRuleInput[] = [];

  if (signals) {
    const clientIdentity = normalizeIdentity(input.client.identityNumber);
    const normalizedReceiverIdentity = normalizeIdentity(signals.receiverIdentity);
    const normalizedIssuerIdentity = normalizeIdentity(signals.issuerIdentity);

    if (clientIdentity && normalizedReceiverIdentity === clientIdentity) {
      learningRules.push({
        signalType: "receiver_identity",
        signalValue: normalizedReceiverIdentity,
        clientId: input.client.id,
        targetFolder: null
      });
    }

    if (clientIdentity && normalizedIssuerIdentity === clientIdentity) {
      learningRules.push({
        signalType: "issuer_identity",
        signalValue: normalizedIssuerIdentity,
        clientId: input.client.id,
        targetFolder: null
      });
    }

    if (namesLikelySame(signals.receiverName, input.client.name)) {
      const signalValue = parseSignalValue("receiver_name", signals.receiverName);
      if (signalValue) {
        learningRules.push({
          signalType: "receiver_name",
          signalValue,
          clientId: input.client.id,
          targetFolder: null
        });
      }
    }

    if (namesLikelySame(signals.issuerName, input.client.name)) {
      const signalValue = parseSignalValue("issuer_name", signals.issuerName);
      if (signalValue) {
        learningRules.push({
          signalType: "issuer_name",
          signalValue,
          clientId: input.client.id,
          targetFolder: null
        });
      }
    }
  }

  const detectedTypeSignal = parseSignalValue("client_document_type", input.detectedType);
  if (detectedTypeSignal) {
    learningRules.push({
      signalType: "client_document_type",
      signalValue: detectedTypeSignal,
      clientId: input.client.id,
      targetFolder: input.targetFolder
    });
  }

  const documentFingerprintSignal = parseSignalValue(
    "document_fingerprint",
    signals?.fileFingerprint ?? null
  );
  if (documentFingerprintSignal) {
    learningRules.push({
      signalType: "document_fingerprint",
      signalValue: documentFingerprintSignal,
      clientId: input.client.id,
      targetFolder: input.targetFolder
    });
  }

  const documentSignatureSignal = parseSignalValue(
    "document_signature",
    signals?.documentSignature ?? null
  );
  if (documentSignatureSignal) {
    learningRules.push({
      signalType: "document_signature",
      signalValue: documentSignatureSignal,
      clientId: input.client.id,
      targetFolder: input.targetFolder
    });
  }

  const uniqueRules = new Map<string, LearningRuleInput>();
  learningRules.forEach((rule) => {
    const key = `${rule.signalType}::${rule.signalValue}::${rule.clientId}::${rule.targetFolder ?? "-"}`;
    uniqueRules.set(key, rule);
  });

  for (const rule of uniqueRules.values()) {
    await upsertLearningRule(rule);
  }
};
