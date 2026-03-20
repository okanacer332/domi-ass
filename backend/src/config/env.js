"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
var dotenv_1 = require("dotenv");
var node_path_1 = require("node:path");
dotenv_1.default.config({
    path: node_path_1.default.resolve(process.cwd(), ".env")
});
var parseRequiredNumber = function (value, label) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error("".concat(label, " tan\u0131ml\u0131 de\u011Fil."));
    }
    return parsed;
};
var parseRequiredString = function (value, label) {
    if (!(value === null || value === void 0 ? void 0 : value.trim())) {
        throw new Error("".concat(label, " tan\u0131ml\u0131 de\u011Fil."));
    }
    return value.trim();
};
exports.env = {
    port: Number((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 8080),
    nodeEnv: (_b = process.env.NODE_ENV) !== null && _b !== void 0 ? _b : "development",
    domizanEnv: (_c = process.env.DOMIZAN_ENV) !== null && _c !== void 0 ? _c : "development",
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
