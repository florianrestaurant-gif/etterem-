// src/app/kitchen/shift-handovers/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NewHandoverForm } from "./_components/NewHandoverForm";
import { WishCard } from "./_components/WishCard";

// helper: aktuális étterem
async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });

  return membership?.restaurantId ?? null;
}

// Kategória és státusz labellek a prep tételekhez
const PREP_CATEGORY_LABELS: Record<string, string> = {
  SAUCE: "Mártás",
  STOCK: "Alaplé",
  SIDE: "Köret",
  GARNISH: "Díszítés",
  DESSERT_BASE: "Desszert alap",
  OTHER: "Egyéb",
};

const PREP_STATUS_LABELS: Record<string, string> = {
  OK: "OK",
  LOW: "Kevés",
  OUT: "Elfogyott",
  DISCARD: "Kidobandó",
};

const SHIFT_TYPE_LABELS: Record<string, string> = {
  MORNING: "Délelőtti műszak",
  AFTERNOON: "Délutáni műszak",
  EVENING: "Esti műszak",
  OTHER: "Egyéb műszak",
};

const HANDOVER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Vázlat",
  SUBMITTED: "Leadva",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("hu-SK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("hu-SK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function handoverStatusClass(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "DRAFT":
    default:
      return "bg-amber-50 text-amber-700 border border-amber-100";
  }
}

