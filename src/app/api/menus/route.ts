import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db";

type CreateMenuBody = {
  restaurantId: string;
  startDate: string; // "2025-11-17" (input[type=date]-ből jön)
  endDate: string;   // "2025-11-21"
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as CreateMenuBody;

    if (!body.restaurantId || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { ok: false, error: "Hiányzó mezők (étterem, kezdő- és záródátum)" },
        { status: 400 }
      );
    }

    // Ellenőrizzük, hogy az étterem létezik-e
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: body.restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const start = new Date(body.startDate);
    const end = new Date(body.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Érvénytelen dátum formátum" },
        { status: 400 }
      );
    }

    // Új heti menü létrehozása draft státusszal
    const menu = await prisma.menuWeek.create({
      data: {
        restaurantId: restaurant.id,
        startDate: start,
        endDate: end,
        status: "draft", // alapértelmezett
      },
    });

    return NextResponse.json({ ok: true, data: menu }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/menus] ERROR:", error);
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
