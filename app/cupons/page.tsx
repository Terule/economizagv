"use client";
import { useState } from "react";
import { markets } from "@/lib/demo-data";

export default function ReceiptPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="simple-page">
      <a className="brand" href="/">
        economiza<span>gv</span>
      </a>
      <section className="form-card">
        <span className="eyebrow">CUPOM FISCAL</span>
        <h1>Compartilhe um preço.</h1>
        <p>
          Informe os dados exatamente como aparecem no cupom. A leitura será
          comparada com o OCR antes da revisão.
        </p>
        {sent ? (
          <div className="success">
            Recebemos seu cupom. Ele será publicado somente após revisão; o
            arquivo será excluído ao final.
          </div>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              const response = await fetch("/api/receipts", {
                method: "POST",
                body: new FormData(event.currentTarget),
              });
              if (response.ok) setSent(true);
              else
                setError(
                  (await response.json()).error ??
                    "Não foi possível enviar o cupom.",
                );
            }}
          >
            <label>
              Arquivo do cupom (máx. 10 MB)
              <input name="file" type="file" accept="image/*,.pdf" required />
            </label>
            <label>
              Supermercado
              <select name="marketId" required>
                {markets.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Filial de referência
              <select name="storeId" required>
                {markets.map((market) => (
                  <option key={market.id} value={`${market.id}-referencia`}>
                    {market.district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data da compra
              <input name="purchasedAt" type="date" required />
            </label>
            <button type="submit" className="primary">
              Enviar para revisão
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
