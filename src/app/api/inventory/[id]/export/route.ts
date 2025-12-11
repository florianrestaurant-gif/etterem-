import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const sheet = await prisma.inventorySheet.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            template: true,
          },
          orderBy: {
            template: {
              sortOrder: "asc",
            },
          },
        },
        restaurant: true,
      },
    });

    if (!sheet) {
      return NextResponse.json(
        { error: "Leltárív nem található." },
        { status: 404 }
      );
    }

    // ── Excel tartalom összerakása (AOA = array of arrays) ──

    const dateStr = sheet.date.toISOString().slice(0, 10);

    const rows: (string | number)[][] = [
      ["Étterem:", sheet.restaurant.name],
      ["Leltár dátuma:", dateStr],
      ["Megjegyzés:", sheet.note ?? ""],
      [],
      ["Alapanyag", "Egység", "Mennyiség", "Megjegyzés"],
    ];

    for (const item of sheet.items) {
      rows.push([
        item.template.name,
        item.template.unit ?? "",
        item.quantity ?? 0,
        item.note ?? "",
      ]);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Leltár");

    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    const filename = `leltar_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Inventory Excel export error:", error);
    return NextResponse.json(
      { error: "Nem sikerült elkészíteni az Excel exportot." },
      { status: 500 }
    );
  }
}
