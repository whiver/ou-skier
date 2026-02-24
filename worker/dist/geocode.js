"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geocodeResort = geocodeResort;
const node_fetch_1 = __importDefault(require("node-fetch"));
const USER_AGENT = "ou-skier-bot/1.0 (+https://github.com/whiver/ou-skier) geocoding";
const REGION_LABELS = {
    AUVERGNE_RHONE_ALPES: "Auvergne-Rhône-Alpes",
    BOURGOGNE_FRANCHE_COMTE: "Bourgogne-Franche-Comté",
    BRETAGNE: "Bretagne",
    CENTRE_VAL_DE_LOIRE: "Centre-Val de Loire",
    CORSE: "Corse",
    GRAND_EST: "Grand Est",
    HAUTS_DE_FRANCE: "Hauts-de-France",
    ILE_DE_FRANCE: "Île-de-France",
    NORMANDIE: "Normandie",
    NOUVELLE_AQUITAINE: "Nouvelle-Aquitaine",
    OCCITANIE: "Occitanie",
    PAYS_DE_LA_LOIRE: "Pays de la Loire",
    PROVENCE_ALPES_COTE_D_AZUR: "Provence-Alpes-Côte d'Azur",
};
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isFrenchCoordinate(latitude, longitude) {
    const latitudeInRange = latitude >= 41 && latitude <= 51.5;
    const longitudeInRange = longitude >= -5.5 && longitude <= 10;
    return latitudeInRange && longitudeInRange;
}
function buildQuery(name, region) {
    const regionLabel = region ? REGION_LABELS[region] : null;
    const parts = [name, "station nordique", regionLabel, "France"].filter(Boolean);
    return parts.join(", ");
}
async function geocodeWithBan(query) {
    const url = new URL("https://api-adresse.data.gouv.fr/search/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "1");
    url.searchParams.set("autocomplete", "0");
    const response = await (0, node_fetch_1.default)(url.toString(), {
        headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
        },
    });
    if (!response.ok)
        return null;
    const payload = (await response.json());
    const first = payload.features?.[0];
    if (!first?.geometry?.coordinates)
        return null;
    const [longitude, latitude] = first.geometry.coordinates;
    if (!isFrenchCoordinate(latitude, longitude))
        return null;
    const score = first.properties?.score ?? 0;
    if (score < 0.35)
        return null;
    return {
        latitude,
        longitude,
        source: "ban",
    };
}
async function geocodeWithNominatim(query) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "fr");
    await sleep(1100);
    const response = await (0, node_fetch_1.default)(url.toString(), {
        headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
        },
    });
    if (!response.ok)
        return null;
    const payload = (await response.json());
    const first = payload[0];
    if (!first?.lat || !first?.lon)
        return null;
    const latitude = Number.parseFloat(first.lat);
    const longitude = Number.parseFloat(first.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude))
        return null;
    if (!isFrenchCoordinate(latitude, longitude))
        return null;
    return {
        latitude,
        longitude,
        source: "nominatim",
    };
}
async function geocodeResort(name, region) {
    const query = buildQuery(name, region);
    try {
        const ban = await geocodeWithBan(query);
        if (ban)
            return ban;
    }
    catch {
    }
    try {
        const nominatim = await geocodeWithNominatim(query);
        if (nominatim)
            return nominatim;
    }
    catch {
    }
    return null;
}
