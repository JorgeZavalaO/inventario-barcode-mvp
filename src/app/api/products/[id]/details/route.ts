import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        barcode: true,
        description: true,
        unit: true,
        category: true,
        supplierCode: true,
        theoreticalStock: true,
        active: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const boxProducts = await prisma.boxProduct.findMany({
      where: { productId: id },
      include: {
        box: {
          include: {
            pallet: {
              include: {
                import: { select: { id: true, code: true, description: true } },
              },
            },
          },
        },
      },
      orderBy: { box: { pallet: { import: { code: "asc" } } } },
    });

    const importMap = new Map<string, {
      importId: string;
      importCode: string;
      importDescription: string | null;
      pallets: Map<string, {
        palletId: string;
        palletNumber: string;
        boxes: { boxId: string; boxNumber: string; expectedQty: number | null; supplierCode: string | null }[];
      }>;
    }>();

    for (const bp of boxProducts) {
      const imp = bp.box.pallet.import;
      const pallet = bp.box.pallet;

      if (!importMap.has(imp.id)) {
        importMap.set(imp.id, {
          importId: imp.id,
          importCode: imp.code,
          importDescription: imp.description,
          pallets: new Map(),
        });
      }

      const importEntry = importMap.get(imp.id)!;
      if (!importEntry.pallets.has(pallet.id)) {
        importEntry.pallets.set(pallet.id, {
          palletId: pallet.id,
          palletNumber: pallet.number,
          boxes: [],
        });
      }

      const palletEntry = importEntry.pallets.get(pallet.id)!;
      palletEntry.boxes.push({
        boxId: bp.box.id,
        boxNumber: bp.box.number,
        expectedQty: bp.expectedQty != null ? Number(bp.expectedQty) : null,
        supplierCode: bp.supplierCode,
      });
    }

    const imports = Array.from(importMap.values()).map((imp) => ({
      importId: imp.importId,
      importCode: imp.importCode,
      importDescription: imp.importDescription,
      pallets: Array.from(imp.pallets.values()).map((pal) => ({
        palletId: pal.palletId,
        palletNumber: pal.palletNumber,
        boxes: pal.boxes,
      })),
    }));

    const locations = await prisma.productLocationStock.findMany({
      where: { productId: id },
      include: {
        position: {
          include: {
            rack: {
              include: {
                zone: {
                  include: {
                    floor: {
                      include: { warehouse: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    });

    const locationData = locations.map((loc) => ({
      positionId: loc.positionId,
      positionCode: loc.position.code,
      theoreticalStock: Number(loc.theoreticalStock),
      minimumStock: loc.minimumStock != null ? Number(loc.minimumStock) : null,
      isPrimary: loc.isPrimary,
      source: loc.source,
      warehouse: loc.position.rack.zone.floor.warehouse.name,
      floor: loc.position.rack.zone.floor.name,
      zone: loc.position.rack.zone.name,
      rack: loc.position.rack.name,
      path: `${loc.position.rack.zone.floor.warehouse.name} / ${loc.position.rack.zone.floor.name} / ${loc.position.rack.zone.name} / ${loc.position.rack.name}`,
    }));

    const totalImportBoxes = boxProducts.length;
    const totalLocations = locations.length;
    const totalStock = locations.reduce((sum, loc) => sum + Number(loc.theoreticalStock), 0);

    return NextResponse.json({
      product,
      imports,
      locations: locationData,
      summary: {
        totalImportBoxes,
        totalLocations,
        totalStock,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
