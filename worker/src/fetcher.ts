import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { ResortSnowData } from "./types";
import { normalizeResortName } from "./normalization";

const NORDIC_FRANCE_BULLETIN_URL =
  "https://www.nordicfrance.fr/le-bulletin-neige/";
const NORDIC_FRANCE_AJAX_URL =
  "https://www.nordicfrance.fr/cms/wp-admin/admin-ajax.php";
const POSTS_PER_PAGE = 50;
const MAX_PAGES = 40;
const PAGE_FETCH_ATTEMPTS = 3;
const PAGE_FETCH_RETRY_DELAY_MS = 1000;

type NordicMassifSlug =
  | "alpes_du_nord"
  | "alpes_du_sud"
  | "jura"
  | "massif_central"
  | "pyrenees"
  | "vosges"
  | "around-me";

interface BulletinPostMetadata {
  id: string;
  label: string;
  massif: NordicMassifSlug;
  permalink: string;
}

interface BulletinMetadataIndex {
  byPermalink: Map<string, BulletinPostMetadata>;
  byLabel: Map<string, BulletinPostMetadata>;
}

/**
 * Parses an open/total slopes string like "12/18" or "12".
 */
function parseSlopes(raw: string | undefined): [number | null, number | null] {
  if (!raw) return [null, null];
  const parts = raw.trim().split("/").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  if (parts.length === 1 && !isNaN(parts[0])) {
    return [parts[0], null];
  }
  return [null, null];
}

function parseFrenchDayMonth(raw: string | undefined): Date {
  if (!raw) return new Date();

  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return new Date();

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (Number.isNaN(day) || Number.isNaN(month)) return new Date();

  const now = new Date();
  const year = now.getUTCFullYear();
  let parsed = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(parsed.getTime())) return now;

  // The source only provides day/month without a year. If the resulting date
  // is in the future it most likely refers to the previous year (e.g. a
  // "30/12" update parsed in March 2026 should resolve to 2025-12-30).
  if (parsed.getTime() > now.getTime()) {
    parsed = new Date(Date.UTC(year - 1, month - 1, day));
  }

  return parsed;
}

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

async function wait(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function mapMassifToRegion(
  massif: NordicMassifSlug | null
): ResortSnowData["region"] {
  if (!massif) return null;

  const mapping: Record<NordicMassifSlug, ResortSnowData["region"]> = {
    alpes_du_nord: "AUVERGNE_RHONE_ALPES",
    alpes_du_sud: "PROVENCE_ALPES_COTE_D_AZUR",
    jura: "BOURGOGNE_FRANCHE_COMTE",
    massif_central: "AUVERGNE_RHONE_ALPES",
    pyrenees: "OCCITANIE",
    vosges: "GRAND_EST",
    "around-me": null,
  };

  return mapping[massif] ?? null;
}

function extractPostsJson(html: string): string | null {
  const marker = "this.posts =";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const arrayStart = html.indexOf("[", markerIndex);
  if (arrayStart === -1) return null;

  let depth = 0;
  let inString = false;
  let stringQuote = "";
  let escaped = false;

  for (let index = arrayStart; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return html.slice(arrayStart, index + 1);
      }
    }
  }

  return null;
}

