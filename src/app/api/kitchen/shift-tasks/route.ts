// src/app/api/kitchen/shift-tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });

  return membership?.restaurantId ?? null;
}

// GET /api/kitchen/shift-tasks?shiftId=...
export async function GET(req: NextRequest) {
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

    const { searchParams } = req.nextUrl;
    const shiftId = searchParams.get("shiftId");

    if (!shiftId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_SHIFT_ID" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, restaurantId },
      include: { tasks: true },
    });

    if (!shift) {
      return NextResponse.json(
        { ok: false, error: "SHIFT_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, tasks: shift.tasks });
  } catch (error) {
    console.error("GET /api/kitchen/shift-tasks ERROR", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// POST /api/kitchen/shift-tasks
// body: { shiftId, title, description? }
export async function POST(req: NextRequest) {
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

    const body = (await req.json()) as {
      shiftId?: string;
      title?: string;
      description?: string;
    };

    if (!body.shiftId || !body.title?.trim()) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
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

    const created = await prisma.shiftTask.create({
      data: {
        shiftId: body.shiftId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        // status, createdAt defaultból jön
      },
    });

    return NextResponse.json({ ok: true, task: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/kitchen/shift-tasks ERROR", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// PATCH /api/kitchen/shift-tasks
// body: { id, status }
export async function PATCH(req: NextRequest) {
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

    const body = (await req.json()) as {
      id?: string;
      status?: TaskStatus;
    };

    if (!body.id || !body.status) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // ellenőrizzük, hogy a task az adott étteremhez tartozik-e
    const existing = await prisma.shiftTask.findFirst({
      where: {
        id: body.id,
        shift: {
          restaurantId,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "TASK_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await prisma.shiftTask.update({
      where: { id: body.id },
      data: {
        status: body.status,
        completedAt: body.status === "DONE" ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, task: updated });
  } catch (error) {
    console.error("PATCH /api/kitchen/shift-tasks ERROR", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
