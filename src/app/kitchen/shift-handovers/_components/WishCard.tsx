// src/app/kitchen/shift-handovers/_components/WishCard.tsx
"use client";

import { useState } from "react";

type ShiftWishStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

const STATUS_LABELS: Record<ShiftWishStatus, string> = {
  OPEN: "Nyitott",
  IN_PROGRESS: "Folyamatban",
  DONE: "Kész",
  CANCELLED: "Törölve",
};

type Props = {
  id: string;
  title: string;
  description: string | null;
  status: ShiftWishStatus;
  createdAt: string;
  createdByEmail: string | null;
};

export function WishCard({
  id,
  title,
  description,
  status,
  createdAt,
  createdByEmail,
}: Props) {
  const [currentStatus, setCurrentStatus] = useState<ShiftWishStatus>(status);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function toggleDone() {
    const newStatus: ShiftWishStatus =
      currentStatus === "DONE" ? "OPEN" : "DONE";

    // optimista update
    setCurrentStatus(newStatus);
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/kitchen/shift-wishes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setCurrentStatus(status);
        setErrorMsg(data.error ?? "Nem sikerült frissíteni a státuszt.");
      }
    } catch (err) {
      console.error("WishCard toggle error", err);
      setCurrentStatus(status);
      setErrorMsg("Hálózati hiba miatt nem sikerült frissíteni.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border rounded-lg px-3 py-2 bg-gray-50 flex flex-col gap-1">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={currentStatus === "DONE"}
            onChange={toggleDone}
            disabled={saving}
          />
          <div className="font-medium text-xs sm:text-sm">{title}</div>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border text-gray-700">
          {STATUS_LABELS[currentStatus]}
        </span>
      </div>

      {description && (
        <div className="text-xs text-gray-700 whitespace-pre-line">
          {description}
        </div>
      )}

      <div className="text-[11px] text-gray-400 flex justify-between">
        <span>
          Rögzítve:{" "}
          {new Intl.DateTimeFormat("hu-SK", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(createdAt))}
        </span>
        {createdByEmail && <span>{createdByEmail}</span>}
      </div>

      {errorMsg && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 mt-1">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
