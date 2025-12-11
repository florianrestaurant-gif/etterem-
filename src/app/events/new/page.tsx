import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { NewEventForm } from "../_components/NewEventForm";

async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });
  return membership?.restaurantId ?? null;
}

export default async function NewEventPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const restaurantId = await getCurrentRestaurantId(session.user.id);
  if (!restaurantId) {
    return (
      <div className="p-4 text-sm text-red-600">
        A felhasználóhoz nem tartozik étterem.
      </div>
    );
  }

  // 🔹 CRM vendégek az adott étteremből
  const guests = await prisma.guest.findMany({
    where: { restaurantId },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  });

  const crmContacts = guests.map((g) => ({
    id: g.id,
    name: g.name ?? "(névtelen vendég)",
    phone: g.phone ?? "",
    email: g.email ?? "",
  }));

  return (
    <div className="p-4 sm:p-6">
      {/* 🔹 ÚJ prop: crmContacts */}
      <NewEventForm crmContacts={crmContacts} />
    </div>
  );
}
