export type PriceType =
  | "vigente"
  | "cupom_aprovado"
  | "histórico_desatualizado"
  | "manual_privado";

export type ProductPrice = {
  id: string;
  market: string;
  district: string;
  amount: number;
  type: Exclude<PriceType, "manual_privado">;
  referenceDate: string;
  validUntil?: string;
  image?: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  packageSize: string;
  image?: string;
  marketImages?: { market: string; url: string }[];
  prices: ProductPrice[];
  alternatives?: { name: string; amount: number; market: string }[];
};

export type ValueSuggestion = {
  product: CatalogProduct;
  price: ProductPrice;
  unitPrice: number;
  unit: "L" | "kg" | "un";
  savingsPercent: number;
};

export type ListEntry = {
  id: string;
  label: string;
  quantity: number;
  product?: CatalogProduct;
  manualPrice?: number;
};
