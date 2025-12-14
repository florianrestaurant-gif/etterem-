// src/app/api/haccp/daily-checklists/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function parseYyyyMmDdToLocalMidnight(dateStr: string): Date | null {
  // dateStr: "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// JS getDay(): 0 vasárnap ... 6 szombat
// nálunk: 0 hétfő ... 6 vasárnap
function toTemplateDayIndex(localMidnight: Date): number {
  const js = localMidnight.getDay();
  return js === 0 ? 6 : js - 1;
}

async function resolveRestaurantId(req: Request): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isGlobalAdmin: true },
  });
  if (!user) return null;

  const { searchParams } = new URL(req.url);
  const restaurantIdFromQuery = searchParams.get("restaurantId");

  // Global admin: ha adsz restaurantId-t query-ben, azt használjuk
  if (user.isGlobalAdmin && restaurantIdFromQuery) return restaurantIdFromQuery;

  // Egyébként: első membership étterem
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, restaurantId: { not: null } },
    select: { restaurantId: true },
    orderBy: { id: "asc" },
  });

  return membership?.restaurantId ?? null;
}

// ------------------------------------------------------------
// GET /api/haccp/daily-checklists?date=YYYY-MM-DD&type=OPENING|CLOSING
// - adott napra visszaadja a checklistet
// - ha nincs, sablonból legenerálja (dayOfWeek alapján)
// - ha már létezik, de nincsenek itemek, utólag feltölti sablonból
// ------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { error: "type csak OPENING vagy CLOSING lehet." },
        { status: 400 }
      );
    }

    const dayStart = parseYyyyMmDdToLocalMidnight(dateStr);
    if (!dayStart) {
      return NextResponse.json(
        { error: "date formátuma YYYY-MM-DD legyen." },
        { status: 400 }
      );
    }

    const dayIndex = toTemplateDayIndex(dayStart);

    // 1) Meglévő checklist keresése (a dátumot nálunk 00:00-kor tároljuk)
    let checklist = await prisma.dailyChecklist.findUnique({
      where: {
        // a schema-ban: @@unique([restaurantId, date, type], name: "unique_daily_checklist")
        unique_daily_checklist: {
          restaurantId,
          date: dayStart,
          type: type as any,
        },
      },
      include: {
        items: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    // 2) Ha nincs checklist: sablonból létrehozzuk
    if (!checklist) {
      const templates = await prisma.checklistTemplate.findMany({
        where: {
          restaurantId,
          isActive: true,
          checklistType: type as any,
          dayOfWeek: dayIndex,
        },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      });

      checklist = await prisma.dailyChecklist.create({
        data: {
          restaurantId,
          date: dayStart,
          type: type as any,
          items: {
            create: templates.map((t) => ({
              label: t.label,
              templateId: t.id,
            })),
          },
        },
        include: {
          items: { orderBy: [{ createdAt: "asc" }] },
        },
      });
    } else if (!checklist.items || checklist.items.length === 0) {
      // 3) Checklist létezik, de üres → utólag töltjük fel sablonból
      const templates = await prisma.checklistTemplate.findMany({
        where: {
          restaurantId,
          isActive: true,
          checklistType: type as any,
          dayOfWeek: dayIndex,
        },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
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
            items: { orderBy: [{ createdAt: "asc" }] },
          },
        });
      }
    }

    return NextResponse.json({ ok: true, checklist });
  } catch (error) {
    console.error("[DAILY_CHECKLISTS_GET]", error);
    return NextResponse.json(
      { error: "Hiba történt a checklist betöltésekor." },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// PUT/PATCH – checklist item pipálás + megjegyzés
// Body: { itemId, isDone, note? }
// - ownership check: item -> checklist.restaurantId = current restaurant
// - doneAt + doneById rendben
// ------------------------------------------------------------
async function updateChecklistItem(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

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

    // Ownership check
    const existing = await prisma.dailyChecklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: { select: { restaurantId: true } } },
    });

    if (!existing || existing.checklist.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "A checklist item nem található." },
        { status: 404 }
      );
    }

    const updated = await prisma.dailyChecklistItem.update({
      where: { id: itemId },
      data: {
        isDone,
        note: typeof note === "string" ? note : null,
        doneAt: isDone ? new Date() : null,
        doneById: isDone ? userId : null,
      },
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    console.error("[DAILY_CHECKLISTS_UPDATE]", error);
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
