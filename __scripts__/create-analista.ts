import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Creando usuario analista@dimahisac.com...");

  const passwordHash = await bcrypt.hash("Bless159", 12);

  const user = await prisma.user.upsert({
    where: { email: "analista@dimahisac.com" },
    update: { passwordHash, name: "Analista Dimahisa", role: "ADMIN" },
    create: {
      id: "analista-dimahisa",
      name: "Analista Dimahisa",
      email: "analista@dimahisac.com",
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log(`Usuario creado: ${user.email} (${user.role})`);
  console.log("Contraseña: Bless159");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());