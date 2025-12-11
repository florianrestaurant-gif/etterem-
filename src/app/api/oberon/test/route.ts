// src/app/api/oberon/test/route.ts
import { NextResponse } from "next/server";
import { getOberonClient } from "@/lib/oberon/client";

export async function GET() {
  try {
    const client = await getOberonClient();

    // csak a WSDL-t töltjük be és kiírjuk a metódusokat – ha ez sikerül, akkor működik az API kapcsolat
    const description = client.describe();

    return NextResponse.json(
      {
        ok: true,
        message: "Sikerült csatlakozni az OBERON WebService-hez.",
        description,
      },
      { status: 200 }
    );
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      {
        ok: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
