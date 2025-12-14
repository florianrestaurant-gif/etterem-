import { prisma } from "@/lib/db";

export async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
    select: { restaurantId: true },
  });

  return membership?.restaurantId ?? null;
}
