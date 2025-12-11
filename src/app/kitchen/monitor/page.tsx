// src/app/kitchen/monitor/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { MonitorScreen, MonitorData } from "./_components/MonitorScreen";

async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });

  return membership?.restaurantId ?? null;
}

export default async function KitchenMonitorPage() {
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

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true },
  });

  const shift = await prisma.shift.findFirst({
    where: { restaurantId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      tasks: true,
      prepItems: true,
      wishes: {
        include: {
          createdBy: { select: { email: true } },
        },
      },
    },
  });

  // --- Itt rakjuk össze az adatot, majd a végén cast-oljuk MonitorData-ra ---
  const initialData = {
    ok: true,
    restaurantName: restaurant?.name ?? null,
    shift: shift
      ? {
          id: shift.id,
          label: `${new Intl.DateTimeFormat("hu-SK", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(shift.date)} – ${shift.type}`,
          date: shift.date.toISOString(),
          type: shift.type,
          tasks: shift.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status as
              | "PENDING"
              | "IN_PROGRESS"
              | "DONE"
              | "CANCELLED",
            createdAt: t.createdAt.toISOString(),
          })),
          prepItems: shift.prepItems.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            status: p.status,
            expiryAt: p.expiryAt ? p.expiryAt.toISOString() : null,
            location: p.location,
            note: p.note,
          })),
          wishes: shift.wishes.map((w) => ({
            id: w.id,
            title: w.title,
            description: w.description,
            status: w.status as "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED",
            createdAt: w.createdAt.toISOString(),
            createdByEmail: w.createdBy?.email ?? null,
          })),
        }
      : null,
    generatedAt: new Date().toISOString(),
  } as MonitorData; // <- ITT CAST-OLUNK, INNENTŐL TS NEM KÖTEKSZIK

  return <MonitorScreen initialData={initialData} />;
}
