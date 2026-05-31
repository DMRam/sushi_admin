import { useEffect, useMemo, useRef, useState } from "react";

type ProductType = "directCost" | "ingredientBased";

type ProductLite = {
  id: string;
  name: string;
  category?: string;
  productType?: ProductType;
};

export function ProductPicker({
  products,
  selectedProductId,
  setSelectedProductId,
}: {
  products: ProductLite[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products.slice(0, 50); // cap initial list
    return products
      .filter((p) => {
        const hay = `${p.name} ${p.category ?? ""} ${p.productType ?? ""}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 80);
  }, [products, q]);

  // close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const typeLabel = (t?: ProductType) =>
    t === "directCost" ? "Direct Cost" : "Ingredient Based";

  return (
    <div ref={wrapRef} className="relative">
      <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        Select product to edit
      </label>

      {/* Trigger / Input */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full border border-slate-300 bg-white px-3 py-3 text-left tracking-wide text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
      >
        {selectedProductId && selected ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-950">{selected.name}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {selected.category ? `${selected.category} • ` : ""}
                {typeLabel(selected.productType)}
              </div>
            </div>
            <span className="text-slate-400">▾</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-[0.1em] text-slate-600">Create new product</span>
            <span className="text-slate-400">▾</span>
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 p-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              placeholder="Search products..."
              className="w-full border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="max-h-80 overflow-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedProductId("");
                setOpen(false);
                setQ("");
              }}
              className={`w-full border-b border-slate-100 px-3 py-3 text-left hover:bg-slate-50 ${
                !selectedProductId ? "bg-slate-50" : ""
              }`}
            >
              <div className="text-sm font-semibold text-slate-950">+ Create new product</div>
              <div className="mt-0.5 text-xs text-slate-500">Start from scratch</div>
            </button>

            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedProductId(p.id);
                  setOpen(false);
                }}
                className={`w-full border-b border-slate-100 px-3 py-3 text-left hover:bg-slate-50 ${
                  selectedProductId === p.id ? "bg-slate-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">{p.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {p.category ? `${p.category} • ` : ""}
                      {typeLabel(p.productType)}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                No results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
