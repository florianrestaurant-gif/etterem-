import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

/**
 * RestaurantId feloldás:
 * - Global admin: ha van ?restaurantId=... akkor azt használjuk
 * - Normál user: első membership restaurantId
 */
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

/**
 * GET /api/haccp/fridges
 * Az aktuális étterem összes hűtője / fagyasztója.
 * (Global adminnál lehet: /api/haccp/fridges?restaurantId=...)
 */
export async function GET(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fridges = await prisma.fridgeDevice.findMany({
      where: { restaurantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        minTemp: true,
        maxTemp: true,
      },
    });

    // Frontend közvetlenül FridgeDevice[]-t vár
    return NextResponse.json(fridges, { status: 200 });
  } catch (error) {
    console.error("[FRIDGES_GET]", error);
    return NextResponse.json(
      { error: "Hiba történt a hűtők lekérésekor." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/haccp/fridges
 * Új hűtő / fagyasztó létrehozása az aktuális étteremhez.
 * (Global adminnál lehet: /api/haccp/fridges?restaurantId=...)
 */
export async function POST(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const {
      name,
      type,
      location,
      minTemp,
      maxTemp,
    }: {
      name?: string;
      type?: "FRIDGE" | "FREEZER" | "CHILLROOM";
      location?: string;
      minTemp?: number | string | null;
      maxTemp?: number | string | null;
    } = body ?? {};

    const trimmedName = (name ?? "").trim();
    const trimmedLocation = (location ?? "").trim();

    if (!trimmedName) {
      return NextResponse.json({ error: "A hűtő neve kötelező." }, { status: 400 });
    }

    if (!trimmedLocation) {
      return NextResponse.json(
        { error: "A hűtő helye / elhelyezése kötelező." },
        { status: 400 }
      );
    }

    if (!type || !["FRIDGE", "FREEZER", "CHILLROOM"].includes(type)) {
      return NextResponse.json({ error: "Érvénytelen hűtő típus." }, { status: 400 });
    }

    const parseOptNumber = (v: unknown): number | null => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      if (!s) return null;
      const n = Number.parseFloat(s.replace(",", "."));
      if (!Number.isFinite(n)) return null;
      return n;
    };

    const min = parseOptNumber(minTemp);
    if (minTemp !== undefined && minTemp !== null && String(minTemp).trim() !== "" && min === null) {
      return NextResponse.json(
        { error: "A minimum hőmérsékletnek számnak kell lennie." },
        { status: 400 }
      );
    }

    const max = parseOptNumber(maxTemp);
    if (maxTemp !== undefined && maxTemp !== null && String(maxTemp).trim() !== "" && max === null) {
      return NextResponse.json(
        { error: "A maximum hőmérsékletnek számnak kell lennie." },
        { status: 400 }
      );
    }

    const fridge = await prisma.fridgeDevice.create({
      data: {
        restaurantId,
        name: trimmedName,
        type,
        location: trimmedLocation,
        minTemp: min,
        maxTemp: max,
      },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        minTemp: true,
        maxTemp: true,
      },
    });

    return NextResponse.json(fridge, { status: 201 });
  } catch (error: any) {
    console.error("[FRIDGES_POST]", error);

    // unique: restaurantId + name
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Ezzel a névvel már létezik hűtő ennél az étteremnél. Válassz másik nevet (pl. Konyha 1, Konyha 2).",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Hiba történt a hűtő létrehozása közben." },
      { status: 500 }
    );
  }
}
