import Link from "next/link";
import { prisma } from "@/lib/db";
import { CreateMenuForm } from "../CreateMenuForm";
import { MenuStatusToggleClient } from "../MenuStatusToggleClient";
import { MenuSocialPostClient } from "../MenuSocialPostClient";
import { RestaurantForm } from "../RestaurantForm";
import { RestaurantsTable } from "../RestaurantsTable";
import { MenuAutopilotClient } from "../MenuAutopilotClient";

const STATUS_LABELS: Record<string, string> = {
  draft: "Piszkozat",
  scheduled: "Ütemezett",
  published: "Publikált",
  archived: "Archivált",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-800",
  scheduled: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-neutral-200 text-neutral-600",
};

export default async function MenusDashboardPage() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { name: "asc" },
  });

  const menus = await prisma.menuWeek.findMany({
    include: { restaurant: true },
    orderBy: { startDate: "desc" },
    take: 20,
  });

  return (
    <main className="container pb-10">
      <div className="mt-6 md:mt-10 grid gap-6">

        {/* Étterem létrehozása */}
        <section className="card p-4 md:p-6">
          <RestaurantForm />
        </section>

        {/* Éttermeim */}
        <section className="card p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-2">Éttermeim</h2>
          <RestaurantsTable restaurants={restaurants} />
        </section>

        {/* Új heti menü létrehozása */}
        <section className="card p-4 md:p-6">
          <CreateMenuForm
            restaurants={restaurants.map((r) => ({
              id: r.id,
              name: r.name,
              slug: r.slug,
            }))}
          />
        </section>

        {/* Heti menük listája */}
        <section className="card p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-2">
            Heti menük áttekintése
          </h2>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            Itt látod az összes létrehozott heti menüt. Innen éred el a
            szerkesztést és a publikus linket, valamint a publikálást.
          </p>

          {menus.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Még nincs létrehozva heti menü.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="min-w-full text-xs md:text-sm border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                <thead className="bg-neutral-100 dark:bg-neutral-900/60">
                  <tr>
                    <th className="px-3 py-2 text-left">Éttermem</th>
                    <th className="px-3 py-2 text-left">Időszak</th>
                    <th className="px-3 py-2 text-left">Státusz</th>
                    <th className="px-3 py-2 text-left">Linkek</th>
                    <th className="px-3 py-2 text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {menus.map((menu) => {
                    const statusLabel =
                      STATUS_LABELS[menu.status] ?? menu.status;
                    const statusClass =
                      STATUS_COLORS[menu.status] ?? "bg-neutral-100";

                    const publicUrl = menu.restaurant
                      ? `/public/${menu.restaurant.slug}?lang=hu`
                      : "#";

                    return (
                      <tr
                        key={menu.id}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium">
                            {menu.restaurant?.name ?? "Ismeretlen étterem"}
                          </div>
                          <div className="text-[10px] md:text-xs text-neutral-500">
                            slug: {menu.restaurant?.slug ?? "n/a"}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          {menu.startDate.toDateString()} –{" "}
                          {menu.endDate.toDateString()}
                        </td>

                        <td className="px-3 py-2 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-1 text-xs">
                            <Link
                              href={`/menus/${menu.id}/edit`}
                              className="underline"
                            >
                              Tételek szerkesztése
                            </Link>
                            {menu.restaurant && (
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                Publikus link (HU)
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top text-right">
                          <div className="flex flex-col items-end gap-2">
                            <MenuStatusToggleClient
                              menuId={menu.id}
                              initialStatus={menu.status}
                            />
                            <MenuSocialPostClient menuId={menu.id} />
                            <MenuAutopilotClient menuId={menu.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
