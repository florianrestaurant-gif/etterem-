// src/app/api/kitchen/prep-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

type PrepCategory = "SAUCE" | "STOCK" | "SIDE" | "GARNISH" | "DESSERT_BASE" | "OTHER";
type PrepStatus = "OK" | "LOW" | "OUT" | "DISCARD";

// helper: aktuális étterem
async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });
  return membership?.restaurantId ?? null;
}

// GET /api/kitchen/prep-items?shiftId=...
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const restaurantId = await getCurrentRestaurantId(session.user.id);
    if (!restaurantId) {
      return NextResponse.json({ ok: false, error: "NO_RESTAURANT" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const shiftId = searchParams.get("shiftId");

    if (!shiftId) {
      return NextResponse.json({ ok: false, error: "MISSING_SHIFT_ID" }, { status: 400 });
    }

    const items = await prisma.shiftPrepItem.findMany({
      where: { shiftId, shift: { restaurantId } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("GET /api/kitchen/prep-items ERROR", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// POST /api/kitchen/prep-items
// body: { shiftId, name, category, status?, quantity?, location?, expiryAt?, note? }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const restaurantId = await getCurrentRestaurantId(session.user.id);
    if (!restaurantId) {
      return NextResponse.json({ ok: false, error: "NO_RESTAURANT" }, { status: 400 });
    }

    const body = (await req.json()) as {
      shiftId: string;
      name: string;
      category: PrepCategory;
      status?: PrepStatus;
      quantity?: string;
      location?: string;
      expiryAt?: string | null;
      note?: string;
    };

    if (!body.shiftId || !body.name || !body.category) {
      return NextResponse.json(
        { ok: false, error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 }
      );
    }

    // ellenőrizzük, hogy a shift az adott étteremhez tartozik-e
    const shift = await prisma.shift.findFirst({
      where: { id: body.shiftId, restaurantId },
      select: { id: true },
    });

    if (!shift) {
      return NextResponse.json(
        { ok: false, error: "SHIFT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const expiryDate =
      body.expiryAt && body.expiryAt.trim() !== ""
        ? new Date(body.expiryAt)
        : null;

        const item = await prisma.shiftPrepItem.create({
      data: {
        shiftId: body.shiftId,
        name: body.name,
        category: body.category,
        status: body.status ?? "OK",
        quantity: body.quantity,
        location: body.location,
        expiryAt: expiryDate ?? undefined,
        note: body.note,
      },
    });

    // DTO – dátumok stringgé alakítva, hogy illeszkedjen a PrepItem típushoz
    const dto = {
      id: item.id,
      name: item.name,
      category: item.category,
      status: item.status,
      quantity: item.quantity,
      location: item.location,
      note: item.note,
      expiryAt: item.expiryAt ? item.expiryAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };

    return NextResponse.json({ ok: true, item: dto }, { status: 201 });

  } catch (error) {
    console.error("POST /api/kitchen/prep-items ERROR", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
