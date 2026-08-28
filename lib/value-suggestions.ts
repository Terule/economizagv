export type PackageMeasure = {
  amount: number;
  baseUnit: "L" | "kg" | "un";
};

export type ValueCandidate<TPrice> = {
  id: string;
  name: string;
  brand: string | null;
  variant: string | null;
  packageSize: string | null;
  prices: TPrice[];
};

export type CurrentPrice = { amount: number };

const measurePattern =
  /^(\d+(?:[.,]\d+)?)\s*(l|ml|kg|g|un(?:idades?)?|capsulas?|cápsulas?)$/i;

export function parsePackageMeasure(
  packageSize: string | null | undefined,
): PackageMeasure | null {
  if (!packageSize || packageSize.includes("·")) return null;
  const match = packageSize.trim().match(measurePattern);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2].toLowerCase();
  if (unit === "l") return { amount, baseUnit: "L" };
  if (unit === "ml") return { amount: amount / 1_000, baseUnit: "L" };
  if (unit === "kg") return { amount, baseUnit: "kg" };
  if (unit === "g") return { amount: amount / 1_000, baseUnit: "kg" };
  return { amount, baseUnit: "un" };
}

export function sameProductFamily(
  source: Pick<ValueCandidate<never>, "brand" | "variant">,
  candidate: Pick<ValueCandidate<never>, "brand" | "variant">,
) {
  return Boolean(
    source.brand &&
      source.variant &&
      candidate.brand &&
      candidate.variant &&
      source.brand.localeCompare(candidate.brand, "pt-BR", {
        sensitivity: "accent",
      }) === 0 &&
      source.variant.localeCompare(candidate.variant, "pt-BR", {
        sensitivity: "accent",
      }) === 0,
  );
}

export function findBetterPackages<TPrice extends CurrentPrice>(
  source: ValueCandidate<TPrice>,
  candidates: ValueCandidate<TPrice>[],
) {
  const sourceMeasure = parsePackageMeasure(source.packageSize);
  const sourcePrice = Math.min(...source.prices.map((price) => price.amount));
  if (!sourceMeasure || !Number.isFinite(sourcePrice)) return [];
  const sourceUnitPrice = sourcePrice / sourceMeasure.amount;

  return candidates
    .filter((candidate) => candidate.id !== source.id)
    .filter((candidate) => sameProductFamily(source, candidate))
    .flatMap((candidate) => {
      const measure = parsePackageMeasure(candidate.packageSize);
      if (
        !measure ||
        measure.baseUnit !== sourceMeasure.baseUnit ||
        measure.amount <= sourceMeasure.amount
      )
        return [];
      const price = candidate.prices.reduce((lowest, current) =>
        current.amount < lowest.amount ? current : lowest,
      );
      const unitPrice = price.amount / measure.amount;
      if (unitPrice >= sourceUnitPrice) return [];
      return [
        {
          candidate,
          price,
          measure,
          sourceMeasure,
          unitPrice,
          sourceUnitPrice,
          savingsPercent:
            ((sourceUnitPrice - unitPrice) / sourceUnitPrice) * 100,
        },
      ];
    })
    .sort((left, right) => right.savingsPercent - left.savingsPercent);
}
