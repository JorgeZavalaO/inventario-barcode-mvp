import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

// ── Warehouse ──

export async function listWarehouses() {
  return prisma.warehouse.findMany({
    where: { active: true },
    include: { _count: { select: { floors: true } } },
    orderBy: { code: "asc" },
  });
}

export async function getWarehouseTree() {
  return prisma.warehouse.findMany({
    where: { active: true },
    include: {
      floors: {
        where: { active: true },
        include: {
          zones: {
            where: { active: true },
            include: {
              racks: {
                where: { active: true },
                orderBy: { orderIndex: "asc" },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { code: "asc" },
  });
}

export async function getWarehouse(id: string) {
  return prisma.warehouse.findUnique({
    where: { id },
    include: {
      floors: {
        where: { active: true },
        include: {
          zones: {
            where: { active: true },
            include: {
              racks: {
                where: { active: true },
                orderBy: { orderIndex: "asc" },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
}

export async function createWarehouse(data: { code: string; name: string }) {
  return prisma.warehouse.create({ data: { id: randomUUID(), ...data } });
}

export async function updateWarehouse(id: string, data: { code?: string; name?: string; active?: boolean }) {
  return prisma.warehouse.update({ where: { id }, data });
}

// ── Floor ──

export async function getFloor(id: string) {
  return prisma.floor.findUnique({
    where: { id },
    include: {
      zones: {
        where: { active: true },
        include: {
          racks: {
            where: { active: true },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
}

export async function createFloor(data: {
  warehouseId: string;
  code: string;
  name: string;
  orderIndex?: number;
}) {
  return prisma.floor.create({ data: { id: randomUUID(), orderIndex: 0, ...data } });
}

export async function createFloors(data: Array<{
  warehouseId: string;
  code: string;
  name: string;
  orderIndex?: number;
}>) {
  return prisma.$transaction(
    data.map(d => prisma.floor.create({
      data: { id: randomUUID(), orderIndex: 0, ...d },
    }))
  );
}

export async function updateFloor(id: string, data: { code?: string; name?: string; orderIndex?: number; active?: boolean }) {
  return prisma.floor.update({ where: { id }, data });
}

// ── Zone ──

export async function getZone(id: string) {
  return prisma.warehouseZone.findUnique({
    where: { id },
    include: {
      racks: {
        where: { active: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
}

export async function createZone(data: {
  floorId: string;
  code: string;
  name: string;
  type?: string;
  orderIndex?: number;
}) {
  return prisma.warehouseZone.create({ data: { id: randomUUID(), orderIndex: 0, ...data } });
}

export async function createZones(data: Array<{
  floorId: string;
  code: string;
  name: string;
  type?: string;
  orderIndex?: number;
}>) {
  return prisma.$transaction(
    data.map(d => prisma.warehouseZone.create({
      data: { id: randomUUID(), orderIndex: 0, ...d },
    }))
  );
}

export async function updateZone(id: string, data: { code?: string; name?: string; type?: string; orderIndex?: number; active?: boolean }) {
  return prisma.warehouseZone.update({ where: { id }, data });
}

// ── Rack ──

export async function getRack(id: string) {
  return prisma.rack.findUnique({
    where: { id },
    include: {
      compartments: {
        where: { active: true },
        include: {
          depthSlots: {
            where: { active: true },
            include: { positions: { where: { active: true } } },
            orderBy: { depthIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
      zone: { include: { floor: { include: { warehouse: true } } } },
    },
  });
}

export async function createRack(data: {
  zoneId: string;
  code: string;
  name: string;
  widthMm?: number | null;
  heightMm?: number | null;
  depthMm?: number | null;
  orderIndex?: number;
}) {
  return prisma.rack.create({ data: { id: randomUUID(), orderIndex: 0, ...data } });
}

export async function createRacks(data: Array<{
  zoneId: string;
  code: string;
  name: string;
  widthMm?: number | null;
  heightMm?: number | null;
  depthMm?: number | null;
  orderIndex?: number;
}>) {
  return prisma.$transaction(
    data.map(d => prisma.rack.create({
      data: { id: randomUUID(), orderIndex: 0, ...d },
    }))
  );
}

export async function updateRack(id: string, data: {
  code?: string; name?: string; widthMm?: number | null; heightMm?: number | null;
  depthMm?: number | null; orderIndex?: number; active?: boolean; design?: unknown;
}) {
  return prisma.rack.update({ where: { id }, data: data as Parameters<typeof prisma.rack.update>[0]["data"] });
}

// ── Compartments ──

export async function createCompartment(data: {
  rackId: string; code: string; name: string;
  x: number; y: number; width: number; height: number;
  columnCount?: number; stackLevels?: number;
  moduleLabel?: string | null; levelLabel?: string | null;
  orderIndex?: number;
}) {
  return prisma.rackCompartment.create({ data: { id: randomUUID(), orderIndex: 0, ...data } });
}

export async function updateCompartment(id: string, data: Partial<{
  code: string; name: string; x: number; y: number; width: number; height: number;
  moduleLabel: string | null; levelLabel: string | null; orderIndex: number; active: boolean;
}>) {
  return prisma.rackCompartment.update({ where: { id }, data });
}

// ── Depth Slots ──

export async function createDepthSlot(data: {
  compartmentId: string; code: string; name: string; kind: "FRONT" | "MIDDLE" | "BACK" | "CUSTOM";
  depthIndex: number; startZ?: number | null; depthSize?: number | null;
}) {
  return prisma.rackDepthSlot.create({ data: { id: randomUUID(), ...data } });
}

// ── Storage Positions ──

export async function createStoragePosition(data: {
  rackId: string; compartmentId: string; depthSlotId: string;
  columnIndex?: number; stackIndex?: number;
  code: string; qrValue: string;
  capacityQty?: number | null; capacityUnit?: string | null;
  notes?: string | null;
}) {
  return prisma.storagePosition.create({ data: { id: randomUUID(), ...data } });
}

export async function listPositionsByRack(rackId: string) {
  return prisma.storagePosition.findMany({
    where: { rackId, active: true },
    include: { compartment: true, depthSlot: true },
    orderBy: { code: "asc" },
  });
}

// ── Bulk import ──

export async function importLocations(data: {
  warehouseCode: string; warehouseName: string;
  floorCode: string; floorName: string;
  zoneCode: string; zoneName: string;
  rackCode: string; rackName: string;
  widthMm?: number | null; heightMm?: number | null; depthMm?: number | null;
}) {
  return prisma.$transaction(async (tx) => {
    let warehouse = await tx.warehouse.findUnique({ where: { code: data.warehouseCode } });
    if (!warehouse) {
      warehouse = await tx.warehouse.create({
        data: { id: randomUUID(), code: data.warehouseCode, name: data.warehouseName },
      });
    }

    let floor = await tx.floor.findUnique({
      where: { warehouseId_code: { warehouseId: warehouse.id, code: data.floorCode } },
    });
    if (!floor) {
      floor = await tx.floor.create({
        data: { id: randomUUID(), warehouseId: warehouse.id, code: data.floorCode, name: data.floorName, orderIndex: 0 },
      });
    }

    let zone = await tx.warehouseZone.findUnique({
      where: { floorId_code: { floorId: floor.id, code: data.zoneCode } },
    });
    if (!zone) {
      zone = await tx.warehouseZone.create({
        data: { id: randomUUID(), floorId: floor.id, code: data.zoneCode, name: data.zoneName, orderIndex: 0 },
      });
    }

    const rack = await tx.rack.upsert({
      where: { zoneId_code: { zoneId: zone.id, code: data.rackCode } },
      update: { name: data.rackName, widthMm: data.widthMm, heightMm: data.heightMm, depthMm: data.depthMm },
      create: {
        id: randomUUID(), zoneId: zone.id, code: data.rackCode, name: data.rackName,
        widthMm: data.widthMm, heightMm: data.heightMm, depthMm: data.depthMm, orderIndex: 0,
      },
    });

    return { warehouse, floor, zone, rack, created: !rack.updatedAt };
  });
}
