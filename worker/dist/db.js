"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.disconnectDb = disconnectDb;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
let _prisma;
function getDb() {
    if (!_prisma) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error("DATABASE_URL environment variable is not set");
        }
        const adapter = new adapter_pg_1.PrismaPg({
            connectionString,
            ssl: { rejectUnauthorized: false },
        });
        _prisma = new client_1.PrismaClient({
            adapter,
            log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        });
    }
    return _prisma;
}
async function disconnectDb() {
    if (_prisma) {
        await _prisma.$disconnect();
        _prisma = undefined;
    }
}
