// src/app/api/menus/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/auth";

type CreateMenuBody = {
  restaurantId: string;
  startDate: string; // "2025-11-17"
  endDate: string;   // "2025-11-21"
};

export async function POST(req: Request) {
  try {
    // Auth + tenant kiválasztás (global adminnál restaurantId query param működik)
    const currentRestaurantId = await getRestaurantId(req);
    if (!currentRestaurantId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CreateMenuBody;

    // Biztonság: csak a saját / kiválasztott étteremre engedjük
    if (!body.restaurantId || body.restaurantId !== currentRestaurantId) {
      return NextResponse.json(
        { ok: false, error: "Nincs jogosultság ehhez az étteremhez." },
        { status: 403 }
      );
    }

    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { ok: false, error: "Hiányzó mezők (kezdő- és záródátum)" },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: body.restaurantId },
      select: { id: true },
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

    const menu = await prisma.menuWeek.create({
      data: {
        restaurantId: restaurant.id,
        startDate: start,
        endDate: end,
        status: "draft",
      },
    });

    return NextResponse.json({ ok: true, data: menu }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/menus] ERROR:", error);
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
