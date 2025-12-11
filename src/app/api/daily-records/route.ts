import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // ha máshol van, ehhez igazítsd

type ApiError = {
  error: string;
};

function badRequest(message: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 400 });
}

function notFound(message: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Étterem ID feloldása: először id-ként, majd slug-ként próbáljuk.
 */
async function resolveRestaurantId(
  identifier: string
): Promise<string | null> {
  const byId = await prisma.restaurant.findUnique({
    where: { id: identifier },
  });
  if (byId) return byId.id;

  const bySlug = await prisma.restaurant.findUnique({
    where: { slug: identifier },
  });
  if (bySlug) return bySlug.id;

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const restaurantParam = searchParams.get("restaurant");

    if (!yearParam || !monthParam || !restaurantParam) {
      return badRequest(
        "A year, month és restaurant query paraméter kötelező."
      );
    }

    const year = Number(yearParam);
    const month = Number(monthParam);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return badRequest("year és month numerikus érték kell legyen.");
    }

    if (month < 1 || month > 12) {
      return badRequest("A hónapnak 1 és 12 között kell lennie.");
    }

    const restaurantId = await resolveRestaurantId(restaurantParam);

    if (!restaurantId) {
      return notFound(
        `Nem található étterem ezzel az azonosítóval / sluggal: ${restaurantParam}`
      );
    }

    const days = await prisma.dailyFinance.findMany({
      where: {
        restaurantId,
        year,
        month,
      },
      include: {
        expenses: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: [
        { dayNumber: "asc" },
        { date: "asc" },
      ],
    });

    return NextResponse.json(days);
  } catch (err) {
    console.error("DAILY RECORDS ERROR", err);
    return NextResponse.json(
      { error: "Hiba történt a napi adatok lekérésekor." },
      { status: 500 }
    );
  }
}
