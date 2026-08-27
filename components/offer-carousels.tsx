"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { recommendedPrice } from "@/lib/pricing";
import type { CatalogProduct } from "@/lib/types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function OffersCarousel({
  title,
  items,
}: {
  title: string;
  items: CatalogProduct[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="offers-section">
      <div>
        <span className="eyebrow">ECONOMIZA GV</span>
        <h2>{title}</h2>
      </div>
      <Carousel
        className="w-full"
        opts={{ align: "start", loop: items.length > 3 }}
      >
        <CarouselContent className="ml-0 px-10">
          {items.map((product) => {
            const price = recommendedPrice(product.prices);
            return (
              <CarouselItem
                className="basis-72 pl-3 sm:basis-80"
                key={product.id}
              >
                <Card>
                  <CardHeader>
                    <Badge
                      variant={
                        price?.type === "vigente" ? "default" : "secondary"
                      }
                    >
                      {price?.type === "vigente"
                        ? "Oferta vigente"
                        : "Menor estimativa"}
                    </Badge>
                    <CardTitle>{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      {product.brand} · {product.packageSize}
                    </p>
                    <b>{price ? money.format(price.amount) : "Sem preço"}</b>
                    <small>
                      {price
                        ? `${price.market} · ${price.district}`
                        : "Aguardando coleta"}
                    </small>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-0" />
        <CarouselNext className="right-0" />
      </Carousel>
    </section>
  );
}

export function OfferCarousels({ products }: { products: CatalogProduct[] }) {
  const daily = products.filter((product) =>
    product.prices.some((price) => price.type === "vigente"),
  );
  const lowest = [...products].sort(
    (a, b) =>
      (recommendedPrice(a.prices)?.amount ?? Infinity) -
      (recommendedPrice(b.prices)?.amount ?? Infinity),
  );
  return (
    <div className="offer-carousels">
      <OffersCarousel title="Ofertas do dia" items={daily} />
      <OffersCarousel title="Alguns dos menores preços" items={lowest} />
    </div>
  );
}
