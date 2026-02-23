import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Où Skier ? — Conditions d'enneigement nordique en France",
  description:
    "Trouvez votre prochaine destination de ski nordique grâce aux conditions d'enneigement en temps réel des domaines français.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
