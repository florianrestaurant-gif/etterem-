import { NextRequest, NextResponse } from "next/server";
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

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = ctx.params.id;
    if (!id) {
      return NextResponse.json({ error: "Hiányzó id." }, { status: 400 });
    }

    const existing = await prisma.coolingLog.findUnique({ where: { id } });
    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "A bejegyzés nem található." }, { status: 404 });
    }

    await prisma.coolingLog.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[COOLING_LOGS_DELETE]", error);
    return NextResponse.json({ error: "Hiba történt a törlés során." }, { status: 500 });
  }
}
