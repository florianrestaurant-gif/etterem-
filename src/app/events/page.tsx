import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

async function getCurrentRestaurantId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { restaurantId: true },
  });
  return membership?.restaurantId ?? null;
}

export default async function EventsPage() {
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await prisma.restaurantEvent.findMany({
    where: {
      restaurantId,
      date: {
        gte: today,
      },
      status: {
        not: "CANCELLED",
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("hu-SK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function formatTime(date: Date | null | undefined) {
    if (!date) return "";
    return new Intl.DateTimeFormat("hu-SK", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function typeLabel(type: string) {
    switch (type) {
      case "BIRTHDAY":
        return "Születésnap";
      case "WEDDING":
        return "Esküvő";
      case "CHRISTENING":
        return "Keresztelő";
      case "CORPORATE":
        return "Céges";
      default:
        return "Egyéb";
    }
  }

  function statusBadge(status: string) {
    const base = "px-2 py-0.5 rounded-full text-[11px] font-medium";
    switch (status) {
      case "INQUIRY":
        return `${base} bg-gray-100 text-gray-700`;
      case "OFFER_SENT":
        return `${base} bg-blue-100 text-blue-700`;
      case "CONFIRMED":
        return `${base} bg-emerald-100 text-emerald-700`;
      case "DEPOSIT_PAID":
        return `${base} bg-purple-100 text-purple-700`;
      case "FINALIZED":
        return `${base} bg-black text-white`;
      case "CANCELLED":
        return `${base} bg-red-100 text-red-700`;
      default:
        return `${base} bg-gray-100 text-gray-700`;
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Események és akciók</h1>
          <p className="text-sm text-gray-500">
            Születésnapok, esküvők, keresztelők és egyéb rendezvények áttekintése.
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-black text-white text-sm"
        >
          Új esemény felvétele
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-gray-500">
          Jelenleg nincs rögzített közelgő esemény. Kattints az „Új esemény
          felvétele” gombra a kezdéshez.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Dátum</th>
                <th className="px-3 py-2 text-left">Idő</th>
                <th className="px-3 py-2 text-left">Típus</th>
                <th className="px-3 py-2 text-left">Cím</th>
                <th className="px-3 py-2 text-left">Létszám</th>
                <th className="px-3 py-2 text-left">Kapcsolattartó</th>
                <th className="px-3 py-2 text-left">Státusz</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDate(ev.date)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatTime(ev.startTime)}
                    {ev.startTime && ev.endTime ? " – " : ""}
                    {formatTime(ev.endTime)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {typeLabel(ev.type)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{ev.title}</div>
                    {ev.roomName && (
                      <div className="text-xs text-gray-500">{ev.roomName}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {ev.guestsTotal}
                    {ev.guestsKids ? ` (+${ev.guestsKids} gyerek)` : ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm">{ev.contactName}</div>
                    <div className="text-xs text-gray-500">
                      {ev.contactPhone}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={statusBadge(ev.status)}>
                      {ev.status === "INQUIRY"
                        ? "Érdeklődés"
                        : ev.status === "OFFER_SENT"
                        ? "Ajánlat elküldve"
                        : ev.status === "CONFIRMED"
                        ? "Visszaigazolva"
                        : ev.status === "DEPOSIT_PAID"
                        ? "Foglaló beérkezett"
                        : ev.status === "FINALIZED"
                        ? "Lezárt"
                        : ev.status === "CANCELLED"
                        ? "Lemondva"
                        : ev.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
