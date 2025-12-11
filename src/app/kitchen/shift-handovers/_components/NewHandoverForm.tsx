// src/app/kitchen/shift-handovers/_components/NewHandoverForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// kliens oldalon ne importáljunk a Prisma-ból
type ShiftType = "MORNING" | "AFTERNOON" | "EVENING" | "OTHER";
type WeekType = "SHORT" | "LONG";
type PrepStatusClient = "OK" | "LOW" | "OUT" | "DISCARD";

type FormState = {
  date: string;
  shiftType: ShiftType;
  miseEnPlace: string;
  tasksSummary: string;
  warnings: string;
  cleanliness: string;
  nextShiftExpectations: string;
  chefNote: string;
};

type MenuPrepRow = {
  code: "MENU1" | "MENU2" | "MENU3" | "MENU4" | "MENU5" | "SOUP" | "DESSERT";
  label: string;
  status: PrepStatusClient;
  note: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
};

type HandoverRequestPayload = FormState & {
  prepForDate: string | null;
  weekType: WeekType;
  menus: MenuPrepRow[];
  alaCartePrep: string;
  specialsPrep: string;
};

const SHIFT_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: "MORNING", label: "Délelőtt" },
  { value: "AFTERNOON", label: "Délután" },
  { value: "EVENING", label: "Este" },
  { value: "OTHER", label: "Egyéb" },
];

const PREP_STATUS_OPTIONS: { value: PrepStatusClient; label: string }[] = [
  { value: "OK", label: "OK" },
  { value: "LOW", label: "Kevés" },
  { value: "OUT", label: "Nincs / nincs kész" },
  { value: "DISCARD", label: "Kidobandó" },
];

