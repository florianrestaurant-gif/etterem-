import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    // 👇 Itt kell "await"-tel kibontani a params-t
    const { id } = await params;

    // Aktuális leltár
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
      },
    });

    if (!sheet) {
      return NextResponse.json(
        { error: "Leltárív nem található." },
        { status: 404 }
      );
    }

    // Előző leltár ugyanahhoz az étteremhez, korábbi dátummal
    const previousSheet = await prisma.inventorySheet.findFirst({
      where: {
        restaurantId: sheet.restaurantId,
        date: { lt: sheet.date },
      },
      orderBy: { date: "desc" },
      include: {
        items: {
          include: { template: true },
        },
      },
    });

    return NextResponse.json({ sheet, previousSheet });
  } catch (error) {
    console.error("Inventory detail GET error:", error);
    return NextResponse.json(
      { error: "Nem sikerült betölteni a leltár részleteit." },
      { status: 500 }
    );
  }
}
