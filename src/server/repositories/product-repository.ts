import { prisma } from "@/lib/prisma";

export type ProductRow = {
  id: string;
  code: string;
  barcode: string | null;
  description: string;
  unit: string;
  category: string | null;
  theoreticalStock: number;
  active: boolean;
};

export async function findActiveByCode(code: string): Promise<ProductRow | null> {
  const product = await prisma.product.findFirst({
    where: { active: true, OR: [{ barcode: code }, { code }] },
  });
  if (!product) return null;
  return {
    ...product,
    barcode: product.barcode,
    category: product.category,
    theoreticalStock: Number(product.theoreticalStock),
  };
}

export async function findActiveById(id: string): Promise<ProductRow | null> {
  const product = await prisma.product.findFirst({
    where: { id, active: true },
  });
  if (!product) return null;
  return {
    ...product,
    barcode: product.barcode,
    category: product.category,
    theoreticalStock: Number(product.theoreticalStock),
  };
}

export async function searchProducts(search: string): Promise<ProductRow[]> {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      OR: [
        { code: { contains: search } },
        { barcode: { contains: search } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    },
    orderBy: { description: "asc" },
  });
  return products.map((p) => ({
    ...p,
    barcode: p.barcode,
    category: p.category,
    theoreticalStock: Number(p.theoreticalStock),
  }));
}

export async function findAllActive(): Promise<ProductRow[]> {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { description: "asc" },
  });
  return products.map((p) => ({
    ...p,
    barcode: p.barcode,
    category: p.category,
    theoreticalStock: Number(p.theoreticalStock),
  }));
}
