import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// DELETE /api/haccp/fridge-logs/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    // 👇 Itt is meg kell várni a Promise-t
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Hiányzó mérés azonosító (id)." },
        { status: 400 }
      );
    }

    await prisma.fridgeLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/haccp/fridge-logs/[id] error:", error);
    return NextResponse.json(
      { error: "Nem sikerült törölni a mérést." },
      { status: 500 }
    );
  }
}
