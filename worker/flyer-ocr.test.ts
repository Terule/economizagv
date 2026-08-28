import { describe, expect, it } from "vitest";
import { extractFlyerOffers, extractFlyerValidity } from "./flyer-ocr";

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

describe("extractFlyerValidity", () => {
  it("reads the printed date range and keeps the final day valid", () => {
    const validity = extractFlyerValidity(
      "Ofertas com validade de 18/12/2026 até 24/12/2026",
    );
    expect(validity?.validFrom).toEqual(new Date(2026, 11, 18));
    expect(validity?.validUntil).toEqual(
      new Date(2026, 11, 24, 23, 59, 59, 999),
    );
  });

  it("does not invent a validity when the flyer does not state one", () => {
    expect(extractFlyerValidity("Ofertas especiais da semana")).toBeNull();
  });
});
