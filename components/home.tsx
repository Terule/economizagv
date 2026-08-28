"use client";

import { useEffect, useMemo, useState } from "react";
import { OfferCarousels } from "@/components/offer-carousels";
import { ProductThumbnail } from "@/components/product-thumbnail";
import { authClient } from "@/lib/auth-client";
import { entryPrice, recommendedPrice, splitList } from "@/lib/pricing";
import type { CatalogProduct, ListEntry, ValueSuggestion } from "@/lib/types";

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
  images: Array<{ url: string; market: { name: string } | null }>;
  offers: ApiOffer[];
};
type SavedListItem = {
  id: string;
  label: string;
  productId: string | null;
  quantity: number;
  manualPrice: string | number | null;
};
type SavedList = { id: string; name: string; items: SavedListItem[] };
type SuggestionResponse = { suggestion: ValueSuggestion | null };
function toCatalogProduct(product: ApiProduct): CatalogProduct {
  const marketImages = product.images.flatMap((image) =>
    image.market ? [{ market: image.market.name, url: image.url }] : [],
  );
  const prices: CatalogProduct["prices"] = product.offers.map((offer) => ({
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
    image: marketImages.find((image) => image.market === offer.market.name)
      ?.url,
  }));
  return {
    id: product.id,
    name: product.name,
    brand: product.brand ?? "Sem marca",
    packageSize: product.packageSize ?? "Embalagem não informada",
    image: product.images.find((image) => image.market === null)?.url,
    marketImages,
    prices,
  };
}
function hydrateList(list: SavedList, products: CatalogProduct[]): ListEntry[] {
  return list.items.map((item) => ({
    id: item.id,
    label: item.label,
    product: products.find((product) => product.id === item.productId),
    quantity: item.quantity,
    manualPrice:
      item.manualPrice === null ? undefined : Number(item.manualPrice),
  }));
}

