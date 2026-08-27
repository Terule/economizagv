import type { ListEntry, ProductPrice } from "@/lib/types";

const rank: Record<ProductPrice["type"], number> = {
  vigente: 0,
  cupom_aprovado: 1,
  histórico_desatualizado: 2,
};

export function recommendedPrice(
  prices: ProductPrice[],
): ProductPrice | undefined {
  if (!prices.length) return undefined;
  const bestRank = Math.min(...prices.map((price) => rank[price.type]));
  return prices
    .filter((price) => rank[price.type] === bestRank)
    .sort((a, b) => a.amount - b.amount)[0];
}

export function entryPrice(entry: ListEntry): {
  amount?: number;
  source: string;
  market?: string;
  stale: boolean;
} {
  if (entry.manualPrice !== undefined)
    return { amount: entry.manualPrice, source: "Preço manual", stale: false };
  const price = entry.product && recommendedPrice(entry.product.prices);
  return price
    ? {
        amount: price.amount,
        source: price.type.replaceAll("_", " "),
        market: price.market,
        stale: price.type === "histórico_desatualizado",
      }
    : { source: "Sem preço", stale: false };
}

export function splitList(entries: ListEntry[]) {
  return entries.reduce<
    Record<
      string,
      { district?: string; entries: ListEntry[]; total: number; stale: boolean }
    >
  >((groups, entry) => {
    const chosen = entry.product && recommendedPrice(entry.product.prices);
    const key = chosen?.market ?? "Itens sem supermercado";
    const result = groups[key] ?? {
      district: chosen?.district,
      entries: [],
      total: 0,
      stale: false,
    };
    const price = entryPrice(entry);
    result.entries.push(entry);
    result.total += (price.amount ?? 0) * entry.quantity;
    result.stale ||= price.stale;
    groups[key] = result;
    return groups;
  }, {});
}