async function fetchBulletinMetadataIndex(): Promise<BulletinMetadataIndex> {
  const response = await fetch(NORDIC_FRANCE_BULLETIN_URL, {
    headers: {
      "User-Agent":
        "ou-skier-bot/1.0 (+https://github.com/whiver/ou-skier) - snow data aggregator",
      Accept: "text/html, */*",
      Referer: NORDIC_FRANCE_BULLETIN_URL,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Nordic France bulletin page: HTTP ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const postsJson = extractPostsJson(html);
  if (!postsJson) {
    throw new Error(
      "Failed to locate Weather.posts metadata in Nordic France bulletin page"
    );
  }

  const parsed = JSON.parse(postsJson) as BulletinPostMetadata[];
  const byPermalink = new Map<string, BulletinPostMetadata>();
  const byLabel = new Map<string, BulletinPostMetadata>();

  for (const post of parsed) {
    if (!post.permalink || !post.label) continue;

    byPermalink.set(normalizeUrl(post.permalink), post);
    byLabel.set(normalizeResortName(post.label), post);
  }

  return {
    byPermalink,
    byLabel,
  };
}

async function fetchWeatherPage(page: number): Promise<string> {
  const form = new URLSearchParams({
    action: "load_more_weather",
    page: String(page),
    posts_per_pages: String(POSTS_PER_PAGE),
  });

  const response = await fetch(NORDIC_FRANCE_AJAX_URL, {
    method: "POST",
    headers: {
      "User-Agent":
        "ou-skier-bot/1.0 (+https://github.com/whiver/ou-skier) - snow data aggregator",
      Accept: "text/html, */*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://www.nordicfrance.fr",
      Referer: NORDIC_FRANCE_BULLETIN_URL,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: form.toString(),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Nordic France AJAX page ${page}: HTTP ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

async function fetchWeatherPageWithRetry(page: number): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= PAGE_FETCH_ATTEMPTS; attempt += 1) {
    try {
      if (attempt > 1) {
        console.warn(
          `⚠  Retrying Nordic France AJAX page ${page} (${attempt}/${PAGE_FETCH_ATTEMPTS})…`
        );
      }

      return await fetchWeatherPage(page);
    } catch (error) {
      lastError = error;
      if (attempt < PAGE_FETCH_ATTEMPTS) {
        await wait(PAGE_FETCH_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch Nordic France AJAX page ${page}`);
}

function parseWeatherCards(
  html: string,
  metadataIndex: BulletinMetadataIndex
): ResortSnowData[] {
  const $ = cheerio.load(html);
  const records: ResortSnowData[] = [];

  $(".Weather-itemContainer").each((_, container) => {
    const card = $(container);
    const name = card.find(".Weather-name").first().text().trim();
    if (!name) return;

    const slopesRaw = card.find(".Weather-pistes").first().text().replace(/\s+/g, " ").trim();
    const [openSlopes, totalSlopes] = parseSlopes(slopesRaw);

    const kmRaw = card.find(".Weather-km").first().text().replace(/\s+/g, " ").trim();
    const updateRaw = card
      .find(".Weather-neigeHeight")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const href = card.find("a.Weather-link").attr("href") ?? null;
    const domainUrl = href ? new URL(href, "https://www.nordicfrance.fr").toString() : null;
    const normalizedDomainUrl = domainUrl ? normalizeUrl(domainUrl) : null;
    const normalizedName = normalizeResortName(name);
    const metadata =
      (normalizedDomainUrl
        ? metadataIndex.byPermalink.get(normalizedDomainUrl)
        : undefined) ?? metadataIndex.byLabel.get(normalizedName);

    const massif = metadata?.massif ?? null;
    const recordDate = parseFrenchDayMonth(updateRaw);

    records.push({
      name,
      region: mapMassifToRegion(massif),
      domainUrl,
      recordDate,
      openSlopes,
      totalSlopes,
      notes: kmRaw || null,
      sourceUrl: domainUrl ?? NORDIC_FRANCE_BULLETIN_URL,
    });
  });

  return records;
}

/**
 * Fetches and parses snow condition data from the Nordic France bulletin de neige.
 *
 * The Nordic France website publishes a weekly bulletin listing Nordic ski
 * domains in France with their current snow conditions. This function fetches
 * that page, extracts the tabular data using cheerio, and returns a normalized
 * array of ResortSnowData records.
 *
 * Structure targeted (as of 2024):
 *   <table class="bulletin-neige"> or similar structure with rows:
 *     Domain name | Region | Open trails | Notes
 */
export async function fetchNordicFranceBulletin(): Promise<ResortSnowData[]> {
  const metadataIndex = await fetchBulletinMetadataIndex();
  const allRecords: ResortSnowData[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const html = await fetchWeatherPageWithRetry(page);
    const pageRecords = parseWeatherCards(html, metadataIndex);

    console.log(`→ Parsed ${pageRecords.length} resort(s) from bulletin page ${page}.`);

    if (pageRecords.length === 0) {
      break;
    }

    allRecords.push(...pageRecords);
  }

  const uniqueByName = new Map<string, ResortSnowData>();
  for (const record of allRecords) {
    uniqueByName.set(record.name, record);
  }

  const duplicateCount = allRecords.length - uniqueByName.size;
  if (duplicateCount > 0) {
    console.warn(
      `⚠  Collapsed ${duplicateCount} duplicate bulletin row(s) by resort name.`
    );
  }

  console.log(
    `→ Parsed ${allRecords.length} raw bulletin row(s), ${uniqueByName.size} unique resort(s).`
  );

  return [...uniqueByName.values()];
}
