import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DashboardProps = {
  searchParams?: {
    message?: string;
  };
};

export default async function DashboardPage({ searchParams }: DashboardProps) {
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
  const flashMessage = searchParams?.message;

  // GLOBAL ADMIN NÉZET – összes étterem listája
  if (isGlobalAdmin) {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          include: { user: true },
        },
        _count: {
          select: {
            memberships: true,
            menus: true,
            orders: true,
          },
        },
      },
    });

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                Platform admin – Éttermek
              </h1>
              <p className="text-sm text-gray-600">
                Itt látod az összes regisztrált éttermet a rendszerben.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Bejelentkezve mint{" "}
              <span className="font-medium">{session.user.email}</span> (global
              admin)
            </div>
          </header>

          {flashMessage && (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {flashMessage}
            </div>
          )}

          <section className="border rounded-lg bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-gray-100 text-[11px] md:text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Étterem</th>
                    <th className="px-3 py-2 text-left">Slug</th>
                    <th className="px-3 py-2 text-left">Tulaj / owner</th>
                    <th className="px-3 py-2 text-right">Felhasználók</th>
                    <th className="px-3 py-2 text-right">Heti menük</th>
                    <th className="px-3 py-2 text-right">Rendelések</th>
                    <th className="px-3 py-2 text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-4 text-center text-gray-500"
                      >
                        Még nincs egyetlen regisztrált étterem sem.
                      </td>
                    </tr>
                  )}

                  {restaurants.map((r) => {
                    const owners = r.memberships.filter(
                      (m) => m.role === "RESTAURANT_OWNER"
                    );
                    const ownerEmails =
                      owners.length > 0
                        ? owners
                            .map((m) => m.user?.email)
                            .filter(Boolean)
                            .join(", ")
                        : "nincs owner";

                    return (
                      <tr key={r.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-[11px] text-gray-500">
                            ID: {r.id}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-xs">
                          {r.slug}
                        </td>
                        <td className="px-3 py-2 align-top text-xs">
                          {ownerEmails}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          {r._count.memberships}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          {r._count.menus}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          {r._count.orders}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <div className="flex flex-col items-end gap-1">
                            <Link
                              href={`/dashboard/finance?restaurantId=${r.id}`}
                              className="text-xs text-blue-600 underline"
                            >
                              Belépés ide (pénzügyek)
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // NORMÁL USER NÉZET – étterem admin főoldal gombokkal
  const membership = user.memberships[0];
  const restaurant = membership?.restaurant;

  if (!restaurant) {
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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Étterem admin felület</h1>
          <p className="text-sm text-gray-600">
            Itt éred el az összes modult ehhez az étteremhez.
          </p>
          <p className="text-xs text-gray-500">
            Aktív étterem: <span className="font-medium">{restaurant.name}</span>
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/finance"
            className="rounded-xl border bg-white px-4 py-4 flex flex-col gap-1 hover:shadow-sm transition"
          >
            <span className="text-sm font-semibold">Pénzügyek</span>
            <span className="text-xs text-gray-500">
              Napi bevételek, Excel import, beszállítók.
            </span>
          </Link>

          <Link
            href="/dashboard/restaurant"
            className="rounded-xl border bg-white px-4 py-4 flex flex-col gap-1 hover:shadow-sm transition"
          >
            <span className="text-sm font-semibold">
              Heti menü & étterem beállítások
            </span>
            <span className="text-xs text-gray-500">
              Heti menük kezelése, publikus linkek, étterem adatok.
            </span>
          </Link>

          <Link
            href="/dashboard/kitchen"
            className="rounded-xl border bg-white px-4 py-4 flex flex-col gap-1 hover:shadow-sm transition"
          >
            <span className="text-sm font-semibold">Konyha & műszak</span>
            <span className="text-xs text-gray-500">
              Műszakok, checklisták, HACCP naplók (hamarosan teljesen kész).
            </span>
          </Link>

          <Link
            href="/dashboard/inventory"
            className="rounded-xl border bg-white px-4 py-4 flex flex-col gap-1 hover:shadow-sm transition"
          >
            <span className="text-sm font-semibold">Leltár</span>
            <span className="text-xs text-gray-500">
              Raktárkészlet, leltárívek, sablonok.
            </span>
          </Link>

          <Link
            href="/dashboard/delivery"
            className="rounded-xl border bg-white px-4 py-4 flex flex-col gap-1 hover:shadow-sm transition"
          >
            <span className="text-sm font-semibold">Futár & kiszállítás</span>
            <span className="text-xs text-gray-500">
              Házhozszállítás, vendégek, rendelésfelvétel.
            </span>
          </Link>

          <Link
            href="/dashboard/guests"
            className="rounded-xl border bg-white px-4 py-4 flex flex-col gap-1 hover:shadow-sm transition"
          >
            <span className="text-sm font-semibold">CRM (hamarosan)</span>
            <span className="text-xs text-gray-500">
              Vendégadatbázis, hírlevelek, kampányok.
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
