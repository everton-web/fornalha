import { requireSession } from "@/lib/auth";
import { baseUrl } from "@/lib/auth-tokens";
import { encryptionAvailable } from "@/lib/crypto";
import { listAccounts } from "@/lib/payments/accounts";
import { listProviders } from "@/lib/payments/registry";

import { GatewaysManager } from "./gateways-manager";

export const metadata = { title: "Pagamentos" };

export default async function PagamentosPage() {
  const session = await requireSession();

  const contas = await listAccounts(session.tenant.id);
  const gateways = listProviders().map((p) => ({
    id: p.id,
    label: p.label,
    summary: p.summary,
    supports: p.supports,
    credentialFields: p.credentialFields,
  }));

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Pagamentos online</h1>
        <p className="text-sm text-muted-foreground">
          Onde você recebe. O dinheiro cai direto na sua conta do gateway — não
          passa por ninguém no caminho.
        </p>
      </div>

      {!encryptionAvailable() && (
        <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          O sistema está sem a chave de criptografia configurada, então ainda
          não dá para guardar credencial de gateway com segurança. Avise quem
          cuida da instalação.
        </p>
      )}

      <GatewaysManager
        gateways={gateways}
        contas={contas.map((c) => ({
          provider: c.provider,
          label: c.label,
          acceptsPix: c.acceptsPix,
          acceptsCard: c.acceptsCard,
          isActive: c.isActive,
          hint: c.hint,
        }))}
        canEdit={session.role === "owner"}
        baseUrl={await baseUrl()}
      />
    </>
  );
}
