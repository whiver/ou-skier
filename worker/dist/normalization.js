"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeResortName = normalizeResortName;
function normalizeResortName(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}
