import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { MenuWeek, MenuItem, Restaurant } from "@prisma/client";

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

type MenuWithItems = MenuWeek & { items: MenuItem[] };
type RestaurantWithPhone = Restaurant;

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Egyszerű poszt-szöveg generáló – ugyanazt használhatjuk FB/IG/Make-hez
function buildSocialPostText(
  menu: MenuWithItems,
  restaurant: RestaurantWithPhone
) {
  const start = new Date(menu.startDate);
  const end = new Date(menu.endDate);

  const weekStr = `${start.toLocaleDateString("hu-SK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })} – ${end.toLocaleDateString("hu-SK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })}`;

  const lines: string[] = [];

  lines.push(`🍽️ ${restaurant.name} – heti menü`);
  lines.push(`📅 Időszak: ${weekStr}`);
  lines.push("");

  const dayLabels = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek"];

  for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
    const itemsForDay = menu.items.filter(
      (item) => item.dayIndex === dayIndex || item.allWeek
    );
    if (itemsForDay.length === 0) continue;

    lines.push(`📍 ${dayLabels[dayIndex]}:`);

    for (const item of itemsForDay) {
      const price =
        typeof item.priceCents === "number" && item.priceCents > 0
          ? (item.priceCents / 100).toFixed(2) + " €"
          : "";

      const label = item.menuLabel ? `${item.menuLabel} – ` : "";

      lines.push(`• ${label}${item.titleHU}${price ? ` (${price})` : ""}`);
    }

    lines.push("");
  }

  lines.push("");
  lines.push(
    "☎️ Asztalfoglalás / rendelés: " + (restaurant.phone ?? "")
  );
  lines.push("");
  lines.push("#hetimenu #menu");

  return lines.join("\n");
}

// POST – Make webhook hívása
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!MAKE_WEBHOOK_URL) {
      return NextResponse.json(
        { ok: false, error: "MAKE_WEBHOOK_URL hiányzik a szerveren." },
        { status: 500 }
      );
    }

    const { id: menuId } = await params;

    const menu = await prisma.menuWeek.findUnique({
      where: { id: menuId },
      include: {
        restaurant: true,
        items: true,
      },
    });

    if (!menu || !menu.restaurant) {
      return NextResponse.json(
        { ok: false, error: "Menü vagy étterem nem található." },
        { status: 404 }
      );
    }

    const text = buildSocialPostText(
      menu as MenuWithItems,
      menu.restaurant as RestaurantWithPhone
    );

    // Ezt küldjük a Make webhooknak
    const payload = {
      menuId,
      restaurantId: menu.restaurantId,
      restaurantName: menu.restaurant.name,
      restaurantSlug: menu.restaurant.slug,
      text,
      startDate: menu.startDate.toISOString(),
      endDate: menu.endDate.toISOString(),
    };

    const makeRes = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!makeRes.ok) {
      const body = await makeRes.text();
      console.error("MAKE WEBHOOK ERROR:", makeRes.status, body);
      return NextResponse.json(
        {
          ok: false,
          error: `Make webhook hibát adott vissza (${makeRes.status}).`,
          details: body,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/menus/[id]/post-facebook] ERROR:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
