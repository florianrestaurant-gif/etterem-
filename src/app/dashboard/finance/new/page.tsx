// src/app/dashboard/finance/new/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import FinanceNewClient from "./FinanceNewClient";

const prisma = new PrismaClient();

type PageProps = {
  searchParams?: {
    restaurantId?: string;
  };
};

export default async function NewDailyFinancePage({ searchParams }: PageProps) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: { restaurant: true },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const isGlobalAdmin = user.isGlobalAdmin;

  // Alapértelmezett étterem: a user első membership-je
  let activeRestaurant = user.memberships[0]?.restaurant ?? null;

  // Global admin választhat URL-ből is: /dashboard/finance/new?restaurantId=...
  const requestedRestaurantId = searchParams?.restaurantId;
  if (isGlobalAdmin && requestedRestaurantId) {
    const byId = await prisma.restaurant.findUnique({
      where: { id: requestedRestaurantId },
    });
    if (byId) {
      activeRestaurant = byId;
    }
  }

  // Global adminnál listázzuk az összes éttermet egy selectorhoz
  let restaurantsForAdmin:
    | { id: string; name: string; slug: string }[]
    | null = null;

  if (isGlobalAdmin) {
    restaurantsForAdmin = await prisma.restaurant.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
  }

  // Ha nem global admin és nincs étterem, akkor hiba
  if (!activeRestaurant && !isGlobalAdmin) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border rounded-lg p-6 space-y-3 text-center">
          <h1 className="text-lg font-semibold">Nincs étterem</h1>
          <p className="text-sm text-gray-600">
            Jelenleg nincs olyan étterem, amelyhez hozzáférésed lenne.
          </p>
        </div>
      </main>
    );
  }

  const today = new Date();

  return (
    <FinanceNewClient
      // dátum alapértelmezésnek ma
      defaultDate={today.toISOString().slice(0, 10)}
      // normál usernél ez az aktív étterem; adminnál a selector kezdeti értéke
      defaultRestaurantId={activeRestaurant?.id ?? ""}
      restaurantName={activeRestaurant?.name ?? ""}
      isGlobalAdmin={isGlobalAdmin}
      restaurantsForAdmin={restaurantsForAdmin}
      // később ide egyszerűen be lehet tenni a "hu"/"sk" váltást
      lang="hu"
    />
  );
}
