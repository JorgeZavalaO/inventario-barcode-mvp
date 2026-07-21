import { prisma } from "@/lib/prisma";

export async function findById(id: string) {
  return prisma.operator.findUnique({ where: { id } });
}

export async function findByName(name: string) {
  return prisma.operator.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
}

export async function create(name: string) {
  const { randomUUID } = await import("node:crypto");
  return prisma.operator.create({
    data: { id: randomUUID(), name },
  });
}

export async function upsertParticipant(sessionId: string, operatorId: string) {
  return prisma.sessionParticipant.upsert({
    where: { sessionId_operatorId: { sessionId, operatorId } },
    update: { lastSeenAt: new Date() },
    create: { sessionId, operatorId },
  });
}
