import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
  });
  return membership?.restaurantId ?? null;
}

// Telefonszám normalizálása – ugyanúgy, mint a delivery API-ban
function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("421")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.replace(/^0+/, "");
  return digits;
}

// ==== TÍPUSOK A VÁLASZHOZ ====

type GuestDetailOk = {
  ok: true;
  guest: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    firstOrderDate: string | null;
    lastOrderDate: string | null;
  };
  orders: {
    id: string;
    deliveryDate: string | null;
    totalPrice: number | null;
    place: string | null;
    address: string | null;
    note: string | null;
    soup: number | null;
    menu1: number | null;
    menu2: number | null;
    menu3: number | null;
    menu4: number | null;
    businessMenu: number | null;
    dessert: number | null;
    delivered: boolean;
    createdAt: string;
  }[];
};

type GuestDetailError = {
  ok: false;
  error: string;
};

type GuestDetailResponse = GuestDetailOk | GuestDetailError;

/**
 * GET /api/guests/[id]
 * Vendég + rendeléstörténet + statisztikák
 * (rendelések guestId VAGY telefonszám alapján)
 */
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<GuestDetailResponse>(
        { ok: false, error: "Nincs bejelentkezve." },
        { status: 401 }
      );
    }

    const restaurantId = await getCurrentRestaurantId(session.user.id);
    if (!restaurantId) {
      return NextResponse.json<GuestDetailResponse>(
        { ok: false, error: "A felhasználóhoz nem tartozik étterem." },
        { status: 400 }
      );
    }

    const { id } = context.params;

    // Vendég betöltése (csak az adott étteremből)
    const guest = await prisma.guest.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!guest) {
      return NextResponse.json<GuestDetailResponse>(
        { ok: false, error: "Nem található ilyen vendég ebben az étteremben." },
        { status: 404 }
      );
    }

    // Telefonszám variációk (pl. 0907…, 907…, 421907…)
    const variants: string[] = [];
    if (guest.phone) {
      variants.push(guest.phone);

      const canonical = normalizePhone(guest.phone);
      if (canonical && canonical !== guest.phone) {
        variants.push(canonical);
        variants.push("0" + canonical); // 0907…
        variants.push("421" + canonical); // 421907…
      }
    }
    const phoneVariants = variants.filter((v): v is string => !!v);

    // Rendelések keresése:
    //  - ahol guestId = vendég id
    //  - VAGY a telefon a variánsok egyike
    const ordersRaw = await prisma.deliveryOrder.findMany({
      where: {
        restaurantId,
        OR: [
          { guestId: guest.id },
          ...(phoneVariants.length > 0
            ? [
                {
                  phone: {
                    in: phoneVariants,
                  },
                },
              ]
            : []),
        ],
      },
      orderBy: [{ deliveryDate: "desc" }, { createdAt: "desc" }],
    });

    const totalOrders = ordersRaw.length;
    const totalRevenue = ordersRaw.reduce(
      (sum, o) => sum + (o.totalPrice ?? 0),
      0
    );

    let firstOrderDate: string | null = null;
    let lastOrderDate: string | null = null;

    if (ordersRaw.length > 0) {
      const sortedByDate = [...ordersRaw].sort((a, b) => {
        const ad = a.deliveryDate ?? a.createdAt;
        const bd = b.deliveryDate ?? b.createdAt;
        return ad.getTime() - bd.getTime();
      });

      const first = sortedByDate[0];
      const last = sortedByDate[sortedByDate.length - 1];

      firstOrderDate = (first.deliveryDate ?? first.createdAt).toISOString();
      lastOrderDate = (last.deliveryDate ?? last.createdAt).toISOString();
    }

    const response: GuestDetailOk = {
      ok: true,
      guest: {
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        email: guest.email,
        address: guest.address,
        note: guest.note,
        createdAt: guest.createdAt.toISOString(),
        updatedAt: guest.updatedAt.toISOString(),
      },
      stats: {
        totalOrders,
        totalRevenue,
        firstOrderDate,
        lastOrderDate,
      },
      orders: ordersRaw.map((o) => ({
        id: o.id,
        deliveryDate: o.deliveryDate ? o.deliveryDate.toISOString() : null,
        totalPrice: o.totalPrice,
        place: o.place,
        address: o.address,
        note: o.note,
        soup: o.soup,
        menu1: o.menu1,
        menu2: o.menu2,
        menu3: o.menu3,
        menu4: o.menu4,
        businessMenu: o.businessMenu,
        dessert: o.dessert,
        delivered: o.delivered ?? false,
        createdAt: o.createdAt.toISOString(),
      })),
    };

    return NextResponse.json<GuestDetailResponse>(response);
  } catch (error) {
    console.error("GET /api/guests/[id] ERROR", error);
    return NextResponse.json<GuestDetailResponse>(
      { ok: false, error: "Hiba történt a vendég adatainak lekérésekor." },
      { status: 500 }
    );
  }
}

type PatchBody = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
};

/**
 * PATCH /api/guests/[id]
 * Vendég adatainak frissítése
 */
export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Nincs bejelentkezve." },
        { status: 401 }
      );
    }

    const restaurantId = await getCurrentRestaurantId(session.user.id);
    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "A felhasználóhoz nem tartozik étterem." },
        { status: 400 }
      );
    }

    const { id } = context.params;
    const body = (await req.json()) as PatchBody;

    const guest = await prisma.guest.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!guest) {
      return NextResponse.json(
        { ok: false, error: "Nem található ilyen vendég ebben az étteremben." },
        { status: 404 }
      );
    }

    const updated = await prisma.guest.update({
      where: { id: guest.id },
      data: {
        name: body.name ?? guest.name,
        phone: body.phone ?? guest.phone,
        email: body.email ?? guest.email,
        address: body.address ?? guest.address,
        note: body.note ?? guest.note,
      },
    });

    return NextResponse.json({
      ok: true,
      guest: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        note: updated.note,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/guests/[id] ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt a vendég módosításakor." },
      { status: 500 }
    );
  }
}
