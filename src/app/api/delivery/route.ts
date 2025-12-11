import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

// Telefonszám normalizálása – pl. +4219xx -> 9xx, 09xx -> 9xx
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("421")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.replace(/^0+/, "");
  return digits;
}

// Aktuális étterem a bejelentkezett user alapján
async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
  });

  return membership?.restaurantId ?? null;
}

// Árlista mezők
type PriceItemKey =
  | "soup"
  | "menu1"
  | "menu2"
  | "menu3"
  | "menu4"
  | "businessMenu"
  | "dessert";

type PriceCounts = Record<PriceItemKey, number>;

/**
 * Automatikus árkalkuláció egy rendelésre
 * - menü darabok
 * - csomagolás darab
 * - nyugdíjas kedvezmény
 */
async function computeTotalPriceForOrder(
  restaurantId: string,
  counts: PriceCounts,
  packagingCount: number,
  isSenior: boolean
): Promise<number | null> {
  const config = await prisma.deliveryPriceConfig.findFirst({
    where: { restaurantId },
  });

  if (!config) return null;

  const {
    soupPrice = 0,
    menu1Price = 0,
    menu2Price = 0,
    menu3Price = 0,
    menu4Price = 0,
    businessMenuPrice = 0,
    dessertPrice = 0,
    packagingPrice = 0,
    seniorDiscountPercent = 0,
  } = config;

  const baseMenusTotal =
    counts.soup * soupPrice +
    counts.menu1 * menu1Price +
    counts.menu2 * menu2Price +
    counts.menu3 * menu3Price +
    counts.menu4 * menu4Price +
    counts.businessMenu * businessMenuPrice +
    counts.dessert * dessertPrice;

  const packagingTotal = packagingCount * packagingPrice;

  let total = baseMenusTotal + packagingTotal;

  if (isSenior && seniorDiscountPercent > 0) {
    const discount = (total * seniorDiscountPercent) / 100;
    total -= discount;
  }

  if (!Number.isFinite(total)) return null;
  return total;
}

// Közös: számlálók 0-val
function toCountsFromOrder(order: {
  soup: number | null;
  menu1: number | null;
  menu2: number | null;
  menu3: number | null;
  menu4: number | null;
  businessMenu: number | null;
  dessert: number | null;
}): PriceCounts {
  return {
    soup: order.soup ?? 0,
    menu1: order.menu1 ?? 0,
    menu2: order.menu2 ?? 0,
    menu3: order.menu3 ?? 0,
    menu4: order.menu4 ?? 0,
    businessMenu: order.businessMenu ?? 0,
    dessert: order.dessert ?? 0,
  };
}

/**
 * GET /api/delivery?date=YYYY-MM-DD
 * Napi rendelések lekérése az aktuális user éttermére,
 * menü darabszámokkal, bevétellel, csomagolással kiegészítve.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nincs bejelentkezve." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { error: "Hiányzó dátum paraméter." },
        { status: 400 }
      );
    }

    const baseDate = new Date(dateStr);
    if (Number.isNaN(baseDate.getTime())) {
      return NextResponse.json(
        { error: "Érvénytelen dátum." },
        { status: 400 }
      );
    }

    const restaurantId = await getCurrentRestaurantId(session.user.id);
    if (!restaurantId) {
      return NextResponse.json(
        { error: "A felhasználóhoz nem tartozik étterem." },
        { status: 400 }
      );
    }

    const start = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() + 1,
      0,
      0,
      0,
      0
    );

    const orders = await prisma.deliveryOrder.findMany({
      where: {
        restaurantId,
        deliveryDate: {
          gte: start,
          lt: end,
        },
      },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { routeOrder: "asc" }, // kézbesítési sorrend
        { createdAt: "asc" },
      ],
    });

    // Össz darabszámok és bevétel
    const aggregates = orders.reduce(
      (acc, o) => {
        const counts = toCountsFromOrder(o);

        acc.soup += counts.soup;
        acc.menu1 += counts.menu1;
        acc.menu2 += counts.menu2;
        acc.menu3 += counts.menu3;
        acc.menu4 += counts.menu4;
        acc.businessMenu += counts.businessMenu;
        acc.dessert += counts.dessert;

        acc.totalRevenue += o.totalPrice ?? 0;
        acc.totalPackagingCount += o.packagingCount ?? 0;
        acc.seniorCount += o.isSenior ? 1 : 0;

        return acc;
      },
      {
        soup: 0,
        menu1: 0,
        menu2: 0,
        menu3: 0,
        menu4: 0,
        businessMenu: 0,
        dessert: 0,
        totalRevenue: 0,
        totalPackagingCount: 0,
        seniorCount: 0,
      }
    );

    return NextResponse.json({
      date: start.toISOString(),
      totalCount: orders.length,
      totalRevenue: aggregates.totalRevenue,
      totalsByItem: {
        soup: aggregates.soup,
        menu1: aggregates.menu1,
        menu2: aggregates.menu2,
        menu3: aggregates.menu3,
        menu4: aggregates.menu4,
        businessMenu: aggregates.businessMenu,
        dessert: aggregates.dessert,
      },
      totalPackagingCount: aggregates.totalPackagingCount,
      seniorCount: aggregates.seniorCount,
      orders,
    });
  } catch (error) {
    console.error("GET /api/delivery ERROR", error);
    return NextResponse.json(
      { error: "Hiba történt a rendelések lekérésekor." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/delivery
 * Új rendelés rögzítése automatikus árkalkulációval
 * (csomagolás + nyugdíjas kedvezmény figyelembevételével).
 */
