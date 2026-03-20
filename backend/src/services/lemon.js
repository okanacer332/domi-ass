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
exports.getPublicLicensingConfig = exports.parseWebhookPayload = exports.verifyWebhookSignature = exports.validateLicenseViaLemon = exports.activateLicenseViaLemon = void 0;
var node_crypto_1 = require("node:crypto");
var zod_1 = require("zod");
var env_1 = require("../config/env");
var licenseMetaSchema = zod_1.z.object({
    store_id: zod_1.z.number().nullable().optional(),
    order_id: zod_1.z.number().nullable().optional(),
    order_item_id: zod_1.z.number().nullable().optional(),
    product_id: zod_1.z.number().nullable().optional(),
    product_name: zod_1.z.string().nullable().optional(),
    variant_id: zod_1.z.number().nullable().optional(),
    variant_name: zod_1.z.string().nullable().optional(),
    customer_id: zod_1.z.number().nullable().optional(),
    customer_name: zod_1.z.string().nullable().optional(),
    customer_email: zod_1.z.string().nullable().optional()
});
var licenseKeySchema = zod_1.z.object({
    id: zod_1.z.number(),
    status: zod_1.z.string(),
    key: zod_1.z.string(),
    activation_limit: zod_1.z.number().nullable().optional(),
    activation_usage: zod_1.z.number().nullable().optional(),
    created_at: zod_1.z.string().nullable().optional(),
    expires_at: zod_1.z.string().nullable().optional()
});
var licenseInstanceSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    name: zod_1.z.string().nullable().optional(),
    created_at: zod_1.z.string().nullable().optional()
})
    .nullable()
    .optional();
