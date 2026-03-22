import crypto = require("node:crypto");
import type express = require("express");

const adminUsername = process.env.ADMIN_GATEWAY_USERNAME?.trim() || "acerokan33";
const adminPassword = process.env.ADMIN_GATEWAY_PASSWORD?.trim() || "Mersin.acer33";
const adminTokenSecret =
  process.env.ADMIN_GATEWAY_TOKEN_SECRET?.trim() || "domizan-admin-gateway-secret-v1";

type AdminTokenPayload = {
  username: string;
  issuedAt: number;
  nonce: string;
};

const encodePayload = (payload: AdminTokenPayload) =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const sign = (value: string) =>
  crypto.createHmac("sha256", adminTokenSecret).update(value).digest("base64url");

const decodePayload = (encoded: string) => {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AdminTokenPayload;

    if (!parsed?.username || !parsed?.issuedAt || !parsed?.nonce) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const verifyAdminCredentials = (username: string, password: string) =>
  username.trim() === adminUsername && password.trim() === adminPassword;

export const createAdminAccessToken = (username: string) => {
  const payload: AdminTokenPayload = {
    username,
    issuedAt: Date.now(),
    nonce: crypto.randomBytes(10).toString("hex")
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${sign(encoded)}`;
};

export const verifyAdminAccessToken = (value: string | undefined | null) => {
  if (!value) {
    return null;
  }

  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = sign(encoded);
  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const validSignature = crypto.timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expectedSignature, "utf8")
  );

  if (!validSignature) {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload) {
    return null;
  }

  const maxAgeMs = 12 * 60 * 60 * 1000;
  if (Date.now() - payload.issuedAt > maxAgeMs) {
    return null;
  }

  return payload;
};

export const readBearerToken = (request: express.Request) => {
  const header = request.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
};

export const getAdminPublicUser = () => ({
  username: adminUsername,
  role: "ADMIN"
});
