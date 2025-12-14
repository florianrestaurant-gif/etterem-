"use client";

import { useEffect, useState } from "react";

type CleaningFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "OTHER";

interface CleaningLog {
  id: string;
  restaurantId: string;
  createdAt: string;

  date: string;
  area: string;
  frequency: CleaningFrequency;
  productUsed: string | null;
  method: string | null;
  completed: boolean;
  comment: string | null;

  createdById: string | null;
}

interface CleaningLogForm {
  date: string;
  area: string;
  frequency: CleaningFrequency;
  productUsed: string;
  method: string;
  completed: boolean;
  comment: string;
}

const defaultForm: CleaningLogForm = {
  date: "",
  area: "",
  frequency: "DAILY",
  productUsed: "",
  method: "",
  completed: true,
  comment: "",
};

function frequencyLabel(freq: CleaningFrequency) {
  switch (freq) {
    case "DAILY":
      return "Napi";
    case "WEEKLY":
      return "Heti";
    case "MONTHLY":
      return "Havi";
    case "OTHER":
    default:
      return "Egyéb";
  }
}

function formatDateForInput(value: string | Date) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

export default function CleaningLogsPage() {
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState<string>("");

  const [createForm, setCreateForm] = useState<CleaningLogForm>(defaultForm);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CleaningLogForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);

      const url =
        "/api/haccp/cleaning-logs" +
        (params.toString() ? `?${params.toString()}` : "");

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Hiba a naplók lekérésekor");
      }

      // új API: { ok, logs }
      setLogs(data?.logs ?? []);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba történt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);

      if (!createForm.date || !createForm.area) {
        setError("Dátum és terület megadása kötelező.");
        return;
      }

      const res = await fetch("/api/haccp/cleaning-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Hiba a takarítási napló mentése során.");
      }

      // új API: { ok, log }
      const newLog: CleaningLog | null = data?.log ?? null;
      if (newLog) {
        setLogs((prev) => [newLog, ...prev]);
      } else {
        // fallback: frissítünk, ha valamiért nincs log
        await fetchLogs();
      }

      setCreateForm(defaultForm);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba történt mentés közben.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (log: CleaningLog) => {
    setEditingId(log.id);
    setEditForm({
      date: formatDateForInput(log.date),
      area: log.area,
      frequency: log.frequency,
      productUsed: log.productUsed || "",
      method: log.method || "",
      completed: log.completed,
      comment: log.comment || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm) return;

    try {
      setSavingEdit(true);
      setError(null);

      const res = await fetch("/api/haccp/cleaning-logs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          ...editForm,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || "Hiba a takarítási napló frissítése során."
        );
      }

      const updated: CleaningLog | null = data?.log ?? null;
      if (updated) {
        setLogs((prev) =>
          prev.map((log) => (log.id === updated.id ? updated : log))
        );
      } else {
        await fetchLogs();
      }

      cancelEdit();
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba történt frissítés közben.");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleCompleted = async (log: CleaningLog) => {
    try {
      setError(null);

      const res = await fetch("/api/haccp/cleaning-logs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: log.id,
          completed: !log.completed,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Hiba a státusz frissítése során.");
      }

      const updated: CleaningLog | null = data?.log ?? null;
      if (updated) {
        setLogs((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
      } else {
        await fetchLogs();
      }
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba történt frissítés közben.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Biztosan törlöd ezt a bejegyzést?")) return;

    try {
      setDeletingId(id);
      setError(null);

      const res = await fetch("/api/haccp/cleaning-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Hiba a törlés során.");
      }

      setLogs((prev) => prev.filter((log) => log.id !== id));
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba történt törlés közben.");
    } finally {
      setDeletingId(null);
    }
  };

  const statusText =
    logs.length === 0
      ? "Nincs bejegyzés."
      : `${logs.length} bejegyzés található.`;

  return (
    <div className="px-4 py-6 mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-bold">Takarítási napló</h1>
      <p className="mb-4 text-sm text-gray-600">
        Napi / heti / havi takarítások rögzítése HACCP célokra.
      </p>

      <div className="mb-6 rounded-lg border border-gray-300 bg-white">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Dátum</span>
              <input
                type="date"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="éééé. hh. nn."
              />
              {filterDate && (
                <button
                  type="button"
                  className="text-xs text-gray-500 underline"
                  onClick={() => setFilterDate("")}
                >
                  Szűrő törlése
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-xs text-green-600">
              {logs.length > 0 ? statusText : "Nincs bejegyzés a szűrővel."}
            </span>
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "Frissítés..." : "Frissítés"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Új takarítási bejegyzés</h2>
        <form
          onSubmit={handleCreate}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Dátum *</label>
            <input
              type="date"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={createForm.date}
              onChange={(e) =>
                setCreateForm({ ...createForm, date: e.target.value })
              }
              required
              placeholder="éééé. hh. nn."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Terület *</label>
            <input
              type="text"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder='Pl. "Konyha – padló", "Hűtő 1"'
              value={createForm.area}
              onChange={(e) =>
                setCreateForm({ ...createForm, area: e.target.value })
              }
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Gyakoriság *</label>
            <select
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={createForm.frequency}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  frequency: e.target.value as CleaningFrequency,
                })
              }
            >
              <option value="DAILY">Napi</option>
              <option value="WEEKLY">Heti</option>
              <option value="MONTHLY">Havi</option>
              <option value="OTHER">Egyéb</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tisztítószer</label>
            <input
              type="text"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Pl. Suma, Domestos, stb."
              value={createForm.productUsed}
              onChange={(e) =>
                setCreateForm({ ...createForm, productUsed: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Módszer</label>
            <input
              type="text"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder='Pl. "megtisztítani + fertőtleníteni"'
              value={createForm.method}
              onChange={(e) =>
                setCreateForm({ ...createForm, method: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={createForm.completed}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    completed: e.target.checked,
                  })
                }
              />
              Feladat elvégezve (completed)
            </label>
          </div>

          <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium">Megjegyzés</label>
            <textarea
              className="min-h-[60px] rounded border border-gray-300 px-2 py-1 text-sm"
              value={createForm.comment}
              onChange={(e) =>
                setCreateForm({ ...createForm, comment: e.target.value })
              }
              placeholder="Extra információ, rendkívüli esemény, stb."
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? "Mentés..." : "Bejegyzés hozzáadása"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Rögzített takarítások</h2>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Frissítés..." : "Frissítés"}
          </button>
        </div>

        {logs.length === 0 && !loading ? (
          <p className="text-sm text-gray-500">
            Nincs még rögzített bejegyzés a megadott szűrőkkel.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                  <th className="px-3 py-2">Dátum</th>
                  <th className="px-3 py-2">Terület</th>
                  <th className="px-3 py-2">Gyakoriság</th>
                  <th className="px-3 py-2">Tisztítószer</th>
                  <th className="px-3 py-2">Módszer</th>
                  <th className="px-3 py-2">Megjegyzés</th>
                  <th className="px-3 py-2">Kész</th>
                  <th className="px-3 py-2 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2">
                      {formatDateForInput(log.date)}
                    </td>
                    <td className="px-3 py-2">{log.area}</td>
                    <td className="px-3 py-2">
                      {frequencyLabel(log.frequency)}
                    </td>
                    <td className="px-3 py-2">
                      {log.productUsed || (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {log.method || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate">
                      {log.comment || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={log.completed}
                        onChange={() => toggleCompleted(log)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(log)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                        >
                          Szerkesztés
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(log.id)}
                          disabled={deletingId === log.id}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === log.id ? "Törlés..." : "Törlés"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingId && editForm && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bejegyzés szerkesztése</h2>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-sm text-blue-700 underline"
            >
              Mégse
            </button>
          </div>

          <form
            onSubmit={handleEditSave}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Dátum</label>
              <input
                type="date"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm({ ...editForm, date: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Terület</label>
              <input
                type="text"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={editForm.area}
                onChange={(e) =>
                  setEditForm({ ...editForm, area: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Gyakoriság</label>
              <select
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={editForm.frequency}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    frequency: e.target.value as CleaningFrequency,
                  })
                }
              >
                <option value="DAILY">Napi</option>
                <option value="WEEKLY">Heti</option>
                <option value="MONTHLY">Havi</option>
                <option value="OTHER">Egyéb</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Tisztítószer</label>
              <input
                type="text"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={editForm.productUsed}
                onChange={(e) =>
                  setEditForm({ ...editForm, productUsed: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Módszer</label>
              <input
                type="text"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={editForm.method}
                onChange={(e) =>
                  setEditForm({ ...editForm, method: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={editForm.completed}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      completed: e.target.checked,
                    })
                  }
                />
                Feladat elvégezve (completed)
              </label>
            </div>

            <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium">Megjegyzés</label>
              <textarea
                className="min-h-[60px] rounded border border-gray-300 px-2 py-1 text-sm"
                value={editForm.comment}
                onChange={(e) =>
                  setEditForm({ ...editForm, comment: e.target.value })
                }
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingEdit ? "Mentés..." : "Változások mentése"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
