import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/auth";

const weekdayFieldMap = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
} as const;

function getWeekdayField(date: Date): keyof typeof weekdayFieldMap {
  const day = date.getDay(); // 0 = vasárnap, 1 = hétfő, ... 6 = szombat
  switch (day) {
    case 1:
      return "monday";
    case 2:
      return "tuesday";
    case 3:
      return "wednesday";
    case 4:
      return "thursday";
    case 5:
      return "friday";
    case 6:
      return "saturday";
    case 0:
    default:
      return "sunday";
  }
}

// YYYY-MM-DD -> local Date (nem UTC!)
function parseLocalDate(dateStr: string): Date | null {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// GET /api/haccp/daily-cleaning?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    if (!dateParam) {
      return NextResponse.json({ error: "Hiányzó dátum paraméter." }, { status: 400 });
    }

    const start = parseLocalDate(dateParam);
    if (!start) {
      return NextResponse.json({ error: "date formátuma YYYY-MM-DD legyen." }, { status: 400 });
    }

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // 1) Megnézzük, hogy van-e már CleaningLog erre a napra
    let logs = await prisma.cleaningLog.findMany({
      where: {
        restaurantId,
        date: { gte: start, lt: end },
      },
      orderBy: { area: "asc" },
    });

    // 2) Ha nincs még log, sablonból generáljuk
    if (logs.length === 0) {
      const weekdayField = getWeekdayField(start);

      const templates = await prisma.cleaningTemplate.findMany({
        where: {
          restaurantId,
          isActive: true,
          [weekdayField]: true,
        },
        orderBy: [{ task: "asc" }],
      });

      if (templates.length > 0) {
        // gyorsabb és tisztább: createMany
        await prisma.cleaningLog.createMany({
          data: templates.map((tpl) => ({
            restaurantId,
            date: start,
            area: tpl.task,
            frequency: "DAILY", // nálad most ez fix
            productUsed: null,
            method: null,
            completed: false,
            comment: null,
            createdById: null,
          })),
        });

        logs = await prisma.cleaningLog.findMany({
          where: {
            restaurantId,
            date: { gte: start, lt: end },
          },
          orderBy: { area: "asc" },
        });
      }
    }

    // 3) Description hozzárakása sablonból (map a gyors kereséshez)
    const templatesForDesc = await prisma.cleaningTemplate.findMany({
      where: { restaurantId },
      select: { task: true, description: true },
    });

    const descMap = new Map<string, string | null>();
    for (const t of templatesForDesc) descMap.set(t.task, t.description ?? null);

    const items = logs.map((log) => ({
      logId: log.id,
      task: log.area,
      description: descMap.get(log.area) ?? null,
      isDone: log.completed,
      comment: log.comment ?? null,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[DAILY_CLEANING_GET]", error);
    return NextResponse.json(
      { error: "Hiba történt a napi takarítási feladatok lekérése során." },
      { status: 500 }
    );
  }
}

// PATCH /api/haccp/daily-cleaning
export async function PATCH(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { logId, isDone } = body as { logId?: string; isDone?: boolean };

    if (!logId || typeof isDone !== "boolean") {
      return NextResponse.json(
        { error: "Hiányzó vagy hibás paraméter (logId, isDone)." },
        { status: 400 }
      );
    }

    const existing = await prisma.cleaningLog.findUnique({ where: { id: logId } });
    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "A takarítási log nem található." }, { status: 404 });
    }

    const updated = await prisma.cleaningLog.update({
      where: { id: logId },
      data: { completed: isDone },
    });

    const tpl = await prisma.cleaningTemplate.findFirst({
      where: { restaurantId, task: updated.area },
      select: { description: true },
    });

    return NextResponse.json({
      item: {
        logId: updated.id,
        task: updated.area,
        description: tpl?.description ?? null,
        isDone: updated.completed,
        comment: updated.comment ?? null,
      },
    });
  } catch (error) {
    console.error("[DAILY_CLEANING_PATCH]", error);
    return NextResponse.json(
      { error: "Hiba történt a takarítási feladat frissítése során." },
      { status: 500 }
    );
  }
}
