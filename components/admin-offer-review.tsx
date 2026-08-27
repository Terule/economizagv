"use client";

import { useState, useTransition } from "react";

type PendingOffer = {
  id: string;
  productId: string;
  name: string;
  price: string;
  confidence: number;
  market: string;
  district: string;
  suggestions: Array<{ id: string; name: string; packageSize: string | null }>;
};

type DuplicatePair = {
  source: { id: string; name: string; packageSize: string | null };
  target: {
    id: string;
    name: string;
    packageSize: string | null;
    score: number;
  };
};

export function AdminOfferReview({
  offers,
  duplicatePairs,
}: {
  offers: PendingOffer[];
  duplicatePairs: DuplicatePair[];
}) {
  const [items, setItems] = useState(offers);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const decide = (
    id: string,
    decision: "APPROVED" | "REJECTED" | "LINK",
    productId?: string,
  ) => {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, productId }),
      });
      if (!response.ok) {
        setError("Não foi possível registrar a decisão.");
        return;
      }
      setItems((current) => current.filter((offer) => offer.id !== id));
    });
  };

  return (
    <>
      {items.length === 0 ? (
        <p className="empty">Nenhuma oferta OCR aguardando revisão.</p>
      ) : null}
      {items.map((offer) => (
        <article className="review-item" key={offer.id}>
          <span className="tag">OCR · {offer.confidence * 100}% confiança</span>
          <h3>{offer.name}</h3>
          <p>
            R$ {offer.price} · {offer.market} · {offer.district}
          </p>
          <span className="warning">Aguardando revisão</span>
          {offer.suggestions.length ? (
            <div className="product-suggestions">
              <b>Possíveis equivalentes</b>
              {offer.suggestions.map((product) => (
                <button
                  className="secondary small"
                  disabled={pending}
                  key={product.id}
                  onClick={() => decide(offer.id, "LINK", product.id)}
                  type="button"
                >
                  Vincular a {product.name}
                  {product.packageSize ? ` · ${product.packageSize}` : ""}
                </button>
              ))}
            </div>
          ) : null}
          <div>
            <button
              className="primary small"
              disabled={pending}
              onClick={() => decide(offer.id, "APPROVED")}
              type="button"
            >
              Manter como novo
            </button>
            <button
              className="reject"
              disabled={pending}
              onClick={() => decide(offer.id, "REJECTED")}
              type="button"
            >
              Rejeitar
            </button>
          </div>
        </article>
      ))}
      {duplicatePairs.length ? (
        <section className="duplicate-products">
          <span className="eyebrow">DUPLICATAS SUGERIDAS</span>
          <h2>Mesclar catálogo</h2>
          {duplicatePairs.map((pair) => (
            <article className="review-item" key={pair.source.id}>
              <h3>{pair.source.name}</h3>
              <p>
                Unir com {pair.target.name} ·{" "}
                {Math.round(pair.target.score * 100)}% de semelhança
              </p>
              <button
                className="secondary small"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const response = await fetch("/api/admin/products/merge", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        sourceProductId: pair.source.id,
                        targetProductId: pair.target.id,
                      }),
                    });
                    if (!response.ok) {
                      setError("Não foi possível mesclar os produtos.");
                      return;
                    }
                    window.location.reload();
                  })
                }
                type="button"
              >
                Mesclar
              </button>
            </article>
          ))}
        </section>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </>
  );
}
