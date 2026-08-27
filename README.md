# Economiza GV

MVP de comparação de preços para Governador Valadares. Consulte ofertas, monte listas e envie cupons para revisão.

## Rodar localmente

1. Copie `.env.example` para `.env` e configure as credenciais Google.
2. Execute `npm install`, `npm run db:generate` e `npm run db:push`.
3. Inicie com `npm run dev`, ou use `docker compose up --build`. O Compose sobe PostgreSQL e SeaweedFS (S3 em `localhost:8333`).

O administrador é definido por `ADMIN_EMAIL` (padrão: `terule@gmail.com`) e a rota protegida é `/admin`.

## Dados e revisão

O motor prioriza menor oferta vigente, depois preço de cupom aprovado e por fim preço histórico. Preços manuais são privados. Arquivos de cupom e fotos coletadas ficam no bucket SeaweedFS; o arquivo de cupom é removido após a revisão, preservando apenas os dados normalizados e o log de decisão.
