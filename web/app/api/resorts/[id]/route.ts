import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resortId = parseInt(id, 10);
    if (isNaN(resortId)) {
      return NextResponse.json({ error: "Invalid resort ID" }, { status: 400 });
    }

    const resort = await prisma.resort.findUnique({
      where: { id: resortId },
      include: {
        snowRecords: {
          orderBy: { recordDate: "desc" },
          take: 10,
        },
      },
    });

    if (!resort) {
      return NextResponse.json({ error: "Resort not found" }, { status: 404 });
    }

    return NextResponse.json(resort);
  } catch (error) {
    console.error("Error fetching resort:", error);
    return NextResponse.json(
      { error: "Failed to fetch resort" },
      { status: 500 }
    );
  }
}
