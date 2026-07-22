export type Compartment = {
  id: string;
  code: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active?: boolean;
};

export type ValidationIssue = {
  type: "overlap" | "bounds" | "duplicate_code" | "empty" | "minimum_size";
  message: string;
  compartmentId?: string;
};

/**
 * Check if two rectangles overlap (inclusive of touching).
 */
export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

/**
 * Check if a compartment stays within rack bounds.
 */
export function isWithinBounds(
  comp: { x: number; y: number; width: number; height: number },
  rackWidth: number,
  rackHeight: number,
): boolean {
  return comp.x >= 0 && comp.y >= 0 && comp.x + comp.width <= rackWidth && comp.y + comp.height <= rackHeight;
}

/**
 * Validate a new compartment against existing ones and rack bounds.
 */
export function validateCompartment(
  newComp: Omit<Compartment, "id"> & { id?: string },
  existing: Compartment[],
  rackWidth: number,
  rackHeight: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isWithinBounds(newComp, rackWidth, rackHeight)) {
    issues.push({
      type: "bounds",
      message: `Fuera de limites (${rackWidth}x${rackHeight})`,
    });
  }

  for (const ex of existing) {
    if (newComp.id && ex.id === newComp.id) continue;
    if (rectsOverlap(newComp, ex)) {
      issues.push({ type: "overlap", message: `Solapa con ${ex.code}`, compartmentId: ex.id });
    }
  }

  for (const ex of existing) {
    if (newComp.id && ex.id === newComp.id) continue;
    if (ex.code === newComp.code) {
      issues.push({ type: "duplicate_code", message: `Codigo duplicado ${newComp.code}`, compartmentId: ex.id });
    }
  }

  return issues;
}

export type Rect = { x: number; y: number; width: number; height: number };

export type ResizeHandle =
  | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** Keep a value inside an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Snap a logical rack coordinate to a positive grid size. */
export function snapToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) return Math.round(value);
  return Math.round(value / gridSize) * gridSize;
}

/** Move a rectangle while preserving its size and rack bounds. */
export function moveRect(
  initial: Rect,
  delta: { x: number; y: number },
  rackWidth: number,
  rackHeight: number,
  gridSize = 1,
): Rect {
  const x = clamp(snapToGrid(initial.x + delta.x, gridSize), 0, rackWidth - initial.width);
  const y = clamp(snapToGrid(initial.y + delta.y, gridSize), 0, rackHeight - initial.height);
  return { ...initial, x, y };
}

