import { describe, expect, it } from "vitest";
import { findBetterPackages, parsePackageMeasure } from "./value-suggestions";

describe("value suggestions", () => {
  it("suggests a larger package with a lower price per litre", () => {
    const suggestions = findBetterPackages(
      {
        id: "omo-5l",
        name: "Sabão líquido Omo 5 L",
        brand: "Omo",
        variant: "líquido",
        packageSize: "5 L",
        prices: [{ amount: 50 }],
      },
      [
        {
          id: "omo-7l",
          name: "Sabão líquido Omo 7 L",
          brand: "Omo",
          variant: "líquido",
          packageSize: "7 L",
          prices: [{ amount: 60 }],
        },
      ],
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].unitPrice).toBeCloseTo(60 / 7);
    expect(suggestions[0].savingsPercent).toBeCloseTo(100 / 7);
  });

  it("rejects different families, smaller packages, and equal unit prices", () => {
    const source = {
      id: "omo-5l",
      name: "Sabão líquido Omo 5 L",
      brand: "Omo",
      variant: "líquido",
      packageSize: "5 L",
      prices: [{ amount: 50 }],
    };
    expect(
      findBetterPackages(source, [
        {
          ...source,
          id: "ype-7l",
          brand: "Ypê",
          packageSize: "7 L",
          prices: [{ amount: 60 }],
        },
        {
          ...source,
          id: "omo-3l",
          packageSize: "3 L",
          prices: [{ amount: 20 }],
        },
        {
          ...source,
          id: "omo-7l",
          packageSize: "7 L",
          prices: [{ amount: 70 }],
        },
      ]),
    ).toEqual([]);
  });

  it("normalizes volume, weight, and count to compatible base units", () => {
    expect(parsePackageMeasure("500 ml")).toEqual({
      amount: 0.5,
      baseUnit: "L",
    });
    expect(parsePackageMeasure("750 g")).toEqual({
      amount: 0.75,
      baseUnit: "kg",
    });
    expect(parsePackageMeasure("12 cápsulas")).toEqual({
      amount: 12,
      baseUnit: "un",
    });
    expect(parsePackageMeasure("12 un · 20 m")).toBeNull();
  });
});