export function Home() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [newProduct, setNewProduct] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [activeListId, setActiveListId] = useState<string>();
  const [listName, setListName] = useState("");
  const [suggestions, setSuggestions] = useState<
    Record<string, ValueSuggestion | null | undefined>
  >({});
  useEffect(() => {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : []))
      .then((catalog: ApiProduct[]) =>
        setProducts(catalog.map(toCatalogProduct)),
      );
  }, []);
  useEffect(() => {
    if (!userId) {
      setSavedLists([]);
      setActiveListId(undefined);
      return;
    }
    fetch("/api/lists")
      .then((response) => (response.ok ? response.json() : []))
      .then((lists: SavedList[]) => {
        setSavedLists(lists);
        setActiveListId((current) => current ?? lists[0]?.id);
      });
  }, [userId]);
  useEffect(() => {
    const list = savedLists.find((item) => item.id === activeListId);
    if (!list) return;
    setListName(list.name);
    setEntries(hydrateList(list, products));
  }, [activeListId, products, savedLists]);
  useEffect(() => {
    const productIds = new Set(
      [selected, ...entries.map((entry) => entry.product)].flatMap((product) =>
        product ? [product.id] : [],
      ),
    );
    const missing = [...productIds].filter((id) => !(id in suggestions));
    if (!missing.length) return;
    void Promise.all(
      missing.map(async (id) => {
        const response = await fetch(`/api/products/${id}/suggestions`);
        const data = response.ok
          ? ((await response.json()) as SuggestionResponse)
          : { suggestion: null };
        return [id, data.suggestion] as const;
      }),
    ).then((results) =>
      setSuggestions((current) => ({
        ...current,
        ...Object.fromEntries(results),
      })),
    );
  }, [entries, selected, suggestions]);
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
  const createList = async (name = "Minha compra", clearEntries = true) => {
    const response = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) return;
    const list = (await response.json()) as SavedList;
    setSavedLists((current) => [list, ...current]);
    setActiveListId(list.id);
    setListName(list.name);
    if (clearEntries) setEntries([]);
    return list.id;
  };
  const persistItem = async (entry: ListEntry) => {
    if (!session?.user) return;
    const listId = activeListId ?? (await createList("Minha compra", false));
    if (!listId) return;
    const response = await fetch(`/api/lists/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: entry.label,
        productId: entry.product?.id,
        quantity: entry.quantity,
        manualPrice: entry.manualPrice,
      }),
    });
    if (!response.ok) return;
    const saved = (await response.json()) as SavedListItem;
    setSavedLists((current) =>
      current.map((list) =>
        list.id === listId ? { ...list, items: [...list.items, saved] } : list,
      ),
    );
    setEntries((current) =>
      current.map((item) =>
        item.id === entry.id ? { ...item, id: saved.id } : item,
      ),
    );
  };
  const addProduct = (product?: CatalogProduct, customLabel?: string) => {
    const name = product?.name ?? customLabel?.trim() ?? newProduct.trim();
    if (!name) return;
    const entry = {
      id: crypto.randomUUID(),
      label: name,
      product,
      quantity: 1,
      manualPrice: manualPrice
        ? Number(manualPrice.replace(",", "."))
        : undefined,
    };
    setEntries((current) => [...current, entry]);
    void persistItem(entry);
    setNewProduct("");
    setManualPrice("");
  };
  const updateEntry = (
    id: string,
    changes: Partial<Pick<ListEntry, "quantity" | "manualPrice">>,
  ) => {
    setEntries((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
    setSavedLists((current) =>
      current.map((list) =>
        list.id === activeListId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === id ? { ...item, ...changes } : item,
              ),
            }
          : list,
      ),
    );
    if (session?.user && activeListId)
      void fetch(`/api/lists/${activeListId}/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
  };
  const removeEntry = (id: string) => {
    setEntries((current) => current.filter((item) => item.id !== id));
    setSavedLists((current) =>
      current.map((list) =>
        list.id === activeListId
          ? { ...list, items: list.items.filter((item) => item.id !== id) }
          : list,
      ),
    );
    if (session?.user && activeListId)
      void fetch(`/api/lists/${activeListId}/items/${id}`, {
        method: "DELETE",
      });
  };
  const applySuggestedPackage = (
    entry: ListEntry,
    suggestion: ValueSuggestion,
  ) => {
    const changes = {
      label: suggestion.product.name,
      product: suggestion.product,
      manualPrice: undefined,
    };
    setEntries((current) =>
      current.map((item) =>
        item.id === entry.id ? { ...item, ...changes } : item,
      ),
    );
    setSavedLists((current) =>
      current.map((list) =>
        list.id === activeListId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === entry.id
                  ? {
                      ...item,
                      label: changes.label,
                      productId: suggestion.product.id,
                      manualPrice: null,
                    }
                  : item,
              ),
            }
          : list,
      ),
    );
    if (session?.user && activeListId)
      void fetch(`/api/lists/${activeListId}/items/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: changes.label,
          productId: suggestion.product.id,
          manualPrice: null,
        }),
      });
  };
  const renameList = async () => {
    if (!activeListId || !listName.trim()) return;
    const response = await fetch(`/api/lists/${activeListId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: listName }),
    });
    if (!response.ok) return;
    setSavedLists((current) =>
      current.map((list) =>
        list.id === activeListId ? { ...list, name: listName.trim() } : list,
      ),
    );
  };
  return (
    <main>
      <header>
        <a className="brand" href="/">
          economiza<span>gv</span>
        </a>
        <p>Preços de supermercado em Governador Valadares</p>
        {session?.user ? (
          <span className="login">Olá, {session.user.name}</span>
        ) : (
          <a className="login" href="/login">
            Entrar com Google
          </a>
        )}
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
                  <ProductThumbnail
                    image={best?.image ?? product.image}
                    name={product.brand}
                  />
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
                    <ProductThumbnail
                      className="market-thumbnail"
                      image={price.image}
                      name={price.market}
                    />
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
              {suggestions[selected.id] ? (
                <div className="value-suggestion">
                  <span>
                    💡 Melhor custo por {suggestions[selected.id]?.unit}
                  </span>
                  <b>{suggestions[selected.id]?.product.name}</b>
                  <small>
                    {money.format(suggestions[selected.id]?.price.amount ?? 0)}{" "}
                    · {money.format(suggestions[selected.id]?.unitPrice ?? 0)}/
                    {suggestions[selected.id]?.unit} ·{" "}
                    {Math.round(suggestions[selected.id]?.savingsPercent ?? 0)}%
                    mais econômico
                  </small>
                  <small>
                    {suggestions[selected.id]?.price.market} ·{" "}
                    {suggestions[selected.id]?.price.district}
                  </small>
                </div>
              ) : null}
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
          <div className="list-total">
            <b className="total">{money.format(total)}</b>
            {session?.user ? (
              <div className="list-controls">
                <select
                  aria-label="Lista de compras ativa"
                  onChange={(event) => setActiveListId(event.target.value)}
                  value={activeListId ?? ""}
                >
                  {savedLists.length === 0 ? (
                    <option value="">Minha compra</option>
                  ) : null}
                  {savedLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
                <button
                  className="secondary small"
                  onClick={() => void createList("Nova lista")}
                  type="button"
                >
                  Nova lista
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {session?.user && activeListId ? (
          <div className="saved-list-name">
            <input
              aria-label="Nome da lista"
              onChange={(event) => setListName(event.target.value)}
              value={listName}
            />
            <button
              className="secondary small"
              onClick={renameList}
              type="button"
            >
              Renomear
            </button>
          </div>
        ) : null}
        {!session?.user ? (
          <p className="list-signin">
            <a href="/login">Entre com Google</a> para salvar esta lista e
            acessá-la de outro dispositivo.
          </p>
        ) : null}
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
                  const suggestion = entry.product
                    ? suggestions[entry.product.id]
                    : null;
                  return (
                    <div className="list-entry" key={entry.id}>
                      <div className="list-item">
                        <span>{entry.label}</span>
                        <div>
                          <button
                            type="button"
                            aria-label="Diminuir quantidade"
                            onClick={() =>
                              updateEntry(entry.id, {
                                quantity: Math.max(1, entry.quantity - 1),
                              })
                            }
                          >
                            −
                          </button>
                          <b>{entry.quantity}</b>
                          <button
                            type="button"
                            aria-label="Aumentar quantidade"
                            onClick={() =>
                              updateEntry(entry.id, {
                                quantity: entry.quantity + 1,
                              })
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
                            onClick={() => removeEntry(entry.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {suggestion ? (
                        <div className="list-value-suggestion">
                          <span>
                            💡 {suggestion.product.name} custa{" "}
                            {money.format(suggestion.unitPrice)}/
                            {suggestion.unit} (
                            {Math.round(suggestion.savingsPercent)}% menos)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              applySuggestedPackage(entry, suggestion)
                            }
                          >
                            Usar esta opção
                          </button>
                        </div>
                      ) : null}
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
