import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { MenuWeek, MenuItem, Restaurant } from "@prisma/client";

type MenuWithItems = MenuWeek & { items: MenuItem[] };
type RestaurantBasic = Restaurant;

type RouteParams = {
  params: Promise<{ id: string }>;
};

const dayLabelsHu = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek"];

// Ugyanaz a logika, mint a Make-es/FB posztban: heti menü szöveg összerakása
function buildSocialPostText(
  menu: MenuWithItems,
  restaurant: RestaurantBasic
): string {
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

  for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
    const itemsForDay = menu.items.filter(
      (item) => item.dayIndex === dayIndex || item.allWeek
    );
    if (itemsForDay.length === 0) continue;

    lines.push(`📍 ${dayLabelsHu[dayIndex]}:`);

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

// GET – szöveg generálása a frontend gombnak (vágólapra másoláshoz)
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
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
      menu.restaurant as RestaurantBasic
    );

    return NextResponse.json({ ok: true, text });
  } catch (e) {
    console.error("[GET /api/menus/[id]/social-post] ERROR:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
