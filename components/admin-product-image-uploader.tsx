"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ProductOption = { id: string; name: string; packageSize: string | null };

export function AdminProductImageUploader({
  products,
}: {
  products: ProductOption[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [message, setMessage] = useState("");
  return (
    <section className="panel logo-uploader">
      <h2>Imagem de produto</h2>
      <p>
        Para panfletos sem foto individual, envie uma imagem JPG, PNG ou WebP. O
        envio administrativo já fica aprovado e armazenado no SeaweedFS.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!productId) return;
          const response = await fetch(
            `/api/admin/products/${productId}/image`,
            {
              method: "POST",
              body: new FormData(event.currentTarget),
            },
          );
          setMessage(
            response.ok
              ? "Imagem publicada. Atualize a página inicial para vê-la."
              : "Não foi possível enviar a imagem.",
          );
        }}
      >
        <label>
          Produto
          <select
            onChange={(event) => setProductId(event.target.value)}
            value={productId}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {product.packageSize ? ` · ${product.packageSize}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Imagem
          <input
            accept="image/png,image/jpeg,image/webp"
            name="image"
            required
            type="file"
          />
        </label>
        <Button type="submit" variant="outline">
          Publicar imagem
        </Button>
      </form>
      {message ? <p className="success">{message}</p> : null}
    </section>
  );
}
