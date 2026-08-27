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
};

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  packageSize: string;
  image?: string;
  prices: ProductPrice[];
  alternatives?: { name: string; amount: number; market: string }[];
};

export type ListEntry = {
  id: string;
  label: string;
  quantity: number;
  product?: CatalogProduct;
  manualPrice?: number;
};
