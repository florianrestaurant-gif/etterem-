import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Egyetlen DailyFinance rekord lekérése ID alapján,
 * hozzá tartozó beszállítói kiadásokkal és az étteremmel együtt.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1) Napi rekord lekérése
    const daily = await prisma.dailyFinance.findFirst({
      where: { id },
    });

    if (!daily) {
      return NextResponse.json(
        { error: "Napi rekord nem található." },
        { status: 404 }
      );
    }

    // 2) Étterem külön lekérése (ha van restaurantId)
    let restaurant: { id: string; slug: string | null } | null = null;

    if (daily.restaurantId) {
      const r = await prisma.restaurant.findUnique({
        where: { id: daily.restaurantId },
      });
      if (r) {
        restaurant = {
          id: r.id,
          slug: r.slug,
        };
      }
    }

    // 3) Beszállítói kiadások lekérése dayId alapján
    const expenses = await prisma.expense.findMany({
      where: { dayId: id },
      include: {
        supplier: true,
      },
      orderBy: {
        supplier: {
          name: "asc",
        },
      },
    });

    // 4) Összeállított válasz
    return NextResponse.json({
      ...daily,
      restaurant,
      expenses,
    });
  } catch (error) {
    console.error("GET DAILY FINANCE BY ID ERROR", error);
    return NextResponse.json(
      { error: "Hiba történt a napi adat lekérésekor." },
      { status: 500 }
    );
  }
}
