import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type RevalidateBody = {
  resortIds?: number[];
};

function getProvidedSecret(request: Request): string | null {
  const fromHeader = request.headers.get("x-revalidate-secret");
  if (fromHeader) return fromHeader;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
  const configuredSecret = process.env.REVALIDATE_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "REVALIDATE_SECRET is not configured" },
      { status: 500 }
    );
  }

  const providedSecret = getProvidedSecret(request);
  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RevalidateBody = {};
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    // JSON body is optional.
  }

  const fallbackIds = await prisma.resort.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const resortIds =
    body.resortIds && body.resortIds.length > 0
      ? body.resortIds
      : fallbackIds.map((resort) => resort.id);

  const paths = new Set<string>(["/", "/domaines", "/api/resorts"]);
  for (const resortId of resortIds) {
    paths.add(`/resorts/${resortId}`);
    paths.add(`/api/resorts/${resortId}`);
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    ok: true,
    revalidatedPaths: Array.from(paths),
    resortCount: resortIds.length,
  });
}
