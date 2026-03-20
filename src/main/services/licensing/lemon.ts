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
import { ensureInstallationBinding } from "./device-binding";
import { getStoredLicenseState, replaceStoredLicenseState } from "./license-store";
import { syncSharedLicenseState } from "./shared-access-state";

const licenseSchema = z.object({
  provider: z.literal("lemonsqueezy"),
  licenseKey: z.string(),
  licenseStatus: z.string(),
  instanceId: z.string().nullable(),
  instanceName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerName: z.string().nullable(),
  storeId: z.number().nullable(),
  productId: z.number().nullable(),
  variantId: z.number().nullable(),
  orderId: z.number().nullable(),
  orderItemId: z.number().nullable(),
  expiresAt: z.string().nullable(),
  activatedAt: z.string().nullable(),
  validatedAt: z.string().nullable(),
  updatedAt: z.string()
});

const activationResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().nullable(),
  license: licenseSchema.nullable()
});

const validationResponseSchema = z.object({
  valid: z.boolean(),
  error: z.string().nullable(),
  license: licenseSchema.nullable()
});

const ensureCheckoutConfigured = () => {
  if (!env.lemon.checkoutUrl) {
    throw new Error("Lemon checkout URL tanımlı değil.");
  }
};

const ensureLicensingApiConfigured = () => {
  if (!env.domizanApiBaseUrl) {
    throw new Error("DOMIZAN_API_BASE_URL tanımlı değil.");
  }
};

const postLicensingRequest = async <TResponse>(
  endpoint: string,
  payload: Record<string, string>
): Promise<TResponse> => {
  ensureLicensingApiConfigured();

  const response = await fetch(new URL(endpoint, env.domizanApiBaseUrl).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json();

  if (!response.ok) {
    if (typeof json?.error === "string" && json.error) {
      throw new Error(json.error);
    }

    throw new Error(`Lisans servisi hatası: ${response.status}`);
  }

  return json as TResponse;
};

export const isLemonConfigured = () =>
  Boolean(
    env.lemon.checkoutUrl &&
      env.lemon.storeId &&
      env.lemon.variantId &&
      env.domizanApiBaseUrl
  );

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
    const installation = await ensureInstallationBinding();

    if (installation.bindingStatus === "mismatch") {
      return {
        success: false,
        error: "Bu kurulum farklı bir cihaza taşınmış görünüyor. Lisans etkinleştirilemez.",
        license: null
      };
    }

    const parsed = activationResponseSchema.parse(
      await postLicensingRequest("/licenses/activate", {
        licenseKey: input.licenseKey.trim(),
        email: input.email?.trim() ?? "",
        instanceName:
          input.instanceName?.trim() ||
          `Domizan Desktop - ${installation.deviceLabel} - ${installation.installationId.slice(0, 8)}`
      })
    );

    if (!parsed.success || !parsed.license) {
      return {
        success: false,
        error: parsed.error ?? "Lisans aktifleştirilemedi.",
        license: null
      };
    }

    const stored = await replaceStoredLicenseState({
      licenseKey: parsed.license.licenseKey,
      licenseStatus: parsed.license.licenseStatus,
      instanceId: parsed.license.instanceId,
      instanceName: parsed.license.instanceName,
      customerEmail: parsed.license.customerEmail,
      customerName: parsed.license.customerName,
      storeId: parsed.license.storeId,
      productId: parsed.license.productId,
      variantId: parsed.license.variantId,
      orderId: parsed.license.orderId,
      orderItemId: parsed.license.orderItemId,
      expiresAt: parsed.license.expiresAt,
      activatedAt: parsed.license.activatedAt,
      validatedAt: parsed.license.validatedAt,
      updatedAt: parsed.license.updatedAt
    });

    syncSharedLicenseState({
      installationId: installation.installationId,
      licenseKey: stored.licenseKey,
      status: stored.licenseStatus,
      activatedAt: stored.activatedAt,
      validatedAt: stored.validatedAt
    });

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
    const installation = await ensureInstallationBinding();
    const parsed = validationResponseSchema.parse(
      await postLicensingRequest("/licenses/validate", {
        licenseKey: storedLicense.licenseKey,
        instanceId: storedLicense.instanceId ?? ""
      })
    );

    const nextState = parsed.license
      ? await replaceStoredLicenseState({
          licenseKey: parsed.license.licenseKey,
          licenseStatus: parsed.license.licenseStatus,
          instanceId: parsed.license.instanceId,
          instanceName: parsed.license.instanceName,
          customerEmail: parsed.license.customerEmail,
          customerName: parsed.license.customerName,
          storeId: parsed.license.storeId,
          productId: parsed.license.productId,
          variantId: parsed.license.variantId,
          orderId: parsed.license.orderId,
          orderItemId: parsed.license.orderItemId,
          expiresAt: parsed.license.expiresAt,
          activatedAt: storedLicense.activatedAt,
          validatedAt: parsed.license.validatedAt,
          updatedAt: parsed.license.updatedAt
        })
      : storedLicense;

    syncSharedLicenseState({
      installationId: installation.installationId,
      licenseKey: nextState.licenseKey,
      status: nextState.licenseStatus,
      activatedAt: nextState.activatedAt,
      validatedAt: nextState.validatedAt
    });

    return {
      valid: parsed.valid,
      error: parsed.error,
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
