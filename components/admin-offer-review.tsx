"use client";

import { useState, useTransition } from "react";

type PendingOffer = {
  id: string;
  name: string;
  price: string;
  confidence: number;
  market: string;
  district: string;
};

export function AdminOfferReview({ offers }: { offers: PendingOffer[] }) {
  const [items, setItems] = useState(offers);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const decide = (id: string, decision: "APPROVED" | "REJECTED") => {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) {
        setError("Não foi possível registrar a decisão.");
        return;
      }
      setItems((current) => current.filter((offer) => offer.id !== id));
    });
  };

  if (items.length === 0)
    return <p className="empty">Nenhuma oferta OCR aguardando revisão.</p>;

  return (
    <>
      {items.map((offer) => (
        <article className="review-item" key={offer.id}>
          <span className="tag">OCR · {offer.confidence * 100}% confiança</span>
          <h3>{offer.name}</h3>
          <p>
            R$ {offer.price} · {offer.market} · {offer.district}
          </p>
          <span className="warning">Aguardando revisão</span>
          <div>
            <button
              className="primary small"
              disabled={pending}
              onClick={() => decide(offer.id, "APPROVED")}
              type="button"
            >
              Aprovar
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
      {error ? <p className="error">{error}</p> : null}
    </>
  );
}
