export interface ResortSnowData {
  name: string;
  region: string | null;
  department: string | null;
  domainUrl: string | null;
  recordDate: Date;
  openSlopes: number | null;
  totalSlopes: number | null;
  snowDepthBase: number | null;
  snowDepthTop: number | null;
  freshSnow: number | null;
  notes: string | null;
  sourceUrl: string;
}

const NORDIC_FRANCE_BULLETIN_URL =
  "https://www.nordicfrance.fr/le-bulletin-neige/";

/**
 * Parses a snow depth string like "30/60 cm" or "45 cm" into base and top values.
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
 * domains in France with their current snow conditions.
 */
export async function fetchNordicFranceBulletin(): Promise<ResortSnowData[]> {
  const { load } = await import("cheerio");

  const response = await fetch(NORDIC_FRANCE_BULLETIN_URL, {
    headers: {
      "User-Agent":
        "ou-skier-bot/1.0 (+https://github.com/whiver/ou-skier) - snow data aggregator",
      Accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Nordic France bulletin: HTTP ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const $ = load(html);
  const results: ResortSnowData[] = [];

  // Determine the bulletin date from the page
  let bulletinDate = new Date();
  const dateText = $("h2, h3, .bulletin-date, .date")
    .filter(
      (_, el) =>
        /\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}/.test($(el).text())
    )
    .first()
    .text();
  if (dateText) {
    const parsed = new Date(dateText);
    if (!isNaN(parsed.getTime())) {
      bulletinDate = parsed;
    }
  }

  // Parse each row in the bulletin table
  $("table tr, .domaine-row, .resort-row").each((_, row) => {
    const cells = $(row).find("td, .cell");
    if (cells.length < 3) return;

    const name = $(cells[0]).text().trim();
    if (
      !name ||
      name.toLowerCase() === "domaine" ||
      name.toLowerCase() === "station"
    ) {
      return;
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
      [openSlopes, totalSlopes] = parseSlopes($(cells[4]).text().trim());
    }

    if (cells.length > 5) {
      notes = $(cells[5]).text().trim() || null;
    }

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
