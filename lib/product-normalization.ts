export type NormalizedProduct = {
  name: string;
  normalized: string;
  brand: string | null;
  variant: string | null;
  packageSize: string | null;
  unit: string | null;
};

const brands = [
  "3 Corações",
  "Nescafé",
  "Piraquê",
  "Itambé",
  "Melitta",
  "Pilão",
  "Mili",
  "Lola",
  "Ypê",
  "Lor",
  "Omo",
];
const categoryWords = new Set([
  "cafe",
  "café",
  "folha",
  "papel",
  "detergente",
  "leite",
  "biscoito",
  "capsula",
  "cápsula",
  "shampoo",
  "sabao",
  "sabão",
  "sabonete",
]);
const packagePattern =
  /\b(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|m|metros?|unidades?|unid(?:\.)?|capsulas?|cápsulas?)\b/gi;

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function canonicalUnit(unit: string) {
  const value = unit.toLowerCase().replace(".", "");
  if (value.startsWith("metro") || value === "m") return "m";
  if (value.startsWith("unid")) return "un";
  if (value.startsWith("caps")) return "cápsulas";
  return value;
}

function findBrand(value: string) {
  return (
    brands.find((brand) =>
      new RegExp(`\\b${brand.replace(" ", "\\s+")}\\b`, "i").test(value),
    ) ?? null
  );
}

export function normalizeProduct(rawName: string): NormalizedProduct {
  const name = rawName.replace(/\|/g, " · ").replace(/\s+/g, " ").trim();
  const packages = [...name.matchAll(packagePattern)].map(
    ([, amount, unit]) => `${amount.replace(",", ".")} ${canonicalUnit(unit)}`,
  );
  const brand = findBrand(name);
  const variantSource = name
    .replace(packagePattern, " ")
    .replace(/\|/g, " ")
    .replace(brand ?? "", " ");
  const variantWords = variantSource
    .split(/\s+/)
    .filter(
      (word) => word.length > 1 && !categoryWords.has(word.toLowerCase()),
    );
  const variant = variantWords.join(" ").trim() || null;
  const packageSize = packages.join(" · ") || null;

  return {
    name,
    normalized: toSlug(
      name
        .replace(
          packagePattern,
          (_, amount: string, unit: string) =>
            `${amount.replace(",", ".")}${canonicalUnit(unit)}`,
        )
        .replace(/\|/g, " "),
    ),
    brand,
    variant,
    packageSize,
    unit:
      packages.length === 1 ? (packages[0].split(" ").at(-1) ?? null) : null,
  };
}
