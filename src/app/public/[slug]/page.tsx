import { prisma } from "@/lib/db";
import { OrderFormClient } from "./OrderFormClient";


type Lang = "hu" | "sk";

const dayLabels: Record<Lang, Record<number, string>> = {
  hu: {
    0: "Hétfő",
    1: "Kedd",
    2: "Szerda",
    3: "Csütörtök",
    4: "Péntek",
  },
  sk: {
    0: "Pondelok",
    1: "Utorok",
    2: "Streda",
    3: "Štvrtok",
    4: "Piatok",
  },
};

const uiText: Record<
  Lang,
  {
    weeklyMenuTitleSuffix: string;
    noMenu: string;
    dateSeparator: string;
  }
> = {
  hu: {
    weeklyMenuTitleSuffix: "— heti menü",
    noMenu: "Ehhez az étteremhez jelenleg nincs publikált heti menü.",
    dateSeparator: " – ",
  },
  sk: {
    weeklyMenuTitleSuffix: "— týždenné menu",
    noMenu: "Táto reštaurácia momentálne nemá publikované týždenné menu.",
    dateSeparator: " – ",
  },
};

// Fogástípus címkék (HU / SK)
const COURSE_LABELS: Record<
  Lang,
  Record<"soup" | "main" | "dessert" | "other", string>
> = {
  hu: {
    soup: "Leves",
    main: "Főétel",
    dessert: "Desszert",
    other: "Egyéb",
  },
  sk: {
    soup: "Polievka",
    main: "Hlavné jedlo",
    dessert: "Dezert",
    other: "Iné",
  },
};

export default async function PublicMenuPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ slug }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const lang: Lang = searchParams.lang === "sk" ? "sk" : "hu";

  // Mai nap indexe (0 = hétfő, 4 = péntek)
  const today = new Date();
  const jsDayIndex = today.getDay(); // 0 = vasárnap, 1 = hétfő...
  const todayDayIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // 0..6, hétfő-alapú

  // Étterem + *publikált* menük betöltése (csak published!)
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      menus: {
        where: { status: "published" },         // 👈 csak publikált menük
        include: { items: true },
        orderBy: { startDate: "desc" },         // legfrissebb elöl
        take: 1,                                // csak az utolsó publikált
      },
    },
  });

  const t = uiText[lang];

  // Nincs publikált menü
  if (!restaurant || restaurant.menus.length === 0) {
    return (
      <main className="container">
        <div className="card mt-10 space-y-4">
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">
              {slug} {t.weeklyMenuTitleSuffix}
            </h1>
            <LanguageSwitcher slug={slug} currentLang={lang} />
          </header>

          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t.noMenu}
          </p>
        </div>
      </main>
    );
  }

  // Itt már biztos van legalább egy publikált menü
  const menu = restaurant.menus[0];
  const dayOrder = [0, 1, 2, 3, 4];

  return (
    <main className="container">
      <div className="card mt-10 space-y-4">
        {/* Fejléc + nyelvváltó */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {restaurant.name} {t.weeklyMenuTitleSuffix}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {menu.startDate.toDateString()}
              {t.dateSeparator}
              {menu.endDate.toDateString()}
            </p>
          </div>

          <LanguageSwitcher slug={slug} currentLang={lang} />
        </header>

        {/* Napokra bontott menü – kártyák */}
        <div className="space-y-4">
          {dayOrder.map((dayIndex) => {
            const itemsForDay = menu.items.filter(
              (item) => item.dayIndex === dayIndex || item.allWeek
            );
            if (itemsForDay.length === 0) return null;

            const isToday = dayIndex === todayDayIndex;

            return (
              <section
                key={dayIndex}
                className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 bg-white/80 dark:bg-neutral-900/60 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-3">
                  <h2 className="text-lg font-semibold">
                    {dayLabels[lang][dayIndex]}
                  </h2>
                  {isToday && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                      {lang === "hu" ? "Ma" : "Dnes"}
                    </span>
                  )}
                </div>

                <ul className="space-y-3">
                  {itemsForDay.map((item) => {
                    const title =
                      lang === "hu"
                        ? item.titleHU
                        : item.titleSK || item.titleHU;
                    const desc =
                      lang === "hu"
                        ? item.descHU
                        : item.descSK || item.descHU;

                    const courseLabel =
                      item.courseType && COURSE_LABELS[lang][item.courseType];

                    const price =
                      typeof item.priceCents === "number" &&
                      item.priceCents > 0
                        ? (item.priceCents / 100).toFixed(2)
                        : null;

                    return (
                      <li key={item.id}>
                        <div className="flex justify-between gap-4">
                          <div>
                            {/* Menü címke (pl. Business menü, Menü 1, Heti ajánlat) */}
                            {item.menuLabel && (
                              <p className="text-xs uppercase tracking-wide text-neutral-500 mb-0.5">
                                {item.menuLabel}
                              </p>
                            )}

                            {/* Fogás típusa (Leves / Főétel / Desszert / Egyéb) */}
                            {courseLabel && (
                              <p className="text-xs text-neutral-500 mb-0.5">
                                {courseLabel}
                              </p>
                            )}

                            {/* Étel neve */}
                            <p className="font-medium leading-snug">
                              {title}
                            </p>

                            {/* Leírás */}
                            {desc && (
                              <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
                                {desc}
                              </p>
                            )}

                            {/* Allergének – ha látni szeretnéd publicban is */}
                            {item.allergens && (
                              <p className="text-xs text-neutral-500 mt-1">
                                Allergének: {item.allergens}
                              </p>
                            )}
                          </div>

                          {/* Ár EUR-ban */}
                          <div className="text-right whitespace-nowrap text-sm font-semibold">
                            {price ?? "-"} €
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        {/* Rendelés / foglalás űrlap */}
        <OrderFormClient
          restaurantSlug={slug}
          menuId={menu.id}
          lang={lang}
        />
        {/* Lábléc megjegyzés árakról */}
        <p className="pt-2 text-xs text-neutral-500 dark:text-neutral-400 text-right">
          {lang === "hu"
            ? "Az árak euróban értendők."
            : "Ceny sú uvedené v eurách."}
        </p>
      </div>
    </main>
  );
}

function LanguageSwitcher({
  slug,
  currentLang,
}: {
  slug: string;
  currentLang: Lang;
}) {
  const basePath = `/public/${slug}`;

  return (
    <div className="inline-flex rounded-full border border-neutral-300 dark:border-neutral-600 overflow-hidden text-sm">
      <a
        href={`${basePath}?lang=hu`}
        className={`px-3 py-1 ${
          currentLang === "hu"
            ? "bg-neutral-900 text-white dark:bg:white dark:text-neutral-900"
            : "bg-transparent text-neutral-800 dark:text-neutral-200"
        }`}
      >
        🇭🇺 HU
      </a>
      <a
        href={`${basePath}?lang=sk`}
        className={`px-3 py-1 ${
          currentLang === "sk"
            ? "bg-neutral-900 text-white dark:bg:white dark:text-neutral-900"
            : "bg-transparent text-neutral-800 dark:text-neutral-200"
        }`}
      >
        🇸🇰 SK
      </a>
    </div>
  );
}
