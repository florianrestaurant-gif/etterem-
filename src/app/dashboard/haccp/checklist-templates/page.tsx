"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

type ChecklistType = "OPENING" | "CLOSING";
type ChecklistGroup = "PREP" | "CLEANING" | "ADMIN" | "OTHER";
type KitchenZone = "HOT" | "COLD" | "STORAGE" | "SERVICE" | "COMMON";
type StaffRole = "COOK" | "HELPER" | "BOTH";

type TemplateApi = {
  id: string;
  label: string;
  checklistType: ChecklistType;
  group: ChecklistGroup;
  zone: KitchenZone;
  role: StaffRole;
  dayOfWeek: number | null;
  sortOrder: number;
};

type GroupedTemplate = {
  id: string;
  label: string;
  checklistType: ChecklistType;
  group: ChecklistGroup;
  zone: KitchenZone;
  role: StaffRole;
  sortOrder: number;
  days: number[];
};

const DAY_LABELS = [
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
  "Vasárnap",
];

function translateType(type: ChecklistType) {
  return type === "OPENING" ? "Nyitás" : "Zárás";
}

function translateGroup(group: ChecklistGroup) {
  switch (group) {
    case "PREP":
      return "Előkészítés";
    case "CLEANING":
      return "Takarítás";
    case "ADMIN":
      return "Admin";
    default:
      return "Egyéb";
  }
}

function translateZone(zone: KitchenZone) {
  switch (zone) {
    case "HOT":
      return "Melegkonyha";
    case "COLD":
      return "Hideg előkészítő";
    case "STORAGE":
      return "Raktár / hűtők";
    case "SERVICE":
      return "Tálaló";
    default:
      return "Közös terület";
  }
}

function translateRole(role: StaffRole) {
  switch (role) {
    case "COOK":
      return "Szakács";
    case "HELPER":
      return "Kisegítő";
    default:
      return "Mindkettő";
  }
}

