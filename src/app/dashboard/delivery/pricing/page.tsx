// src/app/dashboard/delivery/pricing/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import AdminSubNav from "@/components/AdminSubNav";
import DeliveryPricingClient from "./DeliveryPricingClient";

export default async function DeliveryPricingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  // Jelenlegi user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  // Első étterem, amihez tartozik (owner / staff)
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { restaurant: true },
  });

  if (!membership || !membership.restaurant) {
    return (
      <main className="container py-6">
        <AdminSubNav />
        <p className="mt-6 text-sm text-red-600">
          Nincs hozzárendelt éttermed, így nem tudsz árlistát beállítani.
        </p>
      </main>
    );
  }

  const restaurant = membership.restaurant;

  const config = await prisma.deliveryPriceConfig.findFirst({
    where: { restaurantId: restaurant.id },
  });

  return (
    <main className="container py-6 space-y-6">
      <AdminSubNav />

      <section className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-1">
          Kiszállítási árlista beállítása
        </h1>
        <p className="text-sm text-neutral-600">
          Itt adhatod meg a futár rendeléshez használt egységárakat. Az új
          rendelések végösszegét a rendszer ezek alapján számolja ki.
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Étterem: <span className="font-medium">{restaurant.name}</span>
        </p>
      </section>

      <DeliveryPricingClient
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        initialConfig={{
          soupPrice: config?.soupPrice ?? null,
          menu1Price: config?.menu1Price ?? null,
          menu2Price: config?.menu2Price ?? null,
          menu3Price: config?.menu3Price ?? null,
          menu4Price: config?.menu4Price ?? null,
          businessMenuPrice: config?.businessMenuPrice ?? null,
          dessertPrice: config?.dessertPrice ?? null,
        }}
      />
    </main>
  );
}
