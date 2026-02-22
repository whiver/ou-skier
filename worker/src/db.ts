import { PrismaClient } from "./generated/prisma";

let _prisma: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (!_prisma) {
    const datasourceUrl = process.env.DATABASE_URL;
    if (!datasourceUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _prisma = new PrismaClient({
      datasourceUrl,
      log:
        process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return _prisma;
}

export async function disconnectDb(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = undefined;
  }
}
