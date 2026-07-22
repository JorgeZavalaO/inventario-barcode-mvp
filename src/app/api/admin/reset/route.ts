import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const TABLE_NOT_FOUND = "P2021";

type TxOp = () => Promise<{ count: number }>;

export async function DELETE() {
  try {
    const auth = await requireRole("ADMIN");
    if (!auth.authorized) return auth.response;

    const stats: Record<string, number> = {};
    const operations: Record<string, TxOp> = {
      countEvents: () => prisma.countEvent.deleteMany(),
      boxCountEntries: () => prisma.boxCountEntry.deleteMany(),
      boxProducts: () => prisma.boxProduct.deleteMany(),
      countRounds: () => prisma.countRound.deleteMany(),
      sessionPositions: () => prisma.sessionPosition.deleteMany(),
      sessionStockSnapshots: () => prisma.sessionStockSnapshot.deleteMany(),
      sessionParticipants: () => prisma.sessionParticipant.deleteMany(),
      sessionProducts: () => prisma.sessionProduct.deleteMany(),
      countIncidents: () => prisma.countIncident.deleteMany(),
      productLocationStocks: () => prisma.productLocationStock.deleteMany(),
      productBarcodes: () => prisma.productBarcode.deleteMany(),
      productPackages: () => prisma.productPackage.deleteMany(),
      boxes: () => prisma.box.deleteMany(),
      pallets: () => prisma.pallet.deleteMany(),
      imports: () => prisma.import.deleteMany(),
      storagePositions: () => prisma.storagePosition.deleteMany(),
      rackDepthSlots: () => prisma.rackDepthSlot.deleteMany(),
      rackCompartments: () => prisma.rackCompartment.deleteMany(),
      racks: () => prisma.rack.deleteMany(),
      warehouseZones: () => prisma.warehouseZone.deleteMany(),
      floors: () => prisma.floor.deleteMany(),
      warehouses: () => prisma.warehouse.deleteMany(),
      products: () => prisma.product.deleteMany(),
      inventorySessions: () => prisma.inventorySession.deleteMany(),
      operators: () => prisma.operator.deleteMany(),
    };

    const errors: string[] = [];
    for (const [name, op] of Object.entries(operations)) {
      try {
        const result = await op();
        stats[name] = result.count;
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        if (err?.code === TABLE_NOT_FOUND || (err?.message?.includes?.("does not exist"))) {
          stats[name] = -1;
        } else {
          stats[name] = -2;
          errors.push(`${name}: ${err?.message || "Error desconocido"}`);
        }
      }
    }

    return NextResponse.json({ ok: errors.length === 0, deleted: stats, warnings: errors.length > 0 ? errors : undefined });
  } catch (error) {
    return apiError(error);
  }
}
