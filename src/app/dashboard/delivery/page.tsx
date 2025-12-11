// src/app/dashboard/delivery/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import DeliveryDashboardClient from "./DeliveryDashboardClient";
import AdminSubNav from "@/components/AdminSubNav";

export default async function DeliveryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: { restaurant: true },
        // Itt volt korábban az orderBy: { createdAt: "asc" },
        // ezt kivettük, mert a Membership modellben nincs createdAt mező.
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const isGlobalAdmin = user.isGlobalAdmin ?? false;
  const firstMembership = user.memberships[0] ?? null;

  // Ha nem globál admin és nincs étterem-hozzárendelés
  if (!isGlobalAdmin && !firstMembership?.restaurant) {
    return (
      <main className="container py-6">
        <AdminSubNav />
        <h1 className="text-xl font-semibold mb-2">Kiszállítás</h1>
        <p className="text-sm text-gray-600">
          Jelenleg nincs hozzárendelt étterem a fiókodhoz. Kérd a rendszergazda
          segítségét.
        </p>
      </main>
    );
  }

  const restaurant = firstMembership?.restaurant ?? null;
  const restaurantId = restaurant?.id ?? "";
  const restaurantName = restaurant?.name ?? "Ismeretlen étterem";

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="container py-6">
      {/* Vissza gombok / admin navigáció */}
      <AdminSubNav />

      {/* Kiszállítási dashboard kliens komponens */}
      <DeliveryDashboardClient
        initialDate={today}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        lang="hu"
        isGlobalAdmin={isGlobalAdmin}
      />
    </main>
  );
}
