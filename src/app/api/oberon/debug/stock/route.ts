import { NextResponse } from "next/server";
import { getOberonClient } from "@/lib/oberon/client";

// A describe() struktúráját csak annyira típusozzuk, amennyire tényleg kell
type StockCardsDescribeTree = {
  OBERONServiceGen2?: {
    OBERONServiceGen2Soap?: {
      Stock_StockCards_List?: unknown;
    };
  };
};

export async function GET() {
  try {
    const client = await getOberonClient();

    const rawDescribe = client.describe() as unknown;

    const tree = rawDescribe as StockCardsDescribeTree;

    const methodDescribe =
      tree.OBERONServiceGen2?.OBERONServiceGen2Soap?.Stock_StockCards_List;

    if (!methodDescribe) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stock_StockCards_List leírás nem található a describe() kimenetben.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      describe: methodDescribe,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Ismeretlen hiba",
      },
      { status: 500 }
    );
  }
}
