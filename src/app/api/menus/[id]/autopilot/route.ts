import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { MenuWeek, MenuItem, Restaurant } from "@prisma/client";

const MAKE_AUTOPILOT_WEBHOOK_URL = process.env.MAKE_AUTOPILOT_WEBHOOK_URL;

type MenuWithItems = MenuWeek & { items: MenuItem[] };
type RestaurantBasic = Restaurant;

type RouteParams = {
  params: Promise<{ id: string }>;
};

const dayLabelsHu = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek"];

// Ezt a struktúrát fogjuk elküldeni a Make-nek
type AutopilotPayload = {
  menuId: string;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  week: {
    startDate: string;
    endDate: string;
    labelHu: string;
  };
  publicUrl: string;
  itemsByDay: {
    dayIndex: number;
    dayLabelHu: string;
    items: {
      id: string;
      menuLabel: string | null;
      courseType: string | null;
      titleHU: string;
      descHU: string | null;
      price: number | null; // euró
      allWeek: boolean;
      allergens: string | null;
    }[];
  }[];
  // előre generált hosszabb szöveg pl. FB poszthoz
  socialTextHu: string;
};

// Szöveg generálása FB/IG poszthoz
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

// Autopilot Week – Make webhook hívása
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!MAKE_AUTOPILOT_WEBHOOK_URL) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "MAKE_AUTOPILOT_WEBHOOK_URL hiányzik a szerver környezeti változók közül.",
        },
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

    if (menu.status !== "published") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Csak publikált menün futtatható az Autopilot Week. Állítsd a státuszt Published-re.",
        },
        { status: 400 }
      );
    }

    const restaurant = menu.restaurant as RestaurantBasic;
    const menuWithItems = menu as MenuWithItems;

    const socialTextHu = buildSocialPostText(menuWithItems, restaurant);

    // Napokra bontott lista a Make-nek
    const itemsByDay: AutopilotPayload["itemsByDay"] = [0, 1, 2, 3, 4].map(
      (dayIndex) => {
        const itemsForDay = menuWithItems.items.filter(
          (item) => item.dayIndex === dayIndex || item.allWeek
        );

        return {
          dayIndex,
          dayLabelHu: dayLabelsHu[dayIndex],
          items: itemsForDay.map((item) => ({
            id: item.id,
            menuLabel: item.menuLabel ?? null,
            courseType: item.courseType ?? null,
            titleHU: item.titleHU,
            descHU: item.descHU ?? null,
            price:
              typeof item.priceCents === "number"
                ? item.priceCents / 100
                : null,
            allWeek: item.allWeek,
            allergens: item.allergens ?? null,
          })),
        };
      }
    ).filter((d) => d.items.length > 0);

    const weekStart = new Date(menu.startDate);
    const weekEnd = new Date(menu.endDate);
    const weekLabelHu = `${weekStart.toLocaleDateString("hu-SK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })} – ${weekEnd.toLocaleDateString("hu-SK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })}`;

    const publicUrl = `/public/${restaurant.slug}?lang=hu`;

    const payload: AutopilotPayload = {
      menuId: menu.id,
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      week: {
        startDate: menu.startDate.toISOString(),
        endDate: menu.endDate.toISOString(),
        labelHu: weekLabelHu,
      },
      publicUrl,
      itemsByDay,
      socialTextHu,
    };

    const makeRes = await fetch(MAKE_AUTOPILOT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!makeRes.ok) {
      const body = await makeRes.text();
      console.error("MAKE AUTOPILOT WEBHOOK ERROR:", makeRes.status, body);
      return NextResponse.json(
        {
          ok: false,
          error: `Make Autopilot webhook hibát adott vissza (${makeRes.status}).`,
          details: body,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/menus/[id]/autopilot] ERROR:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
