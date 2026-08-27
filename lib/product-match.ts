export type ProductMatchInput = {
  id: string;
  name: string;
  normalized: string;
  brand: string | null;
  packageSize: string | null;
};

export type ProductMatch = ProductMatchInput & { score: number };

function words(value: string) {
  return new Set(value.split("-").filter((word) => word.length > 2));
}

function similarity(left: string, right: string) {
  const a = words(left);
  const b = words(right);
  const common = [...a].filter((word) => b.has(word)).length;
  return common / Math.max(1, new Set([...a, ...b]).size);
}

export function productMatchScore(
  source: ProductMatchInput,
  candidate: ProductMatchInput,
) {
  if (source.id === candidate.id) return 0;
  if (
    source.brand &&
    candidate.brand &&
    source.brand.toLowerCase() !== candidate.brand.toLowerCase()
  )
    return 0;
  if (
    source.packageSize &&
    candidate.packageSize &&
    source.packageSize !== candidate.packageSize
  )
    return 0;
  if (source.normalized === candidate.normalized) return 1;
  return similarity(source.normalized, candidate.normalized);
}

export function findProductMatches(
  source: ProductMatchInput,
  candidates: ProductMatchInput[],
  limit = 3,
) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: productMatchScore(source, candidate),
    }))
    .filter((candidate) => candidate.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findDuplicatePairs(products: ProductMatchInput[], limit = 8) {
  const pairs: Array<{ source: ProductMatchInput; target: ProductMatch }> = [];
  for (const [index, source] of products.entries()) {
    const match = findProductMatches(source, products.slice(index + 1), 1)[0];
    if (match) pairs.push({ source, target: match });
  }
  return pairs.sort((a, b) => b.target.score - a.target.score).slice(0, limit);
}
