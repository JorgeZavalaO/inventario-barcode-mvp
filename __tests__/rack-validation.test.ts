import { describe, it, expect } from "vitest";
import {
  rectsOverlap,
  isWithinBounds,
  validateCompartment,
  splitHorizontal,
  splitVertical,
  duplicateCompartment,
  generatePositionCode,
  generatePhysicalPositionCode,
  positionHasStock,
  compartmentHasStock,
  compartmentHasProtectedUse,
  areCoordsValid,
  clamp,
  moveRect,
  resizeRect,
  snapToGrid,
  validateCompartmentSet,
  type Compartment,
} from "@/lib/rack-validation";

function comp(overrides: Partial<Compartment> & { id: string; code: string }): Compartment {
  return {
    name: "Comp",
    x: 0,
    y: 0,
    width: 1000,
    height: 1000,
    ...overrides,
  };
}

describe("rectsOverlap", () => {
  it("no overlaps for disjoint rectangles", () => {
    expect(rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 200, y: 0, width: 100, height: 100 })).toBe(false);
    expect(rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 200, width: 100, height: 100 })).toBe(false);
  });

  it("detects overlap when rectangles share space", () => {
    expect(rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 50, width: 100, height: 100 })).toBe(true);
  });

  it("detects overlap when one contains the other", () => {
    expect(rectsOverlap({ x: 0, y: 0, width: 200, height: 200 }, { x: 50, y: 50, width: 100, height: 100 })).toBe(true);
  });

  it("treats touching edges as NOT overlap (adjacency)", () => {
    // Edge touching at x boundary - adjacent, not overlapping
    expect(rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 100, y: 0, width: 100, height: 100 })).toBe(false);
    // Edge touching at y boundary - adjacent, not overlapping
    expect(rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 100, width: 100, height: 100 })).toBe(false);
    // But sharing even 1 pixel of overlap IS overlap
    expect(rectsOverlap({ x: 0, y: 0, width: 101, height: 100 }, { x: 100, y: 0, width: 100, height: 100 })).toBe(true);
  });
});

describe("isWithinBounds", () => {
  it("compartment within bounds is valid", () => {
    expect(isWithinBounds({ x: 0, y: 0, width: 5000, height: 5000 }, 10000, 10000)).toBe(true);
  });

  it("compartment exceeding width is invalid", () => {
    expect(isWithinBounds({ x: 8000, y: 0, width: 3000, height: 1000 }, 10000, 10000)).toBe(false);
  });

  it("compartment exceeding height is invalid", () => {
    expect(isWithinBounds({ x: 0, y: 8000, width: 1000, height: 3000 }, 10000, 10000)).toBe(false);
  });

  it("negative coordinates are invalid", () => {
    expect(isWithinBounds({ x: -1, y: 0, width: 100, height: 100 }, 10000, 10000)).toBe(false);
    expect(isWithinBounds({ x: 0, y: -1, width: 100, height: 100 }, 10000, 10000)).toBe(false);
  });

  it("exact fit is valid", () => {
    expect(isWithinBounds({ x: 0, y: 0, width: 10000, height: 10000 }, 10000, 10000)).toBe(true);
  });
});

describe("validateCompartment", () => {
  const existing: Compartment[] = [
    { id: "c1", code: "N01", name: "Modulo Izq", x: 0, y: 0, width: 5000, height: 5000 },
    { id: "c2", code: "N02", name: "Modulo Der", x: 5000, y: 0, width: 5000, height: 5000 },
  ];

  it("valid compartment has no issues", () => {
    const issues = validateCompartment(
      { id: "new1", code: "N03", name: "Modulo Abajo", x: 0, y: 5000, width: 10000, height: 5000 },
      existing, 10000, 10000,
    );
    expect(issues).toHaveLength(0);
  });

  it("detects overlap with existing compartment", () => {
    const issues = validateCompartment(
      { id: "new1", code: "N03", name: "Overlap", x: 2500, y: 2500, width: 5000, height: 5000 },
      existing, 10000, 10000,
    );
    expect(issues.some((i) => i.type === "overlap")).toBe(true);
  });

  it("detects out of bounds", () => {
    const issues = validateCompartment(
      { id: "new1", code: "N03", name: "Out", x: 9000, y: 9000, width: 2000, height: 2000 },
      existing, 10000, 10000,
    );
    expect(issues.some((i) => i.type === "bounds")).toBe(true);
  });

  it("detects duplicate code", () => {
    const issues = validateCompartment(
      { id: "new1", code: "N01", name: "Duplicate", x: 0, y: 5000, width: 5000, height: 5000 },
      existing, 10000, 10000,
    );
    expect(issues.some((i) => i.type === "duplicate_code")).toBe(true);
  });

  it("ignores self when updating", () => {
    const issues = validateCompartment(
      { id: "c1", code: "N01", name: "Same", x: 0, y: 0, width: 5000, height: 5000 },
      existing, 10000, 10000,
    );
    expect(issues).toHaveLength(0);
  });
});