export function NewHandoverForm() {
  const router = useRouter();
  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10);

  // alap: ma töltik, holnapra készítik a menüt
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultPrepForDate = tomorrow.toISOString().slice(0, 10);

  const [form, setForm] = useState<FormState>({
    date: defaultDate,
    shiftType: "EVENING",
    miseEnPlace: "", // ezt mostantól a backend generálja
    tasksSummary: "",
    warnings: "",
    cleanliness: "",
    nextShiftExpectations: "",
    chefNote: "",
  });

  const [weekType, setWeekType] = useState<WeekType>("SHORT");
  const [prepForDate, setPrepForDate] = useState<string>(defaultPrepForDate);

  const [menus, setMenus] = useState<MenuPrepRow[]>([
    { code: "MENU1", label: "Menü 1", status: "OK", note: "" },
    { code: "MENU2", label: "Menü 2", status: "OK", note: "" },
    { code: "MENU3", label: "Menü 3", status: "OK", note: "" },
    { code: "MENU4", label: "Menü 4", status: "OK", note: "" },
    { code: "MENU5", label: "Menü 5", status: "OK", note: "" },
    { code: "SOUP", label: "Leves", status: "OK", note: "" },
    { code: "DESSERT", label: "Desszert", status: "OK", note: "" },
  ]);

  const [alaCartePrep, setAlaCartePrep] = useState("");
  const [specialsPrep, setSpecialsPrep] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleChange<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateMenu(
    code: MenuPrepRow["code"],
    patch: Partial<Omit<MenuPrepRow, "code" | "label">>,
  ) {
    setMenus((prev) =>
      prev.map((m) => (m.code === code ? { ...m, ...patch } : m)),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Heti rendszer + dátum beégetése az elvárások elejére
    const weekLabel =
      weekType === "SHORT"
        ? "RÖVID HÉT (Csütörtök–Péntek)"
        : "HOSSZÚ HÉT (Hétfő–Szerda + Szombat–Vasárnap)";

    const trimmedExpectations = form.nextShiftExpectations.trim();
    const nextShiftExpectations =
      `Heti rendszer: ${weekLabel}\n` +
      `Előkészítés dátuma (menük): ${
        prepForDate || "nincs megadva"
      }\n\n${trimmedExpectations}`;

    const payload: HandoverRequestPayload = {
      ...form,
      miseEnPlace: "", // a backend tölti ki automatikusan
      nextShiftExpectations,
      prepForDate: prepForDate || null,
      weekType,
      menus,
      alaCartePrep,
      specialsPrep,
    };

    try {
      const res = await fetch("/api/kitchen/shift-handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: ApiResponse | null = null;
      try {
        data = (await res.json()) as ApiResponse;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        const message =
          data?.error ??
          `Hiba történt a mentés során. (HTTP ${res.status.toString()})`;
        setErrorMsg(message);
        setIsSubmitting(false);
        return;
      }

      // ürítjük a szöveges mezőket, dátum + műszaktípus maradhat
      setForm((prev) => ({
        ...prev,
        miseEnPlace: "",
        tasksSummary: "",
        warnings: "",
        cleanliness: "",
        nextShiftExpectations: "",
        chefNote: "",
      }));
      setMenus((prev) =>
        prev.map((m) => ({ ...m, status: "OK", note: "" })),
      );
      setAlaCartePrep("");
      setSpecialsPrep("");

      router.refresh();
      setIsSubmitting(false);
    } catch (error) {
      console.error("NewHandoverForm submit error", error);
      setErrorMsg("Nem sikerült menteni a műszakátadást.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      {/* Műszak dátum + típus + gyors megjegyzés */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Műszak dátuma
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Műszak típusa
          </label>
          <select
            value={form.shiftType}
            onChange={(e) =>
              handleChange("shiftType", e.target.value as ShiftType)
            }
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            required
          >
            {SHIFT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Gyors megjegyzés (opcionális)
          </label>
          <input
            type="text"
            placeholder="Pl. sok foglalás 19:00-ra, több köret kell..."
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            value={form.chefNote}
            onChange={(e) => handleChange("chefNote", e.target.value)}
          />
        </div>
      </div>

      {/* Heti rendszer + menük dátuma */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 border rounded-xl p-3 bg-gray-50/80 space-y-2">
          <div>
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Heti beosztás (2 szakács váltás)
            </div>
            <p className="text-xs text-gray-500">
              Rövid hét: Csütörtök–Péntek. Hosszú hét: Hétfő–Szerda + Szombat–
              Vasárnap. Csak azt jelöld, kinek adsz át.
            </p>
          </div>

          <div className="mt-2 flex flex-col sm:flex-row gap-3">
            <label className="flex-1 inline-flex items-start gap-2 rounded-lg border bg-white px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                className="mt-0.5"
                name="weekType"
                value="SHORT"
                checked={weekType === "SHORT"}
                onChange={() => setWeekType("SHORT")}
              />
              <div>
                <div className="text-xs font-semibold text-gray-800">
                  Rövid hét szakácsa
                </div>
                <div className="text-[11px] text-gray-500">
                  Csütörtök–Péntek – erre készül a mise en place.
                </div>
              </div>
            </label>

            <label className="flex-1 inline-flex items-start gap-2 rounded-lg border bg-white px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                className="mt-0.5"
                name="weekType"
                value="LONG"
                checked={weekType === "LONG"}
                onChange={() => setWeekType("LONG")}
              />
              <div>
                <div className="text-xs font-semibold text-gray-800">
                  Hosszú hét szakácsa
                </div>
                <div className="text-[11px] text-gray-500">
                  Hétfő–Szerda + Szombat–Vasárnap – teljes hétvégi felelősség.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Milyen napra készültek a menük?
          </label>
          <input
            type="date"
            value={prepForDate}
            onChange={(e) => setPrepForDate(e.target.value)}
            className="w-full rounded-md border px-2 py-1.5 text-sm"
          />
          <p className="text-[11px] text-gray-500">
            Ez az a nap, amikor a vendégeknek tálaljátok a menüt (pl. holnap).
          </p>
        </div>
      </div>

      {/* Menük – rövid, tag-szerű szövegek + státusz */}
      <div className="border rounded-xl p-3 sm:p-4 bg-white space-y-3">
        <div>
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Menükre való előkészítések
          </div>
          <p className="text-xs text-gray-500">
            Csak pár szó legyen: pl. &quot;hús előkészítve&quot;, &quot;köret
            kész&quot;, &quot;mártás kész&quot;, &quot;nincs semmi&quot;.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {menus.map((m) => (
            <div
              key={m.code}
              className="flex flex-col gap-1 rounded-lg border px-2 py-2 bg-gray-50/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700">
                  {m.label}
                </span>
                <select
                  className="border rounded-md px-1.5 py-0.5 text-[11px]"
                  value={m.status}
                  onChange={(e) =>
                    updateMenu(
                      m.code,
                      { status: e.target.value as PrepStatusClient },
                    )
                  }
                >
                  {PREP_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className="w-full rounded-md border px-2 py-1 text-xs"
                maxLength={60}
                placeholder="Pl. hús előkészítve / köret kész / semmi"
                value={m.note}
                onChange={(e) => updateMenu(m.code, { note: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Á la carte előkészítések */}
      <div className="border rounded-xl p-3 sm:p-4 bg-white space-y-2">
        <div>
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Á la carte előkészítések
          </div>
          <p className="text-xs text-gray-500">
            Röviden: melyik á la carte vonal áll készen (pl. steak garnírung
            kész, halak előkészítve, saláta mise en place…).
          </p>
        </div>

        <textarea
          className="w-full rounded-md border px-2 py-1.5 text-sm min-h-[70px]"
          value={alaCartePrep}
          onChange={(e) => setAlaCartePrep(e.target.value)}
          placeholder="Pl. steak köretek kész, halak előkészítve, saláta alapok előkészítve..."
        />
      </div>

      {/* Akciók / speciálok */}
      <div className="border rounded-xl p-3 sm:p-4 bg-white space-y-2">
        <div>
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Akciók / speciálok előkészítése
          </div>
          <p className="text-xs text-gray-500">
            Napi/heti ajánlat – pl. burger pogácsa formázva, pulled pork kész,
            desszert akcióhoz alapok.
          </p>
        </div>

        <textarea
          className="w-full rounded-md border px-2 py-1.5 text-sm min-h-[70px]"
          value={specialsPrep}
          onChange={(e) => setSpecialsPrep(e.target.value)}
          placeholder="Pl. burger pogácsa 30 db, pulled pork 5 kg, akciós desszert alap kész..."
        />
      </div>

      {/* Részletes jegyzetek – külön blokkban */}
      <details className="border rounded-xl bg-white">
        <summary className="px-3 py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
          Részletes jegyzetek (opcionális)
        </summary>
        <div className="p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextAreaField
              label="Feladatok – mi készült el / mi maradt hátra"
              placeholder={`Pl.:
• Húsok bepácolva (kész)
• Zöldségek előkészítése (hiányzik a répa)
• Desszert díszítés 50%-ban kész`}
              value={form.tasksSummary}
              onChange={(v) => handleChange("tasksSummary", v)}
            />
            <TextAreaField
              label="Figyelmeztetések / problémák"
              placeholder={`Pl.:
• Kevés bélszín – rendelni kell
• Mosogatógép néha megáll
• Egy GN zöldség kérdéses minőségű, ellenőrizni`}
              value={form.warnings}
              onChange={(v) => handleChange("warnings", v)}
            />
            <TextAreaField
              label="Tisztaság, állapot (zónánként)"
              placeholder={`Pl.:
• Melegkonyha: rendben
• Mosogató: leterhelt, extra segítség kell holnap
• Raktár: sok üres doboz – kidobni`}
              value={form.cleanliness}
              onChange={(v) => handleChange("cleanliness", v)}
            />
            <TextAreaField
              label="Elvárások a következő műszak felé"
              placeholder={`Pl.:
• Kérlek, húzzátok újra a barna mártást
• Több köretet készítsetek 18:00-ra
• Figyeljetek a hal frissességére`}
              value={form.nextShiftExpectations}
              onChange={(v) => handleChange("nextShiftExpectations", v)}
            />
          </div>
        </div>
      </details>

      {errorMsg && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
          {errorMsg}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-black text-white disabled:opacity-60"
        >
          {isSubmitting ? "Mentés..." : "Műszakátadás mentése"}
        </button>
      </div>
    </form>
  );
}

type TextAreaFieldProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

function TextAreaField({
  label,
  placeholder,
  value,
  onChange,
}: TextAreaFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700">
        {label}
      </label>
      <textarea
        className="w-full rounded-md border px-2 py-1.5 text-sm min-h-[90px]"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
