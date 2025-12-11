import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

// Az Excel oszlopainak típusa.
// Ha később változik az Excel, ezt itt tudjuk hozzáigazítani.
type RawDeliveryRow = {
  "Időbélyeg"?: string | Date | null;
  "Tel szám"?: string | number | null;
  "Column 14"?: boolean | string | null;
  "Cím\n"?: string | null;
  Leves?: number | null;
  "1. Menü"?: number | null;
  "2. Menü"?: number | null;
  "3. Menü"?: number | null;
  "4. Menü"?: number | null;
  "Business Menü"?: number | null;
  Desszert?: number | null;
  Hely?: string | null;
  megjegyzés?: string | null;
  Ár?: number | null;
};

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : Math.round(n);
}

function toFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function normalizePhone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  // szóközök ki, a többit később finomíthatjuk
  return str.replace(/\s+/g, "");
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const dateString = formData.get("date");

    if (
      !file ||
      !(file instanceof File) ||
      !dateString ||
      typeof dateString !== "string"
    ) {
      return NextResponse.json(
        { error: "Hiányzik a feltöltött Excel fájl vagy a dátum." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json(
        { error: "Nem található munkalap az Excelben." },
        { status: 400 }
      );
    }

    // Itt szüntetjük meg az `any[]`-t: típusos sorok
    const rows: RawDeliveryRow[] = XLSX.utils.sheet_to_json<RawDeliveryRow>(
      sheet,
      {
        defval: null,
      }
    );

    let inserted = 0;

    const baseDate = new Date(dateString);
    const baseDateValid = !Number.isNaN(baseDate.getTime());

    for (const row of rows) {
      const phone = normalizePhone(row["Tel szám"]);
      const address = row["Cím\n"]?.toString().trim() ?? null;

      // ha se telefon, se cím, akkor ezt a sort kihagyjuk
      if (!phone && !address) {
        continue;
      }

      const soup = toInt(row.Leves);
      const menu1 = toInt(row["1. Menü"]);
      const menu2 = toInt(row["2. Menü"]);
      const menu3 = toInt(row["3. Menü"]);
      const menu4 = toInt(row["4. Menü"]);
      const businessMenu = toInt(row["Business Menü"]);
      const dessert = toInt(row.Desszert);

      const flag =
        typeof row["Column 14"] === "boolean"
          ? row["Column 14"]
          : row["Column 14"] === "True" ||
            row["Column 14"] === "true";

      const totalPrice = toFloat(row["Ár"]);
      const place = row.Hely ?? null;

      // megjegyzés lehet szám is az Excelben → mindig stringgé alakítjuk
      const noteRaw = row.megjegyzés;
      const note =
        noteRaw === null || noteRaw === undefined || noteRaw === ""
          ? null
          : String(noteRaw);

      const tsFromExcel = toDate(row["Időbélyeg"]);
      const timestamp =
        tsFromExcel ??
        (baseDateValid
          ? new Date(baseDate) // form date, ha az Excelben nincs időbélyeg
          : null);

      const deliveryDate =
        timestamp !== null
          ? new Date(
              timestamp.getFullYear(),
              timestamp.getMonth(),
              timestamp.getDate()
            )
          : baseDateValid
          ? new Date(
              baseDate.getFullYear(),
              baseDate.getMonth(),
              baseDate.getDate()
            )
          : null;

      // Vendég (Guest) keresése telefon alapján
      let guestId: string | null = null;

      if (phone) {
        const existingGuest = await prisma.guest.findFirst({
          where: { phone },
        });

        if (existingGuest) {
          guestId = existingGuest.id;
        } else {
          const newGuest = await prisma.guest.create({
            data: {
              phone,
              address: address ?? undefined,
            },
          });
          guestId = newGuest.id;
        }
      }

      await prisma.deliveryOrder.create({
        data: {
          guestId: guestId ?? undefined,
          phone: phone ?? undefined,
          address: address ?? undefined,
          place: place ?? undefined,
          note: note ?? undefined,

          timestamp: timestamp ?? undefined,
          deliveryDate: deliveryDate ?? undefined,

          soup,
          menu1,
          menu2,
          menu3,
          menu4,
          businessMenu,
          dessert,

          flag,
          totalPrice,
        },
      });

      inserted += 1;
    }

    return NextResponse.json({
      ok: true,
      inserted,
    });
  } catch (error) {
    console.error("IMPORT DELIVERY ERROR", error);
    return NextResponse.json(
      { error: "Hiba történt a kiszállítási import során." },
      { status: 500 }
    );
  }
}
