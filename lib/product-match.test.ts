import { describe, expect, it } from "vitest";
import { findProductMatches, productMatchScore } from "./product-match";

const pilao = {
  id: "pilao-1",
  name: "Café Pilão Tradicional 500 g",
  normalized: "cafe-pilao-tradicional-500g",
  brand: "Pilão",
  packageSize: "500 g",
};

describe("product matching", () => {
  it("suggests the same branded package despite a formatting difference", () => {
    expect(
      findProductMatches(
        { ...pilao, id: "pilao-2", normalized: "cafe-pilao-tradicional-500-g" },
        [pilao],
      )[0]?.id,
    ).toBe("pilao-1");
  });

  it("does not match conflicting brands or packages", () => {
    expect(
      productMatchScore(pilao, {
        ...pilao,
        id: "other",
        brand: "Melitta",
      }),
    ).toBe(0);
  });
});
