import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { CoolingStatus } from "@prisma/client";

type CreateCoolingLogBody = {
  date: string; // YYYY-MM-DD
  itemName: string;
  batchCode?: string | null;
  targetTemp: number;
  measuredTemp: number;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  operatorId?: string | null;
  notes?: string | null;
};

function isValidHHMM(value: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return !!m;
}

function parseYYYYMMDD(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
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

// GET /api/haccp/cooling-logs
// támogatja:
//   ?date=YYYY-MM-DD  (egész nap)
//   vagy ?from=ISO&to=ISO
export async function GET(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const where: any = { restaurantId };

    if (dateParam) {
      const d = parseYYYYMMDD(dateParam);
      if (!d) {
        return NextResponse.json(
          { error: "date formátuma YYYY-MM-DD legyen." },
          { status: 400 }
        );
      }

      const from = new Date(d.year, d.month - 1, d.day, 0, 0, 0);
      const to = new Date(d.year, d.month - 1, d.day + 1, 0, 0, 0);

      where.startTime = { gte: from, lt: to };
    } else if (fromParam || toParam) {
      const range: { gte?: Date; lte?: Date } = {};

      if (fromParam) {
        const from = new Date(fromParam);
        if (Number.isNaN(from.getTime())) {
          return NextResponse.json(
            { error: "from érvényes ISO dátum legyen." },
            { status: 400 }
          );
        }
        range.gte = from;
      }

      if (toParam) {
        const to = new Date(toParam);
        if (Number.isNaN(to.getTime())) {
          return NextResponse.json(
            { error: "to érvényes ISO dátum legyen." },
            { status: 400 }
          );
        }
        range.lte = to;
      }

      where.startTime = range;
    }

    const items = await prisma.coolingLog.findMany({
      where,
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("[COOLING_LOGS_GET]", error);
    return NextResponse.json(
      { error: "Váratlan hiba történt." },
      { status: 500 }
    );
  }
}

// POST /api/haccp/cooling-logs
export async function POST(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CreateCoolingLogBody;

    const itemName = body.itemName?.trim();
    const date = body.date?.trim();
    const startTime = String(body.startTime ?? "");
    const endTime = String(body.endTime ?? "");

    if (!itemName) {
      return NextResponse.json(
        { error: "itemName (étel neve) kötelező." },
        { status: 400 }
      );
    }

    const d = date ? parseYYYYMMDD(date) : null;
    if (!d) {
      return NextResponse.json(
        { error: "date (nap) kötelező, formátum: YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (
      typeof body.targetTemp !== "number" ||
      Number.isNaN(body.targetTemp) ||
      body.targetTemp <= 0
    ) {
      return NextResponse.json(
        { error: "targetTemp érvényes pozitív szám legyen." },
        { status: 400 }
      );
    }

    if (
      typeof body.measuredTemp !== "number" ||
      Number.isNaN(body.measuredTemp) ||
      body.measuredTemp <= 0
    ) {
      return NextResponse.json(
        { error: "measuredTemp érvényes pozitív szám legyen." },
        { status: 400 }
      );
    }

    if (!isValidHHMM(startTime) || !isValidHHMM(endTime)) {
      return NextResponse.json(
        { error: "startTime és endTime formátuma HH:MM legyen." },
        { status: 400 }
      );
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);

    const start = new Date(d.year, d.month - 1, d.day, sh, sm, 0);
    const end = new Date(d.year, d.month - 1, d.day, eh, em, 0);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "startTime/endTime érvényes idő legyen." },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "endTime későbbi legyen, mint startTime." },
        { status: 400 }
      );
    }

    // státusz (Prisma enum: "OK" | "ERROR")
    const status: CoolingStatus =
      body.measuredTemp <= body.targetTemp ? "OK" : "ERROR";

    const notes = body.notes?.trim() || null;

    if (status === "ERROR" && !notes) {
      return NextResponse.json(
        {
          error:
            "Ha a mért hőmérséklet nem éri el az előírt visszahűtési értéket, a megjegyzés kötelező.",
        },
        { status: 400 }
      );
    }

    const created = await prisma.coolingLog.create({
      data: {
        restaurantId,
        itemName,
        batchCode: body.batchCode?.trim() || null,
        targetTemp: body.targetTemp,
        measuredTemp: body.measuredTemp,
        startTime: start,
        endTime: end,
        operatorId: body.operatorId || null,
        notes,
        status,
      },
    });

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (error) {
    console.error("[COOLING_LOGS_POST]", error);
    return NextResponse.json(
      { error: "Váratlan hiba történt mentés közben." },
      { status: 500 }
    );
  }
}
