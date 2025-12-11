"use client";

import { useState } from "react";

type Props = {
  menuId: string;
};

type ApiResp =
  | { ok: true }
  | { ok: false; error: string; details?: unknown };

export function MenuAutopilotClient({ menuId }: Props) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAutopilot = async () => {
    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/menus/${encodeURIComponent(menuId)}/autopilot`,
        {
          method: "POST",
        }
      );

      const json = (await res.json()) as ApiResp;

      if (!json.ok) {
        throw new Error(json.error || "Ismeretlen hiba az Autopilot futtatásakor.");
      }

      setMessage("Autopilot Week elindítva. 😊 Nézd meg a Make scenariót!");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Ismeretlen hiba az Autopilot futtatásakor."
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      <button
        type="button"
        onClick={handleRunAutopilot}
        disabled={running}
        className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {running ? "Autopilot fut…" : "Autopilot Week indítása"}
      </button>

      {message && (
        <p className="text-[11px] text-emerald-600 mt-1">{message}</p>
      )}
      {error && (
        <p className="text-[11px] text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
