import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Először megnézzük, használták-e már leltárban
    const usageCount = await prisma.inventoryItem.count({
      where: { templateId: id },
    });

    if (usageCount > 0) {
      // Ha már szerepelt leltárban, nem engedjük törölni
      return NextResponse.json(
        {
          error:
            "Ezt a tételt már használta egy leltár, ezért nem törölhető. " +
            "Ha nem szeretnéd használni, húzd a lista végére vagy nevezd át.",
        },
        { status: 400 }
      );
    }

    // Ha sosem volt használva, nyugodtan törölhetjük
    await prisma.inventoryTemplateItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inventory template DELETE error:", error);
    return NextResponse.json(
      { error: "Nem sikerült törölni a tételt." },
      { status: 500 }
    );
  }
}
