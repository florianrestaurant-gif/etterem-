// src/app/kitchen/tasks/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TaskBoard, TaskItem } from "./_components/TaskBoard";

async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });

  return membership?.restaurantId ?? null;
}

export default async function KitchenTasksPage() {
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

  const latestShift = await prisma.shift.findFirst({
    where: { restaurantId },
    orderBy: [
      { date: "desc" },
      { createdAt: "desc" },
    ],
    include: { tasks: true },
  });

  if (!latestShift) {
    return (
      <div className="p-4 space-y-3">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Műszak feladatok</h1>
            <p className="text-sm text-gray-500">
              Itt tudjátok a konyhai feladatokat felvinni és pipálni, de még
              nincs rögzített műszak az étteremhez.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/kitchen/shift-handovers"
              className="inline-flex items-center px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
            >
              Műszakátadások
            </Link>
          </div>
        </header>
        <p className="text-sm text-gray-500">
          Először hozz létre egy műszakot (pl. a műszakátadó oldalon), utána
          tudsz feladatokat is kezelni.
        </p>
      </div>
    );
  }

  const shiftLabel = `${new Intl.DateTimeFormat("hu-SK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(latestShift.date)} – ${latestShift.type}`;

  const initialTasks: TaskItem[] = latestShift.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as TaskItem["status"],
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Műszak feladatok</h1>
          <p className="text-sm text-gray-500">
            Itt tudjátok kiosztani és pipálni a konyhai feladatokat a jelenlegi
            műszakhoz.
          </p>
          <p className="text-xs text-gray-400">
            Aktuális műszak: {shiftLabel}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/kitchen/shift-handovers"
            className="inline-flex items-center px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
          >
            Műszakátadások
          </Link>
          <Link
            href="/kitchen/prep"
            className="inline-flex items-center px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
          >
            Előkészítés
          </Link>
          <Link
            href="/kitchen/wishes"
            className="inline-flex items-center px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
          >
            Kívánságlista
          </Link>
        </div>
      </header>

      <section className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
        <TaskBoard shiftId={latestShift.id} initialTasks={initialTasks} />
      </section>
    </div>
  );
}
