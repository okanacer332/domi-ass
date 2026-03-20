"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var helmet_1 = require("helmet");
var zod_1 = require("zod");
var env_1 = require("./config/env");
var lemon_1 = require("./services/lemon");
var app = (0, express_1.default)();
app.disable("x-powered-by");
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
app.get("/health", function (_, res) {
    res.json({
        ok: true,
        service: "domizan-api",
        env: env_1.env.domizanEnv,
        lemon: (0, lemon_1.getPublicLicensingConfig)()
    });
});
app.post("/licenses/activate", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, lemon_1.activateLicenseViaLemon)(req.body)];
            case 1:
                result = _a.sent();
                res.status(result.success ? 200 : 400).json(result);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                next(error_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post("/licenses/validate", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, lemon_1.validateLicenseViaLemon)(req.body)];
            case 1:
                result = _a.sent();
                res.status(result.valid ? 200 : 400).json(result);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                next(error_2);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post("/webhooks/lemon", express_1.default.raw({ type: "application/json", limit: "1mb" }), function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var rawBody, signatureHeader, payload;
    return __generator(this, function (_a) {
        try {
            rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
            signatureHeader = req.header("X-Signature");
            if (!(0, lemon_1.verifyWebhookSignature)(rawBody, signatureHeader)) {
                return [2 /*return*/, res.status(401).json({
                        ok: false,
                        error: "Geçersiz webhook imzası."
                    })];
            }
            payload = (0, lemon_1.parseWebhookPayload)(rawBody);
            console.log(JSON.stringify({
                scope: "lemon-webhook",
                event: payload.meta.event_name,
                receivedAt: new Date().toISOString()
            }));
            return [2 /*return*/, res.status(200).json({ ok: true })];
        }
        catch (error) {
            next(error);
        }
        return [2 /*return*/];
    });
}); });
app.use(function (error, _req, res, _next) {
    var _a, _b;
    if (error instanceof zod_1.ZodError) {
        return res.status(400).json({
            ok: false,
            error: (_b = (_a = error.issues[0]) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : "Geçersiz istek."
        });
    }
    var message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.";
    return res.status(500).json({
        ok: false,
        error: message
    });
});
app.listen(env_1.env.port, function () {
    console.log(JSON.stringify({
        scope: "bootstrap",
        service: "domizan-api",
        port: env_1.env.port,
        env: env_1.env.domizanEnv
    }));
});
