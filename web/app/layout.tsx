import type { Metadata } from "next";
import Link from "next/link";
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
      <body className="antialiased">
        <nav className="border-b border-gray-100 bg-white/95">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="text-sm font-semibold text-gray-800 hover:text-blue-600">
              Où Skier ?
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-gray-600 hover:text-blue-600">
                Quand partir ?
              </Link>
              <Link href="/domaines" className="text-gray-600 hover:text-blue-600">
                Le bulletin du jour
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
