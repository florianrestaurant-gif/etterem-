import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// GET  /api/inventory/template   → lista
// POST /api/inventory/template   → új tétel
// PUT  /api/inventory/template   → sorrend mentése (drag&drop után)
// ─────────────────────────────────────────────

export async function GET() {
  try {
    const restaurant = await prisma.restaurant.findFirst();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Nincs étterem az adatbázisban." },
        { status: 500 }
      );
    }

    const items = await prisma.inventoryTemplateItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Inventory template GET error:", error);
    return NextResponse.json(
      { error: "Nem sikerült betölteni a leltár tételeit." },
      { status: 500 }
    );
  }
}

// Új tétel felvétele
export async function POST(req: NextRequest) {
  try {
    const restaurant = await prisma.restaurant.findFirst();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Nincs étterem az adatbázisban." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { name, unit } = body as { name?: string; unit?: string };

    if (!name || !unit) {
      return NextResponse.json(
        { error: "Név és egység megadása kötelező." },
        { status: 400 }
      );
    }

    // legnagyobb sortOrder + 1
    const maxOrder = await prisma.inventoryTemplateItem.aggregate({
      where: { restaurantId: restaurant.id },
      _max: { sortOrder: true },
    });

    const nextOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const item = await prisma.inventoryTemplateItem.create({
      data: {
        restaurantId: restaurant.id,
        name: name.trim(),
        unit: unit.trim(),
        sortOrder: nextOrder,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Inventory template POST error:", error);
    return NextResponse.json(
      { error: "Nem sikerült létrehozni az új tételt." },
      { status: 500 }
    );
  }
}

// Sorrend mentése drag&drop után
export async function PUT(req: NextRequest) {
  try {
    const restaurant = await prisma.restaurant.findFirst();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Nincs étterem az adatbázisban." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { orderedIds } = body as { orderedIds?: string[] };

    if (!orderedIds || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "Hiányzik az orderedIds lista." },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.inventoryTemplateItem.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inventory template PUT error:", error);
    return NextResponse.json(
      { error: "Nem sikerült menteni az új sorrendet." },
      { status: 500 }
    );
  }
}
