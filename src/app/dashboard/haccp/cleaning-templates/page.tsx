"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

interface CleaningTemplate {
  id: string;
  createdAt: string;
  restaurantId: string;
  task: string;
  description: string | null;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  isActive: boolean;
}

interface CleaningTemplateForm {
  task: string;
  description: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  isActive: boolean;
}

const defaultForm: CleaningTemplateForm = {
  task: "",
  description: "",
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
  isActive: true,
};

type ApiListResponse = { items: CleaningTemplate[] };
type ApiOneResponse = { ok: true; item: CleaningTemplate };

export default function CleaningTemplatesPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurantId") ?? "";

  const [templates, setTemplates] = useState<CleaningTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CleaningTemplateForm>(defaultForm);

  // restaurantId opcionális: global adminnál jöhet queryből, normál usernél session/membership alapján megy.
  const apiBaseUrl = useMemo(() => {
    if (restaurantId) {
      return `/api/haccp/cleaning-templates?restaurantId=${encodeURIComponent(
        restaurantId
      )}`;
    }
    return `/api/haccp/cleaning-templates`;
  }, [restaurantId]);

  async function loadTemplates() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(apiBaseUrl, { cache: "no-store" });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || "Hiba a takarítási sablonok lekérése során."
        );
      }

      const data = (await res.json()) as ApiListResponse;

      setTemplates(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ismeretlen hiba történt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const task = form.task.trim();
      if (!task) {
        setError("A feladat megadása kötelező.");
        return;
      }

      const anyDay =
        form.monday ||
        form.tuesday ||
        form.wednesday ||
        form.thursday ||
        form.friday ||
        form.saturday ||
        form.sunday;

      if (!anyDay) {
        setError("Legalább egy napot pipálj ki.");
        return;
      }

      const res = await fetch(apiBaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          task,
          description: form.description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || "Hiba a takarítási sablon mentése során."
        );
      }

      const data = (await res.json()) as ApiOneResponse;

      setTemplates((prev) => [...prev, data.item]);
      setForm(defaultForm);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ismeretlen hiba történt mentés közben.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(tpl: CleaningTemplate) {
    try {
      setError(null);

      const res = await fetch(apiBaseUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tpl.id, isActive: !tpl.isActive }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || "Hiba a takarítási sablon frissítése során."
        );
      }

      const data = (await res.json()) as ApiOneResponse;

      setTemplates((prev) =>
        prev.map((t) => (t.id === data.item.id ? data.item : t))
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ismeretlen hiba történt frissítés közben.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd ezt a takarítási sablont?")) return;

    try {
      setDeletingId(id);
      setError(null);

      // DELETE: checklist-template mintára query param az id
      const deleteUrl =
        apiBaseUrl + (apiBaseUrl.includes("?") ? "&" : "?") + `id=${encodeURIComponent(id)}`;

      const res = await fetch(deleteUrl, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || "Hiba a takarítási sablon törlése során."
        );
      }

      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ismeretlen hiba történt törlés közben.");
    } finally {
      setDeletingId(null);
    }
  }

  function renderDays(tpl: CleaningTemplate) {
    const days: string[] = [];
    if (tpl.monday) days.push("H");
    if (tpl.tuesday) days.push("K");
    if (tpl.wednesday) days.push("Sze");
    if (tpl.thursday) days.push("Cs");
    if (tpl.friday) days.push("P");
    if (tpl.saturday) days.push("Szo");
    if (tpl.sunday) days.push("V");
    if (days.length === 0) return <span className="text-gray-400">Nincs nap</span>;
    return days.join(", ");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-2">Takarítási sablonok</h1>
      <p className="text-sm text-gray-600">
        Itt tudod beállítani, hogy a hét mely napjain milyen takarítási feladat
        jelenjen meg a Napi nyitás / zárás checklist oldalán.
      </p>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2 rounded">
          {error}
        </div>
      )}

      <div className="border rounded-lg bg-white shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-3">Új takarítási sablon</h2>

        <form
          onSubmit={handleCreate}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Feladat *</label>
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm"
              placeholder='Pl. "Padló felmosása", "Hűtő 1 takarítása"'
              value={form.task}
              onChange={(e) => setForm({ ...form, task: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium">
              Leírás / megjegyzés (opcionális)
            </label>
            <textarea
              className="border rounded px-2 py-1 text-sm min-h-[60px]"
              placeholder='Pl. "Suma 1% + Domestos fertőtlenítés"'
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <span className="text-xs text-gray-500">
              Ide írhatod, milyen tisztítószert, módszert használjanak.
            </span>
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium mb-1 block">Mely napokon?</label>
            <div className="border rounded px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {[
                ["monday", "Hétfő"],
                ["tuesday", "Kedd"],
                ["wednesday", "Szerda"],
                ["thursday", "Csütörtök"],
                ["friday", "Péntek"],
                ["saturday", "Szombat"],
                ["sunday", "Vasárnap"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 ${
                    key === "sunday" ? "col-span-2" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={(form as any)[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.checked } as any)
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Legalább egy napot pipálj ki, különben a sablon nem fog megjelenni.
            </p>
          </div>

          <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <span className="text-sm font-medium">Aktív sablon</span>
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Mentés..." : "Sablon mentése"}
            </button>
          </div>
        </form>
      </div>

      <div className="border rounded-lg bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Meglévő takarítási sablonok</h2>
          <button
            type="button"
            onClick={loadTemplates}
            disabled={loading}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Frissítés..." : "Frissítés"}
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="text-sm text-gray-500">
            Még nincs takarítási sablon rögzítve.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-600 border-b">
                  <th className="px-3 py-2">Feladat</th>
                  <th className="px-3 py-2">Leírás</th>
                  <th className="px-3 py-2">Napok</th>
                  <th className="px-3 py-2">Aktív</th>
                  <th className="px-3 py-2 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{tpl.task}</td>
                    <td className="px-3 py-2">
                      {tpl.description || <span className="text-gray-400">–</span>}
                    </td>
                    <td className="px-3 py-2">{renderDays(tpl)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(tpl)}
                        className={`px-2 py-1 rounded text-xs ${
                          tpl.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {tpl.isActive ? "Aktív" : "Inaktív"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDelete(tpl.id)}
                          disabled={deletingId === tpl.id}
                          className="px-2 py-1 border border-red-300 rounded text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === tpl.id ? "Törlés..." : "Törlés"}
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
    </div>
  );
}
