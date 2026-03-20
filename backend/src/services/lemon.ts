import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { env } from "../config/env";

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

const activationRequestSchema = z.object({
  licenseKey: z.string().trim().min(3, "Lisans anahtarı zorunludur."),
  email: z.string().trim().email("Geçerli bir e-posta girilmelidir.").optional(),
  instanceName: z.string().trim().min(2).max(120).optional()
});

const validationRequestSchema = z.object({
  licenseKey: z.string().trim().min(3, "Lisans anahtarı zorunludur."),
  instanceId: z.string().trim().min(2).optional()
});

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

const webhookEventSchema = z.object({
  meta: z
    .object({
      event_name: z.string()
    })
    .passthrough(),
  data: z.unknown()
});

const assertConfiguredProductMatch = (meta: z.infer<typeof licenseMetaSchema> | undefined) => {
  if (!meta) {
    return;
  }

  if (meta.store_id && meta.store_id !== env.lemon.storeId) {
    throw new Error("Lisans farklı bir store kaydına ait görünüyor.");
  }

  if (meta.product_id && meta.product_id !== env.lemon.productId) {
    throw new Error("Lisans farklı bir Lemon ürününe ait görünüyor.");
  }

  if (meta.variant_id && meta.variant_id !== env.lemon.variantId) {
    throw new Error("Lisans farklı bir Lemon varyantına ait görünüyor.");
  }
};

const postLicenseRequest = async (
  actionPath: "activate" | "validate" | "deactivate",
  payload: Record<string, string>
) => {
  const body = new URLSearchParams(payload);
  const response = await fetch(`https://api.lemonsqueezy.com/v1/licenses/${actionPath}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    let errorMessage = `Lemon isteği başarısız oldu: ${response.status}`;

    try {
      const json = (await response.json()) as { error?: string };
      if (json.error) {
        errorMessage = json.error;
      }
    } catch {
      // Fallback message is enough here.
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

const mapLicense = ({
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
}) => ({
  provider: "lemonsqueezy" as const,
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

export const activateLicenseViaLemon = async (input: unknown) => {
  try {
    const parsedInput = activationRequestSchema.parse(input);
    const payload = {
      license_key: parsedInput.licenseKey,
      instance_name: parsedInput.instanceName ?? "Domizan Desktop"
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

    if (
      parsedInput.email &&
      parsed.meta?.customer_email &&
      parsedInput.email.toLocaleLowerCase("tr-TR") !==
        parsed.meta.customer_email.toLocaleLowerCase("tr-TR")
    ) {
      return {
        success: false,
        error: "Girilen e-posta adresi Lemon siparişi ile eşleşmiyor.",
        license: null
      };
    }

    return {
      success: true,
      error: null,
      license: mapLicense({
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
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lisans aktifleştirilemedi.",
      license: null
    };
  }
};

export const validateLicenseViaLemon = async (input: unknown) => {
  try {
    const parsedInput = validationRequestSchema.parse(input);
    const payload: Record<string, string> = {
      license_key: parsedInput.licenseKey
    };

    if (parsedInput.instanceId) {
      payload.instance_id = parsedInput.instanceId;
    }

    const json = await postLicenseRequest("validate", payload);
    const parsed = validationResponseSchema.parse(json);
    assertConfiguredProductMatch(parsed.meta);

    return {
      valid: parsed.valid,
      error: parsed.error ?? null,
      license: parsed.license_key
        ? mapLicense({
            licenseKey: parsed.license_key.key,
            status: parsed.license_key.status,
            instanceId: parsed.instance?.id ?? parsedInput.instanceId ?? null,
            instanceName: parsed.instance?.name ?? null,
            customerEmail: parsed.meta?.customer_email ?? null,
            customerName: parsed.meta?.customer_name ?? null,
            storeId: parsed.meta?.store_id ?? null,
            productId: parsed.meta?.product_id ?? null,
            variantId: parsed.meta?.variant_id ?? null,
            orderId: parsed.meta?.order_id ?? null,
            orderItemId: parsed.meta?.order_item_id ?? null,
            expiresAt: parsed.license_key.expires_at ?? null,
            activatedAt: null,
            validatedAt: new Date().toISOString()
          })
        : null
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Lisans doğrulanamadı.",
      license: null
    };
  }
};

export const verifyWebhookSignature = (rawBody: Buffer, signatureHeader: string | undefined) => {
  if (!signatureHeader) {
    return false;
  }

  const expected = createHmac("sha256", env.lemon.webhookSecret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signatureHeader, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
};

export const parseWebhookPayload = (rawBody: Buffer) =>
  webhookEventSchema.parse(JSON.parse(rawBody.toString("utf8")));

export const getPublicLicensingConfig = () => ({
  mode: env.lemon.mode,
  storeId: env.lemon.storeId,
  productId: env.lemon.productId,
  variantId: env.lemon.variantId,
  checkoutUrl: env.lemon.checkoutUrl
});
