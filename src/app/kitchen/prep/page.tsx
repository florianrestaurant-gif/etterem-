// src/app/kitchen/prep/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { PrepEditor } from "./_components/PrepEditor";
import type { PrepItem } from "./_components/PrepEditor";


async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });

  return membership?.restaurantId ?? null;
}

export default async function KitchenPrepPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const restaurantId = await getCurrentRestaurantId(session.user.id);
  if (!restaurantId) {
    return (
      <div className="p-4 text-sm text-red-600">
        Nincs étterem hozzárendelve a felhasználóhoz.
      </div>
    );
  }

  // Legutóbbi shift (dátum + idő szerint)
  const latestShift = await prisma.shift.findFirst({
    where: { restaurantId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      prepItems: true,
    },
  });

  if (!latestShift) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Még nincs egyetlen rögzített műszak sem. Hozz létre először egy
        műszakot a műszakátadás oldalon.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Előkészítés / Mise en place</h1>
        <p className="text-sm text-gray-500">
          Itt tudjátok vezetni a mártásokat, alapleveket, köreteket és egyéb
          előkészített tételeket a műszakhoz.
        </p>
        <div className="text-xs text-gray-500">
          Aktuális műszak:{" "}
          {new Intl.DateTimeFormat("hu-SK", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(latestShift.date)}{" "}
          – {latestShift.type}
        </div>
      </header>

                 <section className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
        {(() => {
          const initialItems: PrepItem[] = latestShift.prepItems.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category as PrepItem["category"],
            status: item.status as PrepItem["status"],
            quantity: item.quantity,
            location: item.location,
            note: item.note,
            expiryAt: item.expiryAt ? item.expiryAt.toISOString() : null,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          }));

          return (
            <PrepEditor shiftId={latestShift.id} initialItems={initialItems} />
          );
        })()}
      </section>


    </div>
  );
}