var activationRequestSchema = zod_1.z.object({
    licenseKey: zod_1.z.string().trim().min(3, "Lisans anahtarı zorunludur."),
    email: zod_1.z.string().trim().email("Geçerli bir e-posta girilmelidir.").optional(),
    instanceName: zod_1.z.string().trim().min(2).max(120).optional()
});
var validationRequestSchema = zod_1.z.object({
    licenseKey: zod_1.z.string().trim().min(3, "Lisans anahtarı zorunludur."),
    instanceId: zod_1.z.string().trim().min(2).optional()
});
var activationResponseSchema = zod_1.z.object({
    activated: zod_1.z.boolean(),
    error: zod_1.z.string().nullable().optional(),
    license_key: licenseKeySchema.optional(),
    instance: licenseInstanceSchema,
    meta: licenseMetaSchema.optional()
});
var validationResponseSchema = zod_1.z.object({
    valid: zod_1.z.boolean(),
    error: zod_1.z.string().nullable().optional(),
    license_key: licenseKeySchema.optional(),
    instance: licenseInstanceSchema,
    meta: licenseMetaSchema.optional()
});
var webhookEventSchema = zod_1.z.object({
    meta: zod_1.z
        .object({
        event_name: zod_1.z.string()
    })
        .passthrough(),
    data: zod_1.z.unknown()
});
var assertConfiguredProductMatch = function (meta) {
    if (!meta) {
        return;
    }
    if (meta.store_id && meta.store_id !== env_1.env.lemon.storeId) {
        throw new Error("Lisans farklı bir store kaydına ait görünüyor.");
    }
    if (meta.product_id && meta.product_id !== env_1.env.lemon.productId) {
        throw new Error("Lisans farklı bir Lemon ürününe ait görünüyor.");
    }
    if (meta.variant_id && meta.variant_id !== env_1.env.lemon.variantId) {
        throw new Error("Lisans farklı bir Lemon varyantına ait görünüyor.");
    }
};
var postLicenseRequest = function (actionPath, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var body, response;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = new URLSearchParams(payload);
                return [4 /*yield*/, fetch("https://api.lemonsqueezy.com/v1/licenses/".concat(actionPath), {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: body
                    })];
            case 1:
                response = _a.sent();
                if (!response.ok) {
                    throw new Error("Lemon iste\u011Fi ba\u015Far\u0131s\u0131z oldu: ".concat(response.status));
                }
                return [2 /*return*/, response.json()];
        }
    });
}); };
var mapLicense = function (_a) {
    var licenseKey = _a.licenseKey, status = _a.status, instanceId = _a.instanceId, instanceName = _a.instanceName, customerEmail = _a.customerEmail, customerName = _a.customerName, storeId = _a.storeId, productId = _a.productId, variantId = _a.variantId, orderId = _a.orderId, orderItemId = _a.orderItemId, expiresAt = _a.expiresAt, activatedAt = _a.activatedAt, validatedAt = _a.validatedAt;
    return ({
        provider: "lemonsqueezy",
        licenseKey: licenseKey,
        licenseStatus: status,
        instanceId: instanceId,
        instanceName: instanceName,
        customerEmail: customerEmail,
        customerName: customerName,
        storeId: storeId,
        productId: productId,
        variantId: variantId,
        orderId: orderId,
        orderItemId: orderItemId,
        expiresAt: expiresAt,
        activatedAt: activatedAt,
        validatedAt: validatedAt,
        updatedAt: new Date().toISOString()
    });
};
var activateLicenseViaLemon = function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var parsedInput, payload, json, parsed;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
    return __generator(this, function (_y) {
        switch (_y.label) {
            case 0:
                parsedInput = activationRequestSchema.parse(input);
                payload = {
                    license_key: parsedInput.licenseKey,
                    instance_name: (_a = parsedInput.instanceName) !== null && _a !== void 0 ? _a : "Domizan Desktop"
                };
                return [4 /*yield*/, postLicenseRequest("activate", payload)];
            case 1:
                json = _y.sent();
                parsed = activationResponseSchema.parse(json);
                if (!parsed.activated || !parsed.license_key) {
                    return [2 /*return*/, {
                            success: false,
                            error: (_b = parsed.error) !== null && _b !== void 0 ? _b : "Lisans aktifleştirilemedi.",
                            license: null
                        }];
                }
                assertConfiguredProductMatch(parsed.meta);
                if (parsedInput.email &&
                    ((_c = parsed.meta) === null || _c === void 0 ? void 0 : _c.customer_email) &&
                    parsedInput.email.toLocaleLowerCase("tr-TR") !==
                        parsed.meta.customer_email.toLocaleLowerCase("tr-TR")) {
                    return [2 /*return*/, {
                            success: false,
                            error: "Girilen e-posta adresi Lemon siparişi ile eşleşmiyor.",
                            license: null
                        }];
                }
                return [2 /*return*/, {
                        success: true,
                        error: null,
                        license: mapLicense({
                            licenseKey: parsed.license_key.key,
                            status: parsed.license_key.status,
                            instanceId: (_e = (_d = parsed.instance) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : null,
                            instanceName: (_g = (_f = parsed.instance) === null || _f === void 0 ? void 0 : _f.name) !== null && _g !== void 0 ? _g : payload.instance_name,
                            customerEmail: (_j = (_h = parsed.meta) === null || _h === void 0 ? void 0 : _h.customer_email) !== null && _j !== void 0 ? _j : null,
                            customerName: (_l = (_k = parsed.meta) === null || _k === void 0 ? void 0 : _k.customer_name) !== null && _l !== void 0 ? _l : null,
                            storeId: (_o = (_m = parsed.meta) === null || _m === void 0 ? void 0 : _m.store_id) !== null && _o !== void 0 ? _o : null,
                            productId: (_q = (_p = parsed.meta) === null || _p === void 0 ? void 0 : _p.product_id) !== null && _q !== void 0 ? _q : null,
                            variantId: (_s = (_r = parsed.meta) === null || _r === void 0 ? void 0 : _r.variant_id) !== null && _s !== void 0 ? _s : null,
                            orderId: (_u = (_t = parsed.meta) === null || _t === void 0 ? void 0 : _t.order_id) !== null && _u !== void 0 ? _u : null,
                            orderItemId: (_w = (_v = parsed.meta) === null || _v === void 0 ? void 0 : _v.order_item_id) !== null && _w !== void 0 ? _w : null,
                            expiresAt: (_x = parsed.license_key.expires_at) !== null && _x !== void 0 ? _x : null,
                            activatedAt: new Date().toISOString(),
                            validatedAt: null
                        })
                    }];
        }
    });
}); };
exports.activateLicenseViaLemon = activateLicenseViaLemon;
var validateLicenseViaLemon = function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var parsedInput, payload, json, parsed;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    return __generator(this, function (_x) {
        switch (_x.label) {
            case 0:
                parsedInput = validationRequestSchema.parse(input);
                payload = {
                    license_key: parsedInput.licenseKey
                };
                if (parsedInput.instanceId) {
                    payload.instance_id = parsedInput.instanceId;
                }
                return [4 /*yield*/, postLicenseRequest("validate", payload)];
            case 1:
                json = _x.sent();
                parsed = validationResponseSchema.parse(json);
                assertConfiguredProductMatch(parsed.meta);
                return [2 /*return*/, {
                        valid: parsed.valid,
                        error: (_a = parsed.error) !== null && _a !== void 0 ? _a : null,
                        license: parsed.license_key
                            ? mapLicense({
                                licenseKey: parsed.license_key.key,
                                status: parsed.license_key.status,
                                instanceId: (_d = (_c = (_b = parsed.instance) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : parsedInput.instanceId) !== null && _d !== void 0 ? _d : null,
                                instanceName: (_f = (_e = parsed.instance) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : null,
                                customerEmail: (_h = (_g = parsed.meta) === null || _g === void 0 ? void 0 : _g.customer_email) !== null && _h !== void 0 ? _h : null,
                                customerName: (_k = (_j = parsed.meta) === null || _j === void 0 ? void 0 : _j.customer_name) !== null && _k !== void 0 ? _k : null,
                                storeId: (_m = (_l = parsed.meta) === null || _l === void 0 ? void 0 : _l.store_id) !== null && _m !== void 0 ? _m : null,
                                productId: (_p = (_o = parsed.meta) === null || _o === void 0 ? void 0 : _o.product_id) !== null && _p !== void 0 ? _p : null,
                                variantId: (_r = (_q = parsed.meta) === null || _q === void 0 ? void 0 : _q.variant_id) !== null && _r !== void 0 ? _r : null,
                                orderId: (_t = (_s = parsed.meta) === null || _s === void 0 ? void 0 : _s.order_id) !== null && _t !== void 0 ? _t : null,
                                orderItemId: (_v = (_u = parsed.meta) === null || _u === void 0 ? void 0 : _u.order_item_id) !== null && _v !== void 0 ? _v : null,
                                expiresAt: (_w = parsed.license_key.expires_at) !== null && _w !== void 0 ? _w : null,
                                activatedAt: null,
                                validatedAt: new Date().toISOString()
                            })
                            : null
                    }];
        }
    });
}); };
exports.validateLicenseViaLemon = validateLicenseViaLemon;
var verifyWebhookSignature = function (rawBody, signatureHeader) {
    if (!signatureHeader) {
        return false;
    }
    var expected = (0, node_crypto_1.createHmac)("sha256", env_1.env.lemon.webhookSecret).update(rawBody).digest("hex");
    var expectedBuffer = Buffer.from(expected, "utf8");
    var receivedBuffer = Buffer.from(signatureHeader, "utf8");
    if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(expectedBuffer, receivedBuffer);
};
exports.verifyWebhookSignature = verifyWebhookSignature;
var parseWebhookPayload = function (rawBody) {
    return webhookEventSchema.parse(JSON.parse(rawBody.toString("utf8")));
};
exports.parseWebhookPayload = parseWebhookPayload;
var getPublicLicensingConfig = function () { return ({
    mode: env_1.env.lemon.mode,
    storeId: env_1.env.lemon.storeId,
    productId: env_1.env.lemon.productId,
    variantId: env_1.env.lemon.variantId,
    checkoutUrl: env_1.env.lemon.checkoutUrl
}); };
exports.getPublicLicensingConfig = getPublicLicensingConfig;