export default function ChecklistTemplatesPage() {
  // űrlap állapotok
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ChecklistType>("OPENING");
  const [group, setGroup] = useState<ChecklistGroup>("PREP");
  const [zone, setZone] = useState<KitchenZone>("HOT");
  const [role, setRole] = useState<StaffRole>("BOTH");
  const [order, setOrder] = useState(0);
  const [days, setDays] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);

  // betöltött sablonok (nyers lista, soronként 1 nap)
  const [templates, setTemplates] = useState<TemplateApi[]>([]);

  async function loadTemplates() {
    try {
      const res = await fetch("/api/haccp/checklist-templates");
      if (!res.ok) {
        throw new Error("Hiba a sablonok betöltésekor");
      }
      const data = await res.json();
      setTemplates(data.items || []);
    } catch (err) {
      console.error(err);
      toast.error("Nem sikerült betölteni a checklist sablonokat.");
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  // ugyanazt a pontot több napról összecsoportosítjuk
  const groupedTemplates: GroupedTemplate[] = useMemo(() => {
    const map = new Map<string, GroupedTemplate>();

    for (const t of templates) {
      const key = [
        t.label,
        t.checklistType,
        t.group,
        t.zone,
        t.role,
      ].join("|");

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: t.id,
          label: t.label,
          checklistType: t.checklistType,
          group: t.group,
          zone: t.zone,
          role: t.role,
          sortOrder: t.sortOrder ?? 0,
          days: typeof t.dayOfWeek === "number" ? [t.dayOfWeek] : [],
        });
      } else {
        if (typeof t.dayOfWeek === "number") {
          if (!existing.days.includes(t.dayOfWeek)) {
            existing.days.push(t.dayOfWeek);
          }
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
  }, [templates]);

  async function saveTemplate() {
    if (!label.trim()) {
      toast.error("A megnevezés kötelező.");
      return;
    }
    if (days.length === 0) {
      toast.error("Legalább egy napot válassz ki!");
      return;
    }

    try {
      const res = await fetch("/api/haccp/checklist-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          type,
          group,
          zone,
          role,
          days,
          sortOrder: order,
          isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Mentés hiba:", data);
        toast.error(
          data?.error ?? "Hiba történt a checklist pont mentésekor."
        );
        return;
      }

      toast.success("Checklist pont mentve.");
      setLabel("");
      setDays([]);
      setOrder(0);
      setIsActive(true);
      await loadTemplates();
    } catch (err) {
      console.error(err);
      toast.error("Hiba történt a mentés közben.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd ezt a checklist pontot?")) return;

    try {
      const res = await fetch(
        `/api/haccp/checklist-templates?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Törlés hiba:", data);
        toast.error(
          data?.error ?? "Nem sikerült törölni a checklist pontot."
        );
        return;
      }
      toast.success("Checklist pont törölve.");
      await loadTemplates();
    } catch (err) {
      console.error(err);
      toast.error("Hiba történt törlés közben.");
    }
  }

  const dayChecked = (d: number) => days.includes(d);

  const toggleDay = (d: number) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Checklist sablonok</h1>

      {/* ÚJ CHECKLIST PONT */}
      <div className="border rounded-lg p-4 mb-8 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Új checklist pont</h2>

        <div className="space-y-4">
          {/* Megnevezés */}
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Pl. Hűtők hőmérsékletének ellenőrzése"
            className="w-full p-2 border rounded"
          />

          {/* Sorok */}
          <div className="grid grid-cols-3 gap-4">
            {/* Checklist típusa */}
            <div>
              <label className="text-sm font-semibold">Checklist típusa</label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as ChecklistType)
                }
                className="w-full p-2 border rounded"
              >
                <option value="OPENING">Nyitás</option>
                <option value="CLOSING">Zárás</option>
              </select>
            </div>

            {/* Csoport */}
            <div>
              <label className="text-sm font-semibold">Csoport</label>
              <select
                value={group}
                onChange={(e) =>
                  setGroup(e.target.value as ChecklistGroup)
                }
                className="w-full p-2 border rounded"
              >
                <option value="PREP">Előkészítés</option>
                <option value="CLEANING">Takarítás</option>
                <option value="ADMIN">Admin</option>
                <option value="OTHER">Egyéb</option>
              </select>
            </div>

            {/* Zóna */}
            <div>
              <label className="text-sm font-semibold">Zóna</label>
              <select
                value={zone}
                onChange={(e) =>
                  setZone(e.target.value as KitchenZone)
                }
                className="w-full p-2 border rounded"
              >
                <option value="HOT">Melegkonyha</option>
                <option value="COLD">Hideg előkészítő</option>
                <option value="STORAGE">Raktár / hűtők</option>
                <option value="SERVICE">Tálaló</option>
                <option value="COMMON">Közös terület</option>
              </select>
            </div>
          </div>

          {/* Felelős + napok + sorrend */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold">Felelős szerep</label>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as StaffRole)
                }
                className="w-full p-2 border rounded"
              >
                <option value="COOK">Szakács</option>
                <option value="HELPER">Kisegítő</option>
                <option value="BOTH">Mindkettő</option>
              </select>
            </div>

            {/* Napok */}
            <div>
              <label className="text-sm font-semibold">Mely napokon?</label>
              <div className="grid grid-cols-2 gap-1 border rounded p-2">
                {DAY_LABELS.map((label, idx) => (
                  <label key={idx} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dayChecked(idx)}
                      onChange={() => toggleDay(idx)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Sorrend */}
            <div>
              <label className="text-sm font-semibold">Sorrend</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Aktív */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Aktív pont
          </label>

          <button
            onClick={saveTemplate}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
          >
            Checklist pont mentése
          </button>
        </div>
      </div>

      {/* MEGLÉVŐ SABLONOK */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Meglévő checklist pontok
          </h2>
          <button
            onClick={loadTemplates}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            Frissítés
          </button>
        </div>

        {groupedTemplates.length === 0 ? (
          <p className="text-gray-500">
            Még nincs checklist pont rögzítve.
          </p>
        ) : (
          <ul className="space-y-2">
            {groupedTemplates.map((t) => (
              <li
                key={t.id}
                className="p-2 border rounded bg-gray-50 flex justify-between items-center"
              >
                <div>
                  <strong>{t.label}</strong>
                  <div className="text-sm text-gray-600">
                    {translateType(t.checklistType)} ·{" "}
                    {translateGroup(t.group)} · {translateZone(t.zone)} ·{" "}
                    {translateRole(t.role)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Napok:{" "}
                    {t.days.length
                      ? t.days
                          .slice()
                          .sort()
                          .map((d) => DAY_LABELS[d])
                          .join(", ")
                      : "Nincs nap megadva"}
                  </div>
                  <div className="text-xs text-gray-400">
                    Aktív: igen · Sorrend: {t.sortOrder ?? 0}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="px-3 py-1 text-sm border rounded text-red-600 hover:bg-red-50"
                >
                  Törlés
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