export async function POST(req: NextRequest) {
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

    const body = (await req.json()) as {
      date: string;
      guestId: string | null;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      place?: string;
      note?: string;
      soup?: number | null;
      menu1?: number | null;
      menu2?: number | null;
      menu3?: number | null;
      menu4?: number | null;
      businessMenu?: number | null;
      dessert?: number | null;
      packagingCount?: number | null;
      isSenior?: boolean;
      totalPrice?: number | null; // opcionális felülírás
    };

    const {
      date,
      guestId,
      name,
      email,
      phone,
      address,
      place,
      note,
      soup = null,
      menu1 = null,
      menu2 = null,
      menu3 = null,
      menu4 = null,
      businessMenu = null,
      dessert = null,
      packagingCount: rawPackagingCount,
      isSenior: rawIsSenior,
      totalPrice,
    } = body;

    if (!date) {
      return NextResponse.json(
        { ok: false, error: "Hiányzó dátum." },
        { status: 400 }
      );
    }

    const baseDate = new Date(date);
    if (Number.isNaN(baseDate.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Érvénytelen dátum." },
        { status: 400 }
      );
    }

    const deliveryDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate()
    );
    const timestamp = new Date(); // mostani időpont

    let finalGuestId = guestId ?? null;

    // Ha nincs guestId, de van telefon → CRM lookup / create (éttermen belül)
    if (!finalGuestId && phone) {
      const normalized = normalizePhone(phone);

      let guest = await prisma.guest.findFirst({
        where: {
          restaurantId,
          OR: [{ phone }, { phone: normalized }],
        },
      });

      if (!guest) {
        guest = await prisma.guest.create({
          data: {
            restaurantId,
            name: name ?? null,
            phone: normalized || phone,
            email: email ?? null,
            address: address ?? null,
          },
        });
      }

      finalGuestId = guest.id;
    }

    const counts: PriceCounts = {
      soup: soup ?? 0,
      menu1: menu1 ?? 0,
      menu2: menu2 ?? 0,
      menu3: menu3 ?? 0,
      menu4: menu4 ?? 0,
      businessMenu: businessMenu ?? 0,
      dessert: dessert ?? 0,
    };

    const packagingCount =
      typeof rawPackagingCount === "number" ? rawPackagingCount : 0;
    const isSenior = !!rawIsSenior;

    const autoTotal = await computeTotalPriceForOrder(
      restaurantId,
      counts,
      packagingCount,
      isSenior
    );
    const finalTotalPrice =
      typeof totalPrice === "number" ? totalPrice : autoTotal;

    // routeOrder: a nap utolsó rendeléséhez képest +1
    const lastOrder = await prisma.deliveryOrder.findFirst({
      where: {
        restaurantId,
        deliveryDate,
      },
      orderBy: { routeOrder: "desc" },
    });

    const nextRouteOrder = (lastOrder?.routeOrder ?? 0) + 1;

    const order = await prisma.deliveryOrder.create({
      data: {
        restaurantId,
        guestId: finalGuestId ?? undefined,
        phone: phone ?? null,
        address: address ?? null,
        place: place ?? null,
        note: note ?? null,
        timestamp,
        deliveryDate,
        soup,
        menu1,
        menu2,
        menu3,
        menu4,
        businessMenu,
        dessert,
        packagingCount, // <- mindig number
        isSenior,
        totalPrice: finalTotalPrice ?? null,
        routeOrder: nextRouteOrder,
        delivered: false,
      },
    });

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    console.error("POST /api/delivery ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt a rendelés mentésekor." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/delivery
 * - action: "reorder" → kiszállítási sorrend mentése
 * - action: "toggleDelivered" → kiszállítva kapcsoló
 * - action: "update" → rendelés módosítása (tételek, cím, ár, csomagolás, nyugdíjas, stb.)
 */
export async function PATCH(req: NextRequest) {
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

    const body = await req.json();

    // 1) Reorder
    if (body.action === "reorder") {
      const orderedIds = body.orderedIds as string[] | undefined;
      if (!orderedIds?.length) {
        return NextResponse.json(
          { ok: false, error: "Hiányzó orderedIds." },
          { status: 400 }
        );
      }

      await Promise.all(
        orderedIds.map((id, index) =>
          prisma.deliveryOrder.updateMany({
            where: { id, restaurantId },
            data: { routeOrder: index + 1 },
          })
        )
      );

      return NextResponse.json({ ok: true });
    }

    // 2) Toggle delivered
    if (body.action === "toggleDelivered") {
      const id = body.id as string | undefined;
      const delivered = body.delivered as boolean | undefined;

      if (!id || typeof delivered !== "boolean") {
        return NextResponse.json(
          { ok: false, error: "Hiányzó id vagy delivered." },
          { status: 400 }
        );
      }

      await prisma.deliveryOrder.updateMany({
        where: { id, restaurantId },
        data: { delivered },
      });

      return NextResponse.json({ ok: true });
    }

    // 3) Update order
    if (body.action === "update") {
      const {
        id,
        phone,
        address,
        place,
        note,
        soup,
        menu1,
        menu2,
        menu3,
        menu4,
        businessMenu,
        dessert,
        packagingCount: rawPackagingCount,
        isSenior: rawIsSenior,
        totalPrice,
        routeOrder,
        delivered,
      } = body as {
        id: string;
        phone?: string | null;
        address?: string | null;
        place?: string | null;
        note?: string | null;
        soup?: number | null;
        menu1?: number | null;
        menu2?: number | null;
        menu3?: number | null;
        menu4?: number | null;
        businessMenu?: number | null;
        dessert?: number | null;
        packagingCount?: number | null;
        isSenior?: boolean;
        totalPrice?: number | null;
        routeOrder?: number | null;
        delivered?: boolean;
      };

      if (!id) {
        return NextResponse.json(
          { ok: false, error: "Hiányzó rendelés azonosító." },
          { status: 400 }
        );
      }

      const existing = await prisma.deliveryOrder.findFirst({
        where: { id, restaurantId },
      });

      if (!existing) {
        return NextResponse.json(
          { ok: false, error: "Nem található ilyen rendelés ehhez az étteremhez." },
          { status: 404 }
        );
      }

      const counts: PriceCounts = {
        soup: soup ?? existing.soup ?? 0,
        menu1: menu1 ?? existing.menu1 ?? 0,
        menu2: menu2 ?? existing.menu2 ?? 0,
        menu3: menu3 ?? existing.menu3 ?? 0,
        menu4: menu4 ?? existing.menu4 ?? 0,
        businessMenu: businessMenu ?? existing.businessMenu ?? 0,
        dessert: dessert ?? existing.dessert ?? 0,
      };

      const mergedPackagingCount =
        typeof rawPackagingCount === "number"
          ? rawPackagingCount
          : existing.packagingCount ?? 0;

      const mergedIsSenior =
        typeof rawIsSenior === "boolean"
          ? rawIsSenior
          : existing.isSenior ?? false;

      const autoTotal = await computeTotalPriceForOrder(
        restaurantId,
        counts,
        mergedPackagingCount,
        mergedIsSenior
      );

      const finalTotalPrice =
        typeof totalPrice === "number" ? totalPrice : autoTotal;

      const updated = await prisma.deliveryOrder.update({
        where: { id: existing.id },
        data: {
          phone: phone ?? existing.phone,
          address: address ?? existing.address,
          place: place ?? existing.place,
          note: note ?? existing.note,
          soup: soup ?? existing.soup,
          menu1: menu1 ?? existing.menu1,
          menu2: menu2 ?? existing.menu2,
          menu3: menu3 ?? existing.menu3,
          menu4: menu4 ?? existing.menu4,
          businessMenu: businessMenu ?? existing.businessMenu,
          dessert: dessert ?? existing.dessert,
          packagingCount:
            typeof rawPackagingCount === "number"
              ? rawPackagingCount
              : existing.packagingCount,
          isSenior:
            typeof rawIsSenior === "boolean"
              ? rawIsSenior
              : existing.isSenior,
          totalPrice: finalTotalPrice ?? null,
          delivered: delivered ?? existing.delivered,
          routeOrder: routeOrder ?? existing.routeOrder,
        },
      });

      return NextResponse.json({ ok: true, order: updated });
    }

    return NextResponse.json(
      { ok: false, error: "Ismeretlen action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("PATCH /api/delivery ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt a rendelés módosításakor." },
      { status: 500 }
    );
  }
}
