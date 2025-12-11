import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, MembershipRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

type RegisterBody = {
  email: string;
  password: string;
  restaurantName?: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterBody;
    const { email, password, restaurantName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "E-mail és jelszó kötelező." },
        { status: 400 }
      );
    }

    // 1) Nézzük, létezik-e már ilyen user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "Ezzel az e-mail címmel már létezik fiók." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 2) User létrehozása – normál user, NEM global admin
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        isGlobalAdmin: false,
      },
    });

    // 3) Étterem létrehozása (1 user = 1 étterem)
    const baseName = restaurantName?.trim() || "Új étterem";
    const baseSlug = slugify(baseName) || "etterem";

    let slug = baseSlug;
    let counter = 1;

    // garantáljuk az egyedi slugot
    // pl. etterem, etterem-2, etterem-3, ...
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await prisma.restaurant.findUnique({
        where: { slug },
      });
      if (!existing) break;
      slug = `${baseSlug}-${counter++}`;
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name: baseName,
        slug,
      },
    });

    // 4) Membership: user ↔ étterem (owner)
   await prisma.membership.create({
  data: {
    userId: user.id,
    restaurantId: restaurant.id,
    role: MembershipRole.RESTAURANT_OWNER,   // ⬅️ EZ A LÉNYEG
  },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { ok: false, error: "Váratlan hiba történt." },
      { status: 500 }
    );
  }
}
