import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

  if (user.isGlobalAdmin && restaurantIdFromQuery) return restaurantIdFromQuery;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, restaurantId: { not: null } },
    select: { restaurantId: true },
    orderBy: { id: "asc" },
  });

  return membership?.restaurantId ?? null;
}

export async function GET(req: Request) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD

    const where: any = { restaurantId };

    if (dateParam) {
      const start = new Date(dateParam);
      const end = new Date(dateParam);
      end.setDate(end.getDate() + 1);

      where.date = { gte: start, lt: end };
    }

    const logs = await prisma.cleaningLog.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[CLEANING_LOGS_GET]", error);
    return NextResponse.json(
      { error: "Hiba történt a takarítási naplók lekérése során." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { date, area, frequency, productUsed, method, completed, comment } =
      body;

    if (!date || !area || !frequency) {
      return NextResponse.json(
        { error: "Hiányzó kötelező mezők (dátum, terület, gyakoriság)." },
        { status: 400 }
      );
    }

    const newLog = await prisma.cleaningLog.create({
      data: {
        restaurantId,
        date: new Date(date),
        area,
        frequency,
        productUsed: productUsed || null,
        method: method || null,
        completed: typeof completed === "boolean" ? completed : true,
        comment: comment || null,
        // createdById: ha akarod automatikusan session.user.id-re tehetjük később
      },
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error) {
    console.error("[CLEANING_LOGS_POST]", error);
    return NextResponse.json(
      { error: "Hiba történt a takarítási napló létrehozása során." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, date, area, frequency, productUsed, method, completed, comment } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Hiányzó azonosító (id) a frissítéshez." },
        { status: 400 }
      );
    }

    const existing = await prisma.cleaningLog.findUnique({ where: { id } });

    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "A bejegyzés nem található." }, { status: 404 });
    }

    const updatedLog = await prisma.cleaningLog.update({
      where: { id },
      data: {
        date: date ? new Date(date) : existing.date,
        area: typeof area !== "undefined" ? area : existing.area,
        frequency: typeof frequency !== "undefined" ? frequency : existing.frequency,
        productUsed: typeof productUsed !== "undefined" ? productUsed : existing.productUsed,
        method: typeof method !== "undefined" ? method : existing.method,
        completed: typeof completed === "boolean" ? completed : existing.completed,
        comment: typeof comment !== "undefined" ? comment : existing.comment,
      },
    });

    return NextResponse.json(updatedLog);
  } catch (error) {
    console.error("[CLEANING_LOGS_PUT]", error);
    return NextResponse.json(
      { error: "Hiba történt a takarítási napló frissítése során." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Hiányzó azonosító (id) a törléshez." },
        { status: 400 }
      );
    }

    const existing = await prisma.cleaningLog.findUnique({ where: { id } });

    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "A bejegyzés nem található." }, { status: 404 });
    }

    await prisma.cleaningLog.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CLEANING_LOGS_DELETE]", error);
    return NextResponse.json(
      { error: "Hiba történt a takarítási napló törlése során." },
      { status: 500 }
    );
  }
}
