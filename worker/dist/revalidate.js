"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revalidateWebCache = revalidateWebCache;
const node_fetch_1 = __importDefault(require("node-fetch"));
const REQUEST_TIMEOUT_MS = 30000;
async function revalidateWebCache() {
    const endpoint = process.env.WEB_REVALIDATE_URL;
    const secret = process.env.WEB_REVALIDATE_SECRET;
    if (!endpoint) {
        console.log("→ Skipping cache invalidation: WEB_REVALIDATE_URL is not set.");
        return;
    }
    if (!secret) {
        console.warn("⚠  Skipping cache invalidation: WEB_REVALIDATE_SECRET is not set.");
        return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await (0, node_fetch_1.default)(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-revalidate-secret": secret,
            },
            body: JSON.stringify({ source: "worker" }),
            signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({})));
        if (!response.ok || payload.ok !== true) {
            throw new Error(payload.error ?? `HTTP ${response.status} ${response.statusText}`);
        }
        const pathsCount = payload.revalidatedPaths?.length ?? 0;
        console.log(`→ Cache invalidation done (${pathsCount} path(s), ${payload.resortCount ?? 0} resort page(s)).`);
    }
    finally {
        clearTimeout(timeout);
    }
}
