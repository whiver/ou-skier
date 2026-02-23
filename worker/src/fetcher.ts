import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { ResortSnowData } from "./types";

const NORDIC_FRANCE_BULLETIN_URL =
  "https://www.nordicfrance.fr/le-bulletin-neige/";
const NORDIC_FRANCE_AJAX_URL =
  "https://www.nordicfrance.fr/cms/wp-admin/admin-ajax.php";
const POSTS_PER_PAGE = 50;
const MAX_PAGES = 40;

/**
 * Parses a snow depth string like "30/60 cm" or "45 cm" into base and top values.
 * Returns [base, top] where top may equal base if only one value is given.
 */
function parseSnowDepths(
  raw: string | undefined
): [number | null, number | null] {
  if (!raw) return [null, null];
  const cleaned = raw.trim().replace(/\s*cm/i, "");
  const parts = cleaned.split("/").map((s) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  if (parts.length === 1 && !isNaN(parts[0])) {
    return [parts[0], parts[0]];
  }
  return [null, null];
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

function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const normalized = raw.replace(",", ".").trim();
  const value = parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
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
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(parsed.getTime())) return now;
  return parsed;
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

function parseWeatherCards(html: string): ResortSnowData[] {
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
    const recordDate = parseFrenchDayMonth(updateRaw);

    // Some cards can expose snow depth in text form; parse only if present.
    const snowRaw = card
      .find(".Weather-neige, .Weather-snow, [data-snow-depth]")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const [snowDepthBase, snowDepthTop] = parseSnowDepths(snowRaw || undefined);

    const freshRaw = card
      .find(".Weather-freshSnow, .Weather-neigeFraiche, [data-fresh-snow]")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const freshSnow = parseNumber(freshRaw.replace(/cm/gi, ""));

    records.push({
      name,
      region: null,
      department: null,
      domainUrl,
      recordDate,
      openSlopes,
      totalSlopes,
      snowDepthBase,
      snowDepthTop,
      freshSnow,
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
 *     Domain name | Region | Snow base | Snow top | Fresh snow | Open trails | Notes
 */
export async function fetchNordicFranceBulletin(): Promise<ResortSnowData[]> {
  const allRecords: ResortSnowData[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const html = await fetchWeatherPage(page);
    const pageRecords = parseWeatherCards(html);

    if (pageRecords.length === 0) {
      break;
    }

    allRecords.push(...pageRecords);
  }

  const uniqueByName = new Map<string, ResortSnowData>();
  for (const record of allRecords) {
    uniqueByName.set(record.name, record);
  }

  return [...uniqueByName.values()];
}
