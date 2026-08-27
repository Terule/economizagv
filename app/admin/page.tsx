import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLogoUploader } from "@/components/admin-logo-uploader";
import { AdminOfferReview } from "@/components/admin-offer-review";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session?.user.email)) redirect("/");
  const [pendingOffers, approvedCount, completedRuns] = await Promise.all([
    db.offer.findMany({
      where: { reviewState: "PENDING", source: "FLYER" },
      include: { product: true, market: true, store: true },
      orderBy: { capturedAt: "desc" },
    }),
    db.offer.count({ where: { reviewState: "APPROVED" } }),
    db.collectionRun.count({ where: { status: "COMPLETED" } }),
  ]);
  const reviewOffers = pendingOffers.map((offer) => ({
    id: offer.id,
    name: offer.product.name,
    price: offer.price.toFixed(2).replace(".", ","),
    confidence: offer.confidence,
    market: offer.market.name,
    district: offer.store.district,
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
          <AdminOfferReview offers={reviewOffers} />
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
