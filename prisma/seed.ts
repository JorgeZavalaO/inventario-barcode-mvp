import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@stockscan.app" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@stockscan.app",
      passwordHash,
    },
  });
  console.log(`User created: ${user.email}`);

  const demoProducts = [
    { code: "MANG-001", barcode: "7750000000017", description: "Manguera hidráulica 1/2 pulgada", unit: "MTR", category: "Mangueras", theoreticalStock: 24 },
    { code: "TERM-001", barcode: "7750000000024", description: "Terminal JIC hembra 1/2 pulgada", unit: "UND", category: "Terminales", theoreticalStock: 40 },
    { code: "ADAP-001", barcode: "7750000000031", description: "Adaptador BSP 1/2 a 3/8", unit: "UND", category: "Adaptadores", theoreticalStock: 18 },
    { code: "ABRA-001", barcode: "7750000000048", description: "Abrazadera inoxidable 25 mm", unit: "UND", category: "Abrazaderas", theoreticalStock: 75 },
    { code: "ACEI-001", barcode: "7750000000055", description: "Aceite hidráulico ISO 68 - galón", unit: "GLN", category: "Lubricantes", theoreticalStock: 12 },
  ];

  for (const product of demoProducts) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: {},
      create: product,
    });
  }
  console.log(`Products created: ${demoProducts.length}`);

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