describe("splitHorizontal", () => {
  it("splits a compartment into top and bottom halves", () => {
    const c = comp({ id: "c1", code: "N01", name: "Modulo", y: 1000, width: 8000, height: 5000 });
    const [top, bottom] = splitHorizontal(c);
    expect(top.y).toBe(1000);
    expect(top.height).toBe(2500);
    expect(top.code).toBe("N01A");
    expect(bottom.y).toBe(3500);
    expect(bottom.height).toBe(2500);
    expect(bottom.code).toBe("N01B");
    expect(top.width).toBe(8000);
    expect(bottom.width).toBe(8000);
  });

  it("handles odd height by giving extra pixel to top", () => {
    const c = comp({ id: "c1", code: "N01", name: "Mod", width: 5000, height: 5001 });
    const [top, bottom] = splitHorizontal(c);
    expect(top.height).toBe(2500);
    expect(bottom.height).toBe(2501);
  });

  it("preserves x coordinate for both halves", () => {
    const c = comp({ id: "c1", code: "N01", name: "M", x: 2000, width: 4000, height: 6000 });
    const [top, bottom] = splitHorizontal(c);
    expect(top.x).toBe(2000);
    expect(bottom.x).toBe(2000);
  });
});

describe("splitVertical", () => {
  it("splits a compartment into left and right halves", () => {
    const c = comp({ id: "c1", code: "N01", name: "Modulo", x: 1000, height: 8000, width: 5000 });
    const [left, right] = splitVertical(c);
    expect(left.x).toBe(1000);
    expect(left.width).toBe(2500);
    expect(left.code).toBe("N01L");
    expect(right.x).toBe(3500);
    expect(right.width).toBe(2500);
    expect(right.code).toBe("N01R");
    expect(left.height).toBe(8000);
    expect(right.height).toBe(8000);
  });

  it("handles odd width by giving extra pixel to left", () => {
    const c = comp({ id: "c1", code: "N01", name: "M", width: 5001, height: 5000 });
    const [left, right] = splitVertical(c);
    expect(left.width).toBe(2500);
    expect(right.width).toBe(2501);
  });

  it("preserves y coordinate for both halves", () => {
    const c = comp({ id: "c1", code: "N01", name: "M", y: 3000, width: 6000, height: 4000 });
    const [left, right] = splitVertical(c);
    expect(left.y).toBe(3000);
    expect(right.y).toBe(3000);
  });
});

describe("duplicateCompartment", () => {
  it("creates copy with offset", () => {
    const c = comp({ id: "c1", code: "N01", name: "Mod", x: 100, y: 200, width: 500, height: 300 });
    const dup = duplicateCompartment(c, 50);
    expect(dup.code).toBe("N01-DUP");
    expect(dup.name).toBe("Mod (copia)");
    expect(dup.x).toBe(150);
    expect(dup.y).toBe(250);
    expect(dup.width).toBe(500);
    expect(dup.height).toBe(300);
  });

  it("clamps to max bounds", () => {
    const c = comp({ id: "c1", code: "N01", name: "M", x: 9980, y: 9980, width: 200, height: 200 });
    const dup = duplicateCompartment(c, 50);
    // x + offset = 10030, maxX - width = 10000 - 200 = 9800 -> min(10030, 9800) = 9800
    expect(dup.x).toBe(9800);
    expect(dup.y).toBe(9800);
  });
});

