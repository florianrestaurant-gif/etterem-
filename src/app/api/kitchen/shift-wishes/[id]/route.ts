import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

type ShiftWishStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });
  return membership?.restaurantId ?? null;
}

// PATCH /api/kitchen/shift-wishes/:id
// body: { status: ShiftWishStatus }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const restaurantId = await getCurrentRestaurantId(session.user.id);
    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "NO_RESTAURANT" },
        { status: 400 }
      );
    }

    // 🔹 Itt „bontjuk ki” az async params-t
    const { id } = await params;
    const wishId = id;

    if (!wishId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_ID" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as { status: ShiftWishStatus };

    if (!body.status) {
      return NextResponse.json(
        { ok: false, error: "MISSING_STATUS" },
        { status: 400 }
      );
    }

    // csak a saját éttermed kívánságait módosíthatod
    const existing = await prisma.shiftWish.findFirst({
      where: { id: wishId, restaurantId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "WISH_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await prisma.shiftWish.update({
      where: { id: wishId },
      data: {
        status: body.status,
        resolvedAt: body.status === "DONE" ? new Date() : null,
      },
      include: {
        createdBy: { select: { email: true } },
      },
    });

    return NextResponse.json({ ok: true, wish: updated });
  } catch (error) {
    console.error("PATCH /api/kitchen/shift-wishes/[id] ERROR", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
