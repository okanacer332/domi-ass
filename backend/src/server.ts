import express = require("express");
import helmet = require("helmet");
import { ZodError } from "zod";

import { env } from "./config/env";
import {
  createAdminAccessToken,
  getAdminPublicUser,
  readBearerToken,
  verifyAdminAccessToken,
  verifyAdminCredentials
} from "./services/admin-auth";
import {
  blockDevice,
  claimTelegramOwner,
  extendOrganizationLicense,
  generateManualOrganization,
  getAuditLogs,
  getDesktopAgentConfig,
  getDevice,
  getDeviceActivity,
  getOrganization,
  getOrganizationUsage,
  getOverview,
  getSettings,
  listAllDevices,
  listOrganizationDevices,
  listOrganizations,
  listOrganizationUsers,
  registerAgentUsage,
  registerTelegramActivity,
  removeDevice,
  resetOrganizationTokens,
  revokeOrganization,
  setGeminiCoordinatorKey,
  setOrganizationGeminiKey,
  setOrganizationTelegramBot,
  syncOrganizationFromDesktop,
  unblockDevice,
  updateOrganization,
  updateOrganizationDeviceLimit,
  updateOrganizationTokenLimit
} from "./services/admin-store";
import {
  activateLicenseViaLemon,
  getPublicLicensingConfig,
  parseWebhookPayload,
  validateLicenseViaLemon,
  verifyWebhookSignature
} from "./services/lemon";

const app = express();
const helmetMiddleware: () => express.RequestHandler =
  (helmet as unknown as { default?: () => express.RequestHandler }).default ??
  (helmet as unknown as () => express.RequestHandler);

const readNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readParam = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";

const requireAdmin = (
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
) => {
  const token = readBearerToken(request);
  const payload = verifyAdminAccessToken(token);

  if (!payload) {
    return response.status(401).json({
      success: false,
      message: "Admin yetkisi gecersiz."
    });
  }

  return next();
};

app.disable("x-powered-by");
app.use(helmetMiddleware());
app.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", request.header("Origin") ?? "*");
  response.header("Vary", "Origin");
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (request.method === "OPTIONS") {
    return response.sendStatus(204);
  }

  return next();
});

app.post(
  "/webhooks/lemon",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (request, response, next) => {
    try {
      const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.from(request.body);
      const signatureHeader = request.header("X-Signature");

      if (!verifyWebhookSignature(rawBody, signatureHeader)) {
        return response.status(401).json({
          ok: false,
          success: false,
          message: "Gecersiz webhook imzasi."
        });
      }

      const payload = parseWebhookPayload(rawBody);
      console.log(
        JSON.stringify({
          scope: "lemon-webhook",
          event: payload.meta.event_name,
          receivedAt: new Date().toISOString()
        })
      );

      return response.status(200).json({ ok: true, success: true });
    } catch (error) {
      return next(error);
    }
  }
);

app.use(express.json({ limit: "2mb" }));

app.get("/health", async (_request, response) => {
  const overview = await getOverview();
  response.json({
    ok: true,
    service: "domizan-api",
    env: env.domizanEnv,
    lemon: getPublicLicensingConfig(),
    admin: {
      organizations: overview.stats.totalOrganizations,
      devices: overview.stats.totalDevices
    }
  });
});

app.post("/auth/login", async (request, response) => {
  const username = typeof request.body?.username === "string" ? request.body.username : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";

  if (!verifyAdminCredentials(username, password)) {
    return response.status(401).json({
      success: false,
      message: "Kullanici adi veya sifre gecersiz."
    });
  }

  const adminUser = getAdminPublicUser();

  return response.json({
    success: true,
    token: createAdminAccessToken(adminUser.username),
    username: adminUser.username,
    role: adminUser.role
  });
});

