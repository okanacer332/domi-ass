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

export const domizanEnv = process.env.DOMIZAN_ENV ?? "development";

export const env = {
  domizanEnv,
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
  lemon: {
    mode: lemonMode,
    storeId: parseOptionalNumber(process.env.LEMON_STORE_ID),
    productId: parseOptionalNumber(process.env.LEMON_PRODUCT_ID),
    variantId: parseOptionalNumber(process.env.LEMON_VARIANT_ID),
    checkoutUrl: process.env.LEMON_CHECKOUT_URL ?? "",
    apiKey: process.env.LEMON_API_KEY ?? "",
    webhookSecret: process.env.LEMON_WEBHOOK_SECRET ?? ""
  }
};