function prepStatusBadgeClass(status: string) {
  switch (status) {
    case "OK":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "LOW":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "OUT":
    case "DISCARD":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
}

export default async function KitchenShiftHandoversPage() {
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

  const handovers = await prisma.shiftHandover.findMany({
    where: { restaurantId },
    include: {
      shift: {
        include: {
          prepItems: true,
          wishes: {
            include: {
              createdBy: { select: { email: true } },
            },
          },
        },
      },
      outgoingUser: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Fejléc + navigáció a konyhai modulok között */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Konyhai műszakátadás
          </h1>
          <p className="text-sm text-gray-500 max-w-xl">
            Michelin-szintű konyhai kommunikáció: a mise en place, feladatok,
            figyelmeztetések és elvárások egy helyen, visszakereshetően.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
          <Link
            href="/kitchen/prep"
            className="inline-flex items-center px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
          >
            Előkészítés / mise en place
          </Link>
          <Link
            href="/kitchen/wishes"
            className="inline-flex items-center px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
          >
            Kívánságlista
          </Link>
          <Link
            href="/kitchen/tasks"
            className="inline-flex items-center px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
          >
            Feladatok
          </Link>
          <Link
            href="/kitchen/monitor"
            className="inline-flex items-center px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
          >
            Konyhai monitor
          </Link>
        </div>
      </header>

      {/* Új műszakátadó űrlap (client component) */}
      <section className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Új műszakátadás rögzítése</h2>
          <p className="text-xs text-gray-500">
            Záráskor töltsétek ki. Ez lesz a következő csapat “briefingje”.
          </p>
        </div>
        <NewHandoverForm />
      </section>

      {/* Legutóbbi átadások + hozzájuk tartozó prep + kívánságlista */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Legutóbbi műszakátadások</h2>
          <p className="text-xs text-gray-500">
            A legutóbbi 20 átadás, műszakokra bontva.
          </p>
        </div>

        {handovers.length === 0 ? (
          <p className="text-sm text-gray-500">
            Még nincs rögzített műszakátadás. Záráskor tölts ki egyet az
            “Új műszakátadás” űrlappal.
          </p>
        ) : (
          <ul className="space-y-4">
            {handovers.map((h) => {
              const shift = h.shift;
              const prep = shift.prepItems;

              const prepOk = prep.filter((p) => p.status === "OK").length;
              const prepLow = prep.filter((p) => p.status === "LOW").length;
              const prepOut = prep.filter((p) => p.status === "OUT").length;
              const prepDiscard = prep.filter(
                (p) => p.status === "DISCARD",
              ).length;

              const openWishes = shift.wishes.filter(
                (w) => w.status === "OPEN" || w.status === "IN_PROGRESS",
              ).length;

              return (
                <li
                  key={h.id}
                  className="bg-white rounded-xl shadow-sm border p-4 sm:p-5 space-y-3 text-sm"
                >
                  {/* Fejléc: műszak meta + státusz + összefoglaló badge-ek */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">
                          {SHIFT_TYPE_LABELS[shift.type] ?? shift.type} –{" "}
                          {formatDate(shift.date)}
                        </div>
                        <span
                          className={
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium " +
                            handoverStatusClass(h.status)
                          }
                        >
                          {HANDOVER_STATUS_LABELS[h.status] ?? h.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>
                          Kitöltötte:{" "}
                          <span className="font-medium text-gray-700">
                            {h.outgoingUser?.email ?? "ismeretlen"}
                          </span>
                        </span>
                        <span>•</span>
                        <span>
                          Műszakátadás rögzítve:{" "}
                          {formatDateTime(h.createdAt)}
                        </span>
                      </div>

                      {/* Gyors áttekintés: prep + kívánság összefoglaló */}
                      <div className="flex flex-wrap gap-2 mt-1 text-[11px]">
                        {prep.length > 0 && (
                          <div className="inline-flex flex-wrap gap-1 items-center">
                            <span className="uppercase tracking-wide text-gray-400 font-semibold">
                              Mise en place:
                            </span>
                            <span className="px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700">
                              OK: {prepOk}
                            </span>
                            <span className="px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700">
                              Kevés: {prepLow}
                            </span>
                            <span className="px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700">
                              Elfogyott: {prepOut}
                            </span>
                            <span className="px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700">
                              Kidobandó: {prepDiscard}
                            </span>
                          </div>
                        )}

                        {shift.wishes.length > 0 && (
                          <div className="inline-flex flex-wrap gap-1 items-center">
                            <span className="uppercase tracking-wide text-gray-400 font-semibold">
                              Kívánságok:
                            </span>
                            <span className="px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700">
                              Összes: {shift.wishes.length}
                            </span>
                            <span className="px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700">
                              Nyitott / folyamatban: {openWishes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Szöveges blokkok – strukturált műszakátadás */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <InfoBlock title="Mise en place" text={h.miseEnPlace} />
                    <InfoBlock title="Feladatok" text={h.tasksSummary} />
                    <InfoBlock
                      title="Figyelmeztetések"
                      text={h.warnings}
                      tone="warning"
                    />
                    <InfoBlock
                      title="Tisztaság / állapot"
                      text={h.cleanliness}
                    />
                    <InfoBlock
                      title="Elvárások a következő műszak felé"
                      text={h.nextShiftExpectations}
                      tone="highlight"
                    />
                    <InfoBlock title="Séf üzenete" text={h.chefNote} />
                  </div>

                  {/* Mise-en-place lista ehhez a műszakhoz */}
                  {prep.length > 0 && (
                    <div className="border-t pt-3 mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-gray-600">
                          Előkészített tételek (mise en place) ehhez a műszakhoz
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Sorok színe a státuszt jelzi: zöld = OK, sárga = kevés,
                          piros = elfogyott / kidobandó.
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full text-[11px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 border-b text-left font-semibold">
                                Név
                              </th>
                              <th className="px-2 py-1 border-b text-left font-semibold">
                                Kategória
                              </th>
                              <th className="px-2 py-1 border-b text-left font-semibold">
                                Mennyiség
                              </th>
                              <th className="px-2 py-1 border-b text-left font-semibold">
                                Státusz
                              </th>
                              <th className="px-2 py-1 border-b text-left font-semibold">
                                Lejárat
                              </th>
                              <th className="px-2 py-1 border-b text-left font-semibold">
                                Hely / megjegyzés
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {prep.map((item) => {
                              const rowToneClass =
                                item.status === "OK"
                                  ? "bg-emerald-50/40"
                                  : item.status === "LOW"
                                  ? "bg-amber-50/50"
                                  : item.status === "OUT" ||
                                    item.status === "DISCARD"
                                  ? "bg-rose-50/60"
                                  : "bg-white";

                              return (
                                <tr key={item.id} className={rowToneClass}>
                                  <td className="px-2 py-1 border-b">
                                    {item.name}
                                  </td>
                                  <td className="px-2 py-1 border-b">
                                    {PREP_CATEGORY_LABELS[item.category] ??
                                      item.category}
                                  </td>
                                  <td className="px-2 py-1 border-b">
                                    {item.quantity ?? "-"}
                                  </td>
                                  <td className="px-2 py-1 border-b">
                                    <span
                                      className={
                                        "inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium " +
                                        prepStatusBadgeClass(item.status)
                                      }
                                    >
                                      {PREP_STATUS_LABELS[item.status] ??
                                        item.status}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1 border-b">
                                    {item.expiryAt
                                      ? formatDate(item.expiryAt)
                                      : "-"}
                                  </td>
                                  <td className="px-2 py-1 border-b">
                                    {item.location || item.note || "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Kívánságlista ehhez a műszakhoz – pipálható WishCard-ok */}
                  {shift.wishes.length > 0 && (
                    <div className="border-t pt-3 mt-2 space-y-2">
                      <div className="text-xs font-semibold text-gray-600">
                        Kívánságlista a következő / előző műszak felé
                      </div>
                      <div className="space-y-2">
                        {shift.wishes.map((w) => (
                          <WishCard
                            key={w.id}
                            id={w.id}
                            title={w.title}
                            description={w.description}
                            status={w.status}
                            createdAt={w.createdAt.toISOString()}
                            createdByEmail={w.createdBy?.email ?? null}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function InfoBlock(props: {
  title: string;
  text: string;
  tone?: "default" | "warning" | "highlight";
}) {
  const { title, text, tone = "default" } = props;

  const base =
    "border rounded-lg p-2.5 text-xs whitespace-pre-line transition-colors";
  const toneClass =
    tone === "warning"
      ? "bg-amber-50 border-amber-100 text-amber-900"
      : tone === "highlight"
      ? "bg-sky-50 border-sky-100 text-sky-900"
      : "bg-gray-50 border-gray-200 text-gray-800";

  const titleColor =
    tone === "warning"
      ? "text-amber-700"
      : tone === "highlight"
      ? "text-sky-700"
      : "text-gray-600";

  const hasText = text && text.trim().length > 0;

  return (
    <div className={`${base} ${toneClass}`}>
      <div className={`font-semibold mb-1 ${titleColor}`}>{title}</div>
      <div className="text-[11px]">
        {hasText ? (
          text
        ) : (
          <span className="text-gray-400">Nincs adat</span>
        )}
      </div>
    </div>
  );
}
