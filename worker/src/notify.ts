import fetch from "node-fetch";

const REQUEST_TIMEOUT_MS = 15_000;

export async function notifyIngestionIssue(message: string): Promise<void> {
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
    const response = await fetch(endpoint, {
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
  } finally {
    clearTimeout(timeout);
  }
}