import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/auth";

// ---------------------------------------------------------------------------
// GET /api/haccp/daily-checklists?date=YYYY-MM-DD&type=OPENING|CLOSING
//  - adott napra visszaadja a checklistet
//  - ha nincs, sablonból legenerálja (dayOfWeek alapján)
//  - ha már létezik, de nincsenek itemek, utólag feltölti sablonból
//  - FONTOS: dátumot NAPI INTERVALLUMMAL kezelünk (nem exact Date egyezés)
// ---------------------------------------------------------------------------

function getDayRangeLocal(dateStr: string) {
  const base = new Date(dateStr);
  if (Number.isNaN(base.getTime())) return null;

  const start = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    0,
    0,
    0,
    0
  );
  const end = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + 1,
    0,
    0,
    0,
    0
  );

  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId();
    if (!restaurantId) {
      return NextResponse.json({ error: "No restaurant" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const type = searchParams.get("type"); // "OPENING" | "CLOSING"

    if (!dateStr || !type) {
      return NextResponse.json(
        { error: "Hiányzó paraméterek (date, type)." },
        { status: 400 }
      );
    }

    if (type !== "OPENING" && type !== "CLOSING") {
      return NextResponse.json({ error: "Érvénytelen type." }, { status: 400 });
    }

    const range = getDayRangeLocal(dateStr);
    if (!range) {
      return NextResponse.json({ error: "Érvénytelen date." }, { status: 400 });
    }

    const { start, end } = range;

    // JS: 0 = vasárnap, 1 = hétfő...
    // dayIndex: 0 = hétfő, 6 = vasárnap (így tároljuk a sablonban)
    const dayIndex = start.getDay() === 0 ? 6 : start.getDay() - 1;

    // 1) Meglévő checklist keresése NAPI tartományra, itemekkel együtt
    let checklist = await prisma.dailyChecklist.findFirst({
      where: {
        restaurantId,
        type: type as any,
        date: {
          gte: start,
          lt: end,
        },
      },
      include: {
        items: {
          orderBy: { label: "asc" },
        },
      },
    });

    // 2) Ha nincs checklist, sablonból újonnan létrehozzuk
    if (!checklist) {
      const templates = await prisma.checklistTemplate.findMany({
        where: {
          restaurantId,
          isActive: true,
          checklistType: type as any,
          dayOfWeek: dayIndex,
        },
        orderBy: { sortOrder: "asc" },
      });

      checklist = await prisma.dailyChecklist.create({
        data: {
          restaurantId,
          // a nap eleje legyen mentve (stabil összehasonlítás)
          date: start,
          type: type as any,
          items: {
            create: templates.map((t) => ({
              label: t.label,
              templateId: t.id,
            })),
          },
        },
        include: {
          items: { orderBy: { label: "asc" } },
        },
      });
    } else if (!checklist.items || checklist.items.length === 0) {
      // 3) Már létezik checklist, de NINCS benne item → utólag töltjük fel sablonból
      const templates = await prisma.checklistTemplate.findMany({
        where: {
          restaurantId,
          isActive: true,
          checklistType: type as any,
          dayOfWeek: dayIndex,
        },
        orderBy: { sortOrder: "asc" },
      });

      if (templates.length > 0) {
        checklist = await prisma.dailyChecklist.update({
          where: { id: checklist.id },
          data: {
            items: {
              create: templates.map((t) => ({
                label: t.label,
                templateId: t.id,
              })),
            },
          },
          include: {
            items: { orderBy: { label: "asc" } },
          },
        });
      }
    }

    return NextResponse.json({ checklist });
  } catch (error) {
    console.error("GET /api/haccp/daily-checklists error:", error);
    return NextResponse.json(
      { error: "Hiba történt a checklist betöltésekor." },
      { status: 500 }
    );
  }
}

// Közös update logika – ezt hívja PUT és PATCH
async function updateChecklistItem(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId();
    if (!restaurantId) {
      return NextResponse.json({ error: "No restaurant" }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, isDone, note } = body as {
      itemId?: string;
      isDone?: boolean;
      note?: string | null;
    };

    if (!itemId || typeof isDone !== "boolean") {
      return NextResponse.json(
        { error: "Hiányzó vagy hibás paraméter (itemId, isDone)." },
        { status: 400 }
      );
    }

    // (opcionális, de hasznos) biztonsági check: item ehhez az étteremhez tartozik-e
    const existing = await prisma.dailyChecklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: true },
    });

    if (!existing || existing.checklist.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "A checklist pont nem található ennél az étteremnél." },
        { status: 404 }
      );
    }

    const updated = await prisma.dailyChecklistItem.update({
      where: { id: itemId },
      data: {
        isDone,
        note: typeof note === "string" ? note : null,
        doneAt: isDone ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error("UPDATE /api/haccp/daily-checklists error:", error);
    return NextResponse.json(
      { error: "Hiba történt a checklist frissítésekor." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return updateChecklistItem(req);
}

export async function PATCH(req: NextRequest) {
  return updateChecklistItem(req);
}
