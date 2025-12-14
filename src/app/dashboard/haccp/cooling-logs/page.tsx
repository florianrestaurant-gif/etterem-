// app/haccp/cooling-logs/page.tsx
"use client";

import { useEffect, useState } from "react";

type CoolingLog = {
  id: string;
  itemName: string;
  batchCode: string | null;
  targetTemp: number;
  measuredTemp: number;
  startTime: string; // ISO
  endTime: string; // ISO
  notes: string | null;
  status: "OK" | "ERROR" | string;
  createdAt: string;
  updatedAt: string;
};

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function CoolingLogsPage() {
  const [date, setDate] = useState<string>(formatDateInput(new Date()));
  const [logs, setLogs] = useState<CoolingLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Új log form state
  const [itemName, setItemName] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [targetTemp, setTargetTemp] = useState<string>("10");
  const [measuredTemp, setMeasuredTemp] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("10:00");
  const [endTime, setEndTime] = useState<string>("14:00");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadLogs(selectedDate: string) {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/haccp/cooling-logs?date=${selectedDate}`, {
        cache: "no-store",
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || `Hiba a napló lekérésekor: ${res.status}`);
      }

      // új API: { items }
      setLogs(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Ismeretlen hiba");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const measured = Number(measuredTemp);
    const target = Number(targetTemp);

    if (!itemName.trim()) {
      setError("A tétel neve kötelező.");
      return;
    }
    if (Number.isNaN(measured) || Number.isNaN(target)) {
      setError("A hőmérsékleteknek számnak kell lenniük.");
      return;
    }

    const status = measured <= target ? "OK" : "ERROR";
    if (status === "ERROR" && notes.trim().length === 0) {
      setError("ERROR státusznál a megjegyzés kötelező.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/haccp/cooling-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          itemName,
          batchCode: batchCode.trim() ? batchCode.trim() : null,
          targetTemp: target,
          measuredTemp: measured,
          startTime,
          endTime,
          notes: notes.trim() ? notes.trim() : null,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || `Hiba mentéskor: ${res.status}`);
      }

      // új API: { ok, item }
      if (!data?.ok) {
        throw new Error("A mentés nem sikerült (ok=false).");
      }

      // form reset
      setItemName("");
      setBatchCode("");
      setTargetTemp("10");
      setMeasuredTemp("");
      setStartTime("10:00");
      setEndTime("14:00");
      setNotes("");

      await loadLogs(date);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Hiba mentéskor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd ezt a naplót?")) return;

    try {
      setError(null);

      const res = await fetch(`/api/haccp/cooling-logs/${id}`, {
        method: "DELETE",
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || `Hiba törléskor: ${res.status}`);
      }

      await loadLogs(date);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Hiba törléskor.");
    }
  }

  const measuredIsError =
    measuredTemp !== "" && Number(measuredTemp) > Number(targetTemp);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Visszahűtési napló</h1>
          <p className="text-sm text-gray-500">
            Hőkezelt ételek visszahűtésének rögzítése (CoolingLog – HACCP).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="date" className="text-sm font-medium">
            Dátum
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border px-2 py-1 text-sm"
          />
        </div>
      </header>

      {/* Új visszahűtési bejegyzés */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Új visszahűtési tétel</h2>

        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Tétel / étel neve
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-sm"
              placeholder="Pl. Marhapörkölt"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Tétel azonosító / főzet (opcionális)
            </label>
            <input
              type="text"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-sm"
              placeholder="Pl. FZ-2025-001"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Célhőmérséklet (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={targetTemp}
              onChange={(e) => setTargetTemp(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-sm"
              placeholder="Pl. 10"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Mért hőmérséklet (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={measuredTemp}
              onChange={(e) => setMeasuredTemp(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-sm"
              placeholder="Pl. 8"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Kezdés (óra:perc)
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Vége (óra:perc)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-sm"
              required
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium">
              Megjegyzés{" "}
              {measuredIsError && (
                <span className="text-xs text-red-600">(ERROR esetén kötelező)</span>
              )}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-sm"
              rows={2}
              placeholder="Pl. Nem érte el időben a célhőmérsékletet, selejtezve..."
            />
          </div>

          <div className="flex items-end justify-end md:col-span-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Mentés..." : "Hozzáadás"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Rögzített tételek ({date})</h2>

        {isLoading ? (
          <p className="text-sm text-gray-500">Betöltés...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500">Nincs visszahűtési adat ezen a napon.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Tétel</th>
                  <th className="px-3 py-2">Főzet</th>
                  <th className="px-3 py-2">Kezdés</th>
                  <th className="px-3 py-2">Vége</th>
                  <th className="px-3 py-2">Cél (°C)</th>
                  <th className="px-3 py-2">Mért (°C)</th>
                  <th className="px-3 py-2">Státusz</th>
                  <th className="px-3 py-2">Megjegyzés</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const ok = log.status === "OK";
                  const start = new Date(log.startTime);
                  const end = new Date(log.endTime);

                  return (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">{log.itemName}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-500">
                        {log.batchCode || "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-xs">{formatTimeInput(start)}</td>
                      <td className="px-3 py-2 align-top text-xs">{formatTimeInput(end)}</td>
                      <td className="px-3 py-2 align-top">{log.targetTemp}</td>
                      <td className="px-3 py-2 align-top">{log.measuredTemp}</td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {ok ? "OK" : "ERROR"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-600">
                        {log.notes || "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Törlés
                        </button>
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
  );
}
