import { prisma } from "@/lib/prisma";

export type SessionRow = {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  status: "DRAFT" | "OPEN" | "PAUSED" | "CLOSED" | "CANCELLED";
  schemaVersion: number;
  createdAt: Date;
  closedAt: Date | null;
};

export async function findById(id: string): Promise<SessionRow | null> {
  const session = await prisma.inventorySession.findUnique({ where: { id } });
  if (!session) return null;
  return {
    ...session,
    closedAt: session.closedAt,
  };
}

export async function findActiveSessions() {
  const sessions = await prisma.inventorySession.findMany({
    where: { status: { in: ["OPEN", "PAUSED"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return sessions;
}

export async function createSession(data: {
  id: string;
  code: string;
  name: string;
  warehouse: string;
}) {
  return prisma.inventorySession.create({
    data: {
      id: data.id,
      code: data.code,
      name: data.name,
      warehouse: data.warehouse,
      status: "DRAFT",
      schemaVersion: 1,
    },
  });
}

export async function updateStatus(id: string, status: "OPEN" | "PAUSED" | "CLOSED" | "CANCELLED") {
  return prisma.inventorySession.update({
    where: { id },
    data: {
      status,
      ...(status === "CLOSED" ? { closedAt: new Date() } : {}),
    },
  });
}