/** Resize a rectangle from one of its eight handles. */
export function resizeRect(
  initial: Rect,
  handle: ResizeHandle,
  delta: { x: number; y: number },
  rackWidth: number,
  rackHeight: number,
  minSize = 2,
  gridSize = 1,
): Rect {
  let left = initial.x;
  let top = initial.y;
  let right = initial.x + initial.width;
  let bottom = initial.y + initial.height;

  if (handle.includes("w")) left = snapToGrid(initial.x + delta.x, gridSize);
  if (handle.includes("e")) right = snapToGrid(initial.x + initial.width + delta.x, gridSize);
  if (handle.includes("n")) top = snapToGrid(initial.y + delta.y, gridSize);
  if (handle.includes("s")) bottom = snapToGrid(initial.y + initial.height + delta.y, gridSize);

  if (handle.includes("w")) left = clamp(left, 0, right - minSize);
  if (handle.includes("e")) right = clamp(right, left + minSize, rackWidth);
  if (handle.includes("n")) top = clamp(top, 0, bottom - minSize);
  if (handle.includes("s")) bottom = clamp(bottom, top + minSize, rackHeight);

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Validate all active rectangles together, including duplicate codes. */
export function validateCompartmentSet(
  compartments: Array<Compartment & { active?: boolean }>,
  rackWidth: number,
  rackHeight: number,
): ValidationIssue[] {
  const active = compartments.filter((comp) => comp.active !== false);
  const issues: ValidationIssue[] = [];
  const codes = new Map<string, string>();

  for (const comp of active) {
    if (comp.width < 1 || comp.height < 1) {
      issues.push({ type: "minimum_size", message: `Tamaño inválido en ${comp.code}`, compartmentId: comp.id });
    }
    if (!isWithinBounds(comp, rackWidth, rackHeight)) {
      issues.push({ type: "bounds", message: `Fuera de límites (${rackWidth}x${rackHeight})`, compartmentId: comp.id });
    }
    const previous = codes.get(comp.code);
    if (previous) {
      issues.push({ type: "duplicate_code", message: `Código duplicado ${comp.code}`, compartmentId: comp.id });
    } else {
      codes.set(comp.code, comp.id);
    }
  }

  for (let index = 0; index < active.length; index += 1) {
    for (let other = index + 1; other < active.length; other += 1) {
      if (rectsOverlap(active[index], active[other])) {
        issues.push({
          type: "overlap",
          message: `${active[index].code} solapa con ${active[other].code}`,
          compartmentId: active[other].id,
        });
      }
    }
  }

  return issues;
}

/**
 * Horizontal split: divides height in half.
 */
export function splitHorizontal(comp: Compartment): Compartment[] {
  const halfH = Math.floor(comp.height / 2);
  return [
    { id: "new1", code: `${comp.code}A`, name: `${comp.name} A`, x: comp.x, y: comp.y, width: comp.width, height: halfH },
    { id: "new2", code: `${comp.code}B`, name: `${comp.name} B`, x: comp.x, y: comp.y + halfH, width: comp.width, height: comp.height - halfH },
  ];
}

/**
 * Vertical split: divides width in half.
 */
export function splitVertical(comp: Compartment): Compartment[] {
  const halfW = Math.floor(comp.width / 2);
  return [
    { id: "new1", code: `${comp.code}L`, name: `${comp.name} Izq`, x: comp.x, y: comp.y, width: halfW, height: comp.height },
    { id: "new2", code: `${comp.code}R`, name: `${comp.name} Der`, x: comp.x + halfW, y: comp.y, width: comp.width - halfW, height: comp.height },
  ];
}

/**
 * Calculate duplicate with offset.
 */
export function duplicateCompartment(comp: Compartment, offset = 50, maxX = 10000, maxY = 10000) {
  return {
    ...comp,
    code: `${comp.code}-DUP`,
    name: `${comp.name} (copia)`,
    x: Math.min(comp.x + offset, maxX - comp.width),
    y: Math.min(comp.y + offset, maxY - comp.height),
  };
}

/**
 * Generate position code.
 */
export function generatePositionCode(
  warehouseCode: string,
  floorCode: string,
  rackCode: string,
  compartmentCode: string,
  depthCode: string,
): string {
  return `${warehouseCode}-${floorCode}-${rackCode}-${compartmentCode}-${depthCode}`;
}

/** Generate the stable code for one physical matrix cell. */
export function generatePhysicalPositionCode(
  warehouseCode: string,
  floorCode: string,
  rackCode: string,
  compartmentCode: string,
  depthCode: string,
  columnIndex: number,
  stackIndex: number,
): string {
  return `${generatePositionCode(warehouseCode, floorCode, rackCode, compartmentCode, depthCode)}-C${String(columnIndex).padStart(2, "0")}-N${String(stackIndex).padStart(2, "0")}`;
}

/**
 * Validate coords in 0..10000.
 */
export function areCoordsValid(comp: { x: number; y: number; width: number; height: number }): boolean {
  return comp.x >= 0 && comp.x <= 10000 && comp.y >= 0 && comp.y <= 10000 && comp.width > 0 && comp.width <= 10000 && comp.height > 0 && comp.height <= 10000;
}

export function positionHasStock(position: { locationStocks?: Array<{ id: string; theoreticalStock?: number | string }> }): boolean {
  return position.locationStocks?.some((stock) => stock.theoreticalStock === undefined || Number(stock.theoreticalStock) > 0) ?? false;
}

export function compartmentHasStock(compartment: {
  positions?: Array<{ locationStocks?: Array<{ id: string; theoreticalStock?: number | string }> }>;
  depthSlots?: Array<{ positions?: Array<{ locationStocks?: Array<{ id: string; theoreticalStock?: number | string }> }> }>;
}): boolean {
  if (compartment.positions?.some((p) => positionHasStock(p))) return true;
  if (compartment.depthSlots?.some((s) => s.positions?.some((p) => positionHasStock(p)))) return true;
  return false;
}

export function compartmentHasProtectedUse(compartment: {
  positions?: Array<{
    locationStocks?: Array<{ id: string; theoreticalStock?: number | string }>;
    sessionPositions?: Array<{ id: string }>;
  }>;
  depthSlots?: Array<{ positions?: Array<{
    locationStocks?: Array<{ id: string; theoreticalStock?: number | string }>;
    sessionPositions?: Array<{ id: string }>;
  }> }>;
}): boolean {
  if (compartmentHasStock(compartment)) return true;
  if (compartment.positions?.some((p) => (p.sessionPositions?.length ?? 0) > 0)) return true;
  return compartment.depthSlots?.some((slot) => slot.positions?.some((p) => (p.sessionPositions?.length ?? 0) > 0)) ?? false;
}
