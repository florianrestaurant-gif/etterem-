"use client";

import { useState } from "react";

type Props = {
  menuId: string;
};

type ApiSocialPostResp =
  | { ok: true; text: string }
  | { ok: false; error: string };

type ApiFbPostResp =
  | { ok: true; data: unknown }
  | { ok: false; error: string; details?: unknown };

export function MenuSocialPostClient({ menuId }: Props) {
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [lastText, setLastText] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1) Poszt szövegének lekérése + vágólapra másolása
  const handleGenerateText = async () => {
    setGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/menus/${encodeURIComponent(menuId)}/social-post`,
        {
          method: "GET",
        }
      );

      const json = (await res.json()) as ApiSocialPostResp;

      if (!json.ok) {
        throw new Error(json.error || "Ismeretlen hiba a szöveg generálásakor.");
      }

      setLastText(json.text);

      // vágólapra másolás – ha a böngésző engedi
      try {
        await navigator.clipboard.writeText(json.text);
        setMessage("A poszt szövege vágólapra másolva. 😊");
      } catch {
        setMessage(
          "A szöveg elkészült. Ha nem másolódott vágólapra, jelöld ki és másold kézzel."
        );
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Ismeretlen hiba a szöveg generálásakor."
      );
    } finally {
      setGenerating(false);
    }
  };

  // 2) Közvetlen poszt Facebookra
  const handlePostToFacebook = async () => {
    setPosting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/menus/${encodeURIComponent(menuId)}/post-facebook`,
        {
          method: "POST",
        }
      );

      const json = (await res.json()) as ApiFbPostResp;

      if (!json.ok) {
        console.error("FB POST ERROR details:", json.details);
        throw new Error(json.error || "Ismeretlen hiba a Facebook posztoláskor.");
      }

      setMessage("Sikeresen elküldtük a posztot a Facebook oldalra. 🎉");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Ismeretlen hiba a Facebook posztoláskor."
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGenerateText}
          disabled={generating}
          className="px-2 py-1 border rounded hover:bg-neutral-100 disabled:opacity-60"
        >
          {generating ? "Szöveg készül…" : "Poszt szövegének másolása"}
        </button>

        <button
          type="button"
          onClick={handlePostToFacebook}
          disabled={posting}
          className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {posting ? "Posztolás…" : "Poszt Facebookra"}
        </button>
      </div>

      {message && (
        <p className="text-[11px] text-emerald-600 mt-1">{message}</p>
      )}

      {error && (
        <p className="text-[11px] text-red-600 mt-1">{error}</p>
      )}

      {lastText && (
        <details className="mt-1 w-full text-[11px] text-neutral-500">
          <summary className="cursor-pointer">Legutóbb generált szöveg</summary>
          <pre className="whitespace-pre-wrap mt-1 border rounded p-2 bg-neutral-50">
            {lastText}
          </pre>
        </details>
      )}
    </div>
  );
}
