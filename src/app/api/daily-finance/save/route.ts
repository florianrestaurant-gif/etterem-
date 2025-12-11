import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type SaveDailyFinanceExpense = {
  supplierId: string;
  amount: number;
};

type SaveDailyFinanceBody = {
  id?: string; // szerkesztésnél jöhet
  restaurantIdentifier: string;
  date: string; // "YYYY-MM-DD"
  kassza: number | null;
  rozvoz: number | null;
  bistro: number | null;
  restaumatic: number | null;
  dochodca: number | null;
  faktura: number | null;
  zostatok: number | null;
  ubytovanie: number | null;
  expenses: SaveDailyFinanceExpense[];
};

type ApiError = {
  error: string;
};

function badRequest(message: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 400 });
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveDailyFinanceBody;

    const {
      id,
      restaurantIdentifier,
      date,
      kassza,
      rozvoz,
      bistro,
      restaumatic,
      dochodca,
      faktura,
      zostatok,
      ubytovanie,
      expenses,
    } = body;

    if (!restaurantIdentifier || !date) {
      return badRequest(
        "A restaurantIdentifier és a date mező kötelező."
      );
    }

    const restaurantId = await resolveRestaurantId(restaurantIdentifier);

    if (!restaurantId) {
      return NextResponse.json(
        {
          error: `Nem található étterem ezzel az azonosítóval / sluggal: ${restaurantIdentifier}`,
        },
        { status: 404 }
      );
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return badRequest("Érvénytelen dátum formátum. (Várt: YYYY-MM-DD)");
    }

    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth() + 1;
    const dayNumber = parsedDate.getDate();
    const dayName = parsedDate.toLocaleDateString("hu-HU", {
      weekday: "long",
    });

    const data = {
      restaurantId,
      date: parsedDate,
      year,
      month,
      dayNumber,
      dayName,
      kassza,
      rozvoz,
      bistro,
      restaumatic,
      dochodca,
      faktura,
      zostatok,
      ubytovanie,
      // akcie, kiadasok: itt nem piszkáljuk, az import kezeli
    };

    let dailyId: string | null = id ?? null;

    if (dailyId) {
      // Szerkesztés ID alapján
      await prisma.dailyFinance.update({
        where: { id: dailyId },
        data,
      });
    } else {
      // Ha nincs id, akkor upsert restaurant + date alapján (új nap rögzítése)
      const existing = await prisma.dailyFinance.findFirst({
        where: {
          restaurantId,
          date: parsedDate,
        },
      });

      const daily = existing
        ? await prisma.dailyFinance.update({
            where: { id: existing.id },
            data,
          })
        : await prisma.dailyFinance.create({ data });

      dailyId = daily.id;
    }

    if (!dailyId) {
      return NextResponse.json(
        { error: "Nem sikerült menteni a napi adatot." },
        { status: 500 }
      );
    }

    // Beszállítói kiadások felülírása
    if (Array.isArray(expenses)) {
      // régi sorok törlése
      await prisma.expense.deleteMany({
        where: { dayId: dailyId },
      });

      // csak érvényes, nem null, nem NaN összegek felvitele
      const filtered = expenses.filter(
        (e) =>
          e.supplierId &&
          typeof e.amount === "number" &&
          Number.isFinite(e.amount)
      );

      if (filtered.length > 0) {
        await prisma.expense.createMany({
          data: filtered.map((e) => ({
            dayId: dailyId as string,
            supplierId: e.supplierId,
            amount: e.amount,
          })),
        });
      }
    }

    return NextResponse.json({ ok: true, id: dailyId });
  } catch (error) {
    console.error("SAVE DAILY FINANCE ERROR", error);
    return NextResponse.json(
      { error: "Hiba történt a napi zárás mentésekor." },
      { status: 500 }
    );
  }
}
