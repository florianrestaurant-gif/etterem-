"use client";

import { useEffect, useState } from "react";

type FridgeType = "FRIDGE" | "FREEZER" | "CHILLROOM";

type FridgeDevice = {
  id: string;
  name: string;
  type: FridgeType;
  location: string;
  minTemp: number | null;
  maxTemp: number | null;
};

type FridgeLog = {
  id: string;
  date: string;
  temperature: number;
  humidity?: number | null;

  fridgeDeviceId: string | null; // ⚠ lehet null régi logoknál
  fridgeName?: string;           // fallback
  location?: string | null;

  actionTaken?: string | null;
};

export default function FridgeLogPage() {
  const [devices, setDevices] = useState<FridgeDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const [temperature, setTemperature] = useState<string>("");

  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingDevice, setCreatingDevice] = useState(false);

  const [logs, setLogs] = useState<FridgeLog[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Napi nézet dátuma (YYYY-MM-DD), alapból ma
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  // Mérés időpontja (datetime-local), alapból most
  const [measurementDate, setMeasurementDate] = useState<string>(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16); // YYYY-MM-DDTHH:MM
    return local;
  });

  // ÚJ HŰTŐ / FAGYASZTÓ FORM
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceType, setNewDeviceType] = useState<FridgeType>("FRIDGE");
  const [newDeviceLocation, setNewDeviceLocation] = useState("");
  const [newMinTemp, setNewMinTemp] = useState<string>("");
  const [newMaxTemp, setNewMaxTemp] = useState<string>("");

  const handleSetToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const formatDeviceLabel = (d: FridgeDevice) => {
    const typeLabel =
      d.type === "FRIDGE"
        ? "hűtő"
        : d.type === "FREEZER"
        ? "fagyasztó"
        : "hűtő box";
    return `${d.name} – ${d.location} (${typeLabel})`;
  };

  // Hűtők betöltése – restaurantId már sessionből jön az API-ban
  const loadDevices = async () => {
    try {
      setLoadingDevices(true);
      setError(null);

      const res = await fetch("/api/haccp/fridges");

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error("Be kell jelentkezned a hűtőnapló használatához.");
        }
        throw new Error(data.error || "Nem sikerült betölteni a hűtőket.");
      }

      const data: FridgeDevice[] = await res.json();
      setDevices(data);

      if (data.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ismeretlen hiba történt a hűtők betöltésekor.");
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    void loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLogs = async (deviceId?: string) => {
    try {
      setLoadingLogs(true);
      setError(null);

      const params = new URLSearchParams();
      if (deviceId) params.set("fridgeDeviceId", deviceId);

      const res = await fetch(
        `/api/haccp/fridge-logs${params.toString() ? `?${params.toString()}` : ""}`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error("Be kell jelentkezned a hűtőnapló használatához.");
        }
        throw new Error(data.error || "Nem sikerült betölteni a logokat.");
      }

      const data: FridgeLog[] = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ismeretlen hiba történt a logok betöltésekor.");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (!selectedDeviceId) return;
    void loadLogs(selectedDeviceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  // ÚJ HŰTŐ LÉTREHOZÁSA
  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setWarningMessage(null);

    if (!newDeviceName.trim()) {
      setError("A hűtő neve kötelező.");
      return;
    }
    if (!newDeviceLocation.trim()) {
      setError("A hűtő helye / elnevezése kötelező (pl. konyha, raktár).");
      return;
    }

    const parseOptNumber = (value: string): number | null => {
      if (!value.trim()) return null;
      const n = Number.parseFloat(value.replace(",", "."));
      if (Number.isNaN(n)) {
        throw new Error("A minimum / maximum hőmérsékletnek számnak kell lennie.");
      }
      return n;
    };

    let minTemp: number | null = null;
    let maxTemp: number | null = null;

    try {
      minTemp = parseOptNumber(newMinTemp);
      maxTemp = parseOptNumber(newMaxTemp);
    } catch (err: any) {
      setError(err.message);
      return;
    }

    try {
      setCreatingDevice(true);

      const res = await fetch("/api/haccp/fridges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDeviceName.trim(),
          type: newDeviceType,
          location: newDeviceLocation.trim(),
          minTemp,
          maxTemp,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error("Be kell jelentkezned a hűtőnapló használatához.");
        }
        throw new Error(data.error || "Nem sikerült létrehozni a hűtőt.");
      }

      await res.json();

      setSuccessMessage("Hűtő / fagyasztó sikeresen létrehozva.");
      setNewDeviceName("");
      setNewDeviceLocation("");
      setNewMinTemp("");
      setNewMaxTemp("");
      setNewDeviceType("FRIDGE");

      await loadDevices();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ismeretlen hiba történt a hűtő létrehozásakor.");
    } finally {
      setCreatingDevice(false);
    }
  };

  // HŰTŐ TÖRLÉSE
  const handleDeleteDevice = async (id: string) => {
    if (
      !confirm(
        "Biztosan törlöd ezt a hűtőt? Az összes hozzá tartozó mérés is törlődni fog."
      )
    ) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/haccp/fridges/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Nem sikerült törölni a hűtőt.");
      }

      setDevices((prev) => {
        const next = prev.filter((d) => d.id !== id);
        if (selectedDeviceId === id) {
          setSelectedDeviceId(next.length > 0 ? next[0].id : "");
        }
        return next;
      });

      setLogs((prev) => prev.filter((log) => log.fridgeDeviceId !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ismeretlen hiba történt törlés közben.");
    }
  };

  // ÚJ MÉRÉS MENTÉSE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId) {
      setError("Válassz egy hűtőt!");
      return;
    }

    if (!measurementDate) {
      setError("A mérés időpontja kötelező.");
      return;
    }

    const numericTemp = Number.parseFloat(temperature.replace(",", "."));
    if (Number.isNaN(numericTemp)) {
      setError("A hőmérsékletnek számnak kell lennie.");
      return;
    }

    const measuredAt = new Date(measurementDate);
    if (Number.isNaN(measuredAt.getTime())) {
      setError("A mérés időpontja érvénytelen.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);
      setWarningMessage(null);

      const res = await fetch("/api/haccp/fridge-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fridgeDeviceId: selectedDeviceId,
          temperature: numericTemp,
          date: measuredAt.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error("Be kell jelentkezned a hűtőnapló használatához.");
        }
        throw new Error(data.error || "Nem sikerült menteni a mérést.");
      }

      const data: { log: FridgeLog; warning: string | null } = await res.json();

      setSuccessMessage("Mérés elmentve.");
      if (data.warning) setWarningMessage(data.warning);

      setTemperature("");

      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setMeasurementDate(local);

      void loadLogs(selectedDeviceId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ismeretlen hiba történt mentés közben.");
    } finally {
      setSubmitting(false);
    }
  };

  // MÉRÉS TÖRLÉSE
  const handleDeleteLog = async (id: string) => {
    if (!confirm("Biztosan törlöd ezt a mérést?")) return;

    try {
      setError(null);
      const res = await fetch(`/api/haccp/fridge-logs/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Nem sikerült törölni a mérést.");
      }

      setLogs((prev) => prev.filter((log) => log.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ismeretlen hiba történt törlés közben.");
    }
  };

  // Csak a kiválasztott napon rögzített mérések (lokális nap)
  const filteredLogs = logs.filter((log) => {
    if (!selectedDate) return true;
    const d = new Date(log.date);
    if (Number.isNaN(d.getTime())) return true;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const logDateStr = `${yyyy}-${mm}-${dd}`;
    return logDateStr === selectedDate;
  });

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          Hűtő / fagyasztó hőmérséklet napló
        </h1>
        <p className="text-sm text-gray-600">
          A mérések automatikusan a bejelentkezett felhasználó étterméhez kerülnek.
        </p>
      </header>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {warningMessage && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
          ⚠ {warningMessage}
        </div>
      )}

      {/* Dátum kiválasztása – napi nézet */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-medium">Dátum kiválasztása</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Dátum</label>
            <input
              type="date"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleSetToday}
            className="mt-5 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            Ma
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Az alábbi táblázatban csak a kiválasztott napon rögzített mérések jelennek meg.
        </p>
      </section>

      {/* Hűtők / fagyasztók kezelése */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-lg font-medium">Hűtők / fagyasztók</h2>

        <div className="space-y-2">
          {loadingDevices ? (
            <p className="text-sm text-gray-500">Hűtők betöltése…</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-gray-500">
              Még nincs rögzítve egyetlen hűtő sem ennél az étteremnél. Hozz létre lent egyet.
            </p>
          ) : (
            <ul className="text-sm list-disc list-inside space-y-1">
              {devices.map((d) => (
                <li key={d.id}>
                  {formatDeviceLabel(d)}
                  <button
                    type="button"
                    className="ml-2 text-xs text-red-600 hover:underline"
                    onClick={() => handleDeleteDevice(d.id)}
                  >
                    Törlés
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={handleCreateDevice}
          className="mt-2 grid gap-3 md:grid-cols-[2fr,1fr,1fr,auto]"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium">Hűtő neve</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder='pl. "Konyha 1"'
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Típus</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newDeviceType}
              onChange={(e) => setNewDeviceType(e.target.value as FridgeType)}
            >
              <option value="FRIDGE">Hűtő</option>
              <option value="FREEZER">Fagyasztó</option>
              <option value="CHILLROOM">Hűtő box</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Hely / elhelyezés</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="pl. konyha, raktár"
              value={newDeviceLocation}
              onChange={(e) => setNewDeviceLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-4 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Minimum hőmérséklet (°C, opcionális)
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="pl. -2"
                value={newMinTemp}
                onChange={(e) => setNewMinTemp(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Maximum hőmérséklet (°C, opcionális)
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="pl. +5"
                value={newMaxTemp}
                onChange={(e) => setNewMaxTemp(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-4 flex items-end">
            <button
              type="submit"
              disabled={creatingDevice}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {creatingDevice ? "Hozzáadás…" : "Hűtő hozzáadása"}
            </button>
          </div>
        </form>
      </section>

      {/* Új mérés form */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-lg font-medium">Új mérés rögzítése</h2>

        {loadingDevices ? (
          <p className="text-sm text-gray-500">Hűtők betöltése…</p>
        ) : devices.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nincs egyetlen hűtő sem rögzítve. Először hozz létre fent egyet.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Hűtő / fagyasztó</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {formatDeviceLabel(d)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Mérés időpontja</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={measurementDate}
                onChange={(e) => setMeasurementDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Mért hőmérséklet (°C)
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="pl. 3.5"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedDeviceId}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Mentés…" : "Mérés mentése"}
            </button>
          </form>
        )}
      </section>

      {/* Log lista */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Mérések a kiválasztott napon</h2>
          <button
            type="button"
            onClick={() => selectedDeviceId && loadLogs(selectedDeviceId)}
            disabled={loadingLogs}
            className="text-xs rounded-md border border-gray-300 px-2 py-1 text-gray-700 disabled:opacity-60"
          >
            {loadingLogs ? "Frissítés…" : "Frissítés"}
          </button>
        </div>

        {loadingLogs ? (
          <p className="text-sm text-gray-500">Logok betöltése…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500">Még nincs rögzített mérés.</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-sm text-gray-500">
            A kiválasztott napon nincs rögzített mérés.
          </p>
        ) : (
          <div className="max-h-80 overflow-auto text-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
                  <th className="px-2 py-1 text-left">Dátum</th>
                  <th className="px-2 py-1 text-left">Hűtő</th>
                  <th className="px-2 py-1 text-right">Hőmérséklet (°C)</th>
                  <th className="px-2 py-1 text-right">Művelet</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const dev =
                    log.fridgeDeviceId
                      ? devices.find((d) => d.id === log.fridgeDeviceId)
                      : null;

                  const date = new Date(log.date);
                  const dateStr = date.toLocaleString("sk-SK", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const fridgeLabel = dev
                    ? `${dev.name} – ${dev.location}`
                    : (log.fridgeName ?? "Ismeretlen hűtő");

                  return (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="px-2 py-1">{dateStr}</td>
                      <td className="px-2 py-1">{fridgeLabel}</td>
                      <td className="px-2 py-1 text-right">
                        {Number.isFinite(log.temperature)
                          ? log.temperature.toFixed(1)
                          : "-"}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => handleDeleteLog(log.id)}
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
