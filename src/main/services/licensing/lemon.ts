import os from "node:os";
import { shell } from "electron";
import { z } from "zod";

import type {
  CheckoutOpenInput,
  CheckoutOpenResult,
  LicenseActivationInput,
  LicenseActivationResult,
  LicenseValidationResult,
  StoredLicenseState
} from "../../../shared/contracts";
import { env } from "../../config/env";
import {
  getStoredLicenseState,
  replaceStoredLicenseState
} from "./license-store";

const licenseMetaSchema = z.object({
  store_id: z.number().nullable().optional(),
  order_id: z.number().nullable().optional(),
  order_item_id: z.number().nullable().optional(),
  product_id: z.number().nullable().optional(),
  product_name: z.string().nullable().optional(),
  variant_id: z.number().nullable().optional(),
  variant_name: z.string().nullable().optional(),
  customer_id: z.number().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  customer_email: z.string().nullable().optional()
});

const licenseKeySchema = z.object({
  id: z.number(),
  status: z.string(),
  key: z.string(),
  activation_limit: z.number().nullable().optional(),
  activation_usage: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional()
});

const licenseInstanceSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    created_at: z.string().nullable().optional()
  })
  .nullable()
  .optional();

const activationResponseSchema = z.object({
  activated: z.boolean(),
  error: z.string().nullable().optional(),
  license_key: licenseKeySchema.optional(),
  instance: licenseInstanceSchema,
  meta: licenseMetaSchema.optional()
});

const validationResponseSchema = z.object({
  valid: z.boolean(),
  error: z.string().nullable().optional(),
  license_key: licenseKeySchema.optional(),
  instance: licenseInstanceSchema,
  meta: licenseMetaSchema.optional()
});

const getDefaultInstanceName = () => `Domizan Desktop - ${os.hostname()}`;

const ensureCheckoutConfigured = () => {
  if (!env.lemon.checkoutUrl) {
    throw new Error("Lemon checkout URL tanımlı değil.");
  }
};

const assertConfiguredProductMatch = (meta: z.infer<typeof licenseMetaSchema> | undefined) => {
  if (!meta) {
    return;
  }

  if (env.lemon.storeId && meta.store_id && env.lemon.storeId !== meta.store_id) {
    throw new Error("Lisans farklı bir store kaydına ait görünüyor.");
  }

  if (env.lemon.productId && meta.product_id && env.lemon.productId !== meta.product_id) {
    throw new Error("Lisans farklı bir Lemon ürününe ait görünüyor.");
  }

  if (env.lemon.variantId && meta.variant_id && env.lemon.variantId !== meta.variant_id) {
    throw new Error("Lisans farklı bir Lemon varyantına ait görünüyor.");
  }
};

const toStoredLicenseState = ({
  licenseKey,
  status,
  instanceId,
  instanceName,
  customerEmail,
  customerName,
  storeId,
  productId,
  variantId,
  orderId,
  orderItemId,
  expiresAt,
  activatedAt,
  validatedAt
}: {
  licenseKey: string;
  status: string;
  instanceId: string | null;
  instanceName: string | null;
  customerEmail: string | null;
  customerName: string | null;
  storeId: number | null;
  productId: number | null;
  variantId: number | null;
  orderId: number | null;
  orderItemId: number | null;
  expiresAt: string | null;
  activatedAt: string | null;
  validatedAt: string | null;
}): Omit<StoredLicenseState, "provider"> => ({
  licenseKey,
  licenseStatus: status,
  instanceId,
  instanceName,
  customerEmail,
  customerName,
  storeId,
  productId,
  variantId,
  orderId,
  orderItemId,
  expiresAt,
  activatedAt,
  validatedAt,
  updatedAt: new Date().toISOString()
});

const postLicenseRequest = async (path: "activate" | "validate" | "deactivate", payload: Record<string, string>) => {
  const body = new URLSearchParams(payload);
  const response = await fetch(`https://api.lemonsqueezy.com/v1/licenses/${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Lemon isteği başarısız oldu: ${response.status}`);
  }

  return response.json();
};

export const isLemonConfigured = () =>
  Boolean(env.lemon.checkoutUrl && env.lemon.storeId && env.lemon.variantId);

