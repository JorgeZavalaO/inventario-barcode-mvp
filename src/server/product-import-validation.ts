import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const productImportRowSchema = z.object({
  code: z.string().trim().min(1),
  barcode: z.string().trim().optional(),
  description: z.string().trim().min(1),
  unit: z.string().trim().optional(),
  category: z.string().trim().optional(),
  supplierCode: z.string().trim().optional(),
  theoreticalStock: z.coerce.number().min(0).optional(),
  importCode: z.string().trim().optional(),
  palletNumber: z.string().trim().optional(),
  boxNumber: z.string().trim().optional(),
  expectedQty: z.coerce.number().min(0).optional(),
});

export const productImportSchema = z.object({
  products: z.array(productImportRowSchema).min(1).max(6500),
});

export type ProductImportRow = z.infer<typeof productImportRowSchema>;

export type ProductImportValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    rows: number;
    newProducts: number;
    existingProducts: number;
    newImports: number;
    newPallets: number;
    newBoxes: number;
    newLinks: number;
    existingLinks: number;
  };
};

function normalized(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export async function validateProductImport(products: ProductImportRow[]): Promise<ProductImportValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const codes = new Map<string, { row: number; product: ProductImportRow; locationKey: string }>();
  const barcodes = new Map<string, { row: number; code: string }>();

  for (const [index, product] of products.entries()) {
    const row = index + 2;
    const code = normalized(product.code);
    const barcode = normalized(product.barcode);
    const hasImport = Boolean(product.importCode?.trim());
    const hasBox = Boolean(product.boxNumber?.trim());
    const locationKey = hasImport && hasBox
      ? `${normalized(product.importCode)}::${normalized(product.palletNumber?.trim() || "SIN_PALLET")}::${normalized(product.boxNumber)}`
      : "";
    const locationLabel = `${product.importCode?.trim() || "SIN_IMPORTACION"} / ${product.palletNumber?.trim() || "SIN_PALLET"} / ${product.boxNumber?.trim() || "SIN_CAJA"}`;

    const previousCode = codes.get(code);
    if (previousCode) {
      const sameCatalogData = previousCode.product.description === product.description
        && (previousCode.product.unit || "UND") === (product.unit || "UND")
        && (previousCode.product.category || "") === (product.category || "")
        && (previousCode.product.supplierCode || "") === (product.supplierCode || "")
        && normalized(previousCode.product.barcode) === barcode
        && (previousCode.product.theoreticalStock ?? 0) === (product.theoreticalStock ?? 0);
      if (!previousCode.locationKey || !locationKey || previousCode.locationKey === locationKey) {
        errors.push(`Fila ${row}: el código ${product.code} está repetido en ${locationLabel} (fila ${previousCode.row}). Elimina la fila duplicada o consolida su cantidad esperada.`);
      } else if (!sameCatalogData) {
        errors.push(`Fila ${row}: el código ${product.code} aparece en otra ubicación con datos maestros diferentes (fila ${previousCode.row}).`);
      }
    } else {
      codes.set(code, { row, product, locationKey });
    }

    if (barcode) {
      const previous = barcodes.get(barcode);
      if (previous && previous.code !== code) {
        errors.push(`Fila ${row}: el código de barras ${product.barcode} está asignado a ${previous.code} en la fila ${previous.row}.`);
      } else {
        barcodes.set(barcode, { row, code });
      }
    }

    const hasPallet = Boolean(product.palletNumber?.trim());
    if (hasImport !== hasBox) {
      errors.push(`Fila ${row}: importación y caja deben venir juntas.`);
    }
    if (hasPallet && !hasImport) {
      errors.push(`Fila ${row}: el pallet requiere una importación y una caja.`);
    }
  }

  const codeValues = Array.from(codes.keys());
  const barcodeValues = Array.from(barcodes.keys());
  const [existingProducts, existingBarcodes, existingImports] = await Promise.all([
    codeValues.length > 0
      ? prisma.product.findMany({
          where: { OR: codeValues.map((code) => ({ code: { equals: code, mode: "insensitive" as const } })) },
          select: { id: true, code: true, barcode: true, description: true, unit: true, category: true, supplierCode: true, theoreticalStock: true },
        })
      : [],
    barcodeValues.length > 0
      ? prisma.product.findMany({
          where: { OR: barcodeValues.map((barcode) => ({ barcode: { equals: barcode, mode: "insensitive" as const } })) },
          select: { id: true, code: true, barcode: true },
        })
      : [],
    prisma.import.findMany({
      where: { OR: Array.from(new Set(products.map((product) => product.importCode?.trim()).filter(Boolean))).map((code) => ({ code: { equals: code, mode: "insensitive" as const } })) },
      include: {
        pallets: {
          include: {
            boxes: { include: { boxProducts: { select: { productId: true, expectedQty: true } } } },
          },
        },
      },
    }),
  ]);

  const productsByCode = new Map(existingProducts.map((product) => [normalized(product.code), product]));
  const productsByBarcode = new Map(existingBarcodes.filter((product) => product.barcode).map((product) => [normalized(product.barcode!), product]));

  for (const [code, entry] of codes) {
    const existing = productsByCode.get(code);
    if (!existing) continue;
    const changes = [
      existing.description !== entry.product.description && "descripción",
      existing.unit !== (entry.product.unit || "UND") && "unidad",
      (existing.category ?? "") !== (entry.product.category || "") && "categoría",
      (existing.supplierCode ?? "") !== (entry.product.supplierCode || "") && "código de proveedor",
      Number(existing.theoreticalStock) !== (entry.product.theoreticalStock ?? 0) && "stock teórico",
    ].filter(Boolean);
    const existingBarcode = normalized(existing.barcode);
    if (existingBarcode !== normalized(entry.product.barcode)) changes.push("barcode");
    if (changes.length > 0) warnings.push(`Fila ${entry.row}: el producto ${entry.product.code} ya existe y actualizará ${changes.join(", ")}.`);
  }

  for (const [barcode, entry] of barcodes) {
    const existing = productsByBarcode.get(barcode);
    if (existing && normalized(existing.code) !== entry.code) {
      errors.push(`Fila ${entry.row}: el código de barras ${entry.code} ya pertenece al producto ${existing.code}.`);
    }
  }

  const importsByCode = new Map(existingImports.map((imp) => [normalized(imp.code), imp]));
  const newImportKeys = new Set<string>();
  const newPalletKeys = new Set<string>();
  const newBoxKeys = new Set<string>();
  const newLinkKeys = new Set<string>();
  let existingLinks = 0;

  for (const [index, product] of products.entries()) {
    if (!product.importCode?.trim() || !product.boxNumber?.trim()) continue;
    const row = index + 2;
    const importKey = normalized(product.importCode);
    const palletNumber = normalized(product.palletNumber?.trim() || "SIN_PALLET");
    const boxNumber = normalized(product.boxNumber);
    const importRecord = importsByCode.get(importKey);
    const pallet = importRecord?.pallets.find((item) => normalized(item.number) === palletNumber);
    const box = pallet?.boxes.find((item) => normalized(item.number) === boxNumber);
    const productRecord = productsByCode.get(normalized(product.code));

    if (!importRecord) newImportKeys.add(importKey);
    if (!pallet) newPalletKeys.add(`${importKey}::${palletNumber}`);
    if (!box) newBoxKeys.add(`${importKey}::${palletNumber}::${boxNumber}`);

    if (!box || !productRecord) {
      newLinkKeys.add(`${importKey}::${palletNumber}::${boxNumber}::${normalized(product.code)}`);
      continue;
    }

    const existingLink = box.boxProducts.find((link) => link.productId === productRecord.id);
    if (existingLink) {
      existingLinks += 1;
      if (product.expectedQty !== undefined && Number(existingLink.expectedQty ?? 0) !== product.expectedQty) {
        warnings.push(`Fila ${row}: la cantidad esperada de ${product.code} en ${product.importCode}/${product.palletNumber || "SIN_PALLET"}/${product.boxNumber} cambiará de ${existingLink.expectedQty ?? 0} a ${product.expectedQty}.`);
      }
    } else {
      newLinkKeys.add(`${importKey}::${palletNumber}::${boxNumber}::${normalized(product.code)}`);
    }
  }

  const candidateBoxKeys = new Set(Array.from(newLinkKeys).map((key) => key.split("::").slice(0, 3).join("::")));
  for (const boxKey of candidateBoxKeys) {
    const [importKey, palletNumber, boxNumber] = boxKey.split("::");
    const importRecord = importsByCode.get(importKey);
    const pallet = importRecord?.pallets.find((item) => normalized(item.number) === palletNumber);
    const box = pallet?.boxes.find((item) => normalized(item.number) === boxNumber);
    const existingCount = box?.boxProducts.length ?? 0;
    const incomingCount = Array.from(newLinkKeys).filter((key) => key.startsWith(`${boxKey}::`)).length;
    if (existingCount + incomingCount > 3) {
      errors.push(`La caja ${importKey}/${palletNumber}/${boxNumber} superaría el máximo de 3 productos.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      rows: products.length,
      newProducts: Array.from(codes.keys()).filter((code) => !productsByCode.has(code)).length,
      existingProducts: Array.from(codes.keys()).filter((code) => productsByCode.has(code)).length,
      newImports: newImportKeys.size,
      newPallets: newPalletKeys.size,
      newBoxes: newBoxKeys.size,
      newLinks: newLinkKeys.size,
      existingLinks,
    },
  };
}
