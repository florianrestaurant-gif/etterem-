import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type RawRow = Record<string, unknown>;

const SUPPLIER_COLUMNS = [
  "Jednota",
  "Lidl",
  "Tesco",
  "Danubia",
  "Lebecco",
  "Barczi",
  "Gabdi",
  "Market Gastro",
  "Gastro Genius",
  "Hossa",
  "Metro",
  "Trafin oil",
  "Pálinkás Gabriel",
  "Kofola",
  "Greenline",
  "Trendpack",
  "SACSLAB",
  "Burapin",
  "Eleonóra Kissova",
  "Domäsko",
  "Greenvironment",
  "Karol Šípoš",
  "PWR",
  "Tibor Puha",
  "Tankovanie",
  "iné",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sheetName = (formData.get("sheetName") as string) || "November 2025";
    const year = Number(formData.get("year") || 2025);
    const month = Number(formData.get("month") || 11);
    const restaurantIdentifier = formData.get("restaurantId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nem érkezett Excel fájl." },
        { status: 400 }
      );
    }

    if (!restaurantIdentifier) {
      return NextResponse.json(
        { error: "Hiányzik az étterem azonosító (restaurantId)." },
        { status: 400 }
      );
    }

    // Étterem keresése id VAGY slug alapján
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [{ id: restaurantIdentifier }, { slug: restaurantIdentifier }],
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        {
          error: `Nem található étterem ezzel az azonosítóval: ${restaurantIdentifier}`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: "buffer" });

    if (!workbook.Sheets[sheetName]) {
      return NextResponse.json(
        { error: `Nincs ilyen munkalap: ${sheetName}` },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: RawRow[] = XLSX.utils.sheet_to_json<RawRow>(sheet, {
      defval: null,
    });

    console.log("IMPORT rows length:", rows.length);

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: true, insertedDays: 0, insertedExpenses: 0 },
        { status: 200 }
      );
    }

    let insertedDays = 0;
    let insertedExpenses = 0;

    // Létező beszállítók cache-ben
    const existingSuppliers = await prisma.supplier.findMany();
    const supplierCache = new Map<string, string>();
    for (const s of existingSuppliers) {
      supplierCache.set(s.name, s.id);
    }

    // Végigmegyünk a sorokon
    for (const row of rows) {
      // 1) megnézzük, van-e egyáltalán adat a sorban
      const importantCols = [
        "Plán",
        "Kassza",
        "Rozvoz",
        "Bistro",
        "Restaumatic",
        "Dôchodca",
        "Faktúra",
        "Zostatok",
        "Osszes",
        "Výdavky spolu",
      ];

      const hasAnyData =
        importantCols.some((col) => {
          const v = row[col];
          return v !== null && v !== undefined && v !== "";
        }) ||
        SUPPLIER_COLUMNS.some((col) => {
          const v = row[col];
          return v !== null && v !== undefined && v !== "";
        });

      if (!hasAnyData) {
        // teljesen üres / csak összegző sor → kihagyjuk
        continue;
      }

      // 2) Nap sorszáma: egyszerűen a már beszúrt napok + 1
      const dayNumber = insertedDays + 1;
      const dayName = row["November"] ?? null;

      // 3) DailyFinance rekord létrehozása
      const dailyDate = new Date(year, month - 1, dayNumber);

const daily = await prisma.dailyFinance.create({
  data: {
    restaurantId: restaurant.id,
    date: dailyDate,         // ⬅⬅⬅ ÚJ
    year,
    month,
    dayNumber,
    dayName: dayName ? String(dayName) : null,

          plan: toFloat(row["Plán"]),
          kassza: toFloat(row["Kassza"]),
          rozvoz: toFloat(row["Rozvoz"]),
          bistro: toFloat(row["Bistro"]),
          restaumatic: toFloat(row["Restaumatic"]),
          dochodca: toFloat(row["Dôchodca"]),
          faktura: toFloat(row["Faktúra"]),
          zostatok: toFloat(row["Zostatok"]),
          akcie: toFloat(row["Akcie"]),

          listkyKupeneEur: toFloat(row["Lístky kúpené (€)"]),
          darcekovyPoukaz: toFloat(row["Darčekový poukaz"]),
          listkyOdovzdaneKs: toInt(row["Lístky odovzdane (ks)"]),
          ubytovanie: toFloat(row["Ubytovanie"]),

          naMieste: toInt(row["Unnamed: 15"]),
          osszes: toFloat(row["Osszes"]),
          restauraciaMenuKs: toInt(row["Restaurácia menu/ks"]),
          rozvozMenuKs: toInt(row["Rozvoz menu/ks"]),
          dochodcovMenuKs: toInt(row["Dôchodcov menu/ks"]),
          zostatokMenuKs: toInt(row["Zostatok menu/ks"]),
          pocetMenuKs: toInt(row["Počet menu (ks)"]),

          summary1: toFloat(row["Unnamed: 22"]),
          summary2: toFloat(row["Unnamed: 23"]),

          kiadasok: toFloat(row["Kiadások"]),

          vydavkySpolu: toFloat(row["Výdavky spolu"]),
          tovarTyzden: toFloat(row["Tovar/týždeň"]),
          elektrina: toFloat(row["Elektrina"]),
          plyn: toFloat(row["Plyn"]),
          vyplaty: toFloat(row["Výplaty"]),
          najom: toFloat(row["Nájom"]),
          odvody: toFloat(row["Odvody"]),
          booking: toFloat(row["Booking"]),
          spolu: toFloat(row["Spolu"]),
          extraDiff: toFloat(row["Unnamed: 60"]),
          vsetkyVydavkyTyzden: toFloat(row["vsetky výdavky za týždeň"]),
          vyplatyTyzden: toFloat(row["výplaty za týždeň"]),
        },
      });

      insertedDays++;

      // 4) beszállítós kiadások
      for (const supplierName of SUPPLIER_COLUMNS) {
        const value = row[supplierName];
        const amount = toFloat(value);
        if (!amount || amount === 0) continue;

        let supplierId = supplierCache.get(supplierName);
        if (!supplierId) {
          const supplier = await prisma.supplier.upsert({
            where: { name: supplierName },
            update: {},
            create: { name: supplierName },
          });
          supplierId = supplier.id;
          supplierCache.set(supplierName, supplierId);
        }

        await prisma.expense.create({
          data: {
            dayId: daily.id,
            supplierId,
            amount,
          },
        });

        insertedExpenses++;
      }
    }

    return NextResponse.json({
      ok: true,
      insertedDays,
      insertedExpenses,
    });
  } catch (err: unknown) {
    console.error("IMPORT ERROR", err);
    return NextResponse.json(
      { error: "Hiba történt az import során." },
      { status: 500 }
    );
  }
}

function toFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}
