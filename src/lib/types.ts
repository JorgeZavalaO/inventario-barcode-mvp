export type Product = {
  id: string;
  code: string;
  barcode: string | null;
  description: string;
  unit: string;
  category: string | null;
  theoretical_stock: number;
  active: boolean;
};

export type InventorySession = {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  status: "OPEN" | "PAUSED" | "CLOSED";
  created_at: string;
  closed_at: string | null;
  product_count?: number;
  counted_products?: number;
  total_units?: number;
};

export type SessionProduct = Product & {
  counted: number;
  difference: number;
};

export type CountEvent = {
  id: string;
  operation_id: string;
  quantity: number;
  input_method: "CAMERA" | "MANUAL" | "USB";
  created_at: string;
  reversed_at: string | null;
  product_code: string;
  barcode: string | null;
  product_description: string;
  operator_name: string;
  operator_id: string;
};

export type Participant = {
  id: string;
  name: string;
  last_seen_at: string;
  active: boolean;
  scans: number;
  total_units: number;
};

export type SessionDetail = {
  session: InventorySession;
  products: SessionProduct[];
  events: CountEvent[];
  participants: Participant[];
  stats: {
    totalProducts: number;
    countedProducts: number;
    pendingProducts: number;
    matchingProducts: number;
    differentProducts: number;
    progress: number;
    totalUnits: number;
  };
};
