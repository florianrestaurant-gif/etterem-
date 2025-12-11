"use client";

import { useState } from "react";

type Props = {
  menuId: string;
  initialStatus: string;
};

export function MenuStatusToggleClient({ menuId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPublished = status === "published";

  async function handleToggle() {
    try {
      setLoading(true);
      setError(null);

      const nextStatus = isPublished ? "draft" : "published";

      const res = await fetch(`/api/menus/${menuId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Hiba státusz váltáskor");
      }

      setStatus(json.data.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="text-xs px-3 py-1 rounded-full border border-neutral-300 hover:bg-neutral-100 disabled:opacity-60"
      >
        {loading
          ? "Mentés…"
          : isPublished
          ? "Visszavonás (draft)"
          : "Publikálás"}
      </button>
      {error && (
        <span className="text-[10px] text-red-600 max-w-[160px] text-right">
          {error}
        </span>
      )}
    </div>
  );
}
