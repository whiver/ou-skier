import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { ResortSnowData } from "./types";

const NORDIC_FRANCE_BULLETIN_URL =
  "https://www.nordicfrance.fr/le-bulletin-neige/";

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
  const response = await fetch(NORDIC_FRANCE_BULLETIN_URL, {
    headers: {
      "User-Agent":
        "ou-skier-bot/1.0 (+https://github.com/whiver/ou-skier) - snow data aggregator",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Nordic France bulletin: HTTP ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results: ResortSnowData[] = [];

  // Determine the bulletin date from the page (format varies but commonly in <h2> or <p>)
  let bulletinDate = new Date();
  const dateText = $("h2, h3, .bulletin-date, .date")
    .filter((_, el) => /\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}/.test($(el).text()))
    .first()
    .text();
  if (dateText) {
    const parsed = new Date(dateText);
    if (!isNaN(parsed.getTime())) {
      bulletinDate = parsed;
    }
  }

  // Parse each row in the bulletin table.
  // The exact selectors depend on the site's HTML structure and may need
  // updating if the site is redesigned.
  $("table tr, .domaine-row, .resort-row").each((_, row) => {
    const cells = $(row).find("td, .cell");
    if (cells.length < 3) return;

    const name = $(cells[0]).text().trim();
    if (!name || name.toLowerCase() === "domaine" || name.toLowerCase() === "station") {
      return; // Skip header rows
    }

    const region = $(cells[1]).text().trim() || null;
    const snowRaw = $(cells[2]).text().trim();
    const [snowDepthBase, snowDepthTop] = parseSnowDepths(snowRaw);

    let freshSnow: number | null = null;
    let openSlopes: number | null = null;
    let totalSlopes: number | null = null;
    let notes: string | null = null;

    if (cells.length > 3) {
      const freshRaw = $(cells[3]).text().trim();
      const freshParsed = parseFloat(freshRaw.replace(/\s*cm/i, ""));
      freshSnow = isNaN(freshParsed) ? null : freshParsed;
    }

    if (cells.length > 4) {
      const slopesRaw = $(cells[4]).text().trim();
      [openSlopes, totalSlopes] = parseSlopes(slopesRaw);
    }

    if (cells.length > 5) {
      notes = $(cells[5]).text().trim() || null;
    }

    // Extract domain URL if present in the name cell
    const domainUrl = $(cells[0]).find("a").attr("href") ?? null;

    results.push({
      name,
      region,
      department: null,
      domainUrl,
      recordDate: bulletinDate,
      openSlopes,
      totalSlopes,
      snowDepthBase,
      snowDepthTop,
      freshSnow,
      notes,
      sourceUrl: NORDIC_FRANCE_BULLETIN_URL,
    });
  });

  return results;
}
