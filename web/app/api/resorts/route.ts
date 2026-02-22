import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const resorts = await prisma.resort.findMany({
      orderBy: { name: "asc" },
      include: {
        snowRecords: {
          orderBy: { recordDate: "desc" },
          take: 1,
        },
      },
    });
    return NextResponse.json(resorts);
  } catch (error) {
    console.error("Error fetching resorts:", error);
    return NextResponse.json(
      { error: "Failed to fetch resorts" },
      { status: 500 }
    );
  }
}
