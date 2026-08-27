import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";

const reviewItems = [
  {
    type: "Cupom fiscal",
    title: "Big Mais · Esplanada",
    detail: "Data declarada 26/08 · OCR identificou 25/08",
    status: "Conflito de data",
  },
  {
    type: "OCR",
    title: "Panfleto Coelho Diniz",
    detail: "Detergente Ypê 500 ml · preço lido: R$ 2,?9",
    status: "Baixa confiança",
  },
  {
    type: "Imagem",
    title: "Café Pilão 500 g",
    detail: "Imagem web aguardando moderação",
    status: "Pendente",
  },
];

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session?.user.email)) redirect("/");
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
            <b>{reviewItems.length}</b>
          </div>
          {reviewItems.map((item) => (
            <article className="review-item" key={item.title}>
              <span className="tag">{item.type}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <span className="warning">{item.status}</span>
              <div>
                <button type="button" className="secondary">
                  Corrigir
                </button>
                <button type="button" className="primary small">
                  Aprovar
                </button>
                <button type="button" className="reject">
                  Rejeitar
                </button>
              </div>
            </article>
          ))}
        </section>
        <aside className="panel metrics">
          <span className="eyebrow">HOJE</span>
          <b>3</b>
          <span>itens aguardando revisão</span>
          <hr />
          <b>18</b>
          <span>ofertas publicadas</span>
          <hr />
          <b>2</b>
          <span>coletas concluídas</span>
        </aside>
      </div>
    </main>
  );
}
