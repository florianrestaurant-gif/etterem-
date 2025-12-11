import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  const expectedPin = process.env.KITCHEN_PIN;
  if (!expectedPin) {
    return NextResponse.json(
      { error: "PIN nincs beállítva a szerveren." },
      { status: 500 }
    );
  }

  if (pin !== expectedPin) {
    return NextResponse.json({ error: "Hibás PIN." }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });

  // egyszerű sütis "session"
  res.cookies.set("inventoryAuth", "ok", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 óra
  });

  return res;
}
