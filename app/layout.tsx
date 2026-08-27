import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Economiza GV",
  description: "Compare preços de supermercado em Governador Valadares",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
