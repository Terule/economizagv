"use client";

import { ProductThumbnail } from "@/components/product-thumbnail";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        className="offer-carousel"
        opts={{ align: "start", loop: items.length > 3 }}
      >
        <CarouselContent>
          {items.map((product) => {
            const price = recommendedPrice(product.prices);
            return (
              <CarouselItem
                className="basis-[336px] shrink-0 grow-0"
                key={product.id}
              >
                <Card>
                  <CardHeader>
                    <div className="offer-card-label">
                      <Badge
                        variant={
                          price?.type === "vigente" ? "default" : "secondary"
                        }
                      >
                        {price?.type === "vigente"
                          ? "Oferta vigente"
                          : "Menor estimativa"}
                      </Badge>
                      <ProductThumbnail
                        image={product.image}
                        name={product.name}
                      />
                    </div>
                    <CardTitle className="line-clamp-2">
                      {product.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {product.brand} · {product.packageSize}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
