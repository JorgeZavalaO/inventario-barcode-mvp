type Position = { id: string };
type DepthSlot = { id: string; code: string; name: string; positions?: Position[] };
type SideCompartment = { id: string; code: string; name: string; depthSlots?: DepthSlot[] };

type Props = {
  compartments: SideCompartment[];
};

export function RackSideView({ compartments }: Props) {
  const maxDepth = Math.max(...compartments.map((compartment) => compartment.depthSlots?.length ?? 0), 0);
  const depthColumns = Math.max(maxDepth, 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3" aria-labelledby="rack-side-view-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="rack-side-view-title" className="text-sm font-semibold text-slate-800">Vista lateral</h3>
          <p className="mt-1 text-xs text-slate-500">Profundidad disponible por compartimento.</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500">Frente → Fondo</span>
      </div>

      {compartments.length === 0 ? (
        <div className="mt-4 flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center text-xs text-slate-500">
          La vista lateral aparecerá después de diseñar los compartimentos.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[460px] border-collapse text-xs" aria-label="Profundidades por compartimento">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th scope="col" className="px-3 py-2 font-medium">Compartimento</th>
                {Array.from({ length: depthColumns }, (_, index) => <th key={index} scope="col" className="px-2 py-2 text-center font-medium">{["Frente", "Centro", "Fondo"][index] ?? `Prof. ${index + 1}`}</th>)}
              </tr>
            </thead>
            <tbody>
              {compartments.map((compartment) => (
                <tr key={compartment.id} className="border-b border-slate-100 last:border-b-0">
                  <th scope="row" className="max-w-36 px-3 py-2 text-left font-medium text-slate-700">
                    <span className="block truncate">{compartment.code}</span>
                    <span className="block truncate text-[10px] font-normal text-slate-400">{compartment.name}</span>
                  </th>
                  {Array.from({ length: depthColumns }, (_, index) => {
                    const slot = compartment.depthSlots?.[index];
                    return (
                      <td key={index} className="px-1.5 py-1.5 text-center">
                        {slot ? <div className="rounded-md border border-teal-100 bg-teal-50 px-1.5 py-2 text-teal-800"><span className="block font-semibold">{slot.code}</span><span className="mt-0.5 block text-[10px] text-teal-600">{slot.positions?.length ?? 0} pos.</span></div> : <span className="text-slate-300" aria-label="Sin profundidad">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
