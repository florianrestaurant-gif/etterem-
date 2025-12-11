// src/app/api/kitchen/shift-wishes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

type ShiftWishStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

// aktuális étterem
async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });
  return membership?.restaurantId ?? null;
}

// GET /api/kitchen/shift-wishes?shiftId=...
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
      return NextResponse.json(
        { ok: false, error: "MISSING_SHIFT_ID" },
        { status: 400 }
      );
    }

    const wishes = await prisma.shiftWish.findMany({
      where: { shiftId, restaurantId },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      include: {
        createdBy: { select: { email: true } },
      },
    });

    return NextResponse.json({ ok: true, wishes });
  } catch (error) {
    console.error("GET /api/kitchen/shift-wishes ERROR", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// POST /api/kitchen/shift-wishes
// body: { shiftId, title, description?, status? }
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
      title: string;
      description?: string;
      status?: ShiftWishStatus;
    };

    if (!body.shiftId || !body.title) {
      return NextResponse.json(
        { ok: false, error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 }
      );
    }

    // ellenőrizzük, hogy a shift ehhez az étteremhez tartozik-e
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

    const wish = await prisma.shiftWish.create({
      data: {
        restaurantId,
        shiftId: body.shiftId,
        title: body.title,
        description: body.description,
        status: body.status ?? "OPEN",
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { email: true } },
      },
    });

    return NextResponse.json({ ok: true, wish }, { status: 201 });
  } catch (error) {
    console.error("POST /api/kitchen/shift-wishes ERROR", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