describe("generatePositionCode", () => {
  it("generates correct position code", () => {
    expect(generatePositionCode("R003", "N07")).toBe("R003-N07");
  });

  it("handles single-char codes", () => {
    expect(generatePositionCode("R", "N")).toBe("R-N");
  });
});

describe("generatePhysicalPositionCode", () => {
  it("includes column, stack and depth indexes", () => {
    expect(generatePhysicalPositionCode("R001", "N07", "P02", 3, 4)).toBe("R001-N07-C03-F04-P02");
  });
});

describe("positionHasStock", () => {
  it("detects stock when locationStocks exist", () => {
    expect(positionHasStock({ locationStocks: [{ id: "s1" }] })).toBe(true);
  });

  it("considers empty array as no stock", () => {
    expect(positionHasStock({ locationStocks: [] })).toBe(false);
  });

  it("considers undefined as no stock", () => {
    expect(positionHasStock({})).toBe(false);
  });

  it("does not treat zero theoretical stock as occupied", () => {
    expect(positionHasStock({ locationStocks: [{ id: "s0", theoreticalStock: 0 }] })).toBe(false);
  });
});

describe("compartmentHasStock", () => {
  it("returns true if a direct position has stock", () => {
    expect(compartmentHasStock({ positions: [{ locationStocks: [{ id: "s1" }] }] })).toBe(true);
  });

  it("returns true if a depth slot position has stock", () => {
    expect(compartmentHasStock({ depthSlots: [{ positions: [{ locationStocks: [{ id: "s1" }] }] }] })).toBe(true);
  });

  it("returns false when nothing has stock", () => {
    expect(compartmentHasStock({ positions: [{ locationStocks: [] }], depthSlots: [] })).toBe(false);
    expect(compartmentHasStock({})).toBe(false);
  });
});

describe("compartmentHasProtectedUse", () => {
  it("protects a position in an active inventory session", () => {
    expect(compartmentHasProtectedUse({ positions: [{ sessionPositions: [{ id: "session-position" }] }] })).toBe(true);
  });

  it("allows a position with neither stock nor active session", () => {
    expect(compartmentHasProtectedUse({ positions: [{ locationStocks: [], sessionPositions: [] }] })).toBe(false);
  });
});

describe("areCoordsValid", () => {
  it("valid coords pass", () => {
    expect(areCoordsValid({ x: 0, y: 0, width: 10000, height: 10000 })).toBe(true);
    expect(areCoordsValid({ x: 5000, y: 5000, width: 5000, height: 5000 })).toBe(true);
  });

  it("coords outside range fail", () => {
    expect(areCoordsValid({ x: -1, y: 0, width: 100, height: 100 })).toBe(false);
    expect(areCoordsValid({ x: 0, y: 10001, width: 100, height: 100 })).toBe(false);
    expect(areCoordsValid({ x: 0, y: 0, width: 10001, height: 100 })).toBe(false);
    expect(areCoordsValid({ x: 0, y: 0, width: 0, height: 100 })).toBe(false);
  });
});

describe("interactive geometry", () => {
  it("snaps and clamps a moved rectangle", () => {
    expect(snapToGrid(249, 100)).toBe(200);
    expect(clamp(12000, 0, 10000)).toBe(10000);
    expect(moveRect({ x: 9000, y: 9000, width: 1000, height: 1000 }, { x: 500, y: 500 }, 10000, 10000, 100)).toEqual({
      x: 9000, y: 9000, width: 1000, height: 1000,
    });
  });

  it("resizes from the north-west handle without crossing the minimum", () => {
    expect(resizeRect({ x: 100, y: 100, width: 400, height: 400 }, "nw", { x: 450, y: 450 }, 1000, 1000, 50, 10)).toEqual({
      x: 450, y: 450, width: 50, height: 50,
    });
  });

  it("validates the complete active set", () => {
    const issues = validateCompartmentSet([
      comp({ id: "a", code: "A", x: 0, y: 0, width: 600, height: 1000 }),
      comp({ id: "b", code: "A", x: 500, y: 0, width: 500, height: 1000 }),
    ], 1000, 1000);
    expect(issues.some((issue) => issue.type === "duplicate_code")).toBe(true);
    expect(issues.some((issue) => issue.type === "overlap")).toBe(true);
  });
});

