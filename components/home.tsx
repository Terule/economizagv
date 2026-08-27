"use client";

import { useEffect, useMemo, useState } from "react";
import { OfferCarousels } from "@/components/offer-carousels";
import { entryPrice, recommendedPrice, splitList } from "@/lib/pricing";
import type { CatalogProduct, ListEntry } from "@/lib/types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const typeLabel = {
  vigente: "Oferta vigente",
  cupom_aprovado: "Cupom aprovado",
  histórico_desatualizado: "Preço desatualizado",
};
type ApiOffer = {
  id: string;
  price: string | number;
  kind: string;
  capturedAt: string;
  validUntil: string | null;
  market: { name: string };
  store: { district: string };
};
type ApiProduct = {
  id: string;
  name: string;
  brand: string | null;
  packageSize: string | null;
  offers: ApiOffer[];
};
function toCatalogProduct(product: ApiProduct): CatalogProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand ?? "Sem marca",
    packageSize: product.packageSize ?? "Embalagem não informada",
    prices: product.offers.map((offer) => ({
      id: offer.id,
      market: offer.market.name,
      district: offer.store.district,
      amount: Number(offer.price),
      type:
        offer.kind === "RECEIPT"
          ? "cupom_aprovado"
          : offer.kind === "HISTORICAL"
            ? "histórico_desatualizado"
            : "vigente",
      referenceDate: new Date(offer.capturedAt).toLocaleDateString("pt-BR"),
      validUntil: offer.validUntil
        ? new Date(offer.validUntil).toLocaleDateString("pt-BR")
        : undefined,
    })),
  };
}

