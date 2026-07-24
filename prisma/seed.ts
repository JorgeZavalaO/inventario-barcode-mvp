import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== SEED COMPLETO ===\n");

  // ============================================================
  // PASO 1: USUARIO ADMIN
  // ============================================================
  console.log("PASO 1: Creando usuario admin...");
  const passwordHash = await bcrypt.hash("admin123", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@stockscan.app" },
    update: {},
    create: { id: randomUUID(), name: "Admin", email: "admin@stockscan.app", passwordHash, role: "ADMIN" },
  });
  console.log(`  Usuario: ${user.email} (${user.role})\n`);

  // ============================================================
  // PASO 2: OPERARIOS / CONTADORES
  // ============================================================
  console.log("PASO 2: Creando operarios...");
  const operatorNames = [
    "Emma", "Noelis", "Rafael", "Sandra", "Yuleidy",
    "Robert", "Edwin", "Yanina", "Henry", "Estefanía",
    "Eveling", "Irma", "Hellen", "Richard",
  ];

  for (const name of operatorNames) {
    const existing = await prisma.operator.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    if (!existing) {
      await prisma.operator.create({ data: { id: randomUUID(), name } });
    }
  }
  console.log(`  ${operatorNames.length} operarios creados\n`);

  // ============================================================
  // PASO 3: PRODUCTOS
  // ============================================================
  console.log("PASO 3: Creando productos...");
  const productsData = [
    { code: "MANG-001", barcode: "7750000000017", description: "Manguera hidráulica 1/2 pulgada", unit: "MTR", category: "Mangueras" },
    { code: "TERM-001", barcode: "7750000000024", description: "Terminal JIC hembra 1/2 pulgada", unit: "UND", category: "Terminales" },
    { code: "ADAP-001", barcode: "7750000000031", description: "Adaptador BSP 1/2 a 3/8", unit: "UND", category: "Adaptadores" },
    { code: "ABRA-001", barcode: "7750000000048", description: "Abrazadera inoxidable 25 mm", unit: "UND", category: "Abrazaderas" },
    { code: "ACEI-001", barcode: "7750000000055", description: "Aceite hidráulico ISO 68 - galón", unit: "GLN", category: "Lubricantes" },
    { code: "FILT-001", barcode: "7750000000062", description: "Filtro de aceite hidráulico", unit: "UND", category: "Filtros" },
    { code: "BRID-001", barcode: "7750000000079", description: "Brida SAE 1/2 pulgada", unit: "UND", category: "Bridas" },
    { code: "OSEL-001", barcode: "7750000000086", description: "O-ring 1/2 pulgada", unit: "UND", category: "Sellos" },
  ];

  const products: Awaited<ReturnType<typeof prisma.product.upsert>>[] = [];
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: { id: randomUUID(), ...p, theoreticalStock: 0 },
    });
    products.push(product);
  }
  console.log(`  ${products.length} productos creados\n`);

  // ============================================================
  // PASO 4: ESTRUCTURA FÍSICA DEL ALMACÉN
  // ============================================================
  console.log("PASO 4: Creando estructura del almacén...");

  const warehouse = await prisma.warehouse.upsert({
    where: { code: "AP" },
    update: {},
    create: { id: randomUUID(), code: "AP", name: "Almacén Principal" },
  });
  console.log(`  Almacén: ${warehouse.code} - ${warehouse.name}`);

  const floor = await prisma.floor.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: "P01" } },
    update: {},
    create: { id: randomUUID(), warehouseId: warehouse.id, code: "P01", name: "Piso 1", orderIndex: 0 },
  });
  console.log(`  Piso: ${floor.code} - ${floor.name}`);

  const zone = await prisma.warehouseZone.upsert({
    where: { floorId_code: { floorId: floor.id, code: "Z01" } },
    update: {},
    create: { id: randomUUID(), floorId: floor.id, code: "Z01", name: "Zona A", orderIndex: 0 },
  });
  console.log(`  Zona: ${zone.code} - ${zone.name}\n`);

  // ============================================================
  // PASO 5: RACKS Y COMPARTIMENTOS
  // ============================================================
  console.log("PASO 5: Creando racks y compartimentos...");

  const rack = await prisma.rack.upsert({
    where: { zoneId_code: { zoneId: zone.id, code: "R001" } },
    update: {},
    create: {
      id: randomUUID(), zoneId: zone.id, code: "R001", name: "Rack 1",
      widthMm: 2000, heightMm: 2000, depthMm: 600, orderIndex: 0, version: 1,
    },
  });
  console.log(`  Rack: ${rack.code} - ${rack.name}`);

  const compartmentsData = [
    { code: "N01", name: "Nivel 1", x: 0, y: 0, width: 10000, height: 3333, columnCount: 2, stackLevels: 3, orderIndex: 0 },
    { code: "N02", name: "Nivel 2", x: 0, y: 3333, width: 10000, height: 3333, columnCount: 2, stackLevels: 3, orderIndex: 1 },
    { code: "N03", name: "Nivel 3", x: 0, y: 6666, width: 10000, height: 3334, columnCount: 1, stackLevels: 2, orderIndex: 2 },
  ];

  for (const comp of compartmentsData) {
    const compartment = await prisma.rackCompartment.upsert({
      where: { rackId_code: { rackId: rack.id, code: comp.code } },
      update: {},
      create: { id: randomUUID(), rackId: rack.id, ...comp },
    });
    console.log(`    Compartimento: ${compartment.code} - ${compartment.name} (${compartment.columnCount} cols × ${compartment.stackLevels} stacks)`);

    // Crear depth slots para cada compartimento
    const depthDefinitions = [
      { code: "P01", name: "Frente", kind: "FRONT" as const, depthIndex: 0 },
      { code: "P02", name: "Centro", kind: "MIDDLE" as const, depthIndex: 1 },
      { code: "P03", name: "Fondo", kind: "BACK" as const, depthIndex: 2 },
    ];

    for (const depth of depthDefinitions) {
      await prisma.rackDepthSlot.upsert({
        where: { compartmentId_code: { compartmentId: compartment.id, code: depth.code } },
        update: {},
        create: { id: randomUUID(), compartmentId: compartment.id, ...depth },
      });
    }
    console.log(`      Depth slots: ${depthDefinitions.map(d => d.code).join(", ")}`);
  }
  console.log();

  // ============================================================
  // PASO 6: GENERAR POSICIONES FÍSICAS
  // ============================================================
  console.log("PASO 6: Generando posiciones físicas...");

  const allCompartments = await prisma.rackCompartment.findMany({
    where: { rackId: rack.id, active: true },
    include: { depthSlots: { where: { active: true }, orderBy: { depthIndex: "asc" } } },
    orderBy: { orderIndex: "asc" },
  });

  let totalPositions = 0;
  for (const comp of allCompartments) {
    for (const depth of comp.depthSlots) {
      for (let col = 1; col <= comp.columnCount; col++) {
        for (let stack = 1; stack <= comp.stackLevels; stack++) {
          const code = `${rack.code}-${comp.code}-${depth.code}-C${String(col).padStart(2, "0")}-F${String(stack).padStart(2, "0")}`;
          const existing = await prisma.storagePosition.findFirst({ where: { code, rackId: rack.id } });
          if (!existing) {
            await prisma.storagePosition.create({
              data: {
                id: randomUUID(), rackId: rack.id, compartmentId: comp.id, depthSlotId: depth.id,
                columnIndex: col, stackIndex: stack, code,
                qrValue: `LOC:v1:${randomUUID()}`,
              },
            });
            totalPositions++;
          }
        }
      }
    }
  }
  console.log(`  ${totalPositions} posiciones creadas\n`);

  // ============================================================
  // PASO 7: IMPORTACIONES, PALLETS Y CAJAS
  // ============================================================
  console.log("PASO 7: Creando importaciones, pallets y cajas...");

  const importsData = [
    {
      code: "IMP-2024-001",
      description: "Importación Enero 2024 - Hidráulicos",
      pallets: [
        {
          number: "PAL-01",
          boxes: [
            { number: "CAJA-001", products: [
              { code: "MANG-001", qty: 10 },
              { code: "TERM-001", qty: 20 },
            ]},
            { number: "CAJA-002", products: [
              { code: "ADAP-001", qty: 15 },
              { code: "ABRA-001", qty: 30 },
            ]},
          ],
        },
        {
          number: "PAL-02",
          boxes: [
            { number: "CAJA-003", products: [
              { code: "ACEI-001", qty: 8 },
              { code: "FILT-001", qty: 12 },
            ]},
          ],
        },
      ],
    },
    {
      code: "IMP-2024-002",
      description: "Importación Febrero 2024 - Accesorios",
      pallets: [
        {
          number: "PAL-01",
          boxes: [
            { number: "CAJA-001", products: [
              { code: "BRID-001", qty: 25 },
              { code: "OSEL-001", qty: 50 },
            ]},
            { number: "CAJA-002", products: [
              { code: "MANG-001", qty: 5 },
              { code: "ADAP-001", qty: 10 },
            ]},
          ],
        },
      ],
    },
  ];

  for (const impData of importsData) {
    const imp = await prisma.import.upsert({
      where: { code: impData.code },
      update: {},
      create: { id: randomUUID(), code: impData.code, description: impData.description },
    });
    console.log(`  Importación: ${imp.code} - ${imp.description}`);

    for (const palData of impData.pallets) {
      const pallet = await prisma.pallet.upsert({
        where: { importId_number: { importId: imp.id, number: palData.number } },
        update: {},
        create: { id: randomUUID(), importId: imp.id, number: palData.number },
      });
      console.log(`    Pallet: ${pallet.number}`);

      for (const boxData of palData.boxes) {
        const box = await prisma.box.upsert({
          where: { palletId_number: { palletId: pallet.id, number: boxData.number } },
          update: {},
          create: { id: randomUUID(), palletId: pallet.id, number: boxData.number },
        });
        console.log(`      Caja: ${box.number}`);

        for (const bp of boxData.products) {
          const product = products.find(p => p.code === bp.code);
          if (product) {
            await prisma.boxProduct.upsert({
              where: { boxId_productId: { boxId: box.id, productId: product.id } },
              update: {},
              create: { id: randomUUID(), boxId: box.id, productId: product.id, orderIndex: 0, expectedQty: bp.qty },
            });
            console.log(`        Producto: ${product.code} (${product.description}) - ${bp.qty} unds`);
          }
        }
      }
    }
  }
  console.log();

  // ============================================================
  // PASO 8: STOCK TEÓRICO POR POSICIÓN
  // ============================================================
  console.log("PASO 8: Asignando stock teórico por posición...");

  const allPositions = await prisma.storagePosition.findMany({
    where: { rackId: rack.id, active: true },
    orderBy: { code: "asc" },
  });

  const stockAssignments = [
    { positionCode: "R001-N01-P01-C01-F01", productCode: "MANG-001", stock: 10 },
    { positionCode: "R001-N01-P01-C01-F02", productCode: "TERM-001", stock: 20 },
    { positionCode: "R001-N01-P01-C02-F01", productCode: "ADAP-001", stock: 15 },
    { positionCode: "R001-N01-P01-C02-F02", productCode: "ABRA-001", stock: 30 },
    { positionCode: "R001-N02-P01-C01-F01", productCode: "ACEI-001", stock: 8 },
    { positionCode: "R001-N02-P01-C01-F02", productCode: "FILT-001", stock: 12 },
    { positionCode: "R001-N02-P01-C02-F01", productCode: "BRID-001", stock: 25 },
    { positionCode: "R001-N02-P01-C02-F02", productCode: "OSEL-001", stock: 50 },
  ];

  for (const assignment of stockAssignments) {
    const position = allPositions.find(p => p.code === assignment.positionCode);
    const product = products.find(p => p.code === assignment.productCode);
    if (position && product) {
      await prisma.productLocationStock.upsert({
        where: { productId_positionId: { productId: product.id, positionId: position.id } },
        update: {},
        create: { id: randomUUID(), productId: product.id, positionId: position.id, theoreticalStock: assignment.stock, isPrimary: true },
      });
      console.log(`  ${assignment.positionCode}: ${assignment.productCode} = ${assignment.stock} unds`);
    }
  }
  console.log();

  // ============================================================
  // RESUMEN
  // ============================================================
  console.log("=== RESUMEN ===");
  console.log(`  Usuarios: 1 (admin@stockscan.app / admin123)`);
  console.log(`  Operarios: ${operatorNames.length}`);
  console.log(`  Productos: ${products.length}`);
  console.log(`  Almacenes: 1 (${warehouse.code})`);
  console.log(`  Pisos: 1 (${floor.code})`);
  console.log(`  Zonas: 1 (${zone.code})`);
  console.log(`  Racks: 1 (${rack.code})`);
  console.log(`  Compartimentos: ${allCompartments.length}`);
  console.log(`  Posiciones: ${totalPositions}`);
  console.log(`  Importaciones: ${importsData.length}`);
  console.log(`  Pallets: ${importsData.reduce((s, i) => s + i.pallets.length, 0)}`);
  console.log(`  Cajas: ${importsData.reduce((s, i) => s + i.pallets.reduce((s2, p) => s2 + p.boxes.length, 0), 0)}`);
  console.log(`  Stock asignado: ${stockAssignments.length} posiciones`);
  console.log("\nSeed completado exitosamente!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
