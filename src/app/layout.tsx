import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-custom",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fornalha — sistema de pedidos para pizzarias",
  description:
    "Cardápio digital, pedidos online e painel de cozinha para pizzarias.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Fornalha", statusBarStyle: "default" },
};

export const viewport = { themeColor: "#c81e1e" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sans.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
