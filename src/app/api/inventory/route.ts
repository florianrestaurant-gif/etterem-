import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
// ─────────────────────────────────────────────
// GET /api/inventory  → leltárívek listája
// query paramok: from=YYYY-MM-DD, to=YYYY-MM-DD (opcionális)
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      return NextResponse.json(
        { error: "Nincs étterem az adatbázisban." },
        { status: 500 }
      );
    }

    // ← EZ HIÁNYZOTT, ezért nem ismerte a 'from' / 'to' változókat
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Prisma-típusos where
    const where: Prisma.InventorySheetWhereInput = {
      restaurantId: restaurant.id,
    };

    if (from || to) {
      const dateFilter: Prisma.DateTimeFilter = {};

      if (from) {
        dateFilter.gte = new Date(from);
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }

      where.date = dateFilter;
    }

    const sheets = await prisma.inventorySheet.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json({ sheets });
  } catch (error) {
    console.error("Inventory list GET error:", error);
    return NextResponse.json(
      { error: "Nem sikerült betölteni a leltáríveket." },
      { status: 500 }
    );
  }
}


// ─────────────────────────────────────────────
// POST /api/inventory  → új leltárív mentése
// ─────────────────────────────────────────────

type ItemInput = {
  templateId: string;
  quantity: number;
  note?: string;
};

type Body = {
  date: string; // "2025-11-26"
  note?: string | null;
  items: ItemInput[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { date, note, items } = body;

    if (!date || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Hiányzó adatok (dátum vagy tételek)." },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      return NextResponse.json(
        { error: "Nincs étterem az adatbázisban." },
        { status: 500 }
      );
    }

    const sheet = await prisma.$transaction(async (tx) => {
      const newSheet = await tx.inventorySheet.create({
        data: {
          restaurantId: restaurant.id,
          date: new Date(date),
          shiftId: null,
          createdById: null,
          note: note ?? null,
        },
      });

      await tx.inventoryItem.createMany({
        data: items.map((item) => ({
          sheetId: newSheet.id,
          templateId: item.templateId,
          quantity: item.quantity,
          note: item.note ?? null,
        })),
      });

      return newSheet;
    });

    return NextResponse.json({ success: true, sheetId: sheet.id });
  } catch (error) {
    console.error("Inventory POST error:", error);
    return NextResponse.json(
      { error: "Hiba történt a leltár mentésekor." },
      { status: 500 }
    );
  }
}
