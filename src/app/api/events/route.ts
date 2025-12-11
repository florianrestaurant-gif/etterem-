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

// ─────────────────────────────
// GET /api/events
// Események listázása az aktuális étteremhez
// ─────────────────────────────

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from"); // opcionális: YYYY-MM-DD
    const toStr = searchParams.get("to"); // opcionális: YYYY-MM-DD

   const dateFilter: { gte?: Date; lt?: Date } = {};

    if (fromStr) {
      const from = new Date(fromStr);
      if (!Number.isNaN(from.getTime())) {
        dateFilter.gte = from;
      }
    }
    if (toStr) {
      const to = new Date(toStr);
      if (!Number.isNaN(to.getTime())) {
        // következő nap 00:00-ig
        dateFilter.lt = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
      }
    }

    const events = await prisma.restaurantEvent.findMany({
      where: {
        restaurantId,
        ...(Object.keys(dateFilter).length
          ? { date: dateFilter }
          : {}),
      },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      events,
    });
  } catch (error) {
    console.error("GET /api/events ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt az események lekérésekor." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────
// POST /api/events
// Új esemény rögzítése + CRM vendég automatikus kezelése
// ─────────────────────────────

type EventType = "BIRTHDAY" | "WEDDING" | "CHRISTENING" | "CORPORATE" | "OTHER";

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
      title: string;
      type: EventType;
      eventDate: string; // YYYY-MM-DD
      startTime?: string; // HH:mm
      endTime?: string; // HH:mm
      guestsTotal: number;
      guestsKids?: number;
      contactName: string;
      contactPhone: string;
      contactEmail?: string;
      roomName?: string;
      tableLayout?: string;
      hasCake?: boolean;
      cakeDetails?: string;
      allergyNotes?: string;
      notes?: string;
    };

    const {
      title,
      type,
      eventDate,
      startTime,
      endTime,
      guestsTotal,
      guestsKids,
      contactName,
      contactPhone,
      contactEmail,
      roomName,
      tableLayout,
      hasCake,
      cakeDetails,
      allergyNotes,
      notes,
    } = body;

    // Kötelező mezők ellenőrzése – ugyanaz, mint a formban
    if (
      !title ||
      !type ||
      !eventDate ||
      !guestsTotal ||
      !contactName ||
      !contactPhone
    ) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Dátum/idő összeállítása
    const date = new Date(`${eventDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Érvénytelen dátum." },
        { status: 400 }
      );
    }

    const start = startTime
      ? new Date(`${eventDate}T${startTime}:00`)
      : null;
    const end = endTime ? new Date(`${eventDate}T${endTime}:00`) : null;

    // 🔹 CRM integráció – pont úgy, mint a delivery-ben:
    // Ha van telefon, akkor:
    //  1) normalizáljuk
    //  2) megkeressük a vendéget az éttermen belül
    //  3) ha nincs, létrehozzuk
    //  4) event.guestId = vendég.id

    let finalGuestId: string | null = null;

    const trimmedPhone = contactPhone.trim();
    if (trimmedPhone) {
      const normalized = normalizePhone(trimmedPhone);

      let guest = await prisma.guest.findFirst({
        where: {
          restaurantId,
          OR: [
            { phone: trimmedPhone },
            { phone: normalized },
          ],
        },
      });

      if (!guest) {
        guest = await prisma.guest.create({
          data: {
            restaurantId,
            name: contactName || null,
            phone: normalized || trimmedPhone,
            email: contactEmail || null,
            address: null,
            note: null,
          },
        });
      }

      finalGuestId = guest.id;
    }

    const created = await prisma.restaurantEvent.create({
      data: {
        restaurantId,
        guestId: finalGuestId, // lehet null, ha nincs telefon
        type,
        status: "INQUIRY", // kezdetben érdeklődés / egyeztetés alatt
        title,
        date,
        startTime: start,
        endTime: end,
        guestsTotal,
        guestsKids: guestsKids ?? null,
        contactName,
        contactPhone,
        contactEmail: contactEmail ?? null,
        roomName: roomName ?? null,
        tableLayout: tableLayout ?? null,
        hasCake: hasCake ?? false,
        cakeDetails: cakeDetails ?? null,
        allergyNotes: allergyNotes ?? null,
        generalNotes: notes ?? null,
      },
    });

    return NextResponse.json({ ok: true, event: created });
  } catch (error) {
    console.error("POST /api/events ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt az esemény mentésekor." },
      { status: 500 }
    );
  }
}
