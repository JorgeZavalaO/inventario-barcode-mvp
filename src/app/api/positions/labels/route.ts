import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const rackId = request.nextUrl.searchParams.get("rackId");
    const floorId = request.nextUrl.searchParams.get("floorId");
    const positionId = request.nextUrl.searchParams.get("positionId");

    const where: any = { active: true };
    if (rackId) where.rackId = rackId;
    if (floorId) where.rack = { zone: { floorId } };
    if (positionId) where.id = positionId;

    const positions = await prisma.storagePosition.findMany({
      where,
      include: {
        rack: {
          include: {
            zone: {
              include: { floor: { include: { warehouse: true } } },
            },
          },
        },
        compartment: true,
        depthSlot: true,
      },
      orderBy: { code: "asc" },
    });

    const labels = positions.map((p) => ({
      id: p.id,
      code: p.code,
      qrValue: p.qrValue,
      warehouseName: p.rack.zone.floor.warehouse.name,
      floorName: p.rack.zone.floor.name,
      zoneName: p.rack.zone.name,
      rackName: p.rack.name,
      rackCode: p.rack.code,
      compartmentName: p.compartment.name,
      depthName: p.depthSlot.name,
    }));

    return NextResponse.json({ labels, total: labels.length });
  } catch (error) {
    return apiError(error);
  }
}
