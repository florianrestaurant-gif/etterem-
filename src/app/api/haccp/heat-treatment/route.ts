import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/auth";

export const runtime = "nodejs";

type CreateHeatTreatmentBody = {
  itemName?: unknown;
  batchCode?: unknown;
  targetTemp?: unknown;
  measuredTemp?: unknown;
  startTime?: unknown; // ISO string
  endTime?: unknown;   // ISO string
  operatorId?: unknown;
  notes?: unknown;
};

function toTrimmedString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function toOptionalTrimmedString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", "."));
    if (Number.isFinite(n)) return Math.round(n);
  }
  return null;
}

function toDate(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// GET /api/haccp/heat-treatment?from=...&to=...
export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId();
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    const where: any = { restaurantId };

    if (fromStr || toStr) {
      where.startTime = {};
      if (fromStr) {
        const from = new Date(fromStr);
        if (Number.isNaN(from.getTime())) {
          return NextResponse.json(
            { error: "Érvénytelen 'from' paraméter (ISO dátum kell)." },
            { status: 400 }
          );
        }
        where.startTime.gte = from;
      }
      if (toStr) {
        const to = new Date(toStr);
        if (Number.isNaN(to.getTime())) {
          return NextResponse.json(
            { error: "Érvénytelen 'to' paraméter (ISO dátum kell)." },
            { status: 400 }
          );
        }
        where.startTime.lte = to;
      }
    }

    const logs = await prisma.heatTreatmentLog.findMany({
      where,
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("GET /api/haccp/heat-treatment error:", error);
    return NextResponse.json({ error: "Váratlan hiba történt." }, { status: 500 });
  }
}

// POST /api/haccp/heat-treatment
export async function POST(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId();
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = (await req.json()) as CreateHeatTreatmentBody;

    const itemName = toTrimmedString(raw.itemName);
    if (!itemName) {
      return NextResponse.json(
        { error: "itemName (étel neve) kötelező." },
        { status: 400 }
      );
    }

    const targetTemp = toInt(raw.targetTemp);
    if (targetTemp == null || targetTemp <= 0) {
      return NextResponse.json(
        { error: "targetTemp érvényes pozitív egész szám legyen." },
        { status: 400 }
      );
    }

    const measuredTemp = toInt(raw.measuredTemp);
    if (measuredTemp == null || measuredTemp <= 0) {
      return NextResponse.json(
        { error: "measuredTemp érvényes pozitív egész szám legyen." },
        { status: 400 }
      );
    }

    const start = toDate(raw.startTime);
    const end = toDate(raw.endTime);

    if (!start || !end) {
      return NextResponse.json(
        { error: "startTime és endTime érvényes ISO dátum legyen." },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "endTime későbbi legyen, mint startTime." },
        { status: 400 }
      );
    }

    const status = measuredTemp >= targetTemp ? "OK" : "ERROR";

    const notes = toOptionalTrimmedString(raw.notes);
    if (status === "ERROR" && (!notes || notes.length === 0)) {
      return NextResponse.json(
        {
          error:
            "Ha a mért hőmérséklet nem éri el az előírtat, a megjegyzés kötelező.",
        },
        { status: 400 }
      );
    }

    const created = await prisma.heatTreatmentLog.create({
      data: {
        restaurantId,
        itemName,
        batchCode: toOptionalTrimmedString(raw.batchCode),
        targetTemp,       // Int
        measuredTemp,     // Int
        startTime: start,
        endTime: end,
        operatorId: toOptionalTrimmedString(raw.operatorId),
        status: status as any, // enum HeatTreatmentStatus: OK | ERROR
        notes,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/haccp/heat-treatment error:", error);
    return NextResponse.json(
      { error: "Váratlan hiba történt mentés közben." },
      { status: 500 }
    );
  }
}
