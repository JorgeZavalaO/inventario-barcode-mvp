type DepthSlot = {
  id: string;
  code: string;
  name: string;
  kind: string;
  positions?: { id: string; code: string; locationStocks?: { product: { code: string; description: string }; theoreticalStock: number }[] }[];
};

type Props = {
  depthSlots: DepthSlot[];
};

export function DepthLateralView({ depthSlots }: Props) {
  if (depthSlots.length === 0) return null;

  return (
    <div className="flex gap-2">
      {depthSlots.map((slot) => {
        const stockCount = slot.positions?.reduce((s, p) => s + (p.locationStocks?.length ?? 0), 0) ?? 0;
        return (
          <div key={slot.id} className="flex-1 rounded-lg border border-slate-200 bg-white p-3 text-center">
            <div className="mb-1 rounded bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
              {slot.name}
            </div>
            <p className="text-xs text-slate-400">{slot.code}</p>
            {slot.positions?.map((pos) => (
              <div key={pos.id} className="mt-2 text-xs text-slate-600">
                <span className="font-medium">{pos.code}</span>
                {pos.locationStocks?.map((ls) => (
                  <div key={`${pos.id}-${ls.product.code}`} className="text-[10px] text-slate-400">
                    {ls.product.code}: {ls.theoreticalStock}
                  </div>
                ))}
              </div>
            ))}
            {stockCount === 0 && <p className="mt-2 text-[10px] text-slate-300">Sin productos</p>}
          </div>
        );
      })}
    </div>
  );
}
