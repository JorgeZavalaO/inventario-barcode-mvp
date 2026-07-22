import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { validateCompartmentSet, type Compartment } from "@/lib/rack-validation";

const compartmentSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  x: z.number().int().min(0).max(10000),
  y: z.number().int().min(0).max(10000),
  width: z.number().int().min(1).max(10000),
  height: z.number().int().min(1).max(10000),
  columnCount: z.number().int().min(1).max(100).optional(),
  stackLevels: z.number().int().min(1).max(100).optional(),
  depthCount: z.number().int().min(1).max(10).optional(),
  moduleLabel: z.string().max(20).optional().nullable(),
  levelLabel: z.string().max(20).optional().nullable(),
}).strict();

const saveSchema = z.object({
  expectedVersion: z.number().int().min(1),
  compartments: z.array(compartmentSchema).max(1000),
}).strict();

const depthDefinitions = [
  { code: "D01", name: "Frente", kind: "FRONT" as const },
  { code: "D02", name: "Centro", kind: "MIDDLE" as const },
  { code: "D03", name: "Fondo", kind: "BACK" as const },
];

class DesignError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { id: rackId } = await context.params;
    const body = saveSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const rack = await tx.rack.findUnique({
        where: { id: rackId },
        select: { id: true, widthMm: true, heightMm: true, version: true },
      });
      if (!rack) throw new DesignError(404, "Rack no encontrado");
      if (rack.version !== body.expectedVersion) {
        throw new DesignError(409, "El rack cambió en otra sesión. Recarga el diseño antes de guardar.");
      }

      const existing = await tx.rackCompartment.findMany({
        where: { rackId },
        include: {
          positions: { select: { id: true } },
          depthSlots: {
            include: { positions: { select: { id: true } } },
            orderBy: { depthIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      });
      const existingById = new Map(existing.map((comp) => [comp.id, comp]));
      const submittedIds = new Set<string>();

      for (const comp of body.compartments) {
        if (!comp.id) continue;
        if (submittedIds.has(comp.id)) throw new DesignError(400, "Compartimento repetido en el diseño");
        if (!existingById.has(comp.id)) throw new DesignError(400, "Compartimento no pertenece a este rack");
        submittedIds.add(comp.id);
      }

      const draftCompartments: Array<Compartment & { active: boolean }> = body.compartments.map((comp, index) => ({
        id: comp.id ?? `new-${index}`,
        code: comp.code,
        name: comp.name,
        x: comp.x,
        y: comp.y,
        width: comp.width,
        height: comp.height,
        active: true,
      }));
      const issues = validateCompartmentSet(draftCompartments, rack.widthMm ?? 10000, rack.heightMm ?? 10000);
      if (issues.length > 0) throw new DesignError(400, issues[0].message);

      const codeOwners = new Map<string, string>();
      for (const comp of existing) {
        const owner = codeOwners.get(comp.code);
        if (owner && owner !== comp.id) throw new DesignError(409, `Código histórico duplicado ${comp.code}`);
        codeOwners.set(comp.code, comp.id);
      }
      for (const comp of body.compartments) {
        const owner = codeOwners.get(comp.code);
        if (owner && owner !== comp.id) throw new DesignError(409, `El código ${comp.code} ya está registrado en este rack`);
      }

      const removed = existing.filter((comp) => comp.active && !submittedIds.has(comp.id));
      const changedCodes = body.compartments.filter((comp) => comp.id && existingById.get(comp.id)?.code !== comp.code);
      const protectedIds = [...removed.map((comp) => comp.id), ...changedCodes.flatMap((comp) => comp.id ? [comp.id] : [])];
      const protectedComp = existing.find((comp) => protectedIds.includes(comp.id) && comp.positions.length > 0);
      if (protectedComp) {
        const isCodeChange = changedCodes.some((comp) => comp.id === protectedComp.id);
        throw new DesignError(400, isCodeChange
          ? `No se puede cambiar el código de ${protectedComp.code} porque tiene posiciones creadas`
          : `No se puede eliminar ${protectedComp.code} porque tiene posiciones creadas`);
      }

      for (const comp of body.compartments) {
        if (!comp.id) continue;
        const current = existingById.get(comp.id);
        if (!current) continue;
        const nextColumns = comp.columnCount ?? current.columnCount;
        const nextLevels = comp.stackLevels ?? current.stackLevels;
        const currentDepthCount = current.depthSlots.filter((slot) => slot.active).length || 1;
        const nextDepthCount = comp.depthCount ?? currentDepthCount;
        if (current.positions.length > 0 && (nextColumns < current.columnCount || nextLevels < current.stackLevels)) {
          throw new DesignError(400, `No se puede reducir la matriz de ${current.code} porque tiene posiciones creadas`);
        }
        if (nextDepthCount < currentDepthCount) {
          const removedDepth = current.depthSlots.filter((slot) => slot.active && slot.depthIndex >= nextDepthCount);
          if (removedDepth.some((slot) => slot.positions.length > 0)) {
            throw new DesignError(400, `No se puede reducir la profundidad de ${current.code} porque tiene posiciones creadas`);
          }
        }
      }

      const versionUpdate = await tx.rack.updateMany({
        where: { id: rackId, version: body.expectedVersion },
        data: { version: { increment: 1 } },
      });
      if (versionUpdate.count !== 1) throw new DesignError(409, "El rack cambió en otra sesión. Recarga el diseño antes de guardar.");

      const savedConfig = new Map<string, { columnCount: number; stackLevels: number; depthCount: number }>();
      for (const [index, comp] of body.compartments.entries()) {
        const current = comp.id ? existingById.get(comp.id) : undefined;
        const data = {
          code: comp.code,
          name: comp.name,
          x: comp.x,
          y: comp.y,
          width: comp.width,
          height: comp.height,
          columnCount: comp.columnCount ?? current?.columnCount ?? 1,
          stackLevels: comp.stackLevels ?? current?.stackLevels ?? 1,
          moduleLabel: comp.moduleLabel ?? null,
          levelLabel: comp.levelLabel ?? null,
          orderIndex: index,
          active: true,
        };
        let compartmentId = comp.id;
        if (compartmentId) {
          await tx.rackCompartment.update({ where: { id: compartmentId }, data });
        } else {
          const created = await tx.rackCompartment.create({ data: { id: randomUUID(), rackId, ...data } });
          compartmentId = created.id;
        }

        const currentSlots = current?.depthSlots ?? [];
        const depthCount = comp.depthCount ?? (currentSlots.filter((slot) => slot.active).length || 1);
        savedConfig.set(compartmentId, { columnCount: data.columnCount, stackLevels: data.stackLevels, depthCount });
        for (let depthIndex = 0; depthIndex < depthCount; depthIndex += 1) {
          const definition = depthDefinitions[depthIndex] ?? {
            code: `D${String(depthIndex + 1).padStart(2, "0")}`,
            name: `Profundidad ${depthIndex + 1}`,
            kind: "CUSTOM" as const,
          };
          const currentSlot = currentSlots.find((slot) => slot.depthIndex === depthIndex);
          if (currentSlot) {
            await tx.rackDepthSlot.update({ where: { id: currentSlot.id }, data: { active: true } });
          } else {
            await tx.rackDepthSlot.create({ data: {
              id: randomUUID(), compartmentId, code: definition.code, name: definition.name,
              kind: definition.kind, depthIndex,
            } });
          }
        }
        for (const currentSlot of currentSlots) {
          if (currentSlot.active && currentSlot.depthIndex >= depthCount) {
            await tx.rackDepthSlot.update({ where: { id: currentSlot.id }, data: { active: false } });
          }
        }
      }
      for (const comp of removed) {
        await tx.rackCompartment.update({ where: { id: comp.id }, data: { active: false } });
      }

      const design = {
        compartments: body.compartments.map(({ id, code, name, x, y, width, height, columnCount, stackLevels, depthCount }) => ({
          ...(id ? { id } : {}), code, name, x, y, width, height,
          columnCount: columnCount ?? 1, stackLevels: stackLevels ?? 1, depthCount: depthCount ?? 1,
        })),
      };
      await tx.rack.update({ where: { id: rackId }, data: { design } });
      return { version: body.expectedVersion + 1, savedConfig };
    });

    const compartments = await prisma.rackCompartment.findMany({
      where: { rackId, active: true },
      include: {
        positions: { where: { active: true }, select: { id: true, code: true, columnIndex: true, stackIndex: true } },
        depthSlots: { where: { active: true }, include: { positions: { where: { active: true }, select: { id: true, code: true, columnIndex: true, stackIndex: true } } }, orderBy: { depthIndex: "asc" } },
      },
      orderBy: { orderIndex: "asc" },
    });
    return NextResponse.json({ version: result.version, compartments });
  } catch (error) {
    if (error instanceof DesignError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const { id } = await context.params;
    const rack = await prisma.rack.findUnique({
      where: { id },
      select: { design: true, version: true, compartments: { where: { active: true }, orderBy: { orderIndex: "asc" } } },
    });
    if (!rack) return NextResponse.json({ error: "Rack no encontrado" }, { status: 404 });
    return NextResponse.json({ design: rack.design, version: rack.version, compartments: rack.compartments });
  } catch (error) {
    return apiError(error);
  }
}
