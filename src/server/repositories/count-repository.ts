import { prisma } from "@/lib/prisma";

export type CountEventRow = {
  id: string;
  operationId: string;
  sessionId: string;
  productId: string;
  operatorId: string;
  quantity: number;
  inputMethod: "CAMERA" | "MANUAL" | "USB";
  createdAt: Date;
  reversedAt: Date | null;
};

export async function findByOperationId(operationId: string) {
  return prisma.countEvent.findUnique({ where: { operationId } });
}

export async function createEvent(data: {
  id: string;
  operationId: string;
  sessionId: string;
  productId: string;
  operatorId: string;
  quantity: number;
  inputMethod: "CAMERA" | "MANUAL" | "USB";
}) {
  return prisma.countEvent.create({ data });
}

export async function getProductTotal(sessionId: string, productId: string): Promise<number> {
  const result = await prisma.countEvent.aggregate({
    where: { sessionId, productId, reversedAt: null },
    _sum: { quantity: true },
  });
  return Number(result._sum?.quantity ?? 0);
}

export async function reverseEvent(eventId: string) {
  return prisma.countEvent.update({
    where: { id: eventId },
    data: { reversedAt: new Date() },
  });
}
