import { NextResponse } from "next/server";
import { getOberonClient } from "@/lib/oberon/client";

export async function GET() {
  try {
    const client = await getOberonClient();

    // A SOAP kliens felépítésének leírása (szervizek, portok, metódusok)
    const description = client.describe();

    // Csak hogy a konzolban is láss valamit:
    console.log("SOAP description keys:", Object.keys(description));

    return NextResponse.json(
      {
        ok: true,
        description,
      },
      { status: 200 }
    );
  } catch (error) {
    const err = error as Error;
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