app.post("/licenses/activate", async (request, response, next) => {
  try {
    const result = await activateLicenseViaLemon(request.body);
    response.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/licenses/validate", async (request, response, next) => {
  try {
    const result = await validateLicenseViaLemon(request.body);
    response.status(result.valid ? 200 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/desktop/sync", async (request, response, next) => {
  try {
    const result = await syncOrganizationFromDesktop(request.body);
    response.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

app.get("/desktop/agent-config", async (request, response, next) => {
  try {
    const licenseKey =
      typeof request.query.licenseKey === "string" && request.query.licenseKey.trim()
        ? request.query.licenseKey
        : null;
    const installationId =
      typeof request.query.installationId === "string" ? request.query.installationId : "";

    if (!installationId.trim()) {
      return response.status(400).json({
        success: false,
        message: "installationId zorunlu."
      });
    }

    const result = await getDesktopAgentConfig(licenseKey, installationId);
    if (!result) {
      return response.status(404).json({
        success: false,
        message: "Masaustu agent konfigurasyonu bulunamadi."
      });
    }

    return response.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

app.post("/desktop/telegram/claim-owner", async (request, response, next) => {
  try {
    const result = await claimTelegramOwner(request.body);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/desktop/agent-usage", async (request, response, next) => {
  try {
    const result = await registerAgentUsage(request.body);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/desktop/telegram-activity", async (request, response, next) => {
  try {
    const result = await registerTelegramActivity(request.body);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/admin/stats", requireAdmin, async (_request, response, next) => {
  try {
    const overview = await getOverview();
    response.json(overview.stats);
  } catch (error) {
    next(error);
  }
});

app.get("/admin/overview", requireAdmin, async (_request, response, next) => {
  try {
    response.json(await getOverview());
  } catch (error) {
    next(error);
  }
});

app.get("/admin/organizations", requireAdmin, async (_request, response, next) => {
  try {
    response.json(await listOrganizations());
  } catch (error) {
    next(error);
  }
});

app.get("/admin/organizations/:organizationId", requireAdmin, async (request, response, next) => {
  try {
    const organizationId = readParam(request.params.organizationId);
    const result = await getOrganization(organizationId);
    if (!result) {
      return response.status(404).json({
        success: false,
        message: "Organizasyon bulunamadi."
      });
    }

    return response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/admin/organizations/:organizationId/users", requireAdmin, async (request, response, next) => {
  try {
    response.json(await listOrganizationUsers(readParam(request.params.organizationId)));
  } catch (error) {
    next(error);
  }
});

app.get("/admin/organizations/:organizationId/devices", requireAdmin, async (request, response, next) => {
  try {
    response.json(await listOrganizationDevices(readParam(request.params.organizationId)));
  } catch (error) {
    next(error);
  }
});

app.get("/admin/organizations/:organizationId/usage", requireAdmin, async (request, response, next) => {
  try {
    response.json(await getOrganizationUsage(readParam(request.params.organizationId)));
  } catch (error) {
    next(error);
  }
});

app.put("/admin/organizations/:organizationId", requireAdmin, async (request, response, next) => {
  try {
    response.json(await updateOrganization(readParam(request.params.organizationId), request.body));
  } catch (error) {
    next(error);
  }
});

app.put("/admin/organizations/:organizationId/extend", requireAdmin, async (request, response, next) => {
  try {
    response.json(
      await extendOrganizationLicense(readParam(request.params.organizationId), readNumber(request.body?.days))
    );
  } catch (error) {
    next(error);
  }
});

app.put(
  "/admin/organizations/:organizationId/token-limit",
  requireAdmin,
  async (request, response, next) => {
    try {
      response.json(
        await updateOrganizationTokenLimit(
          readParam(request.params.organizationId),
          readNumber(request.body?.limit)
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  "/admin/organizations/:organizationId/device-limit",
  requireAdmin,
  async (request, response, next) => {
    try {
      response.json(
        await updateOrganizationDeviceLimit(
          readParam(request.params.organizationId),
          readNumber(request.body?.maxDevices, 1)
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/admin/organizations/:organizationId/reset-tokens",
  requireAdmin,
  async (request, response, next) => {
    try {
      response.json(await resetOrganizationTokens(readParam(request.params.organizationId)));
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  "/admin/organizations/:organizationId/telegram-bot",
  requireAdmin,
  async (request, response, next) => {
    try {
      response.json(
        await setOrganizationTelegramBot(
          readParam(request.params.organizationId),
          typeof request.body?.botToken === "string" ? request.body.botToken.trim() || null : null,
          typeof request.body?.botUsername === "string"
            ? request.body.botUsername.trim() || null
            : null
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  "/admin/organizations/:organizationId/gemini-key",
  requireAdmin,
  async (request, response, next) => {
    try {
      response.json(
        await setOrganizationGeminiKey(
          readParam(request.params.organizationId),
          typeof request.body?.geminiApiKey === "string"
            ? request.body.geminiApiKey.trim() || null
            : null
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

app.put("/admin/organizations/:organizationId/revoke", requireAdmin, async (request, response, next) => {
  try {
    response.json(await revokeOrganization(readParam(request.params.organizationId)));
  } catch (error) {
    next(error);
  }
});

app.delete(
  "/admin/organizations/:organizationId/devices/:deviceId",
  requireAdmin,
  async (request, response, next) => {
    try {
      response.json(
        await removeDevice(
          readParam(request.params.organizationId),
          readParam(request.params.deviceId)
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

app.get("/admin/devices", requireAdmin, async (request, response, next) => {
  try {
    response.json(
      await listAllDevices({
        search: typeof request.query.search === "string" ? request.query.search : undefined,
        status: typeof request.query.status === "string" ? request.query.status : undefined
      })
    );
  } catch (error) {
    next(error);
  }
});

app.get("/admin/devices/:deviceId", requireAdmin, async (request, response, next) => {
  try {
    const result = await getDevice(readParam(request.params.deviceId));
    if (!result) {
      return response.status(404).json({
        success: false,
        message: "Cihaz bulunamadi."
      });
    }

    return response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/admin/devices/:deviceId/activity", requireAdmin, async (request, response, next) => {
  try {
    response.json(await getDeviceActivity(readParam(request.params.deviceId)));
  } catch (error) {
    next(error);
  }
});

app.post("/admin/devices/:deviceId/block", requireAdmin, async (request, response, next) => {
  try {
    const reason =
      typeof request.body?.reason === "string" && request.body.reason.trim()
        ? request.body.reason.trim()
        : "Admin panelinden manuel engellendi";

    response.json(await blockDevice(readParam(request.params.deviceId), reason));
  } catch (error) {
    next(error);
  }
});

app.post("/admin/devices/:deviceId/unblock", requireAdmin, async (request, response, next) => {
  try {
    response.json(await unblockDevice(readParam(request.params.deviceId)));
  } catch (error) {
    next(error);
  }
});

app.get("/admin/audit-logs", requireAdmin, async (request, response, next) => {
  try {
    const page = Math.max(0, readNumber(request.query.page, 0));
    const size = Math.max(1, readNumber(request.query.size, 20));
    const category =
      typeof request.query.category === "string" ? request.query.category.toLocaleLowerCase("tr-TR") : "";

    const allLogs = await getAuditLogs();
    const filtered = category
      ? allLogs.filter((entry) => entry.action.toLocaleLowerCase("tr-TR").includes(category))
      : allLogs;
    const content = filtered.slice(page * size, page * size + size);

    response.json({
      content,
      page,
      size,
      totalElements: filtered.length
    });
  } catch (error) {
    next(error);
  }
});

app.get("/admin/settings", requireAdmin, async (_request, response, next) => {
  try {
    response.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

app.put("/admin/settings/gemini-coordinator-key", requireAdmin, async (request, response, next) => {
  try {
    response.json(
      await setGeminiCoordinatorKey(
        typeof request.body?.geminiApiKey === "string" ? request.body.geminiApiKey.trim() : ""
      )
    );
  } catch (error) {
    next(error);
  }
});

app.post("/admin/licenses/generate", requireAdmin, async (request, response, next) => {
  try {
    response.json(
      await generateManualOrganization({
        companyName: request.body?.companyName,
        email: request.body?.email,
        packageType: request.body?.packageType === "PREMIUM" ? "PREMIUM" : "TRIAL",
        durationDays: Math.max(1, readNumber(request.body?.durationDays, 7)),
        maxDevices: Math.max(1, readNumber(request.body?.maxDevices, 5)),
        telegramBotToken: request.body?.telegramBotToken,
        telegramBotUsername: request.body?.telegramBotUsername,
        geminiApiKey: request.body?.geminiApiKey
      })
    );
  } catch (error) {
    next(error);
  }
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    if (error instanceof ZodError) {
      return response.status(400).json({
        ok: false,
        success: false,
        error: error.issues[0]?.message ?? "Gecersiz istek.",
        message: error.issues[0]?.message ?? "Gecersiz istek."
      });
    }

    const message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatasi.";
    return response.status(500).json({
      ok: false,
      success: false,
      error: message,
      message
    });
  }
);

app.listen(env.port, () => {
  console.log(
    JSON.stringify({
      scope: "bootstrap",
      service: "domizan-api",
      port: env.port,
      env: env.domizanEnv
    })
  );
});
