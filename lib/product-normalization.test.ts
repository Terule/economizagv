import { describe, expect, it } from "vitest";
import { normalizeProduct } from "./product-normalization";

describe("normalizeProduct", () => {
  it("merges formatting variants into one catalog key", () => {
    expect(normalizeProduct("Café Pilão Tradicional 500 g")).toMatchObject({
      normalized: "cafe-pilao-tradicional-500g",
      brand: "Pilão",
      variant: "Tradicional",
      packageSize: "500 g",
      unit: "g",
    });
    expect(normalizeProduct("cafe pilao tradicional 500g").normalized).toBe(
      "cafe-pilao-tradicional-500g",
    );
  });

  it("keeps multi-part packages explicit", () => {
    expect(
      normalizeProduct("Mili Folha Quadrupla 20 metros | 12 unidades"),
    ).toMatchObject({
      brand: "Mili",
      packageSize: "20 m · 12 un",
      unit: null,
    });
  });
});
