import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLogoUploader } from "@/components/admin-logo-uploader";
import { AdminOfferReview } from "@/components/admin-offer-review";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { findDuplicatePairs, findProductMatches } from "@/lib/product-match";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session?.user.email)) redirect("/");
  const [pendingOffers, catalogProducts, approvedCount, completedRuns] =
    await Promise.all([
      db.offer.findMany({
        where: { reviewState: "PENDING", source: "FLYER" },
        include: { product: true, market: true, store: true },
        orderBy: { capturedAt: "desc" },
      }),
      db.product.findMany({
        select: {
          id: true,
          name: true,
          normalized: true,
          brand: true,
          packageSize: true,
        },
        take: 250,
        orderBy: { updatedAt: "desc" },
      }),
      db.offer.count({ where: { reviewState: "APPROVED" } }),
      db.collectionRun.count({ where: { status: "COMPLETED" } }),
    ]);
  const reviewOffers = pendingOffers.map((offer) => ({
    id: offer.id,
    productId: offer.product.id,
    name: offer.product.name,
    price: offer.price.toFixed(2).replace(".", ","),
    confidence: offer.confidence,
    market: offer.market.name,
    district: offer.store.district,
    suggestions: findProductMatches(offer.product, catalogProducts).map(
      (product) => ({
        id: product.id,
        name: product.name,
        packageSize: product.packageSize,
      }),
    ),
  }));
  const duplicatePairs = findDuplicatePairs(catalogProducts).map((pair) => ({
    source: {
      id: pair.source.id,
      name: pair.source.name,
      packageSize: pair.source.packageSize,
    },
    target: {
      id: pair.target.id,
      name: pair.target.name,
      packageSize: pair.target.packageSize,
      score: pair.target.score,
    },
  }));
  return (
    <main className="admin-page">
      <header>
        <a className="brand" href="/">
          economiza<span>gv</span>
        </a>
        <p>Administração · {session?.user.email}</p>
      </header>
      <section className="admin-head">
        <span className="eyebrow">FILA DE REVISÃO</span>
        <h1>Qualidade dos preços</h1>
        <p>
          Revise dados incertos antes de torná-los públicos. Cada decisão fica
          registrada.
        </p>
      </section>
      <div className="admin-grid">
        <section className="panel review-panel">
          <div className="section-title">
            <h2>Pendências</h2>
            <b>{reviewOffers.length}</b>
          </div>
          <AdminOfferReview
            duplicatePairs={duplicatePairs}
            offers={reviewOffers}
          />
        </section>
        <aside className="panel metrics">
          <span className="eyebrow">HOJE</span>
          <b>{reviewOffers.length}</b>
          <span>itens aguardando revisão</span>
          <hr />
          <b>{approvedCount}</b>
          <span>ofertas publicadas</span>
          <hr />
          <b>{completedRuns}</b>
          <span>coletas concluídas</span>
        </aside>
      </div>
      <AdminLogoUploader />
    </main>
  );
}