export function Home() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [newProduct, setNewProduct] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  useEffect(() => {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : []))
      .then((catalog: ApiProduct[]) =>
        setProducts(catalog.map(toCatalogProduct)),
      );
  }, []);
  const visible = products.filter((product) =>
    `${product.name} ${product.brand}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const groups = useMemo(() => splitList(entries), [entries]);
  const total = Object.values(groups).reduce(
    (sum, group) => sum + group.total,
    0,
  );
  const addProduct = (product?: CatalogProduct, customLabel?: string) => {
    const name = product?.name ?? customLabel?.trim() ?? newProduct.trim();
    if (!name) return;
    setEntries((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: name,
        product,
        quantity: 1,
        manualPrice: manualPrice
          ? Number(manualPrice.replace(",", "."))
          : undefined,
      },
    ]);
    setNewProduct("");
    setManualPrice("");
  };
  return (
    <main>
      <header>
        <a className="brand" href="/">
          economiza<span>gv</span>
        </a>
        <p>Preços de supermercado em Governador Valadares</p>
        <a className="login" href="/login">
          Entrar com Google
        </a>
      </header>
      <section className="hero">
        <div>
          <span className="eyebrow">COMPARE. ECONOMIZE. COMPRE.</span>
          <h1>
            Sua compra, pelo <em>menor preço.</em>
          </h1>
          <p>
            Confira as ofertas da sua cidade e monte uma lista que já vem
            separada por supermercado.
          </p>
        </div>
        <div className="hero-card">
          <b>
            {products.reduce(
              (total, product) => total + product.prices.length,
              0,
            )}{" "}
            preços
          </b>
          <span>monitorados diariamente</span>
          <small>Coelho Diniz · Big Mais · BH</small>
        </div>
      </section>
      <OfferCarousels products={products} />
      <section className="workspace">
        <div className="catalog panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">PESQUISAR</span>
              <h2>Encontre produtos</h2>
            </div>
            <input
              aria-label="Pesquisar produtos"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Arroz, leite, café..."
            />
          </div>
          <div className="products">
            {visible.length === 0 && query.trim() ? (
              <div className="search-empty">
                <span>Nenhum preço encontrado para “{query}”.</span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => addProduct(undefined, query)}
                >
                  Adicionar sem preço
                </button>
              </div>
            ) : null}
            {visible.map((product) => {
              const best = recommendedPrice(product.prices);
              return (
                <button
                  type="button"
                  className={`product ${selected?.id === product.id ? "selected" : ""}`}
                  key={product.id}
                  onClick={() => setSelected(product)}
                >
                  <span className="photo">{product.brand.slice(0, 1)}</span>
                  <span className="product-copy">
                    <b>{product.name}</b>
                    <small>
                      {product.brand} · {product.packageSize}
                    </small>
                  </span>
                  <span className="price">
                    {best ? (
                      <>
                        <b>{money.format(best.amount)}</b>
                        <small>{best.market}</small>
                      </>
                    ) : (
                      "Sem preço"
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="custom-product">
            <b>Não encontrou o produto?</b>
            <div>
              <input
                value={newProduct}
                onChange={(event) => setNewProduct(event.target.value)}
                placeholder="Digite o nome do item"
              />
              <input
                value={manualPrice}
                onChange={(event) => setManualPrice(event.target.value)}
                inputMode="decimal"
                placeholder="Preço manual (opcional)"
              />
              <button
                type="button"
                className="secondary"
                onClick={() => addProduct()}
              >
                Adicionar à lista
              </button>
            </div>
            <small>O preço manual é visível somente para você.</small>
          </div>
        </div>
        <aside className="comparison panel">
          {selected ? (
            <>
              <span className="eyebrow">COMPARATIVO</span>
              <h2>{selected.name}</h2>
              <p>
                {selected.brand} · {selected.packageSize}
              </p>
              <div className="price-list">
                {selected.prices.map((price) => (
                  <div
                    className={`market-price ${price.type === "histórico_desatualizado" ? "stale" : ""}`}
                    key={price.id}
                  >
                    <div>
                      <b>{price.market}</b>
                      <span>
                        {price.district} · {typeLabel[price.type]}
                      </span>
                    </div>
                    <div>
                      <b>{money.format(price.amount)}</b>
                      <span>
                        {price.validUntil
                          ? `Válido até ${price.validUntil}`
                          : price.referenceDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {selected.alternatives?.map((alternative) => (
                <div className="alternative" key={alternative.name}>
                  <span>
                    💡 {alternative.name} por {money.format(alternative.amount)}{" "}
                    no {alternative.market}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      addProduct({
                        ...selected,
                        name: alternative.name,
                        prices: [
                          {
                            id: crypto.randomUUID(),
                            market: alternative.market,
                            district: "Esplanada",
                            amount: alternative.amount,
                            type: "vigente",
                            referenceDate: "Hoje",
                          },
                        ],
                      })
                    }
                  >
                    Trocar
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="primary"
                onClick={() => addProduct(selected)}
              >
                Adicionar à lista
              </button>
            </>
          ) : (
            <p>Selecione um produto para comparar preços.</p>
          )}
        </aside>
      </section>
      <section className="list panel">
        <div className="section-title">
          <div>
            <span className="eyebrow">MINHA LISTA</span>
            <h2>Compra inteligente</h2>
          </div>
          <b className="total">{money.format(total)}</b>
        </div>
        {entries.length === 0 ? (
          <div className="empty">
            Adicione produtos para ver onde comprar cada um pelo melhor preço.
          </div>
        ) : (
          <div className="groups">
            {Object.entries(groups).map(([market, group]) => (
              <div className="market-group" key={market}>
                <div>
                  <h3>{market}</h3>
                  <span>
                    {group.district ?? "Aguardando preço"}
                    {group.stale && " · inclui preço desatualizado"}
                  </span>
                </div>
                {group.entries.map((entry) => {
                  const price = entryPrice(entry);
                  return (
                    <div className="list-item" key={entry.id}>
                      <span>{entry.label}</span>
                      <div>
                        <button
                          type="button"
                          aria-label="Diminuir quantidade"
                          onClick={() =>
                            setEntries((items) =>
                              items.map((item) =>
                                item.id === entry.id
                                  ? {
                                      ...item,
                                      quantity: Math.max(1, item.quantity - 1),
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          −
                        </button>
                        <b>{entry.quantity}</b>
                        <button
                          type="button"
                          aria-label="Aumentar quantidade"
                          onClick={() =>
                            setEntries((items) =>
                              items.map((item) =>
                                item.id === entry.id
                                  ? { ...item, quantity: item.quantity + 1 }
                                  : item,
                              ),
                            )
                          }
                        >
                          +
                        </button>
                        <b>
                          {price.amount === undefined
                            ? "—"
                            : money.format(price.amount * entry.quantity)}
                        </b>
                        <button
                          type="button"
                          className="remove"
                          onClick={() =>
                            setEntries((items) =>
                              items.filter((item) => item.id !== entry.id),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="subtotal">
                  Subtotal <b>{money.format(group.total)}</b>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="receipt">
        <div>
          <span className="eyebrow">PREÇO COLABORATIVO</span>
          <h2>Encontrou um preço diferente?</h2>
          <p>
            Envie seu cupom fiscal. Após conferência, ele ajuda toda a cidade a
            economizar.
          </p>
        </div>
        <a className="secondary" href="/cupons">
          Enviar cupom fiscal
        </a>
      </section>
      <footer>
        Valores podem variar conforme disponibilidade. Última atualização
        exibida em cada oferta.
      </footer>
    </main>
  );
}
