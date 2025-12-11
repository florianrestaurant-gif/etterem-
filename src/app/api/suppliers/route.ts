import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(_req: NextRequest) {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("SUPPLIERS LIST ERROR", error);
    return NextResponse.json(
      { error: "Hiba történt a beszállítók lekérésekor." },
      { status: 500 }
    );
  }
}
