// src/app/kitchen/monitor/_components/MonitorScreen.tsx
"use client";

import { useEffect, useState } from "react";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

type MonitorTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
};

type MonitorPrepItem = {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  status: string;
  expiryAt: string | null;
  location: string | null;
  note: string | null;
};

type MonitorWish = {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  createdAt: string;
  createdByEmail: string | null;
};

export type MonitorData = {
  ok: boolean;
  restaurantName: string | null;
  shift: {
    id: string;
    label: string;
    date: string;
    type: string;
    tasks: MonitorTask[];
    prepItems: MonitorPrepItem[];
    wishes: MonitorWish[];
  } | null;
  generatedAt: string;
};

type Props = {
  initialData: MonitorData;
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: "bg-yellow-500",
  IN_PROGRESS: "bg-blue-500",
  DONE: "bg-emerald-500",
  CANCELLED: "bg-gray-500",
};

export function MonitorScreen({ initialData }: Props) {
  const [data, setData] = useState<MonitorData>(initialData);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 30 másodpercenként frissítjük az adatokat
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/kitchen/monitor");
        const json = (await res.json()) as MonitorData & { error?: string };

        if (!res.ok || !json.ok) {
          setErrorMsg(json.error ?? "Nem sikerült frissíteni az adatokat.");
          return;
        }

        setData(json);
        setErrorMsg(null);
      } catch (err) {
        console.error("MonitorScreen fetch error", err);
        setErrorMsg("Hálózati hiba, nem sikerült frissíteni.");
      }
    }

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const lastUpdated = new Intl.DateTimeFormat("hu-SK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(data.generatedAt));

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 flex flex-col gap-4">
      {/* Fejléc */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-gray-700 pb-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-wide">
            {data.restaurantName ?? "Konyhai monitor"}
          </h1>
          <p className="text-sm text-gray-300">
            Élő nézet a konyhának – feladatok, mise en place, kívánságlista.
          </p>
          <p className="text-xs text-gray-400">
            Ez a nézet falra / tabletre van optimalizálva, csak olvasható módon.
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm font-medium">
            {data.shift
              ? `Aktuális műszak: ${data.shift.label}`
              : "Nincs rögzített műszak"}
          </div>
          <div className="text-xs text-gray-400">
            Utolsó frissítés: {lastUpdated}
          </div>
          {errorMsg && (
            <div className="text-xs text-red-400">{errorMsg}</div>
          )}
        </div>
      </header>

      {/* Ha nincs műszak */}
      {!data.shift ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
          Jelenleg nincs rögzített műszak ehhez az étteremhez.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 overflow-hidden">
          {/* Feladatok oszlop */}
          <section className="bg-zinc-900/80 rounded-2xl border border-zinc-700 p-3 sm:p-4 flex flex-col overflow-hidden">
            <h2 className="text-lg font-semibold mb-2 flex items-center justify-between">
              <span>Feladatok</span>
              <span className="text-xs text-gray-400">
                {data.shift.tasks.length} db
              </span>
            </h2>
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {data.shift.tasks.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nincs feladat ehhez a műszakhoz.
                </p>
              ) : (
                data.shift.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${TASK_STATUS_COLORS[t.status]}`}
                        />
                        <span className="font-medium text-sm">
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Intl.DateTimeFormat("hu-SK", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(t.createdAt))}
                      </span>
                    </div>
                    {t.description && (
                      <div className="text-xs text-gray-300 whitespace-pre-line">
                        {t.description}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Mise en place oszlop */}
          <section className="bg-zinc-900/80 rounded-2xl border border-zinc-700 p-3 sm:p-4 flex flex-col overflow-hidden">
            <h2 className="text-lg font-semibold mb-2 flex items-center justify-between">
              <span>Mise en place</span>
              <span className="text-xs text-gray-400">
                {data.shift.prepItems.length} tétel
              </span>
            </h2>
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {data.shift.prepItems.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nincsenek felvitt előkészített tételek.
                </p>
              ) : (
                data.shift.prepItems.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {p.category}
                          {p.quantity !== null ? ` • ${p.quantity}` : ""}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-gray-300 space-y-0.5">
                        <div>{p.status}</div>
                        <div className="text-gray-500">
                          {p.expiryAt
                            ? `Lejár: ${new Intl.DateTimeFormat("hu-SK", {
                                month: "2-digit",
                                day: "2-digit",
                              }).format(new Date(p.expiryAt))}`
                            : ""}
                        </div>
                      </div>
                    </div>
                    {(p.location || p.note) && (
                      <div className="text-xs text-gray-300 whitespace-pre-line">
                        {p.location}
                        {p.location && p.note ? " – " : ""}
                        {p.note}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Kívánságlista oszlop */}
          <section className="bg-zinc-900/80 rounded-2xl border border-zinc-700 p-3 sm:p-4 flex flex-col overflow-hidden">
            <h2 className="text-lg font-semibold mb-2 flex items-center justify-between">
              <span>Kívánságlista</span>
              <span className="text-xs text-gray-400">
                {data.shift.wishes.length} tétel
              </span>
            </h2>
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {data.shift.wishes.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nincs rögzített kívánság ehhez a műszakhoz.
                </p>
              ) : (
                data.shift.wishes.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="font-medium text-sm">{w.title}</div>
                      <span className="text-[11px] text-gray-400">
                        {w.createdByEmail ?? ""}
                      </span>
                    </div>
                    {w.description && (
                      <div className="text-xs text-gray-300 whitespace-pre-line">
                        {w.description}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500">
                      Rögzítve:{" "}
                      {new Intl.DateTimeFormat("hu-SK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(w.createdAt))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
