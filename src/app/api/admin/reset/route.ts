import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const auth = await requireRole("ADMIN");
    if (!auth.authorized) return auth.response;

    const result = await prisma.$transaction(async (tx) => {
      const stats: Record<string, number> = {};

      stats.countEvents = (await tx.countEvent.deleteMany()).count;
      stats.boxCountEntries = (await tx.boxCountEntry.deleteMany()).count;
      stats.boxProducts = (await tx.boxProduct.deleteMany()).count;
      stats.countRounds = (await tx.countRound.deleteMany()).count;
      stats.sessionPositions = (await tx.sessionPosition.deleteMany()).count;
      stats.sessionStockSnapshots = (await tx.sessionStockSnapshot.deleteMany()).count;
      stats.sessionParticipants = (await tx.sessionParticipant.deleteMany()).count;
      stats.sessionProducts = (await tx.sessionProduct.deleteMany()).count;
      stats.countIncidents = (await tx.countIncident.deleteMany()).count;
      stats.productLocationStocks = (await tx.productLocationStock.deleteMany()).count;
      stats.productBarcodes = (await tx.productBarcode.deleteMany()).count;
      stats.productPackages = (await tx.productPackage.deleteMany()).count;
      stats.boxes = (await tx.box.deleteMany()).count;
      stats.pallets = (await tx.pallet.deleteMany()).count;
      stats.imports = (await tx.import.deleteMany()).count;
      stats.storagePositions = (await tx.storagePosition.deleteMany()).count;
      stats.rackDepthSlots = (await tx.rackDepthSlot.deleteMany()).count;
      stats.rackCompartments = (await tx.rackCompartment.deleteMany()).count;
      stats.racks = (await tx.rack.deleteMany()).count;
      stats.warehouseZones = (await tx.warehouseZone.deleteMany()).count;
      stats.floors = (await tx.floor.deleteMany()).count;
      stats.warehouses = (await tx.warehouse.deleteMany()).count;
      stats.products = (await tx.product.deleteMany()).count;
      stats.inventorySessions = (await tx.inventorySession.deleteMany()).count;
      stats.operators = (await tx.operator.deleteMany()).count;

      return stats;
    });

    return NextResponse.json({ ok: true, deleted: result });
  } catch (error) {
    return apiError(error);
  }
}
