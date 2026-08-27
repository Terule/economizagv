"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const markets = [
  { slug: "coelho-diniz", name: "Coelho Diniz" },
  { slug: "big-mais", name: "Big Mais" },
  { slug: "supermercados-bh", name: "Supermercados BH" },
];
export function AdminLogoUploader() {
  const [message, setMessage] = useState("");
  return (
    <section className="panel logo-uploader">
      <h2>Logos dos supermercados</h2>
      <p>
        Não foi possível obter logos oficiais automaticamente. Envie uma imagem
        quadrada (PNG, JPG ou WebP; até 2 MB).
      </p>
      {markets.map((market) => (
        <form
          key={market.slug}
          onSubmit={async (event) => {
            event.preventDefault();
            const response = await fetch(
              `/api/admin/markets/${market.slug}/logo`,
              { method: "POST", body: new FormData(event.currentTarget) },
            );
            setMessage(
              response.ok
                ? `${market.name}: logo atualizada.`
                : "Não foi possível enviar a logo.",
            );
          }}
        >
          <label>
            {market.name}
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
            />
          </label>
          <Button type="submit" variant="outline">
            Enviar logo
          </Button>
        </form>
      ))}
      {message && <p className="success">{message}</p>}
    </section>
  );
}
