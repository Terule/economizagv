import { describe, expect, it } from "vitest";
import { extractFlyerOffers } from "./flyer-ocr";

describe("extractFlyerOffers", () => {
  it("keeps a product with a descriptive name and package", () => {
    expect(extractFlyerOffers("Café Pilão 500g\nR$ 25,90")).toEqual([
      { name: "Café Pilão 500g", price: 25.9, confidence: 0.9 },
    ]);
  });

  it("rejects merged OCR lines that contain several products", () => {
    expect(
      extractFlyerOffers(
        "Fragrâncias | 500ml Colageno Lifter | 100ml Milk | Soft Milk | 400ml\nR$ 54,90",
      ),
    ).toEqual([]);
  });
});
