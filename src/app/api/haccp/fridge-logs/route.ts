import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

// Aktuális étterem a user alapján (első membership)
async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId, restaurantId: { not: null } },
    orderBy: { id: "asc" },
    select: { restaurantId: true },
  });

  return membership?.restaurantId ?? null;
}

/**
 * GET /api/haccp/fridge-logs?fridgeDeviceId=...
 * Az aktuális étterem hűtőnapló bejegyzései (opcionálisan szűrve 1 hűtőre).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Nincs jogosultság (nem vagy bejelentkezve)." },
        { status: 401 }
      );
    }

    const restaurantId = await getCurrentRestaurantId(userId);
    if (!restaurantId) {
      return NextResponse.json(
        { error: "Nincs étterem hozzárendelve a felhasználóhoz." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fridgeDeviceId = searchParams.get("fridgeDeviceId");

    const logs = await prisma.fridgeLog.findMany({
      where: {
        restaurantId,
        ...(fridgeDeviceId ? { fridgeDeviceId } : {}),
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("GET /api/haccp/fridge-logs ERROR", error);
    return NextResponse.json(
      { error: "Hiba történt a hűtőnapló lekérésekor." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/haccp/fridge-logs
 *
 * Body (kompatibilis):
 *  - fridgeDeviceId?: string  (új)
 *  - fridgeName?: string      (régi / fallback)  <-- kötelező lesz, ha nincs deviceId
 *  - temperature: number | string (kötelező)
 *  - date?: string (ISO) vagy measuredAt?: string (ISO)
 *  - humidity?: number | string | null
 *  - location?: string | null (opcionális, ha nincs device)
 *  - actionTaken?: string | null (opcionális)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Nincs jogosultság (nem vagy bejelentkezve)." },
        { status: 401 }
      );
    }

    const restaurantId = await getCurrentRestaurantId(userId);
    if (!restaurantId) {
      return NextResponse.json(
        { error: "Nincs étterem hozzárendelve a felhasználóhoz." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      fridgeDeviceId,
      fridgeName: fridgeNameFromBody,
      temperature,
      measuredAt, // régi név
      date, // új név
      humidity,
      location: locationFromBody,
      actionTaken,
    } = body ?? {};

    if (temperature === undefined || temperature === null) {
      return NextResponse.json(
        { error: "A temperature mező kötelező." },
        { status: 400 }
      );
    }

    const numericTemp =
      typeof temperature === "string"
        ? Number.parseFloat(temperature)
        : temperature;

    if (!Number.isFinite(numericTemp)) {
      return NextResponse.json(
        { error: "A hőmérsékletnek számnak kell lennie." },
        { status: 400 }
      );
    }

    const numericHumidity =
      humidity === undefined || humidity === null || humidity === ""
        ? null
        : typeof humidity === "string"
        ? Number.parseFloat(humidity)
        : Number(humidity);

    if (numericHumidity !== null && !Number.isFinite(numericHumidity)) {
      return NextResponse.json(
        { error: "A páratartalomnak számnak kell lennie (humidity)." },
        { status: 400 }
      );
    }

    // Dátum kiválasztása prioritással:
    // 1) date -> 2) measuredAt -> 3) most
    let effectiveDate = new Date();

    const pickDate = (v: any) => {
      if (typeof v === "string" && v.trim() !== "") {
        const parsed = new Date(v);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
      }
      return null;
    };

    const parsedDate = pickDate(date) ?? pickDate(measuredAt);
    if (parsedDate) effectiveDate = parsedDate;

    // Kötelező fridgeName előállítása:
    // - ha fridgeDeviceId van: device-ból
    // - különben: body.fridgeName kötelező
    let device: { name: string; location: string; minTemp: number | null; maxTemp: number | null } | null =
      null;

    if (typeof fridgeDeviceId === "string" && fridgeDeviceId.trim() !== "") {
      device = await prisma.fridgeDevice.findFirst({
        where: { id: fridgeDeviceId, restaurantId },
        select: { name: true, location: true, minTemp: true, maxTemp: true },
      });

      if (!device) {
        return NextResponse.json(
          { error: "A megadott hűtő/fagyasztó nem található ennél az étteremnél." },
          { status: 404 }
        );
      }
    }

    const finalFridgeName =
      device?.name ?? (typeof fridgeNameFromBody === "string" ? fridgeNameFromBody.trim() : "");

    if (!finalFridgeName) {
      return NextResponse.json(
        { error: "Hiányzik a fridgeName (vagy adj meg fridgeDeviceId-t)." },
        { status: 400 }
      );
    }

    const finalLocation =
      device?.location ??
      (typeof locationFromBody === "string" && locationFromBody.trim() !== ""
        ? locationFromBody.trim()
        : null);

    const log = await prisma.fridgeLog.create({
      data: {
        restaurantId,
        date: effectiveDate,
        fridgeName: finalFridgeName,        // ✅ kötelező mező kitöltve
        temperature: numericTemp,
        humidity: numericHumidity,
        location: finalLocation,
        actionTaken: typeof actionTaken === "string" && actionTaken.trim() !== "" ? actionTaken.trim() : null,

        // opcionális kapcsolatok/audit
        fridgeDeviceId: device ? fridgeDeviceId : null,
        createdById: userId,
      },
    });

    // Warning a device limit alapján (ha van device)
    let warning: string | null = null;

    if (device?.maxTemp != null && numericTemp > device.maxTemp) {
      warning = `Teplota ${numericTemp.toFixed(1)}°C je vyššia ako limit ${device.maxTemp}°C`;
    }
    if (device?.minTemp != null && numericTemp < device.minTemp) {
      warning = `Teplota ${numericTemp.toFixed(1)}°C je nižšia ako limit ${device.minTemp}°C`;
    }

    return NextResponse.json({ log, warning }, { status: 201 });
  } catch (error) {
    console.error("POST /api/haccp/fridge-logs ERROR", error);
    return NextResponse.json(
      { error: "Hiba történt a mérés mentésekor." },
      { status: 500 }
    );
  }
}
