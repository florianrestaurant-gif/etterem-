// src/app/kitchen/tasks/_components/TaskBoard.tsx
"use client";

import { useState } from "react";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string | null;
  createdAt: string;
};

type Props = {
  shiftId: string;
  initialTasks: TaskItem[];
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Teendő",
  IN_PROGRESS: "Folyamatban",
  DONE: "Kész",
  CANCELLED: "Törölve",
};

export function TaskBoard({ shiftId, initialTasks }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [form, setForm] = useState<{ title: string; description: string }>({
    title: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleChange<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg("Adj meg egy feladatcímet.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/kitchen/shift-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        task?: {
          id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          dueAt: string | null;
          createdAt: string;
        };
      };

      if (!res.ok || !data.ok || !data.task) {
        setErrorMsg(data.error ?? "Nem sikerült menteni a feladatot.");
        setIsSaving(false);
        return;
      }

      const newTask: TaskItem = {
        id: data.task.id,
        title: data.task.title,
        description: data.task.description,
        status: data.task.status,
        dueAt: data.task.dueAt,
        createdAt: data.task.createdAt,
      };

      setTasks((prev) => [...prev, newTask]);
      setForm({ title: "", description: "" });
      setIsSaving(false);
    } catch (err) {
      console.error("TaskBoard submit error", err);
      setErrorMsg("Hálózati hiba miatt nem sikerült menteni.");
      setIsSaving(false);
    }
  }

  async function toggleDone(task: TaskItem) {
    const newStatus: TaskStatus =
      task.status === "DONE" ? "PENDING" : "DONE";

    // optimista update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: newStatus,
            }
          : t
      )
    );

    try {
      const res = await fetch("/api/kitchen/shift-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });

      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        // visszaállítjuk, ha hiba
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: task.status,
                }
              : t
          )
        );
        setErrorMsg(data.error ?? "Nem sikerült frissíteni a státuszt.");
      }
    } catch (err) {
      console.error("toggleDone error", err);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: task.status,
              }
            : t
        )
      );
      setErrorMsg("Hálózati hiba miatt nem sikerült frissíteni a státuszt.");
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start"
      >
        <div className="space-y-1 md:col-span-1">
          <label className="block text-xs font-medium text-gray-700">
            Feladat címe
          </label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder="Pl. Desszertek előkészítése"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-gray-700">
            Részletek / megjegyzés
          </label>
          <textarea
            className="w-full rounded-md border px-2 py-1.5 text-sm min-h-[70px]"
            placeholder="Pl. 20 adag mousse, 10 adag tiramisu pohárba rétegezve."
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>

        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-black text-white disabled:opacity-60"
          >
            {isSaving ? "Mentés..." : "Feladat hozzáadása"}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
          {errorMsg}
        </div>
      )}

      <div className="border-t pt-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500">
            Még nincs feladat ehhez a műszakhoz.
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="border rounded-lg px-3 py-2 bg-gray-50 flex flex-col gap-1"
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={t.status === "DONE"}
                      onChange={() => toggleDone(t)}
                    />
                    <div className="font-medium text-sm">{t.title}</div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border text-gray-700">
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
                {t.description && (
                  <div className="text-xs text-gray-700 whitespace-pre-line">
                    {t.description}
                  </div>
                )}
                <div className="text-[11px] text-gray-400">
                  Rögzítve:{" "}
                  {new Intl.DateTimeFormat("hu-SK", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(t.createdAt))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
