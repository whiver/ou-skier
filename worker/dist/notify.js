"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyIngestionIssue = notifyIngestionIssue;
const node_fetch_1 = __importDefault(require("node-fetch"));
const REQUEST_TIMEOUT_MS = 15000;
async function notifyIngestionIssue(message) {
    const topic = process.env.NTFY_TOPIC;
    if (!topic) {
        console.log("→ Skipping ntfy notification: NTFY_TOPIC is not set.");
        return;
    }
    const baseUrl = process.env.NTFY_BASE_URL ?? "https://ntfy.sh";
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/${topic}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await (0, node_fetch_1.default)(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
            body: message,
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        console.log(`→ Sent ingestion warning notification to ${endpoint}.`);
    }
    finally {
        clearTimeout(timeout);
    }
}
