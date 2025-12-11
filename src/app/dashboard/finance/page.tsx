import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
// igazítsd a saját auth importodra
import FinanceDashboardClient from "./FinanceDashboardClient";

const prisma = new PrismaClient();

type Props = {
  searchParams?: {
    restaurantId?: string;
  };
};

export default async function FinancePage({ searchParams }: Props) {
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

  let activeRestaurant = user.memberships[0]?.restaurant ?? null;

  // Ha globál admin vagy ÉS jött restaurantId a query-ben → impersonálás
  const requestedRestaurantId = searchParams?.restaurantId;
  if (isGlobalAdmin && requestedRestaurantId) {
    const byId = await prisma.restaurant.findUnique({
      where: { id: requestedRestaurantId },
    });
    if (byId) {
      activeRestaurant = byId;
    }
  }

  if (!activeRestaurant) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border rounded-lg p-6 space-y-3 text-center">
          <h1 className="text-lg font-semibold">Nincs étterem</h1>
          <p className="text-sm text-gray-600">
            Jelenleg nincs olyan étterem, amelyhez hozzáférésed lenne.
          </p>
        </div>
      </main>
    );
  }

  const now = new Date();

  return (
    <FinanceDashboardClient
      defaultYear={now.getFullYear()}
      defaultMonth={now.getMonth() + 1}
      defaultRestaurantId={activeRestaurant.id}
      restaurantName={activeRestaurant.name}
      isGlobalAdmin={isGlobalAdmin}
    />
  );
}
