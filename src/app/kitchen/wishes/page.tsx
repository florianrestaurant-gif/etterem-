// src/app/kitchen/wishes/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { WishEditor } from "./_components/WishEditor";

async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });

  return membership?.restaurantId ?? null;
}

export default async function KitchenWishesPage() {
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

  // legutóbbi shift + hozzátartozó kívánságlista
  const latestShift = await prisma.shift.findFirst({
    where: { restaurantId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      wishes: {
        include: {
          createdBy: { select: { email: true } },
        },
      },
    },
  });

  if (!latestShift) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Még nincs egyetlen rögzített műszak sem. Hozz létre először egy
        műszakot / műszakátadást.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Kívánságlista a következő műszaknak</h1>
        <p className="text-sm text-gray-500">
          Itt tudjátok rögzíteni, mit vár a belépő műszak az előző műszaktól:
          mit készítsen elő, milyen feladatokat hagyjon készen.
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
        <WishEditor
          shiftId={latestShift.id}
          initialWishes={latestShift.wishes.map((w) => ({
            id: w.id,
            title: w.title,
            description: w.description ?? "",
            status: w.status,
            createdByEmail: w.createdBy?.email ?? null,
            createdAt: w.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
