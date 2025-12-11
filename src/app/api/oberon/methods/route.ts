import { NextResponse } from "next/server";
import { getOberonClient } from "@/lib/oberon/client";

type OperationDesc = {
  input?: unknown;
  output?: unknown;
};

export async function GET() {
  try {
    const client = await getOberonClient();
    const tree = client.describe();

    const service =
      tree?.OBERONServiceGen2?.BasicHttpBinding_IOBERONServiceGen2;

    if (!service || typeof service !== "object") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Nem találom az OBERONServiceGen2 / BasicHttpBinding_IOBERONServiceGen2 csomópontot a describe() kimenetben.",
        },
        { status: 500 }
      );
    }

    const stockMethods = Object.entries(service)
      .filter(([name]) => name.startsWith("Stock_"))
      .map(([name, value]) => {
        const op = value as OperationDesc;

        // csak az input első szintjét mutatjuk, hogy lássuk az arg nevét
        const input =
          op.input && typeof op.input === "object"
            ? Object.keys(op.input as Record<string, unknown>)
            : [];

        return {
          name,
          inputArgNames: input,
        };
      });

    return NextResponse.json({
      ok: true,
      stockMethods,
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
