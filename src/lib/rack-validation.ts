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
  type: "overlap" | "bounds" | "duplicate_code" | "empty";
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

/**
 * Validate coords in 0..10000.
 */
export function areCoordsValid(comp: { x: number; y: number; width: number; height: number }): boolean {
  return comp.x >= 0 && comp.x <= 10000 && comp.y >= 0 && comp.y <= 10000 && comp.width > 0 && comp.width <= 10000 && comp.height > 0 && comp.height <= 10000;
}
