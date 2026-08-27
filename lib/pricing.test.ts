import { describe, expect, it } from "vitest";
import { recommendedPrice } from "@/lib/pricing";

describe("recommendedPrice", () => {
  it("prioritizes current prices even when a historical price is lower", () => {
    expect(
      recommendedPrice([
        {
          id: "old",
          market: "A",
          district: "X",
          amount: 1,
          type: "histórico_desatualizado",
          referenceDate: "Ontem",
        },
        {
          id: "now",
          market: "B",
          district: "Y",
          amount: 2,
          type: "vigente",
          referenceDate: "Hoje",
        },
      ])?.id,
    ).toBe("now");
  });
});
