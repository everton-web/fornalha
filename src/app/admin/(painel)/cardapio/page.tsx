import { requireSession } from "@/lib/auth";
import { getAdminMenu } from "@/lib/admin-menu";

import { MenuEditor } from "./menu-editor";

export const metadata = { title: "Cardápio" };

export default async function CardapioPage() {
  const session = await requireSession();
  const menu = await getAdminMenu(session.tenant.id);

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Cardápio</h1>
        <p className="text-sm text-muted-foreground">
          O que você mudar aqui aparece na hora no link do cliente.
        </p>
      </div>

      <MenuEditor menu={menu} />
    </>
  );
}