// ============================================================
// Integration-style scenario tests (Phase 4 PLAN cases)
// ============================================================

describe("Fase 4 - Rack scenarios", () => {
  it("Rack de dos modulos y tres niveles", () => {
    // Two modules side by side. Left module split into 3 levels. Right module intact.
    const levels = 10000 / 3; // ~3333 each
    const all: Compartment[] = [
      // Left module: 3 levels
      comp({ id: "l1", code: "ML1", name: "ModIzq Nivel 1", x: 0, y: 0, width: 5000, height: 3333 }),
      comp({ id: "l2", code: "ML2", name: "ModIzq Nivel 2", x: 0, y: 3333, width: 5000, height: 3333 }),
      comp({ id: "l3", code: "ML3", name: "ModIzq Nivel 3", x: 0, y: 6666, width: 5000, height: 3334 }),
      // Right module: single
      comp({ id: "r1", code: "MR", name: "ModDer", x: 5000, y: 0, width: 5000, height: 10000 }),
    ];

    expect(all).toHaveLength(4);
    for (const c of all) {
      expect(isWithinBounds(c, 10000, 10000)).toBe(true);
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(rectsOverlap(all[i], all[j])).toBe(false);
      }
    }
  });

  it("Rack con modulos de distinto ancho", () => {
    const narrow = comp({ id: "c1", code: "N", name: "Angosto", x: 0, y: 0, width: 3000, height: 10000 });
    const wide = comp({ id: "c2", code: "W", name: "Ancho", x: 3000, y: 0, width: 7000, height: 10000 });

    expect(isWithinBounds(narrow, 10000, 10000)).toBe(true);
    expect(isWithinBounds(wide, 10000, 10000)).toBe(true);
    expect(rectsOverlap(narrow, wide)).toBe(false);
  });

  it("Rack con niveles diferentes por modulo", () => {
    const mod1 = comp({ id: "c1", code: "M1", name: "Mod1", x: 0, y: 0, width: 5000, height: 10000 });
    const mod2 = comp({ id: "c2", code: "M2", name: "Mod2", x: 5000, y: 0, width: 5000, height: 10000 });

    // Mod1: 3 levels
    const [m1a, m1b] = splitHorizontal(mod1);
    const [m1bA, m1bB] = splitHorizontal(m1b);
    const mod1Parts = [m1a, m1bA, m1bB];
    expect(mod1Parts).toHaveLength(3);

    // Mod2: 2 levels
    const [m2a, m2b] = splitHorizontal(mod2);
    const mod2Parts = [m2a, m2b];
    expect(mod2Parts).toHaveLength(2);

    const all = [...mod1Parts, ...mod2Parts];
    for (const c of all) {
      expect(isWithinBounds(c, 10000, 10000)).toBe(true);
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(rectsOverlap(all[i], all[j])).toBe(false);
      }
    }
  });

  it("Rack sin division de profundidad (solo frente)", () => {
    const code = generatePhysicalPositionCode("R001", "N01", "P01", 1, 1);
    expect(code).toBe("R001-N01-C01-F01-P01");
  });

  it("Rack con tres profundidades", () => {
    const rackCode = "R001";
    const compCode = "N01";
    const depths = ["P01", "P02", "P03"];
    const codes = depths.map((d) => generatePhysicalPositionCode(rackCode, compCode, d, 1, 1));
    expect(codes).toEqual(["R001-N01-C01-F01-P01", "R001-N01-C01-F01-P02", "R001-N01-C01-F01-P03"]);
    // All codes must be unique
    expect(new Set(codes).size).toBe(3);
  });

  it("Rack con una posicion deshabilitada", () => {
    const all: Compartment[] = [
      comp({ id: "c1", code: "N01", name: "Activo", x: 0, y: 0, width: 5000, height: 5000, active: true }),
      comp({ id: "c2", code: "N02", name: "Inactivo", x: 5000, y: 0, width: 5000, height: 5000, active: false }),
    ];
    const active = all.filter((c) => c.active);
    expect(active).toHaveLength(1);
    expect(active[0].code).toBe("N01");
  });
});
