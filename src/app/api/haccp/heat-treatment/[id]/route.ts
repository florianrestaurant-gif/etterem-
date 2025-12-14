import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/auth";

export const runtime = "nodejs";

type RouteParams = {
  params: { id: string };
};

// DELETE /api/haccp/heat-treatment/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const restaurantId = await getRestaurantId();
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Hiányzó azonosító (id)." },
        { status: 400 }
      );
    }

    // Biztonság: csak az adott étteremhez tartozót töröljük
    const result = await prisma.heatTreatmentLog.deleteMany({
      where: { id, restaurantId },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Nem található ilyen bejegyzés ehhez az étteremhez." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/haccp/heat-treatment/[id] error:", error);
    return NextResponse.json(
      { error: "Váratlan hiba történt a törlés közben." },
      { status: 500 }
    );
  }
}
