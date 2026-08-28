import { requireSession } from "@/lib/auth";
import { listAreas } from "@/lib/delivery";

import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const session = await requireSession();
  const areas = await listAreas(session.tenant.id);

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Identidade, horários, entrega e formas de pagamento.
        </p>
      </div>

      <SettingsForm
        tenant={session.tenant}
        areas={areas}
        canEdit={session.role === "owner"}
      />
    </>
  );
}
