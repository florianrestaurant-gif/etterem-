"use client";

import { useEffect, useState, FormEvent } from "react";

type HeatTreatmentStatus = "OK" | "ERROR";

type HeatTreatmentLog = {
  id: string;
  restaurantId: string;
  itemName: string;
  batchCode: string | null;
  targetTemp: number;
  measuredTemp: number;
  startTime: string; // ISO string
  endTime: string; // ISO string
  operatorId: string | null;
  status: HeatTreatmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  itemName: string;
  batchCode: string;
  targetTemp: string;
  measuredTemp: string;
  startTime: string; // datetime-local
  endTime: string; // datetime-local
  operatorId: string;
  notes: string;
};

const initialForm: FormState = {
  itemName: "",
  batchCode: "",
  targetTemp: "",
  measuredTemp: "",
  startTime: "",
  endTime: "",
  operatorId: "",
  notes: "",
};

function formatDateTime(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("hu-HU");
}

export default function HeatTreatmentPage() {
  const [logs, setLogs] = useState<HeatTreatmentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [reloadFlag, setReloadFlag] = useState(0);

  // Napi nézet – dátumválasztó (YYYY-MM-DD), alapból ma
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const handleSetToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Lista betöltése – NEM kell restaurantId, session-ből megy, mint a többi HACCP részben
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/haccp/heat-treatment");

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Nem sikerült betölteni a naplót.");
        }

        const data = (await res.json()) as HeatTreatmentLog[];
        setLogs(data);
      } catch (err: any) {
        setError(err.message || "Ismeretlen hiba történt.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [reloadFlag]);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const targetTemp = Number(form.targetTemp);
      const measuredTemp = Number(form.measuredTemp);

      // datetime-local -> ISO
      const startIso = form.startTime
        ? new Date(form.startTime).toISOString()
        : "";
      const endIso = form.endTime ? new Date(form.endTime).toISOString() : "";

      const res = await fetch("/api/haccp/heat-treatment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // restaurantId-t NEM küldünk, a backend szedi ki a sessionből
          itemName: form.itemName,
          batchCode: form.batchCode || null,
          targetTemp,
          measuredTemp,
          startTime: startIso,
          endTime: endIso,
          operatorId: form.operatorId || null,
          notes: form.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || "Nem sikerült elmenteni a hőkezelési naplót."
        );
      }

      // sikeres mentés után: form ürítése, lista frissítése
      setForm(initialForm);
      setReloadFlag((x) => x + 1);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba történt mentés közben.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Biztosan törlöd ezt a bejegyzést?")) return;

    try {
      setError(null);
      const res = await fetch(`/api/haccp/heat-treatment/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Nem sikerült törölni a bejegyzést.");
      }

      // FRONTEND lista azonnali frissítése
      setLogs((prev) => prev.filter((log) => log.id !== id));

      // Ha akarod, maradhatna a refetch is:
      // setReloadFlag((x) => x + 1);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba történt törlés közben.");
    }
  };

  // Csak a kiválasztott napon rögzített bejegyzések (startTime alapján)
  const filteredLogs = logs.filter((log) => {
    if (!selectedDate) return true;
    const d = new Date(log.startTime);
    if (Number.isNaN(d.getTime())) return true;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const logDateStr = `${yyyy}-${mm}-${dd}`;

    return logDateStr === selectedDate;
  });

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Hőkezelési napló</h1>
        <p className="text-sm text-gray-600">
          Itt rögzítheted a főzési / sütési hőmérsékleteket HACCP naplózáshoz.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Dátum kiválasztása – napi nézet */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Dátum kiválasztása</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Dátum</label>
            <input
              type="date"
              className="rounded-md border px-2 py-1 text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="mt-5 text-sm px-3 py-1 rounded-md border"
            onClick={handleSetToday}
          >
            Ma
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Az alábbi listában csak a kiválasztott napon rögzített hőkezelések
          jelennek meg (a kezdés időpontja alapján).
        </p>
      </div>

      {/* Új bejegyzés űrlap */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Új hőkezelési bejegyzés</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Ételféleség neve *
              </label>
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={form.itemName}
                onChange={handleChange("itemName")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tétel / batch kód
              </label>
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={form.batchCode}
                onChange={handleChange("batchCode")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Előírt hőmérséklet (°C) *
              </label>
              <input
                type="number"
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={form.targetTemp}
                onChange={handleChange("targetTemp")}
                required
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Mért hőmérséklet (°C) *
              </label>
              <input
                type="number"
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={form.measuredTemp}
                onChange={handleChange("measuredTemp")}
                required
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Kezdés időpontja *
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={form.startTime}
                onChange={handleChange("startTime")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Befejezés időpontja *
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={form.endTime}
                onChange={handleChange("endTime")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Dolgozó azonosító (opcionális)
              </label>
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={form.operatorId}
                onChange={handleChange("operatorId")}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Megjegyzés</label>
            <textarea
              className="w-full rounded-md border px-2 py-1 text-sm"
              rows={3}
              value={form.notes}
              onChange={handleChange("notes")}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ha a mért hőmérséklet alacsonyabb, mint az előírt, a megjegyzés
              kötelező (ok, intézkedés).
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="text-sm px-3 py-1 rounded-md border"
              onClick={() => {
                setForm(initialForm);
              }}
              disabled={saving}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="text-sm px-4 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Mentés..." : "Mentés"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="border rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Rögzített hőkezelések</h2>
          {loading && (
            <span className="text-xs text-gray-500">Betöltés...</span>
          )}
        </div>

        {logs.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500">
            Még nincs rögzített hőkezelési bejegyzés.
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500">
            A kiválasztott napon nincs rögzített hőkezelési bejegyzés.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 border-b text-left">Kezdés</th>
                  <th className="px-2 py-2 border-b text-left">Befejezés</th>
                  <th className="px-2 py-2 border-b text-left">Étel</th>
                  <th className="px-2 py-2 border-b text-left">Batch</th>
                  <th className="px-2 py-2 border-b text-right">Előírt °C</th>
                  <th className="px-2 py-2 border-b text-right">Mért °C</th>
                  <th className="px-2 py-2 border-b text-center">Státusz</th>
                  <th className="px-2 py-2 border-b text-left">Megjegyzés</th>
                  <th className="px-2 py-2 border-b text-right">Művelet</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isOk = log.status === "OK";
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1 border-b align-top">
                        {formatDateTime(log.startTime)}
                      </td>
                      <td className="px-2 py-1 border-b align-top">
                        {formatDateTime(log.endTime)}
                      </td>
                      <td className="px-2 py-1 border-b align-top">
                        {log.itemName}
                      </td>
                      <td className="px-2 py-1 border-b align-top">
                        {log.batchCode || "-"}
                      </td>
                      <td className="px-2 py-1 border-b text-right align-top">
                        {log.targetTemp}
                      </td>
                      <td className="px-2 py-1 border-b text-right align-top">
                        {log.measuredTemp}
                      </td>
                      <td className="px-2 py-1 border-b text-center align-top">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isOk
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isOk ? "OK" : "HIBA"}
                        </span>
                      </td>
                      <td className="px-2 py-1 border-b align-top max-w-xs">
                        <div className="line-clamp-3 text-[11px]">
                          {log.notes || "-"}
                        </div>
                      </td>
                      <td className="px-2 py-1 border-b text-right align-top">
                        <button
                          className="text-[11px] text-red-600 hover:underline"
                          onClick={() => handleDelete(log.id)}
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
      </div>
    </div>
  );
}
