import dotenv from "dotenv";
import path from "node:path";

import type { LemonMode } from "../../shared/contracts";

dotenv.config({
  path: path.resolve(process.cwd(), ".env")
});

const parseOptionalNumber = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const lemonMode: LemonMode = process.env.LEMON_MODE === "live" ? "live" : "test";

const DEFAULT_DOMIZAN_API_BASE_URL = "https://gateway.domizan.com/api";
const DEFAULT_LEMON_STORE_ID = "321476";
const DEFAULT_LEMON_PRODUCT_ID = "906701";
const DEFAULT_LEMON_VARIANT_ID = "1426060";
const DEFAULT_LEMON_CHECKOUT_URL =
  "https://domizan.lemonsqueezy.com/checkout/buy/628ec32c-e243-4be8-8722-08a863a9c827";

export const domizanEnv = process.env.DOMIZAN_ENV ?? "development";

export const env = {
  domizanEnv,
  domizanApiBaseUrl: process.env.DOMIZAN_API_BASE_URL ?? DEFAULT_DOMIZAN_API_BASE_URL,
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
  lemon: {
    mode: lemonMode,
    storeId: parseOptionalNumber(process.env.LEMON_STORE_ID ?? DEFAULT_LEMON_STORE_ID),
    productId: parseOptionalNumber(process.env.LEMON_PRODUCT_ID ?? DEFAULT_LEMON_PRODUCT_ID),
    variantId: parseOptionalNumber(process.env.LEMON_VARIANT_ID ?? DEFAULT_LEMON_VARIANT_ID),
    checkoutUrl: process.env.LEMON_CHECKOUT_URL ?? DEFAULT_LEMON_CHECKOUT_URL
  }
};
