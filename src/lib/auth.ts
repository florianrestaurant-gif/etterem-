// src/lib/auth.ts
import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type ReqLike = Request | NextRequest;

export async function getRestaurantId(req?: ReqLike): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isGlobalAdmin: true },
  });
  if (!user) return null;

  // Global admin: ha van restaurantId query param, azt használjuk
  if (user.isGlobalAdmin && req) {
    const { searchParams } = new URL(req.url);
    const rid = searchParams.get("restaurantId");
    if (rid) return rid;
  }

  // Normál user: első membership étterem
  const membership = await prisma.membership.findFirst({
    where: { userId, restaurantId: { not: null } },
    select: { restaurantId: true },
    orderBy: { id: "asc" },
  });

  return membership?.restaurantId ?? null;
}
