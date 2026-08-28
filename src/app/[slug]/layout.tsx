import { notFound } from "next/navigation";

import { getMenu } from "@/lib/menu";

import { CartProvider } from "./_components/cart-provider";
import { StoreHeader } from "./_components/store-header";

/** Texto legível sobre a cor da marca — evita branco sobre amarelo. */
function inkFor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? "#1c1917" : "#ffffff";
}

export async function generateMetadata({ params }: LayoutProps<"/[slug]">) {
  const { slug } = await params;
  const menu = await getMenu(slug);
  if (!menu) return { title: "Pizzaria não encontrada" };

  return {
    title: `${menu.tenant.name} — peça online`,
    description:
      menu.tenant.tagline ?? `Peça sua pizza no ${menu.tenant.name}.`,
  };
}

export default async function StoreLayout({
  children,
  params,
}: LayoutProps<"/[slug]">) {
  const { slug } = await params;
  const menu = await getMenu(slug);
  if (!menu) notFound();

  const brand = menu.tenant.primary_color || "#c81e1e";

  return (
    <div
      className="flex min-h-full flex-col"
      style={
        {
          "--brand": brand,
          "--brand-ink": inkFor(brand),
        } as React.CSSProperties
      }
    >
      <CartProvider menu={menu}>
        <StoreHeader tenant={menu.tenant} />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line py-8 text-center text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{menu.tenant.name}</p>
          {menu.tenant.address && <p className="mt-1">{menu.tenant.address}</p>}
          <p className="mt-3">Pedidos online por Fornalha</p>
        </footer>
      </CartProvider>
    </div>
  );
}
