"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <a className="brand" href="/">
        economiza<span>gv</span>
      </a>
      <section className="auth-card">
        <span className="eyebrow">SUA CONTA</span>
        <h1>Salve suas listas.</h1>
        <p>
          Entre com sua conta Google para acessar sua lista em qualquer
          dispositivo e enviar cupons fiscais.
        </p>
        <Button
          type="button"
          onClick={() =>
            authClient.signIn.social({ provider: "google", callbackURL: "/" })
          }
        >
          Continuar com Google
        </Button>
      </section>
    </main>
  );
}
