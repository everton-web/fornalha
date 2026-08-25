import { requireSession } from "@/lib/auth";

import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const session = await requireSession();

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted">
          Identidade, horários, entrega e formas de pagamento.
        </p>
      </div>

      <SettingsForm tenant={session.tenant} canEdit={session.role === "owner"} />
    </>
  );
}
