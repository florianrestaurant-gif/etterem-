'use client'

import { useEffect, useState, useRef } from 'react'

type GoodsReceipt = {
  id: string
  date: string
  supplier: string
  productName: string
  quantity: number | null
  unit: string | null
  batchNumber: string | null
  expiryDate: string | null
  deliveryTemp: number | null
  tempOk: boolean | null
  packagingOk: boolean | null
  appearanceOk: boolean | null
  documentsOk: boolean | null
  rejected: boolean
  correctiveAction: string | null
  note: string | null
  documentUrl: string | null
  createdAt: string
}

type GetResponse = {
  date: string
  receipts: GoodsReceipt[]
}

// AI által felismert tétel
type AiItem = {
  supplier: string
  productName: string
  quantity: number | null
  unit: string | null
  batchNumber: string | null
  expiryDate: string | null
  deliveryTemp: number | null
}

// Segédfüggvény: mai dátum YYYY-MM-DD
function getTodayISODate() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function GoodsReceiptsPage() {
  const [date, setDate] = useState<string>(getTodayISODate())
  const [loadingList, setLoadingList] = useState(false)
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)

  // MANUÁLIS ŰRLAP STATE
  const [supplier, setSupplier] = useState('')
  const [productName, setProductName] = useState('')
  const [quantity, setQuantity] = useState<string>('')
  const [unit, setUnit] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [deliveryTemp, setDeliveryTemp] = useState<string>('')

  const [tempOk, setTempOk] = useState<boolean>(true)
  const [packagingOk, setPackagingOk] = useState<boolean>(true)
  const [appearanceOk, setAppearanceOk] = useState<boolean>(true)
  const [documentsOk, setDocumentsOk] = useState<boolean>(true)
  const [rejected, setRejected] = useState<boolean>(false)

  const [correctiveAction, setCorrectiveAction] = useState('')
  const [note, setNote] = useState('')

  // 📸 manuális fotó – CSAK TÁROLÁSRA, AI NÉLKÜL
  const [manualDocument, setManualDocument] = useState<File | null>(null)

  // 🤖 AI BLOKK STATE – TELJESEN KÜLÖN
  const [aiFiles, setAiFiles] = useState<File[]>([]) // több kép
  const [aiItems, setAiItems] = useState<AiItem[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const aiFileInputRef = useRef<HTMLInputElement | null>(null)

  // AI-tételek frissítése (soron belüli szerkesztéshez)
  const updateAiItem = (index: number, patch: Partial<AiItem>) => {
    setAiItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    )
  }

  // Lista betöltése
  const loadReceipts = async (targetDate: string) => {
    try {
      setLoadingList(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('date', targetDate)

      const res = await fetch(`/api/haccp/goods-receipts?${params.toString()}`)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 401) {
          throw new Error('Be kell jelentkezned az áruátvételi napló használatához.')
        }
        throw new Error(
          data.error || 'Nem sikerült betölteni az áruátvételi bejegyzéseket.',
        )
      }

      const data: GetResponse = await res.json()
      setReceipts(data.receipts)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Ismeretlen hiba történt a lista betöltésekor.')
    } finally {
      setLoadingList(false)
    }
  }

  // első betöltés + dátumváltás
  useEffect(() => {
    void loadReceipts(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const resetManualForm = () => {
    setSupplier('')
    setProductName('')
    setQuantity('')
    setUnit('')
    setBatchNumber('')
    setExpiryDate('')
    setDeliveryTemp('')
    setTempOk(true)
    setPackagingOk(true)
    setAppearanceOk(true)
    setDocumentsOk(true)
    setRejected(false)
    setCorrectiveAction('')
    setNote('')
    setManualDocument(null)
  }

  // MANUÁLIS MENTÉS – AI NÉLKÜL
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!date) {
      setError('A dátum kötelező.')
      return
    }
    if (!supplier.trim()) {
      setError('A szállító neve kötelező.')
      return
    }
    if (!productName.trim()) {
      setError('A terméknév kötelező.')
      return
    }

    const parsedQuantity =
      quantity.trim() === '' ? null : Number.parseFloat(quantity.replace(',', '.'))
    if (quantity.trim() !== '' && Number.isNaN(parsedQuantity)) {
      setError('A mennyiségnek számnak kell lennie.')
      return
    }

    const parsedTemp =
      deliveryTemp.trim() === ''
        ? null
        : Number.parseFloat(deliveryTemp.replace(',', '.'))
    if (deliveryTemp.trim() !== '' && Number.isNaN(parsedTemp)) {
      setError('A hőmérsékletnek számnak kell lennie.')
      return
    }

    try {
      setSubmitting(true)

      const formData = new FormData()
      formData.set('date', date)
      formData.set('supplier', supplier.trim())
      formData.set('productName', productName.trim())
      formData.set('quantity', quantity.trim())
      formData.set('unit', unit.trim())
      formData.set('batchNumber', batchNumber.trim())
      formData.set('expiryDate', expiryDate)
      formData.set('deliveryTemp', deliveryTemp.trim())

      if (tempOk) formData.set('tempOk', 'on')
      if (packagingOk) formData.set('packagingOk', 'on')
      if (appearanceOk) formData.set('appearanceOk', 'on')
      if (documentsOk) formData.set('documentsOk', 'on')
      if (rejected) formData.set('rejected', 'on')

      formData.set('correctiveAction', correctiveAction.trim())
      formData.set('note', note.trim())

      // 📸 manuális fotó – csak sima tárolásra, AI NÉLKÜL
      if (manualDocument) {
        formData.set('document', manualDocument)
      }

      const res = await fetch('/api/haccp/goods-receipts', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 401) {
          throw new Error('Be kell jelentkezned az áruátvételi napló használatához.')
        }
        throw new Error(data.error || data.message || 'Nem sikerült menteni az áruátvételt.')
      }

      await res.json()

      setSuccessMessage('Áruátvétel (MANUÁLIS) sikeresen rögzítve.')
      resetManualForm()
      await loadReceipts(date)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Ismeretlen hiba történt mentés közben.')
    } finally {
      setSubmitting(false)
    }
  }

  // 🤖 1) KÉPEK FELTÖLTÉSE ÉS AI FELDOLGOZÁS (TÖBB KÉP IS)
  const handleAiProcess = async () => {
    setError(null)
    setSuccessMessage(null)
    if (!aiFiles.length) {
      setError('Válaszd ki a dodací list fotó(ka)t az AI feldolgozásához.')
      return
    }

    try {
      setAiLoading(true)
      setAiItems([])

      const allItems: AiItem[] = []

      // több képet egymás után dolgozunk fel
      for (const file of aiFiles) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('date', date)

        const res = await fetch('/api/haccp/goods-receipts/ai-upload', {
          method: 'POST',
          body: fd,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Nem sikerült az AI feldolgozás.')
        }

        const data = await res.json()
        if (Array.isArray(data.items)) {
          allItems.push(...data.items)
        }
      }

      setAiItems(allItems)
      setSuccessMessage('AI feldolgozás kész, a tételek lent láthatók.')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Ismeretlen hiba történt az AI feldolgozás közben.')
    } finally {
      setAiLoading(false)
    }
  }

  // 🤖 2) EGY AI-SOR RÖGZÍTÉSE AZ ADATBÁZISBA (manuális űrlap nélkül)
  const handleSaveAiItem = async (item: AiItem, index: number) => {
    setError(null)
    setSuccessMessage(null)

    if (!date) {
      setError('A dátum kötelező (fent a dátumválasztónál).')
      return
    }

    try {
      setSubmitting(true)

      const fd = new FormData()
      fd.set('date', date)
      fd.set('supplier', item.supplier || '')
      fd.set('productName', item.productName || '')
      fd.set('quantity', item.quantity != null ? String(item.quantity) : '')
      fd.set('unit', item.unit || '')
      fd.set('batchNumber', item.batchNumber || '')
      fd.set('expiryDate', item.expiryDate || '')
      fd.set(
        'deliveryTemp',
        item.deliveryTemp != null ? String(item.deliveryTemp) : '',
      )

      // AI által felismert tételnél alapból minden ellenőrzőpontot OK-ra tesszük
      fd.set('tempOk', 'on')
      fd.set('packagingOk', 'on')
      fd.set('appearanceOk', 'on')
      fd.set('documentsOk', 'on')
      // rejected-et nem tesszük be → false

      const res = await fetch('/api/haccp/goods-receipts', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || data.message || 'Nem sikerült menteni az AI tételt.')
      }

      await res.json()
      setSuccessMessage('AI által felismert tétel sikeresen rögzítve.')

      // ✅ töröljük az adott AI sort a lila táblázatból
      setAiItems((prev) => prev.filter((_, i) => i !== index))

      await loadReceipts(date)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Ismeretlen hiba történt az AI tétel mentésekor.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Áruátvételi napló</h1>
        <p className="text-sm text-gray-600">
          A bejegyzések automatikusan a bejelentkezett felhasználó étterméhez mentődnek.
        </p>
      </header>

      {/* Dátum választó */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-medium">Dátum kiválasztása</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Dátum</label>
            <input
              type="date"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setDate(getTodayISODate())}
            className="mt-5 text-xs rounded-md border border-gray-300 px-3 py-1 text-gray-700"
          >
            Ma
          </button>
        </div>
      </section>

      {/* Hiba / siker üzenetek */}
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

      {/* MANUÁLIS ŰRLAP – AI NÉLKÜL */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-lg font-medium">Új áruátvétel rögzítése (manuális)</h2>

        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Szállító</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Terméknév</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Mennyiség</label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="pl. 20"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Mértékegység</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="kg, l, db..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Tétel / LOT szám</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Minőségmegőrzési / lejárati dátum</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Szállítási hőmérséklet (°C)</label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="pl. 3.5"
                value={deliveryTemp}
                onChange={(e) => setDeliveryTemp(e.target.value)}
              />
            </div>

            {/* 📸 manuális fotó – AI nélkül */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Számla / szállítólevél fotó (opcionális, AI nélkül)
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setManualDocument(f)
                }}
              />
              <p className="text-xs text-gray-500">
                Itt csak eltároljuk a fotót az áruátvételi bejegyzéshez, az AI nem dolgozza fel.
              </p>
            </div>
          </div>

          {/* Ellenőrző checkboxok */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Ellenőrzőpontok</label>
              <div className="flex flex-col gap-1 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tempOk}
                    onChange={(e) => setTempOk(e.target.checked)}
                  />
                  <span>Hőmérséklet megfelelő</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={packagingOk}
                    onChange={(e) => setPackagingOk(e.target.checked)}
                  />
                  <span>Csomagolás sértetlen</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appearanceOk}
                    onChange={(e) => setAppearanceOk(e.target.checked)}
                  />
                  <span>Megjelenés/szag/állag rendben</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={documentsOk}
                    onChange={(e) => setDocumentsOk(e.target.checked)}
                  />
                  <span>Dokumentumok rendben (számla, bizonylat)</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Elutasítás / intézkedés</label>
              <label className="inline-flex items-center gap-2 text-sm mb-1">
                <input
                  type="checkbox"
                  checked={rejected}
                  onChange={(e) => setRejected(e.target.checked)}
                />
                <span>Áru elutasítva</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[60px]"
                placeholder="Intézkedés (pl. szállító értesítve, áru visszaküldve...)"
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Megjegyzés</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[60px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Mentés…' : 'Áruátvétel mentése (manuális)'}
          </button>
        </form>
      </section>

      {/* 🤖 AI BLOKK – TELJESEN FÜGGETLEN A MANUÁLIS ŰRLAPTÓL */}
      <section className="rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">AI által felismert tételek (dodací list fotó)</h2>
        </div>

        {/* Fájlfeltöltés AI-hoz – SAJÁT GOMB + TÖBB KÉP */}
        <div className="space-y-2">
          {/* rejtett input, amit a gomb aktivál */}
          <input
            ref={aiFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              setAiFiles(files)
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Fotó hozzáadása:</span>
            <button
              type="button"
              onClick={() => aiFileInputRef.current?.click()}
              className="inline-flex items-center rounded-lg border border-purple-400 bg-white px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-100"
            >
              Kép(ek) kiválasztása
            </button>
            {aiFiles.length > 0 && (
              <span className="text-xs text-purple-800">
                {aiFiles.length} fotó kiválasztva
              </span>
            )}
          </div>

          <p className="text-xs text-purple-800">
            Több oldalas szállítólevél esetén nyugodtan jelöld ki az összes fotót egyszerre.
            Először csak az AI-t használd (fent a manuális űrlapot ilyenkor nem kell).
          </p>

          <button
            type="button"
            onClick={handleAiProcess}
            disabled={aiLoading || !aiFiles.length}
            className="mt-1 inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {aiLoading ? 'Feldolgozás…' : 'Feldolgozás indítása (AI)'}
          </button>
        </div>

        {/* AI által felismert sorok */}
        {aiItems.length === 0 ? (
          <p className="text-sm text-purple-800">
            Még nincs AI által felismert tétel. Tölts fel dodací list fotó(ka)t, majd indítsd el a
            feldolgozást.
          </p>
        ) : (
          <div className="max-h-72 overflow-auto text-sm bg-white rounded-lg border border-purple-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
                  <th className="px-2 py-1 text-left">Szállító</th>
                  <th className="px-2 py-1 text-left">Termék</th>
                  <th className="px-2 py-1 text-right">Mennyiség</th>
                  <th className="px-2 py-1 text-left">LOT</th>
                  <th className="px-2 py-1 text-left">Lejárat</th>
                  <th className="px-2 py-1 text-right">T (°C)</th>
                  <th className="px-2 py-1 text-center">Rögzítés</th>
                </tr>
              </thead>
              <tbody>
                {aiItems.map((item, index) => {
                  const qtyStr =
                    item.quantity != null
                      ? `${item.quantity} ${item.unit ?? ''}`.trim()
                      : ''

                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-2 py-1">{item.supplier}</td>
                      <td className="px-2 py-1">{item.productName}</td>
                      <td className="px-2 py-1 text-right">{qtyStr}</td>

                      {/* LOT - szerkeszthető */}
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          className="w-full rounded border border-purple-200 px-1 py-0.5 text-xs"
                          value={item.batchNumber ?? ''}
                          onChange={(e) =>
                            updateAiItem(index, { batchNumber: e.target.value })
                          }
                        />
                      </td>

                      {/* Lejárat - szerkeszthető dátum */}
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          className="w-full rounded border border-purple-200 px-1 py-0.5 text-xs"
                          value={item.expiryDate ?? ''}
                          onChange={(e) =>
                            updateAiItem(index, { expiryDate: e.target.value })
                          }
                        />
                      </td>

                      {/* T (°C) - szerkeszthető */}
                      <td className="px-2 py-1 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-20 rounded border border-purple-200 px-1 py-0.5 text-xs text-right"
                          value={
                            item.deliveryTemp != null
                              ? String(item.deliveryTemp)
                              : ''
                          }
                          onChange={(e) => {
                            const raw = e.target.value.trim()
                            if (raw === '') {
                              updateAiItem(index, { deliveryTemp: null })
                            } else {
                              const num = Number.parseFloat(
                                raw.replace(',', '.'),
                              )
                              updateAiItem(index, {
                                deliveryTemp: Number.isNaN(num) ? null : num,
                              })
                            }
                          }}
                        />
                      </td>

                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleSaveAiItem(item, index)}
                          disabled={submitting}
                          className="text-xs rounded-md border border-purple-400 px-2 py-1 text-purple-700 hover:bg-purple-100 disabled:opacity-60"
                        >
                          Rögzítés
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Lista */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify_between gap-2">
          <h2 className="text-lg font-medium">Áruátvételek – {date}</h2>
          <button
            type="button"
            onClick={() => void loadReceipts(date)}
            disabled={loadingList}
            className="text-xs rounded-md border border-gray-300 px-2 py-1 text-gray-700 disabled:opacity-60"
          >
            {loadingList ? 'Frissítés…' : 'Frissítés'}
          </button>
        </div>

        {loadingList ? (
          <p className="text-sm text-gray-500">Bejegyzések betöltése…</p>
        ) : receipts.length === 0 ? (
          <p className="text-sm text-gray-500">
            Erre a napra még nincs áruátvétel rögzítve.
          </p>
        ) : (
          <div className="max-h-80 overflow-auto text-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
                  <th className="px-2 py-1 text-left">Időpont</th>
                  <th className="px-2 py-1 text-left">Szállító</th>
                  <th className="px-2 py-1 text-left">Termék</th>
                  <th className="px-2 py-1 text-right">Mennyiség</th>
                  <th className="px-2 py-1 text-right">T (°C)</th>
                  <th className="px-2 py-1 text-left">Státusz</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => {
                  const created = new Date(r.createdAt)
                  const timeStr = created.toLocaleTimeString('sk-SK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  const quantityStr =
                    r.quantity != null
                      ? `${r.quantity} ${r.unit ?? ''}`.trim()
                      : ''

                  const tempStr =
                    r.deliveryTemp != null ? r.deliveryTemp.toFixed(1) : ''

                  const statusParts: string[] = []
                  if (r.rejected) statusParts.push('ELUTASÍTVA')
                  else statusParts.push('Elfogadva')

                  if (r.tempOk === false) statusParts.push('Hőmérséklet HIBA')
                  if (r.packagingOk === false) statusParts.push('Csomagolás HIBA')
                  if (r.appearanceOk === false) statusParts.push('Megjelenés HIBA')
                  if (r.documentsOk === false) statusParts.push('Dokumentum HIBA')

                  const status = statusParts.join(' · ')

                  return (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="px-2 py-1">{timeStr}</td>
                      <td className="px-2 py-1">{r.supplier}</td>
                      <td className="px-2 py-1">{r.productName}</td>
                      <td className="px-2 py-1 text-right">{quantityStr}</td>
                      <td className="px-2 py-1 text-right">{tempStr}</td>
                      <td className="px-2 py-1">
                        <span className="text-xs text-gray-700">{status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
