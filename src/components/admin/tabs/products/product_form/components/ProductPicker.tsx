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
      <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
        SELECT PRODUCT TO EDIT
      </label>

      {/* Trigger / Input */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide text-left bg-white"
      >
        {selectedProductId && selected ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-gray-900 truncate">{selected.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {selected.category ? `${selected.category} • ` : ""}
                {typeLabel(selected.productType)}
              </div>
            </div>
            <span className="text-gray-400">▾</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">CREATE NEW PRODUCT</span>
            <span className="text-gray-400">▾</span>
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              placeholder="Search products..."
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
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
              className={`w-full px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                !selectedProductId ? "bg-gray-50" : ""
              }`}
            >
              <div className="text-sm text-gray-900 font-medium">+ Create new product</div>
              <div className="text-xs text-gray-500 mt-0.5">Start from scratch</div>
            </button>

            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedProductId(p.id);
                  setOpen(false);
                }}
                className={`w-full px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                  selectedProductId === p.id ? "bg-gray-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.category ? `${p.category} • ` : ""}
                      {typeLabel(p.productType)}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="px-3 py-6 text-sm text-gray-500 text-center">
                No results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