export const buildCheckoutUrl = (input?: CheckoutOpenInput) => {
  ensureCheckoutConfigured();

  const url = new URL(env.lemon.checkoutUrl);

  if (input?.email) {
    url.searchParams.set("checkout[email]", input.email);
  }

  if (input?.name) {
    url.searchParams.set("checkout[name]", input.name);
  }

  url.searchParams.set("checkout[custom][domizan_app]", "desktop");
  url.searchParams.set("checkout[custom][domizan_env]", env.lemon.mode);

  return url.toString();
};

export const openHostedCheckout = async (input?: CheckoutOpenInput): Promise<CheckoutOpenResult> => {
  try {
    const url = buildCheckoutUrl(input);
    await shell.openExternal(url);
    return {
      opened: true,
      url,
      error: null
    };
  } catch (error) {
    return {
      opened: false,
      url: null,
      error: error instanceof Error ? error.message : "Bilinmeyen checkout hatası"
    };
  }
};

export const activateLicense = async (
  input: LicenseActivationInput
): Promise<LicenseActivationResult> => {
  try {
    const payload = {
      license_key: input.licenseKey.trim(),
      instance_name: input.instanceName?.trim() || getDefaultInstanceName()
    };

    const json = await postLicenseRequest("activate", payload);
    const parsed = activationResponseSchema.parse(json);

    if (!parsed.activated || !parsed.license_key) {
      return {
        success: false,
        error: parsed.error ?? "Lisans aktifleştirilemedi.",
        license: null
      };
    }

    assertConfiguredProductMatch(parsed.meta);

    if (input.email && parsed.meta?.customer_email && input.email !== parsed.meta.customer_email) {
      return {
        success: false,
        error: "Girilen e-posta adresi Lemon siparişi ile eşleşmiyor.",
        license: null
      };
    }

    const stored = await replaceStoredLicenseState(
      toStoredLicenseState({
        licenseKey: parsed.license_key.key,
        status: parsed.license_key.status,
        instanceId: parsed.instance?.id ?? null,
        instanceName: parsed.instance?.name ?? payload.instance_name,
        customerEmail: parsed.meta?.customer_email ?? null,
        customerName: parsed.meta?.customer_name ?? null,
        storeId: parsed.meta?.store_id ?? null,
        productId: parsed.meta?.product_id ?? null,
        variantId: parsed.meta?.variant_id ?? null,
        orderId: parsed.meta?.order_id ?? null,
        orderItemId: parsed.meta?.order_item_id ?? null,
        expiresAt: parsed.license_key.expires_at ?? null,
        activatedAt: new Date().toISOString(),
        validatedAt: null
      })
    );

    return {
      success: true,
      error: null,
      license: stored
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bilinmeyen lisans aktivasyon hatası",
      license: null
    };
  }
};

export const validateStoredLicense = async (): Promise<LicenseValidationResult | null> => {
  const storedLicense = await getStoredLicenseState();
  if (!storedLicense) {
    return null;
  }

  try {
    const payload: Record<string, string> = {
      license_key: storedLicense.licenseKey
    };

    if (storedLicense.instanceId) {
      payload.instance_id = storedLicense.instanceId;
    }

    const json = await postLicenseRequest("validate", payload);
    const parsed = validationResponseSchema.parse(json);
    assertConfiguredProductMatch(parsed.meta);

    const nextState = await replaceStoredLicenseState(
      toStoredLicenseState({
        licenseKey: parsed.license_key?.key ?? storedLicense.licenseKey,
        status: parsed.license_key?.status ?? storedLicense.licenseStatus,
        instanceId: parsed.instance?.id ?? storedLicense.instanceId,
        instanceName: parsed.instance?.name ?? storedLicense.instanceName,
        customerEmail: parsed.meta?.customer_email ?? storedLicense.customerEmail,
        customerName: parsed.meta?.customer_name ?? storedLicense.customerName,
        storeId: parsed.meta?.store_id ?? storedLicense.storeId,
        productId: parsed.meta?.product_id ?? storedLicense.productId,
        variantId: parsed.meta?.variant_id ?? storedLicense.variantId,
        orderId: parsed.meta?.order_id ?? storedLicense.orderId,
        orderItemId: parsed.meta?.order_item_id ?? storedLicense.orderItemId,
        expiresAt: parsed.license_key?.expires_at ?? storedLicense.expiresAt,
        activatedAt: storedLicense.activatedAt,
        validatedAt: new Date().toISOString()
      })
    );

    return {
      valid: parsed.valid,
      error: parsed.error ?? null,
      license: nextState
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Bilinmeyen lisans doğrulama hatası",
      license: storedLicense
    };
  }
};
