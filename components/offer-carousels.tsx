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
import { products } from "@/lib/demo-data";
import { recommendedPrice } from "@/lib/pricing";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function OffersCarousel({
  title,
  items,
}: {
  title: string;
  items: typeof products;
}) {
  return (
    <section className="offers-section">
      <div>
        <span className="eyebrow">ECONOMIZA GV</span>
        <h2>{title}</h2>
      </div>
      <Carousel opts={{ align: "start", loop: items.length > 3 }}>
        <CarouselContent>
          {items.map((product) => {
            const price = recommendedPrice(product.prices);
            return (
              <CarouselItem
                className="basis-full md:basis-1/2 lg:basis-1/3"
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
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
}

export function OfferCarousels() {
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
