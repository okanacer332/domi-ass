import dotenv = require("dotenv");
import path = require("node:path");

dotenv.config({
  path: path.resolve(process.cwd(), ".env")
});

const parseRequiredNumber = (value: string | undefined, label: string) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} tanımlı değil.`);
  }

  return parsed;
};

const parseRequiredString = (value: string | undefined, label: string) => {
  if (!value?.trim()) {
    throw new Error(`${label} tanımlı değil.`);
  }

  return value.trim();
};

export const env = {
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV ?? "development",
  domizanEnv: process.env.DOMIZAN_ENV ?? "development",
  lemon: {
    mode: process.env.LEMON_MODE === "live" ? "live" : "test",
    storeId: parseRequiredNumber(process.env.LEMON_STORE_ID, "LEMON_STORE_ID"),
    productId: parseRequiredNumber(process.env.LEMON_PRODUCT_ID, "LEMON_PRODUCT_ID"),
    variantId: parseRequiredNumber(process.env.LEMON_VARIANT_ID, "LEMON_VARIANT_ID"),
    checkoutUrl: parseRequiredString(process.env.LEMON_CHECKOUT_URL, "LEMON_CHECKOUT_URL"),
    apiKey: parseRequiredString(process.env.LEMON_API_KEY, "LEMON_API_KEY"),
    webhookSecret: parseRequiredString(process.env.LEMON_WEBHOOK_SECRET, "LEMON_WEBHOOK_SECRET")
  }
};
