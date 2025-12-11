// src/app/api/kitchen/monitor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type PrepStatus = string; // egyszerűsítve, csak string kell a kijelzéshez
type PrepCategory = string;

async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });

  return membership?.restaurantId ?? null;
}

export async function GET(_req: NextRequest) {
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

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    });

    const shift = await prisma.shift.findFirst({
      where: { restaurantId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        tasks: true,
        prepItems: true,
        wishes: {
          include: {
            createdBy: { select: { email: true } },
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({
        ok: true,
        restaurantName: restaurant?.name ?? null,
        shift: null,
        generatedAt: new Date().toISOString(),
      });
    }

    const shiftLabel = `${new Intl.DateTimeFormat("hu-SK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(shift.date)} – ${shift.type}`;

    return NextResponse.json({
      ok: true,
      restaurantName: restaurant?.name ?? null,
      shift: {
        id: shift.id,
        label: shiftLabel,
        date: shift.date.toISOString(),
        type: shift.type,
        tasks: shift.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status as TaskStatus,
          createdAt: t.createdAt.toISOString(),
        })),
        prepItems: shift.prepItems.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category as PrepCategory,
          quantity: p.quantity,
          status: p.status as PrepStatus,
          expiryAt: p.expiryAt ? p.expiryAt.toISOString() : null,
          location: p.location,
          note: p.note,
        })),
        wishes: shift.wishes.map((w) => ({
          id: w.id,
          title: w.title,
          description: w.description,
          status: w.status as "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED",
          createdAt: w.createdAt.toISOString(),
          createdByEmail: w.createdBy?.email ?? null,
        })),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/kitchen/monitor ERROR", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
