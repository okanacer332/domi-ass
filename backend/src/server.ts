import express = require("express");
import helmet = require("helmet");
import { ZodError } from "zod";

import { env } from "./config/env";
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

app.disable("x-powered-by");
app.use(helmetMiddleware());

app.post(
  "/webhooks/lemon",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res, next) => {
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      const signatureHeader = req.header("X-Signature");

      if (!verifyWebhookSignature(rawBody, signatureHeader)) {
        return res.status(401).json({
          ok: false,
          error: "Geçersiz webhook imzası."
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

      return res.status(200).json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_, res) => {
  res.json({
    ok: true,
    service: "domizan-api",
    env: env.domizanEnv,
    lemon: getPublicLicensingConfig()
  });
});

app.post("/licenses/activate", async (req, res, next) => {
  try {
    const result = await activateLicenseViaLemon(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/licenses/validate", async (req, res, next) => {
  try {
    const result = await validateLicenseViaLemon(req.body);
    res.status(result.valid ? 200 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: error.issues[0]?.message ?? "Geçersiz istek."
    });
  }

  const message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.";
  return res.status(500).json({
    ok: false,
    error: message
  });
});

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
